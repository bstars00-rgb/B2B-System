import { useEffect, useMemo, useState, type ReactNode } from 'react';
import EnhBadge from './EnhBadge';
import type { Booking } from '../types';
import { allHotels, cityEnOf } from '../mocks/hotelDb';
import {
  ANCILLARY_LABEL,
  budgetTotalOf,
  cancelLabel,
  MIN_GROUP_ROOMS,
  EMPTY_ANCILLARY,
  fmtDateTime,
  fmtMoney,
  generateQuotes,
  remainingInfo,
  type RemainTone,
  nightDates,
  nights as calcNights,
  priceQuote,
  rateFor,
  RATE_COUNTRIES,
  roomsSummary,
  roomsTotal,
  type Ancillary,
  type CountryRate,
  type DateBudget,
  type GroupInquiry,
  type HotelQuote,
  type InquiryStatus,
  type RoomReq,
} from '../mocks/groupInquiry';
import { applyBus, loadInquiries, loadRates, nextInquiryRef, saveInquiries, saveRates, SELLER_NAME, toBusInquiry } from '../utils/groupInquiryStore';
import { CANCEL_REASON_LABEL, cancelClosed, publishInquiry, readBus, subscribeBus, sweepUnpaid, upsertDeal } from '../utils/groupBus';

/**
 * 단체 문의 · 역경매(RFP) 소싱 — 접수 → 기존 계약 호텔 역경매 견적 회수 →
 * 국가별 요금 구조(net+마크업 / 단가+커미션)로 고객가 산출 → 리스트업 → 리퀘스트 예약.
 * **프로토타입 · 폐기 가능.** 상세 기획: docs/plan/feature-group-inquiry-rfp.md
 */

const STATUS_LABEL: Record<InquiryStatus, string> = {
  Submitted: '접수',
  Sourcing: '견적 수집중',
  Quoted: '견적 도착',
  Requested: '리퀘스트 예약 · 호텔 응답 대기',
  Accepted: '호텔 수락 · 결제 대기',
  Confirmed: '확정 · 결제 완료',
  Cancelled: '취소',
  Expired: '마감 · 견적 없음',
};
const STATUS_STYLE: Record<InquiryStatus, string> = {
  Submitted: 'bg-slate-100 text-slate-600',
  Sourcing: 'bg-amber-100 text-amber-700',
  Quoted: 'bg-brand-100 text-brand-700',
  Requested: 'bg-blue-100 text-blue-700',
  Accepted: 'bg-amber-100 text-amber-800',
  Confirmed: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-slate-200 text-slate-400 line-through',
  Expired: 'bg-slate-200 text-slate-500',
};

const MEAL_PLANS = ['Room Only', 'Breakfast', 'Half Board', 'Full Board'];
const ROOM_TYPES = ['Single', 'Twin', 'Double', 'Triple', 'Suite'];
const ANCILLARY_KEYS: (keyof Ancillary)[] = ['seminar', 'banquet', 'partialBreakfast', 'transport'];

const fmtDate = (iso: string) => (iso ? iso.slice(0, 10) : '');
const rateBasisNote = (rate: CountryRate) =>
  rate.mode === 'commission'
    ? '단가+커미션 국가 — 호텔 견적을 단가로 회수, 커미션이 우리 수익(고객가=단가).'
    : 'net 국가 — 호텔 net 견적에 마크업을 얹어 고객가 산출.';

const activeAncillary = (a?: Ancillary) => (a ? ANCILLARY_KEYS.filter((k) => a[k]).map((k) => ANCILLARY_LABEL[k]) : []);

/** 남은 시간 실시간 갱신용 현재시각 (30초 주기) */
function useNow(intervalMs = 30000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

const REMAIN_STYLE: Record<RemainTone, string> = {
  danger: 'bg-rose-100 text-rose-700',
  warning: 'bg-amber-100 text-amber-700',
  neutral: 'bg-slate-100 text-slate-600',
  expired: 'bg-slate-200 text-slate-500',
};

/** 회신 기한 남은 시간 배지 */
function RemainBadge({ deadline, now }: { deadline?: string; now: number }) {
  const r = remainingInfo(deadline, now);
  if (!r) return <span className="text-slate-300">—</span>;
  return <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold ${REMAIN_STYLE[r.tone]}`}>⏱ {r.label}</span>;
}

/** datetime-local 입력값 ('YYYY-MM-DDTHH:mm', 로컬) */
const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** 표시용 유효 상태 — 회신 기한이 지났는데 견적이 하나도 없으면 '마감(견적 없음)' */
const effStatus = (i: GroupInquiry, now: number): InquiryStatus =>
  (i.status === 'Submitted' || i.status === 'Sourcing') && i.quotes.length === 0 && remainingInfo(i.quoteDeadline, now)?.expired ? 'Expired' : i.status;

export default function GroupInquiryPage({
  onCreateBooking,
  onOpenBookings,
}: {
  onCreateBooking?: (b: Booking) => void;
  /** 예약 상태(호텔 컨펌·결제·취소)는 버스(groupBus) → AiSearchPage 동기화로 반영 */
  onOpenBookings?: () => void;
} = {}) {
  const [inquiries, setInquiries] = useState<GroupInquiry[]>(loadInquiries);
  const [rates, setRates] = useState<Record<string, CountryRate>>(loadRates);
  const [mode, setMode] = useState<'list' | 'new' | 'detail'>('list');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showInternal, setShowInternal] = useState(false);
  const [showEllis, setShowEllis] = useState(false);
  const [confirmQuote, setConfirmQuote] = useState<HotelQuote | null>(null);
  /** 단체 예약 확인서(계약 조건) — 결제 전 동의 */
  const [contractOpen, setContractOpen] = useState(false);

  useEffect(() => saveInquiries(inquiries), [inquiries]);
  useEffect(() => saveRates(rates), [rates]);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(t);
  }, [toast]);

  // 벤더 콘솔 실연동 — 호텔 견적·컨펌/거절·결제·취소를 버스에서 받아 반영(+ 결제 마감 경과 자동취소)
  useEffect(() => {
    const sync = () => {
      sweepUnpaid();
      setInquiries((prev) => applyBus(prev, readBus()));
    };
    sync();
    const unsub = subscribeBus(sync);
    const t = setInterval(sync, 30000);
    return () => {
      unsub();
      clearInterval(t);
    };
  }, []);

  const active = inquiries.find((i) => i.id === activeId) ?? null;

  const tree = useMemo(() => {
    const t = new Map<string, Map<string, { id: string; name: string; currency: string }[]>>();
    for (const h of allHotels()) {
      if (!t.has(h.city.country)) t.set(h.city.country, new Map());
      const regs = t.get(h.city.country)!;
      if (!regs.has(h.city.destination)) regs.set(h.city.destination, []);
      regs.get(h.city.destination)!.push({ id: h.id, name: h.name, currency: h.city.currency });
    }
    return t;
  }, []);

  function patchInquiry(id: string, patch: Partial<GroupInquiry>) {
    setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  /** 이메일·SCM 중개 채널 견적 회수(시뮬레이트) — 콘솔 직접 제출 견적은 유지하고 합친다 */
  function sourceQuotes(inq: GroupInquiry) {
    const channel = generateQuotes(inq, rates);
    patchInquiry(inq.id, { status: 'Quoted', quotes: [...inq.quotes.filter((q) => q.source === 'console'), ...channel] });
    setToast(`이메일·SCM 중개로 기존 계약 호텔 ${channel.length}곳 견적을 회수했습니다 — 국가 요금 구조로 고객가 산출 후 리스트업.`);
  }

  function placeRequest(inq: GroupInquiry, q: HotelQuote) {
    patchInquiry(inq.id, {
      status: 'Requested',
      selectedQuoteId: q.id,
      quotes: inq.quotes.map((x) => ({ ...x, status: x.id === q.id ? 'selected' : 'not_selected' })),
    });
    // 낙찰 → 버스 기록(콘솔 호텔이 컨펌/거절) + Marketplace Bookings에 리퀘스트 예약 생성
    upsertDeal(inq.ref, { quoteId: q.id, awardedAt: new Date().toISOString(), paymentDeadlineHours: q.paymentDeadlineHours });
    const pr = priceQuote(q.amount, rateFor(inq.country, rates), q.currency);
    const booking: Booking = {
      ellis_code: inq.ref,
      seller_code: inq.ref,
      booking_date: new Date().toISOString(),
      status: 'Requested',
      payment_status: 'Unpaid',
      hotel_id: q.hotelId,
      hotel_name: q.hotelName,
      region: inq.region,
      check_in: inq.checkIn,
      check_out: inq.checkOut,
      nights: inq.nights,
      room_type: roomsSummary(inq.rooms),
      room_count: roomsTotal(inq.rooms),
      traveler_name: inq.groupType ?? '단체',
      travelers: inq.guests,
      currency: q.currency,
      sum_amt: pr.sell,
      // 취소 마감(호텔 지정) — 그날 23:59까지 무료취소, 이후 취소·환불 불가. 없으면 null(취소 불가)
      client_cancel_dl: q.cancelDeadline ? `${q.cancelDeadline.slice(0, 10)}T23:59:00` : null,
      cancel_date: null,
      group_ref: inq.ref,
    };
    onCreateBooking?.(booking);
    setConfirmQuote(null);
    setToast(
      q.source === 'console'
        ? `${q.hotelName} 리퀘스트 예약이 생성되었습니다 (${inq.ref}) — 호텔이 벤더 콘솔에서 컨펌하면 결제 단계로 넘어갑니다.`
        : `${q.hotelName} 리퀘스트 예약이 생성되었습니다 (${inq.ref}) — Bookings에서 확인 · 호텔 컨펌 대기.`,
    );
  }

  /** 이메일·SCM 중개 호텔의 응답 시뮬레이트 (콘솔 호텔은 콘솔에서 직접 처리) */
  function simulateHotel(inq: GroupInquiry, decision: 'confirmed' | 'rejected') {
    const at = new Date().toISOString();
    upsertDeal(inq.ref, decision === 'confirmed' ? { hotelDecision: 'confirmed', decidedAt: at } : { hotelDecision: 'rejected', decidedAt: at, cancelledAt: at, cancelReason: 'hotel_rejected' });
    setToast(decision === 'confirmed' ? '호텔이 리퀘스트 예약을 수락했습니다 — 계약 조건 동의 후 결제 마감 전에 결제하세요. (시뮬레이트)' : '호텔이 리퀘스트 예약을 거절했습니다 — 문의가 취소됩니다. (시뮬레이트)');
  }

  /** 계약 조건(단체 예약 확인서) 동의 + 결제 — UI 시연(실결제 없음) */
  function payWithContract(inq: GroupInquiry) {
    const at = new Date().toISOString();
    upsertDeal(inq.ref, { contractAcceptedAt: at, paidAt: at });
    setContractOpen(false);
    setToast('결제가 완료되었습니다 — 단체 예약이 확정되었습니다. (시연 · 실결제 없음)');
  }

  /** 고객사 취소 — 취소 마감 전에만(예약 전체 · 결제했으면 전액 환불) */
  function sellerCancel(inq: GroupInquiry) {
    upsertDeal(inq.ref, { cancelledAt: new Date().toISOString(), cancelReason: 'seller_cancelled' });
    setToast(inq.paidAt ? '예약을 취소했습니다 — 취소 마감 전이라 전액 환불됩니다.' : '리퀘스트 예약을 취소했습니다.');
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-100">
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold text-slate-800">
              단체 문의 · 역경매 소싱
              <EnhBadge note="단체 문의(5실↑) → 기존 계약 호텔 역경매(벤더 콘솔 실연동) → 국가별 요금 고객가 → 전부 리스트업 → 리퀘스트 예약 → 호텔 수락 → 계약 동의·결제 (신규 기획)" />
            </h1>
            <p className="mt-0.5 text-[12px] text-slate-500">
              <b>5실 이상</b> 단체는 문의로 접수합니다. 기존 계약 호텔에 역경매로 뿌리고, 호텔이 낸 견적을 <b>전부</b> 리스트업합니다 — 선택은 고객사가 합니다.
            </p>
          </div>
          {mode === 'list' && (
            <button type="button" onClick={() => setMode('new')} className="rounded bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
              ＋ 새 단체 문의
            </button>
          )}
          {mode !== 'list' && (
            <button
              type="button"
              onClick={() => {
                setMode('list');
                setActiveId(null);
              }}
              className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              ← 목록
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 px-6 py-5">
        {mode === 'list' && (
          <ListView
            inquiries={inquiries}
            rates={rates}
            onOpen={(id) => {
              setActiveId(id);
              setMode('detail');
            }}
            showEllis={showEllis}
            setShowEllis={setShowEllis}
            setRates={setRates}
            showInternal={showInternal}
            setShowInternal={setShowInternal}
          />
        )}

        {mode === 'new' && (
          <NewInquiryForm
            tree={tree}
            rates={rates}
            onCancel={() => setMode('list')}
            onSubmit={(draft) => {
              // 접수(메일) → 즉시 RFP 배포: 벤더 콘솔(도시 일치 호텔)로 발송 = 견적 수집중
              const inq: GroupInquiry = { ...draft, status: 'Sourcing', sellerName: SELLER_NAME };
              publishInquiry(toBusInquiry(inq, rates, activeAncillary(inq.ancillary)));
              setInquiries((prev) => [inq, ...prev]);
              setActiveId(inq.id);
              setMode('detail');
              setToast('문의가 접수되었습니다 — 접수 메일 발송 · 같은 도시의 계약 호텔(벤더 콘솔)에 RFP가 배포되었습니다.');
            }}
          />
        )}

        {mode === 'detail' && active && (
          <DetailView
            inq={active}
            rates={rates}
            showInternal={showInternal}
            onSource={() => sourceQuotes(active)}
            onSelectQuote={(q) => setConfirmQuote(q)}
            onOpenBookings={onOpenBookings}
            onSimulateHotel={(d) => simulateHotel(active, d)}
            onOpenContract={() => setContractOpen(true)}
            onSellerCancel={() => sellerCancel(active)}
          />
        )}
      </div>

      {confirmQuote && active && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-[480px] overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm font-bold text-slate-800">리퀘스트 예약 진행</div>
            <div className="px-5 py-5 text-[13px] text-slate-700">
              <p className="mb-3">
                <b>{confirmQuote.hotelName}</b> 견적으로 리퀘스트 예약을 진행합니다.
              </p>
              <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">고객가</span>
                  <b className="text-brand-600">{fmtMoney(priceQuote(confirmQuote.amount, rateFor(active.country, rates), confirmQuote.currency).sell, confirmQuote.currency)}</b>
                </div>
                <div className="mt-1 flex justify-between gap-3">
                  <span className="shrink-0 text-slate-500">조건</span>
                  <span className="text-right">{confirmQuote.condition}</span>
                </div>
                <div className="mt-1 flex justify-between gap-3">
                  <span className="shrink-0 text-slate-500">취소</span>
                  <span className="text-right">{cancelLabel(confirmQuote.cancelDeadline)}</span>
                </div>
                <div className="mt-1 flex justify-between gap-3">
                  <span className="shrink-0 text-slate-500">결제</span>
                  <span className="text-right">호텔 수락 후 {confirmQuote.paymentDeadlineHours}시간 이내 (미결제 시 자동취소)</span>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-amber-600">
                ※ 리퀘스트 예약은 <b>호텔 수락 + 결제 완료 전까지 확정이 아닙니다.</b> 취소는 예약 전체 단위이며,{' '}
                <b>취소 마감 전엔 전액 환불 · 마감 후엔 취소·환불 불가</b>입니다(호텔이 견적 때 지정).
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <button type="button" onClick={() => setConfirmQuote(null)} className="rounded border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                취소
              </button>
              <button type="button" onClick={() => placeRequest(active, confirmQuote)} className="rounded bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600">
                리퀘스트 예약 진행
              </button>
            </div>
          </div>
        </div>
      )}

      {contractOpen && active && (
        <GroupContractModal
          inq={active}
          rates={rates}
          onClose={() => setContractOpen(false)}
          onPay={active.status === 'Accepted' ? () => payWithContract(active) : undefined}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-lg bg-slate-800 px-5 py-3 text-[13px] text-white shadow-xl">{toast}</div>
      )}
    </div>
  );
}

// ─────────────────────────── 목록 ───────────────────────────
function ListView({
  inquiries,
  rates,
  onOpen,
  showEllis,
  setShowEllis,
  setRates,
  showInternal,
  setShowInternal,
}: {
  inquiries: GroupInquiry[];
  rates: Record<string, CountryRate>;
  onOpen: (id: string) => void;
  showEllis: boolean;
  setShowEllis: (v: boolean) => void;
  setRates: (updater: (r: Record<string, CountryRate>) => Record<string, CountryRate>) => void;
  showInternal: boolean;
  setShowInternal: (v: boolean) => void;
}) {
  const now = useNow();
  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <th className="px-4 py-2.5 font-semibold">접수번호</th>
              <th className="px-4 py-2.5 font-semibold">목적지 / 성격</th>
              <th className="px-4 py-2.5 font-semibold">기간</th>
              <th className="px-4 py-2.5 font-semibold">룸 / 인원</th>
              <th className="px-4 py-2.5 text-right font-semibold">예산</th>
              <th className="px-4 py-2.5 font-semibold">회신 기한</th>
              <th className="px-4 py-2.5 text-center font-semibold">견적</th>
              <th className="px-4 py-2.5 text-center font-semibold">상태</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.map((i) => (
              <tr key={i.id} onClick={() => onOpen(i.id)} className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-brand-50/40">
                <td className="px-4 py-3 font-mono text-[12px] text-slate-700">{i.ref}</td>
                <td className="px-4 py-3 text-slate-700">
                  {i.country} · {i.region}
                  {i.hotelName && <span className="text-slate-400"> · {i.hotelName}</span>}
                  <div className="text-[11px] text-slate-400">
                    {i.groupType ?? '단체'} · {i.scope === 'rooms_plus' ? '객실+부대' : '객실만'}
                    {i.anchorName && <> · 📍 차량 {i.anchorRadiusMin}분</>}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {fmtDate(i.checkIn)} ~ {fmtDate(i.checkOut)}
                  <span className="text-slate-400"> ({i.nights}박)</span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {roomsTotal(i.rooms)}실 · {i.guests}명
                </td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {i.budgetPerRoomNight ? (
                    <>
                      {fmtMoney(i.budgetPerRoomNight, i.currency)}
                      <span className="text-slate-400"> /실·박{i.budgetMode === 'byDate' ? '~' : ''}</span>
                      <div className="text-[10px] text-slate-400">총 {fmtMoney(i.budgetTotal ?? 0, i.currency)}</div>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {i.quoteDeadline ? (
                    <>
                      <div className="text-[12px]">{fmtDateTime(i.quoteDeadline)}</div>
                      {['Submitted', 'Sourcing', 'Quoted'].includes(effStatus(i, now)) ? (
                        <RemainBadge deadline={i.quoteDeadline} now={now} />
                      ) : (
                        <span className="text-[11px] text-slate-400">회신 종료</span>
                      )}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 text-center text-slate-600">{i.quotes.length || '—'}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[effStatus(i, now)]}`}>{STATUS_LABEL[effStatus(i, now)]}</span>
                </td>
              </tr>
            ))}
            {inquiries.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                  아직 단체 문의가 없습니다. 우측 상단 <b>＋ 새 단체 문의</b>로 접수하세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ELLIS 내부 — 국가별 요금 구조 (고객 비노출) */}
      <div className="mt-5 rounded-lg border border-slate-200 bg-white">
        <button type="button" onClick={() => setShowEllis(!showEllis)} className="flex w-full items-center justify-between px-4 py-3 text-left">
          <span className="flex items-center gap-2 text-[13px] font-bold text-slate-700">
            🔧 ELLIS 내부 — 국가별 요금 구조
            <EnhBadge note="국가별 net(마크업) / 단가(커미션) 설정. 고객가·마진 자동 산출 — 고객 비노출." />
          </span>
          <span className="text-slate-400">{showEllis ? '접기 ▲' : '펼치기 ▼'}</span>
        </button>
        {showEllis && (
          <div className="border-t border-slate-100 px-4 py-4">
            <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
              국가마다 호텔 요금 구조가 다릅니다 — <b>net 국가</b>(호텔 net 제공 → 우리 <b>마크업</b>을 얹어 고객가) vs{' '}
              <b>단가+커미션 국가</b>(호텔이 단가 제시·커미션 지급 → 고객가=단가, 우리 마진=커미션). 값 변경 시 모든 견적의 고객가·마진이 즉시 재계산됩니다.{' '}
              <b>고객·리스트업 어디에도 net·단가·마크업률·커미션율은 노출되지 않습니다.</b>
            </p>
            <div className="overflow-x-auto rounded border border-slate-200">
              <table className="w-full min-w-[560px] text-[12px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                    <th className="px-3 py-2 font-semibold">국가</th>
                    <th className="px-3 py-2 font-semibold">요금 구조</th>
                    <th className="px-3 py-2 font-semibold">값</th>
                    <th className="px-3 py-2 font-semibold">예시 (회수 100,000 → 고객가)</th>
                  </tr>
                </thead>
                <tbody>
                  {RATE_COUNTRIES.map((c) => {
                    const r = rates[c] ?? { mode: 'net', value: 12 };
                    const ex = priceQuote(100000, r);
                    return (
                      <tr key={c} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2 text-slate-700">{c}</td>
                        <td className="px-3 py-2">
                          <select
                            value={r.mode}
                            onChange={(e) => setRates((prev) => ({ ...prev, [c]: { ...r, mode: e.target.value as CountryRate['mode'] } }))}
                            className="rounded border border-slate-300 px-2 py-1 text-[12px] focus:border-brand-400 focus:outline-none"
                          >
                            <option value="net">net + 마크업</option>
                            <option value="commission">단가 + 커미션</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            value={r.value}
                            onChange={(e) => setRates((prev) => ({ ...prev, [c]: { ...r, value: Math.max(0, Number(e.target.value) || 0) } }))}
                            className="w-20 rounded border border-slate-300 px-1.5 py-1 text-[12px] focus:border-brand-400 focus:outline-none"
                          />
                          <span className="ml-1 text-slate-400">%</span>
                        </td>
                        <td className="px-3 py-2 text-slate-500">
                          {ex.basisLabel} → <b className="text-brand-600">{fmtMoney(ex.sell, 'JPY')}</b> · 마진 {fmtMoney(ex.margin, 'JPY')} ({ex.marginLabel})
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-[12px] text-slate-600">
              <input type="checkbox" checked={showInternal} onChange={(e) => setShowInternal(e.target.checked)} />
              견적에 회수금액·마진 표시(내부)
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── 새 문의 작성 ───────────────────────────
function NewInquiryForm({
  tree,
  rates,
  onCancel,
  onSubmit,
}: {
  tree: Map<string, Map<string, { id: string; name: string; currency: string }[]>>;
  rates: Record<string, CountryRate>;
  onCancel: () => void;
  onSubmit: (inq: GroupInquiry) => void;
}) {
  const countries = useMemo(() => Array.from(tree.keys()), [tree]);
  const [country, setCountry] = useState(countries[0] ?? 'Japan');
  const regions = useMemo(() => Array.from(tree.get(country)?.keys() ?? []), [tree, country]);
  const [region, setRegion] = useState(regions[0] ?? '');
  const hotels = useMemo(() => tree.get(country)?.get(region) ?? [], [tree, country, region]);
  const [hotelId, setHotelId] = useState('');

  const [preferredHotel, setPreferredHotel] = useState('');
  const [preferredStar, setPreferredStar] = useState<number>(0);
  const [anchorName, setAnchorName] = useState('');
  const [anchorRadiusMin, setAnchorRadiusMin] = useState<number>(30);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [rooms, setRooms] = useState<RoomReq[]>([{ roomType: 'Twin', count: MIN_GROUP_ROOMS }]);
  const [mealPlan, setMealPlan] = useState('Room Only');
  const [guests, setGuests] = useState<number>(2);
  const [nationality, setNationality] = useState('');
  const [groupType, setGroupType] = useState('');
  const [scope, setScope] = useState<'rooms' | 'rooms_plus'>('rooms');
  const [ancillary, setAncillary] = useState<Ancillary>({ ...EMPTY_ANCILLARY });
  const [ancillaryNote, setAncillaryNote] = useState('');
  const [holdRequired, setHoldRequired] = useState(false);
  const [goldenKey, setGoldenKey] = useState('');
  const [comparisonAck, setComparisonAck] = useState(false);
  const [budgetMode, setBudgetMode] = useState<'flat' | 'byDate'>('flat');
  const [budgetPerNight, setBudgetPerNight] = useState<number | ''>('');
  const [budgetByDate, setBudgetByDate] = useState<DateBudget[]>([]);
  const [notes, setNotes] = useState('');
  /** 회신 기한 — 호텔이 이 시각까지 견적 회신. 기본 72시간 뒤 */
  const [deadline, setDeadline] = useState(() => toLocalInput(new Date(Date.now() + 72 * 3600000)));
  const deadlinePresets = [
    { label: '24시간', h: 24 },
    { label: '48시간', h: 48 },
    { label: '72시간', h: 72 },
    { label: '1주일', h: 168 },
  ];
  const deadlineMs = deadline ? new Date(deadline).getTime() : NaN;
  const deadlineTooSoon = !Number.isFinite(deadlineMs) || deadlineMs < Date.now() + 3600000; // 최소 1시간 뒤
  const deadlineAfterCheckIn = !!checkIn && Number.isFinite(deadlineMs) && deadlineMs >= new Date(`${checkIn}T00:00`).getTime();

  const currency = hotels[0]?.currency ?? (country === 'Japan' ? 'JPY' : 'KRW');
  const rate = rateFor(country, rates);
  const n = checkIn && checkOut ? calcNights(checkIn, checkOut) : 0;
  const nightsList = useMemo(() => nightDates(checkIn, checkOut), [checkIn, checkOut]);

  // 날짜별 예산 리스트를 박 목록에 동기화 (기존 값 보존)
  useEffect(() => {
    if (budgetMode !== 'byDate') return;
    setBudgetByDate((prev) => {
      const byDate = new Map(prev.map((d) => [d.date, d.perRoomNight]));
      const flat = budgetPerNight === '' ? 0 : Number(budgetPerNight);
      return nightsList.map((d) => ({ date: d, perRoomNight: byDate.get(d) ?? flat }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetMode, nightsList.join(',')]);

  const budgetTotalCalc =
    budgetMode === 'byDate'
      ? budgetByDate.reduce((s, d) => s + (Number(d.perRoomNight) || 0), 0) * roomsTotal(rooms)
      : budgetPerNight === '' ? 0 : Number(budgetPerNight) * roomsTotal(rooms) * (n || 0);

  const underGroup = roomsTotal(rooms) < MIN_GROUP_ROOMS; // 그룹 예약 = 5실 이상 (4실 이하는 즉시 예약)
  const valid =
    region && checkIn && checkOut && n > 0 && !underGroup && guests > 0 && nationality.trim() && groupType.trim() && budgetTotalCalc > 0 &&
    comparisonAck && goldenKey.trim() && !deadlineTooSoon && !deadlineAfterCheckIn;

  function changeCountry(c: string) {
    setCountry(c);
    const firstRegion = Array.from(tree.get(c)?.keys() ?? [])[0] ?? '';
    setRegion(firstRegion);
    setHotelId('');
  }

  function submit() {
    if (!valid) return;
    const now = new Date().toISOString();
    const hotel = hotels.find((h) => h.id === hotelId);
    const base: Pick<GroupInquiry, 'budgetMode' | 'budgetPerRoomNight' | 'budgetByDate' | 'rooms' | 'nights'> = {
      budgetMode,
      budgetPerRoomNight: budgetPerNight === '' ? undefined : Number(budgetPerNight),
      budgetByDate: budgetMode === 'byDate' ? budgetByDate : undefined,
      rooms: rooms.filter((r) => r.count > 0),
      nights: n,
    };
    const avgPerNight =
      budgetMode === 'byDate' && budgetByDate.length
        ? Math.round(budgetByDate.reduce((s, d) => s + d.perRoomNight, 0) / budgetByDate.length)
        : budgetPerNight === '' ? undefined : Number(budgetPerNight);
    const inq: GroupInquiry = {
      id: `gi-${Date.now()}`,
      ref: nextInquiryRef(),
      status: 'Submitted',
      country,
      region,
      hotelId: hotelId || undefined,
      hotelName: hotel?.name,
      preferredHotel: preferredHotel.trim() || undefined,
      preferredStar: preferredStar || undefined,
      anchorName: anchorName.trim() || undefined,
      anchorRadiusMin: anchorName.trim() ? anchorRadiusMin : undefined,
      checkIn,
      checkOut,
      nights: n,
      rooms: rooms.filter((r) => r.count > 0),
      mealPlan,
      guests,
      nationality: nationality.trim() || undefined,
      groupType: groupType.trim() || undefined,
      scope,
      ancillary: scope === 'rooms_plus' ? ancillary : undefined,
      ancillaryNote: scope === 'rooms_plus' && ancillaryNote.trim() ? ancillaryNote.trim() : undefined,
      holdRequired,
      goldenKey: goldenKey.trim(),
      comparisonAck,
      currency,
      budgetMode,
      budgetPerRoomNight: avgPerNight,
      budgetByDate: budgetMode === 'byDate' ? budgetByDate : undefined,
      budgetTotal: budgetTotalOf(base),
      notes: notes.trim() || undefined,
      createdAt: now,
      submittedAt: now,
      quoteDeadline: new Date(deadline).toISOString(),
      quotes: [],
    };
    onSubmit(inq);
  }

  const fieldCls = 'w-full rounded border border-slate-300 px-2.5 py-1.5 text-[13px] focus:border-brand-400 focus:outline-none';
  const labelCls = 'mb-1 block text-[12px] font-semibold text-slate-600';

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-base font-bold text-slate-800">새 단체 문의 작성</h2>

        <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-2">
          <div>
        {/* 목적지 */}
        <div className="mb-2">
          <span className={labelCls}>목적지 <span className="font-normal text-slate-400">(국가 → 지역 → 호텔 · 호텔은 선택)</span></span>
          <div className="grid grid-cols-3 gap-3">
            <select value={country} onChange={(e) => changeCountry(e.target.value)} className={fieldCls}>
              {countries.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
            <select value={region} onChange={(e) => { setRegion(e.target.value); setHotelId(''); }} className={fieldCls}>
              {regions.map((r) => (<option key={r} value={r}>{r}</option>))}
            </select>
            <select value={hotelId} onChange={(e) => setHotelId(e.target.value)} className={fieldCls}>
              <option value="">지역 전체 (호텔 미지정)</option>
              {hotels.map((h) => (<option key={h.id} value={h.id}>{h.name}</option>))}
            </select>
          </div>
          <p className="mt-1 rounded bg-slate-50 px-2 py-1 text-[11px] text-slate-500">
            💱 <b>{country}</b> — {rateBasisNote(rate)} <span className="text-slate-400">통화 {currency}</span>
          </p>
        </div>

        {/* 희망 호텔·성급 */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <span className={labelCls}>희망 호텔 <span className="font-normal text-slate-400">(리스트 외 자유 기재 — 선택)</span></span>
            <input value={preferredHotel} onChange={(e) => setPreferredHotel(e.target.value)} placeholder="예: 역세권 · 특정 체인 선호" className={fieldCls} />
          </div>
          <div>
            <span className={labelCls}>희망 성급</span>
            <select value={preferredStar} onChange={(e) => setPreferredStar(Number(e.target.value))} className={fieldCls}>
              <option value={0}>무관</option>
              {[3, 4, 5].map((s) => (<option key={s} value={s}>{s}성급 이상</option>))}
            </select>
          </div>
        </div>

        {/* 앵커 */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <span className={labelCls}>기준점(앵커) <span className="font-normal text-slate-400">(경기장·행사장 등 — 선택)</span></span>
            <input value={anchorName} onChange={(e) => setAnchorName(e.target.value)} placeholder="예: Sakaimachi Urban Sports Park" className={fieldCls} />
          </div>
          <div>
            <span className={labelCls}>거리 제약 (차량 분)</span>
            <input type="number" value={anchorRadiusMin} min={0} onChange={(e) => setAnchorRadiusMin(Math.max(0, Number(e.target.value) || 0))} className={fieldCls} />
          </div>
        </div>

        {/* 기간 */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div>
            <span className={labelCls}>체크인</span>
            <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={fieldCls} />
          </div>
          <div>
            <span className={labelCls}>체크아웃</span>
            <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className={fieldCls} />
          </div>
          <div>
            <span className={labelCls}>박수</span>
            <input value={n ? `${n}박` : '—'} disabled className={`${fieldCls} bg-slate-50 text-slate-400`} />
          </div>
        </div>

        {/* 룸 요건 */}
        <div className="mb-4">
          <span className={labelCls}>룸 요건 <span className="font-normal text-slate-400">(룸타입 + 수량)</span></span>
          <div className="space-y-2">
            {rooms.map((r, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select value={r.roomType} onChange={(e) => setRooms((prev) => prev.map((x, i) => (i === idx ? { ...x, roomType: e.target.value } : x)))} className="w-40 rounded border border-slate-300 px-2 py-1.5 text-[13px] focus:border-brand-400 focus:outline-none">
                  {ROOM_TYPES.map((rt) => (<option key={rt} value={rt}>{rt}</option>))}
                </select>
                <input type="number" min={0} value={r.count} onChange={(e) => setRooms((prev) => prev.map((x, i) => (i === idx ? { ...x, count: Math.max(0, Number(e.target.value) || 0) } : x)))} className="w-24 rounded border border-slate-300 px-2 py-1.5 text-[13px] focus:border-brand-400 focus:outline-none" />
                <span className="text-[12px] text-slate-400">실</span>
                {rooms.length > 1 && (<button type="button" onClick={() => setRooms((prev) => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-500">✕</button>)}
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <button type="button" onClick={() => setRooms((prev) => [...prev, { roomType: 'Single', count: 1 }])} className="text-[12px] font-semibold text-brand-600 hover:underline">＋ 룸타입 추가</button>
            <span className={`text-[12px] ${underGroup ? 'font-semibold text-rose-600' : 'text-slate-400'}`}>
              합계 {roomsTotal(rooms)}실{underGroup ? ` — 단체(그룹) 예약은 ${MIN_GROUP_ROOMS}실 이상입니다. ${MIN_GROUP_ROOMS - 1}실 이하는 Create Booking에서 즉시 예약하세요.` : ` · 그룹 기준 ${MIN_GROUP_ROOMS}실 이상 충족`}
            </span>
          </div>
        </div>
          </div>{/* /좌측 */}

          <div>{/* 우측 */}
        {/* 식사·인원·국적 */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div>
            <span className={labelCls}>식사조건</span>
            <select value={mealPlan} onChange={(e) => setMealPlan(e.target.value)} className={fieldCls}>
              {MEAL_PLANS.map((m) => (<option key={m} value={m}>{m}</option>))}
            </select>
          </div>
          <div>
            <span className={labelCls}>인원(총)</span>
            <input type="number" min={1} value={guests} onChange={(e) => setGuests(Math.max(1, Number(e.target.value) || 1))} className={fieldCls} />
          </div>
          <div>
            <span className={labelCls}>국적 <span className="text-brand-500">*</span></span>
            <input value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="예: 중국" className={fieldCls} />
          </div>
        </div>

        {/* 단체 성격 · 담당 범위 */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div>
            <span className={labelCls}>단체 성격 <span className="text-brand-500">*</span></span>
            <input value={groupType} onChange={(e) => setGroupType(e.target.value)} placeholder="예: 스포츠팀 · 기업연수 · 인센티브 · MICE" className={fieldCls} />
          </div>
          <div className="col-span-2">
            <span className={labelCls}>담당 범위</span>
            <div className="flex gap-4 pt-1.5 text-[13px] text-slate-700">
              <label className="flex cursor-pointer items-center gap-1.5"><input type="radio" checked={scope === 'rooms'} onChange={() => setScope('rooms')} /> 객실만</label>
              <label className="flex cursor-pointer items-center gap-1.5"><input type="radio" checked={scope === 'rooms_plus'} onChange={() => setScope('rooms_plus')} /> 객실 + 부대서비스</label>
            </div>
          </div>
        </div>

        {/* 부대 서비스 (범위=객실+부대일 때) */}
        {scope === 'rooms_plus' && (
          <div className="mb-4 rounded border border-slate-200 bg-slate-50 px-3 py-3">
            <span className={labelCls}>부대 서비스 요청</span>
            <div className="flex flex-wrap gap-4 text-[13px] text-slate-700">
              {ANCILLARY_KEYS.map((k) => (
                <label key={k} className="flex cursor-pointer items-center gap-1.5">
                  <input type="checkbox" checked={ancillary[k]} onChange={(e) => setAncillary((prev) => ({ ...prev, [k]: e.target.checked }))} /> {ANCILLARY_LABEL[k]}
                </label>
              ))}
            </div>
            <input value={ancillaryNote} onChange={(e) => setAncillaryNote(e.target.value)} placeholder="부대 서비스 상세 (예: 세미나실 1일 · 조식 2·3일차만)" className={`${fieldCls} mt-2`} />
          </div>
        )}

        {/* 예산 (1실·1박 기준 · 날짜별 옵션) */}
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-slate-600">예산 <span className="text-brand-500">*</span> <span className="font-normal text-slate-400">(1실·1박 기준 · {currency})</span></span>
            <div className="flex gap-1 text-[11px]">
              <button type="button" onClick={() => setBudgetMode('flat')} className={`rounded px-2 py-0.5 ${budgetMode === 'flat' ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'}`}>균일</button>
              <button type="button" onClick={() => setBudgetMode('byDate')} className={`rounded px-2 py-0.5 ${budgetMode === 'byDate' ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'}`}>날짜별</button>
            </div>
          </div>
          {budgetMode === 'flat' ? (
            <>
              <input type="number" min={0} value={budgetPerNight} onChange={(e) => setBudgetPerNight(e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0))} placeholder="예: 9100" className={fieldCls} />
              <p className="mt-1 text-[11px] text-slate-400">
                {budgetTotalCalc > 0 ? `전체 환산: ${fmtMoney(budgetTotalCalc, currency)} (${roomsTotal(rooms)}실 × ${n}박)` : '1실·1박 금액 → 실수·박수로 총액 자동 환산'}
              </p>
            </>
          ) : nightsList.length === 0 ? (
            <p className="text-[12px] text-amber-600">체크인·체크아웃을 먼저 입력하세요.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {budgetByDate.map((d, idx) => (
                  <label key={d.date} className="text-[11px] text-slate-500">
                    {d.date.slice(5)}
                    <input type="number" min={0} value={d.perRoomNight} onChange={(e) => setBudgetByDate((prev) => prev.map((x, i) => (i === idx ? { ...x, perRoomNight: Math.max(0, Number(e.target.value) || 0) } : x)))} className="mt-0.5 w-full rounded border border-slate-300 px-1.5 py-1 text-[12px] focus:border-brand-400 focus:outline-none" />
                  </label>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">{budgetTotalCalc > 0 ? `전체 환산: ${fmtMoney(budgetTotalCalc, currency)} (야간 합 × ${roomsTotal(rooms)}실)` : '날짜별 1실·1박 금액 입력'}</p>
            </>
          )}
        </div>

        {/* Golden Key · 홀드 */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <span className={labelCls}>Golden Key <span className="text-brand-500">*</span> <span className="font-normal text-slate-400">(확정에 가장 중요한 1가지)</span></span>
            <input value={goldenKey} onChange={(e) => setGoldenKey(e.target.value)} placeholder="예: 경기장 30분 이내 + 동일 호텔 10실 확보" className={fieldCls} />
          </div>
          <div>
            <span className={labelCls}>객실 홀드</span>
            <label className="flex cursor-pointer items-center gap-1.5 pt-2 text-[13px] text-slate-700">
              <input type="checkbox" checked={holdRequired} onChange={(e) => setHoldRequired(e.target.checked)} /> 견적 시 홀드 필요
            </label>
          </div>
        </div>

        {/* 회신 기한 — 호텔은 이 시각까지 견적 회신 */}
        <div className="mb-4 rounded border border-brand-200 bg-brand-50/40 px-3 py-3">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-slate-600">
              회신 기한 <span className="text-brand-500">*</span> <span className="font-normal text-slate-400">(호텔은 이 시각까지 견적 회신)</span>
            </span>
            <div className="flex gap-1 text-[11px]">
              {deadlinePresets.map((p) => (
                <button
                  key={p.h}
                  type="button"
                  onClick={() => setDeadline(toLocalInput(new Date(Date.now() + p.h * 3600000)))}
                  className="rounded border border-slate-300 bg-white px-2 py-0.5 text-slate-600 hover:border-brand-400 hover:text-brand-600"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={fieldCls} />
          <p className={`mt-1 text-[11px] ${deadlineTooSoon || deadlineAfterCheckIn ? 'text-rose-600' : 'text-slate-400'}`}>
            {deadlineTooSoon
              ? '회신 기한은 지금부터 최소 1시간 이후로 지정하세요.'
              : deadlineAfterCheckIn
                ? '회신 기한은 체크인 이전이어야 합니다.'
                : `호텔 견적 마감: ${fmtDateTime(new Date(deadline).toISOString())} — 기한이 지나면 추가 회신을 받지 않습니다.`}
          </p>
        </div>

        {/* 비고 */}
        <div className="mb-4">
          <span className={labelCls}>비고 <span className="font-normal text-slate-400">(특수요건 — 선택)</span></span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="예: 선수단 단체 이동 — 동일 호텔 우선" className={fieldCls} />
        </div>
          </div>{/* /우측 */}
        </div>{/* /2단 그리드 */}

        {/* 비교견적 아님 동의 */}
        <label className="mb-2 flex cursor-pointer items-start gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-slate-700">
          <input type="checkbox" checked={comparisonAck} onChange={(e) => setComparisonAck(e.target.checked)} className="mt-0.5" />
          <span>본 문의는 <b>비교견적용이 아니며</b> 실제 예약을 전제로 함을 확인합니다. <span className="text-brand-500">*</span></span>
        </label>

        <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          {!valid && <span className="mr-auto text-[12px] text-amber-600">목적지·기간·룸({MIN_GROUP_ROOMS}실 이상)·인원·국적·단체 성격·예산·Golden Key·회신 기한·비교견적 동의를 확인하세요.</span>}
          <button type="button" onClick={onCancel} className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">취소</button>
          <button type="button" onClick={submit} disabled={!valid} className="rounded bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40">문의 제출 (메일 접수)</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── 상세 ───────────────────────────
const todayStr = () => new Date().toISOString().slice(0, 10);

function DetailView({
  inq,
  rates,
  showInternal,
  onSource,
  onSelectQuote,
  onOpenBookings,
  onSimulateHotel,
  onOpenContract,
  onSellerCancel,
}: {
  inq: GroupInquiry;
  rates: Record<string, CountryRate>;
  showInternal: boolean;
  onSource: () => void;
  onSelectQuote: (q: HotelQuote) => void;
  onOpenBookings?: () => void;
  onSimulateHotel: (decision: 'confirmed' | 'rejected') => void;
  onOpenContract: () => void;
  onSellerCancel: () => void;
}) {
  const rate = rateFor(inq.country, rates);
  const now = useNow();
  const remain = remainingInfo(inq.quoteDeadline, now);
  const eff = effStatus(inq, now);
  const collecting = ['Submitted', 'Sourcing', 'Quoted'].includes(inq.status); // 호텔 회신 수집 중
  const selected = inq.quotes.find((q) => q.id === inq.selectedQuoteId) ?? null;
  const extras = activeAncillary(inq.ancillary);
  const hasChannel = inq.quotes.some((q) => q.source === 'channel');
  const info = (label: string, value: ReactNode) => (
    <div>
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-[13px] text-slate-700">{value}</div>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-slate-700">{inq.ref}</span>
            <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[eff]}`}>{STATUS_LABEL[eff]}</span>
            {inq.holdRequired && <span className="rounded bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">객실 홀드 요청</span>}
          </div>
          {inq.quoteDeadline && collecting && (
            <span className="flex items-center gap-2 text-[12px] text-slate-500">
              회신 기한 {fmtDateTime(inq.quoteDeadline)}
              <RemainBadge deadline={inq.quoteDeadline} now={now} />
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {info('목적지', `${inq.country} · ${inq.region}${inq.hotelName ? ` · ${inq.hotelName}` : ''}`)}
          {info('희망 호텔·성급', `${inq.preferredHotel ?? '—'}${inq.preferredStar ? ` · ${inq.preferredStar}성↑` : ''}`)}
          {info('기준점', inq.anchorName ? `${inq.anchorName.split('(')[0].trim()} · 차량 ${inq.anchorRadiusMin}분` : '—')}
          {info('기간', `${fmtDate(inq.checkIn)} ~ ${fmtDate(inq.checkOut)} (${inq.nights}박)`)}
          {info('룸 / 식사', `${roomsSummary(inq.rooms)} (${roomsTotal(inq.rooms)}실) · ${inq.mealPlan}`)}
          {info('인원 / 국적', `${inq.guests}명${inq.nationality ? ` · ${inq.nationality}` : ''}`)}
          {info('단체 성격 / 범위', `${inq.groupType ?? '—'} · ${inq.scope === 'rooms_plus' ? '객실+부대' : '객실만'}`)}
          {info('부대 서비스', extras.length ? `${extras.join(', ')}${inq.ancillaryNote ? ` · ${inq.ancillaryNote}` : ''}` : '—')}
          {info('예산', inq.budgetPerRoomNight ? `${fmtMoney(inq.budgetPerRoomNight, inq.currency)} /실·박${inq.budgetMode === 'byDate' ? '(날짜별 평균)' : ''} · 총 ${fmtMoney(inq.budgetTotal ?? 0, inq.currency)}` : '—')}
          {info('Golden Key', inq.goldenKey ?? '—')}
          {info('비고', inq.notes ?? '—')}
          {info('회신 기한', inq.quoteDeadline ? `${fmtDateTime(inq.quoteDeadline)}${collecting && remain ? ` · ${remain.label}` : ''}` : '—')}
          {info('요금 구조', `${inq.country} · ${rate.mode === 'commission' ? '단가+커미션' : 'net+마크업'}`)}
        </div>
      </div>

      {(inq.status === 'Submitted' || inq.status === 'Sourcing') && inq.quotes.length === 0 && (
        <div className="mt-5 rounded-lg border border-dashed border-brand-300 bg-brand-50/50 p-6 text-center">
          <p className="text-[13px] text-slate-600">
            <b>{cityEnOf(inq.region)}</b>의 <b>기존 계약 호텔</b>에 <b>역경매(RFP)</b>가 배포되었습니다. 호텔이 <b>벤더 콘솔</b>에서 견적을 내면 여기에 <b>자동으로</b> 표시됩니다(실연동).
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            콘솔을 쓰지 않는 호텔(VN 등)은 이메일·SCM 중개로 회수합니다. {rateBasisNote(rate)}{' '}
            <a href="/Console/" target="_blank" rel="noreferrer" className="text-brand-600 underline">벤더 콘솔 열기 ↗</a> <span className="text-slate-300">(라이브 · 같은 브라우저)</span>
          </p>
          {inq.quoteDeadline && (
            <p className="mt-3 flex items-center justify-center gap-2 text-[12px] text-slate-600">
              호텔 회신 기한 <b>{fmtDateTime(inq.quoteDeadline)}</b> <RemainBadge deadline={inq.quoteDeadline} now={now} />
            </p>
          )}
          {remain?.expired ? (
            <p className="mt-4 text-[13px] font-semibold text-slate-500">회신 기한이 지나 더 이상 견적을 받지 않습니다 — 받은 견적이 없습니다.</p>
          ) : (
            <button type="button" onClick={onSource} className="mt-4 rounded bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600">이메일·SCM 중개 견적 회수 (시뮬레이트)</button>
          )}
        </div>
      )}

      {inq.quotes.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-700">
              회수 견적 {inq.quotes.length}건 <span className="text-[12px] font-normal text-slate-400">— 받은 견적은 전부 표시 · 선택은 고객사</span>
              {inq.status === 'Quoted' && inq.quoteDeadline && (
                remain?.expired ? (
                  <span className="text-[12px] font-normal text-slate-400">· 회신 마감 · 받은 견적 중에서 선택하세요</span>
                ) : (
                  <>
                    <span className="text-[12px] font-normal text-slate-400">· 회신 마감까지 추가 견적이 도착할 수 있습니다</span>
                    <RemainBadge deadline={inq.quoteDeadline} now={now} />
                  </>
                )
              )}
            </h3>
            <div className="flex items-center gap-3">
              {inq.status === 'Quoted' && !hasChannel && !remain?.expired && (
                <button type="button" onClick={onSource} className="text-[12px] font-semibold text-brand-600 hover:underline">＋ 이메일·SCM 중개 견적 회수 (시뮬레이트)</button>
              )}
              {showInternal && <span className="text-[11px] text-amber-600">내부 보기: {rate.mode === 'commission' ? '단가·커미션' : 'net·마진'} 표시 중</span>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {inq.quotes.map((q) => {
              const pr = priceQuote(q.amount, rate, q.currency);
              const overBudget = inq.budgetTotal ? pr.sell > inq.budgetTotal : false;
              const isSelected = q.id === inq.selectedQuoteId;
              const dimmed = inq.status !== 'Quoted' && !isSelected;
              const lapsed = q.validUntil < todayStr();
              return (
                <div key={q.id} className={`rounded-lg border bg-white p-4 ${isSelected ? 'border-brand-500 ring-1 ring-brand-300' : 'border-slate-200'} ${dimmed ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-bold text-slate-800">{q.hotelName}</span>
                        {q.star && <span className="text-[11px] text-amber-500">{'★'.repeat(Math.round(q.star))}</span>}
                        <span className={`rounded px-1.5 py-px text-[10px] font-semibold ${q.source === 'console' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {q.source === 'console' ? '벤더 콘솔 직접 제출' : '이메일·SCM 중개'}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[12px] text-slate-500">
                        📍 {q.location}
                        {q.distanceKm != null && <span> · 요청 지역에서 약 {q.distanceKm}km</span>}
                        {q.distanceMin != null && <span> · 앵커까지 차량 {q.distanceMin}분</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-extrabold ${overBudget ? 'text-slate-700' : 'text-brand-600'}`}>{fmtMoney(pr.sell, q.currency)}</div>
                      <div className="text-[10px] text-slate-400">고객가 (총액)</div>
                      {inq.budgetTotal != null && (
                        <div className={`text-[10px] font-semibold ${overBudget ? 'text-red-500' : 'text-emerald-600'}`}>
                          {overBudget ? `예산 초과 +${fmtMoney(pr.sell - inq.budgetTotal, q.currency)}` : `예산 이내 −${fmtMoney(inq.budgetTotal - pr.sell, q.currency)}`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 space-y-0.5 border-t border-slate-100 pt-2 text-[12px] text-slate-600">
                    <div>{q.condition}{q.availability ? <span className="text-slate-400"> · {q.availability}</span> : null}</div>
                    <div className={q.cancelDeadline ? 'text-slate-500' : 'font-semibold text-rose-600'}>취소: {cancelLabel(q.cancelDeadline)}</div>
                    <div className="text-slate-500">결제: 호텔 수락 후 {q.paymentDeadlineHours}시간 이내 (미결제 시 자동취소) · 견적 유효 ~{q.validUntil}</div>
                    {q.note && <div className="text-slate-400">메모: {q.note}</div>}
                    {showInternal && (
                      <div className="mt-1 rounded bg-slate-50 px-2 py-1 text-[11px] text-slate-500">내부: {pr.basisLabel} {fmtMoney(q.amount, q.currency)} · 마진 {fmtMoney(pr.margin, q.currency)} ({pr.marginLabel})</div>
                    )}
                  </div>
                  {inq.status === 'Quoted' &&
                    (lapsed ? (
                      <div className="mt-3 rounded bg-slate-100 py-1.5 text-center text-[12px] text-slate-400">견적 유효기간 경과 — 선택 불가</div>
                    ) : (
                      <button type="button" onClick={() => onSelectQuote(q)} className="mt-3 w-full rounded bg-brand-500 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-600">이 견적으로 예약 →</button>
                    ))}
                  {isSelected && <div className="mt-3 rounded bg-brand-50 py-1.5 text-center text-[12px] font-semibold text-brand-600">선택됨</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selected && ['Requested', 'Accepted', 'Confirmed', 'Cancelled'].includes(inq.status) && (() => {
        const pr = priceQuote(selected.amount, rate, selected.currency);
        const hotelReceive = pr.sell - pr.margin;
        const tone =
          inq.status === 'Requested' ? 'border-blue-200 bg-blue-50'
            : inq.status === 'Accepted' ? 'border-amber-200 bg-amber-50'
              : inq.status === 'Confirmed' ? 'border-emerald-200 bg-emerald-50'
                : 'border-slate-200 bg-slate-50';
        const payRemain = inq.paymentDueAt ? remainingInfo(inq.paymentDueAt, now) : null;
        const cancelLocked = cancelClosed(selected.cancelDeadline, now);
        return (
          <div className={`mt-5 rounded-lg border p-5 ${tone}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[13px] text-slate-700">
                {inq.status === 'Requested' && (
                  <><b>{selected.hotelName}</b> 리퀘스트 예약 생성됨 (<span className="font-mono">{inq.ref}</span>) — <b>호텔 응답 대기</b>
                    {selected.source === 'console' && <span className="ml-1 text-[11px] text-slate-500">· 호텔이 벤더 콘솔에서 컨펌/거절하면 자동 반영</span>}</>
                )}
                {inq.status === 'Accepted' && (
                  <span className="flex flex-wrap items-center gap-2">
                    🏨 <b>{selected.hotelName}</b> 수락 — <b>계약 조건 동의 후 결제</b>하면 확정됩니다. 결제 마감 <b>{fmtDateTime(inq.paymentDueAt)}</b>
                    {payRemain && <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${REMAIN_STYLE[payRemain.tone]}`}>⏱ {payRemain.expired ? '마감' : payRemain.label}</span>}
                  </span>
                )}
                {inq.status === 'Confirmed' && (
                  <>✅ <b>{selected.hotelName}</b> 결제 완료 · 예약 확정 <span className="text-[11px] text-slate-500">({fmtDateTime(inq.paidAt)} · 확인서 동의 {fmtDateTime(inq.contractAcceptedAt)})</span></>
                )}
                {inq.status === 'Cancelled' && (
                  <>✖ 문의 취소 — <b>{inq.cancelReason ? CANCEL_REASON_LABEL[inq.cancelReason] : '취소'}</b>{inq.cancelledAt ? <span className="text-[11px] text-slate-500"> ({fmtDateTime(inq.cancelledAt)})</span> : null}</>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {onOpenBookings && inq.status !== 'Cancelled' && (
                  <button type="button" onClick={onOpenBookings} className="rounded border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">Bookings에서 보기 →</button>
                )}
                {inq.status === 'Requested' && selected.source === 'channel' && (
                  <>
                    <button type="button" onClick={() => onSimulateHotel('rejected')} className="rounded border border-rose-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-rose-600 hover:bg-rose-50">호텔 거절 (시뮬레이트)</button>
                    <button type="button" onClick={() => onSimulateHotel('confirmed')} className="rounded border border-blue-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-blue-600 hover:bg-blue-100">호텔 수락 (시뮬레이트)</button>
                  </>
                )}
                {inq.status === 'Accepted' && (
                  <button type="button" onClick={onOpenContract} className="rounded bg-brand-500 px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-600">계약 조건 확인 · 결제 →</button>
                )}
                {inq.status === 'Confirmed' && (
                  <button type="button" onClick={onOpenContract} className="rounded border border-emerald-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-100">단체 예약 확인서 보기</button>
                )}
                {(inq.status === 'Requested' || inq.status === 'Accepted') && (
                  <button type="button" onClick={onSellerCancel} className="rounded border border-slate-300 bg-white px-3 py-1.5 text-[12px] text-slate-500 hover:text-rose-600">리퀘스트 취소</button>
                )}
                {inq.status === 'Confirmed' && (
                  <button
                    type="button"
                    disabled={cancelLocked}
                    onClick={onSellerCancel}
                    title={cancelLocked ? '취소 마감이 지나 취소·환불할 수 없습니다' : '취소 마감 전 — 예약 전체 취소 시 전액 환불'}
                    className="rounded border border-slate-300 bg-white px-3 py-1.5 text-[12px] text-slate-500 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-slate-500"
                  >
                    {cancelLocked ? (selected.cancelDeadline ? '취소 불가 (마감 경과)' : '취소 불가 (환불 불가 조건)') : '예약 취소 (전액 환불)'}
                  </button>
                )}
              </div>
            </div>
            <p className={`mt-2 text-[12px] ${selected.cancelDeadline && !cancelLocked ? 'text-slate-600' : 'font-semibold text-rose-600'}`}>
              취소 규정: {cancelLabel(selected.cancelDeadline)}{selected.cancelDeadline && cancelLocked ? ' — 현재 취소 마감 경과' : ''}
            </p>
            {inq.status !== 'Cancelled' && (
              <>
                {/* 정산(MOR) — OMH가 대신 수금·지불 */}
                <div className="mt-3 grid grid-cols-2 gap-3 rounded border border-slate-200 bg-white/70 p-3 text-[12px] md:grid-cols-3">
                  <div><div className="text-[10px] text-slate-400">고객 결제 (→OMH)</div><div className="font-bold text-slate-800">{fmtMoney(pr.sell, selected.currency)}</div></div>
                  <div><div className="text-[10px] text-slate-400">호텔 지불 (OMH→)</div><div className="text-slate-700">{fmtMoney(hotelReceive, selected.currency)}</div></div>
                  {showInternal && (
                    <div><div className="text-[10px] text-slate-400">우리 마진 ({pr.marginLabel})</div><div className="font-semibold text-brand-600">{fmtMoney(pr.margin, selected.currency)}</div></div>
                  )}
                </div>
                <p className="mt-1 text-[10px] text-slate-400">OMH가 대신 수금·지불(MOR) — 고객사가 OMH에 결제, OMH가 호텔에 정산. 취소 마감 전 취소는 전액 환불, 마감 후엔 취소·환불 불가.</p>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ─────────────────────────── 단체 예약 확인서 (계약 조건) ───────────────────────────
/**
 * DOTBIZ 단체 예약 확인서 — 근거: Contract Minder의 DotBiz 선불 예약 계약서(Prepaid Hotel Booking Agreement)
 * + 단체 예약 부속약관(Group Booking Terms, 2026-10-01 초안). 결제 전 동의 필수. 결제는 UI 시연(실결제 없음).
 */
function GroupContractModal({ inq, rates, onClose, onPay }: { inq: GroupInquiry; rates: Record<string, CountryRate>; onClose: () => void; onPay?: () => void }) {
  const [agree, setAgree] = useState(false);
  const q = inq.quotes.find((x) => x.id === inq.selectedQuoteId);
  if (!q) return null;
  const pr = priceQuote(q.amount, rateFor(inq.country, rates), q.currency);
  const extras = activeAncillary(inq.ancillary);
  const row = (k: string, v: ReactNode) => (
    <tr className="border-b border-slate-100 last:border-0">
      <th className="w-36 bg-slate-50 px-3 py-1.5 text-left align-top text-[11px] font-semibold text-slate-500">{k}</th>
      <td className="px-3 py-1.5 text-[12px] text-slate-700">{v}</td>
    </tr>
  );
  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-900/50 px-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-[720px] max-w-full flex-col overflow-hidden rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
          <div>
            <div className="text-sm font-bold text-slate-800">단체 예약 확인서 · Group Booking Confirmation</div>
            <div className="text-[11px] text-slate-500">No. <span className="font-mono">{inq.ref}</span> · DOTBIZ 선불 예약 계약서 + 단체 예약 부속약관의 일부</div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="닫기">✕</button>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          <table className="w-full overflow-hidden rounded border border-slate-200">
            <tbody>
              {row('당사자', <>Ohmyhotel Global Pte. Ltd. (Singapore) ↔ <b>{inq.sellerName ?? SELLER_NAME}</b> (DOTBIZ 고객사)</>)}
              {row('호텔', `${q.hotelName} · ${q.location}`)}
              {row('기간', `${fmtDate(inq.checkIn)} ~ ${fmtDate(inq.checkOut)} (${inq.nights}박)`)}
              {row('객실 · 식사', `${roomsSummary(inq.rooms)} (${roomsTotal(inq.rooms)}실) · ${inq.mealPlan}`)}
              {row('인원', `${inq.guests}명${inq.nationality ? ` · ${inq.nationality}` : ''}`)}
              {row('총액', <><b className="text-brand-600">{fmtMoney(pr.sell, q.currency)}</b> <span className="text-slate-400">(카드 처리 수수료 포함 · 현지세·시티택스 등 현장 지불 항목 제외)</span></>)}
              {row('결제', <>호텔 수락 후 <b>{q.paymentDeadlineHours}시간</b> 이내 전액 결제 — 마감 <b>{fmtDateTime(inq.paymentDueAt)}</b>. 미결제 시 <b>자동취소</b>(위약금 없음)</>)}
              {row('취소', q.cancelDeadline
                ? <><b>{q.cancelDeadline.slice(0, 10)} 23:59</b>까지 예약 <b>전체</b> 취소 시 전액 환불(원결제 카드, 승인 후 10영업일 이내). <b className="text-rose-600">마감 이후에는 취소·변경·노쇼 모두 취소 불가 · 환불 불가.</b></>
                : <b className="text-rose-600">취소 마감 없음 — 결제 시점부터 취소 불가 · 환불 불가.</b>)}
              {row('부분 취소 · 변경', '객실 수 감소 등 부분 취소 불가(예약 전체 단위). 날짜·객실 수·룸타입 변경은 새 요청으로 호텔 수락 필요')}
              {row('포함 사항', `확인서에 적힌 객실·식사만 포함${extras.length ? ` · 부대 서비스(${extras.join(', ')})는 호텔 견적 메모에 명시된 범위만` : ''}`)}
              {row('명단(Rooming list)', <span className="text-amber-600">체크인 [●]일 전까지 제출 — 기한 확정 예정</span>)}
              {row('대금 · 정산', 'OMH가 Merchant of Record로 수금하고 호텔에 정산. 차지백 전 OMH에 서면 통지(선불 계약서 제7조)')}
              {row('문제 예약', '오버부킹 등은 선불 계약서 제10조(대체 숙소·첫날 객실요금 100% 한도 보상) 적용')}
              {row('준거법 · 분쟁', '싱가포르법 · SIAC 중재(선불 계약서 제18조)')}
            </tbody>
          </table>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
            우선순위: 개별 예약의 요금·취소·환불 조건은 본 확인서가 우선하고, 그 외 사항은 DOTBIZ 선불 예약 계약서(Prepaid Hotel Booking Agreement)와 단체 예약 부속약관(Group Booking Terms)을 따릅니다.
          </p>
          {onPay && (
            <label className="mt-3 flex cursor-pointer items-start gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-slate-700">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
              <span>위 단체 예약 조건(<b>취소 마감 이후 취소·환불 불가</b>, 결제 마감 경과 시 자동취소 포함)을 확인했으며 동의합니다.</span>
            </label>
          )}
          {!onPay && inq.contractAcceptedAt && (
            <p className="mt-3 rounded bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">✓ {fmtDateTime(inq.contractAcceptedAt)} 동의 · {fmtDateTime(inq.paidAt)} 결제 완료</p>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          {onPay && <span className="mr-auto text-[11px] text-slate-400">시연 화면 — 실제 카드 입력·결제는 없습니다.</span>}
          <button type="button" onClick={onClose} className="rounded border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">닫기</button>
          {onPay && (
            <button type="button" disabled={!agree} onClick={onPay} className="rounded bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40">
              동의하고 결제 ({fmtMoney(pr.sell, q.currency)})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
