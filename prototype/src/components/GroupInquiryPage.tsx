import { useEffect, useMemo, useState, type ReactNode } from 'react';
import EnhBadge from './EnhBadge';
import { allHotels } from '../mocks/hotelDb';
import {
  applyMarkup,
  fmtMoney,
  generateQuotes,
  nights as calcNights,
  roomsSummary,
  roomsTotal,
  type GroupInquiry,
  type HotelQuote,
  type InquiryStatus,
  type MarkupConfig,
  type RoomReq,
} from '../mocks/groupInquiry';
import {
  loadInquiries,
  loadMarkup,
  nextInquiryRef,
  saveInquiries,
  saveMarkup,
} from '../utils/groupInquiryStore';

/**
 * 단체 문의 · 역경매(RFP) 소싱 — 고객사 문의 접수 → 호텔 역경매 견적 회수 →
 * 마크업 자동 적용(net→sell) → 리스트업 → 선택 → 리퀘스트 예약. **프로토타입 · 폐기 가능.**
 * 상세 기획: docs/plan/feature-group-inquiry-rfp.md
 */

const STATUS_LABEL: Record<InquiryStatus, string> = {
  Submitted: '접수',
  Sourcing: '견적 요청중',
  Quoted: '견적 도착',
  Requested: '리퀘스트 예약',
  Confirmed: '확정',
  Cancelled: '취소',
};
const STATUS_STYLE: Record<InquiryStatus, string> = {
  Submitted: 'bg-slate-100 text-slate-600',
  Sourcing: 'bg-amber-100 text-amber-700',
  Quoted: 'bg-brand-100 text-brand-700',
  Requested: 'bg-blue-100 text-blue-700',
  Confirmed: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-slate-200 text-slate-400 line-through',
};

const MEAL_PLANS = ['Room Only', 'Breakfast', 'Half Board', 'Full Board'];
const ROOM_TYPES = ['Single', 'Twin', 'Double', 'Triple', 'Suite'];

const fmtDate = (iso: string) => (iso ? iso.slice(0, 10) : '');

export default function GroupInquiryPage() {
  const [inquiries, setInquiries] = useState<GroupInquiry[]>(loadInquiries);
  const [markup, setMarkup] = useState<MarkupConfig>(loadMarkup);
  const [mode, setMode] = useState<'list' | 'new' | 'detail'>('list');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  /** ELLIS 내부 보기 — net·마진 노출(고객 화면엔 없음) */
  const [showInternal, setShowInternal] = useState(false);
  const [showEllis, setShowEllis] = useState(false);
  const [confirmQuote, setConfirmQuote] = useState<HotelQuote | null>(null);

  useEffect(() => saveInquiries(inquiries), [inquiries]);
  useEffect(() => saveMarkup(markup), [markup]);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(t);
  }, [toast]);

  const active = inquiries.find((i) => i.id === activeId) ?? null;

  // ── 목적지 드릴다운 트리 (국가 → 지역 → 호텔) ──
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

  // ── 역경매 견적 회수(시뮬레이트) ──
  function sourceQuotes(inq: GroupInquiry) {
    const quotes = generateQuotes(inq);
    patchInquiry(inq.id, { status: 'Quoted', quotes });
    setToast(`호텔 ${quotes.length}곳 견적을 회수했습니다 — 마크업 적용 후 리스트업되었습니다.`);
  }

  // ── 리퀘스트 예약(견적 선택) ──
  function placeRequest(inq: GroupInquiry, q: HotelQuote) {
    patchInquiry(inq.id, {
      status: 'Requested',
      selectedQuoteId: q.id,
      quotes: inq.quotes.map((x) => ({ ...x, status: x.id === q.id ? 'selected' : 'declined' })),
    });
    setConfirmQuote(null);
    setToast(`${q.hotelName} 리퀘스트 예약이 접수되었습니다 — 호텔 확정 응답을 기다립니다.`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-100">
      {/* 헤더 */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold text-slate-800">
              단체 문의 · 역경매 소싱
              <EnhBadge note="단체 문의 → 호텔 역경매 견적 → 마크업 자동 → 리스트업 → 리퀘스트 예약 (신규 기획)" />
            </h1>
            <p className="mt-0.5 text-[12px] text-slate-500">
              고객사 단체 문의를 접수해 호텔에 역경매로 뿌리고, 회수 견적에 마크업을 자동 적용해 리스트업합니다.
            </p>
          </div>
          {mode === 'list' && (
            <button
              type="button"
              onClick={() => setMode('new')}
              className="rounded bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
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
            markup={markup}
            onOpen={(id) => {
              setActiveId(id);
              setMode('detail');
            }}
            showEllis={showEllis}
            setShowEllis={setShowEllis}
            setMarkup={setMarkup}
            showInternal={showInternal}
            setShowInternal={setShowInternal}
          />
        )}

        {mode === 'new' && (
          <NewInquiryForm
            tree={tree}
            onCancel={() => setMode('list')}
            onSubmit={(inq) => {
              setInquiries((prev) => [inq, ...prev]);
              setActiveId(inq.id);
              setMode('detail');
              setToast('문의가 접수되었습니다 — 담당 메일함으로 접수 알림이 발송되었습니다. (프로토타입)');
            }}
          />
        )}

        {mode === 'detail' && active && (
          <DetailView
            inq={active}
            markup={markup}
            showInternal={showInternal}
            onSource={() => sourceQuotes(active)}
            onSelectQuote={(q) => setConfirmQuote(q)}
            onConfirmHotel={() => {
              patchInquiry(active.id, { status: 'Confirmed' });
              setToast('호텔이 리퀘스트 예약을 수락했습니다 — 확정되었습니다. (시뮬레이트)');
            }}
          />
        )}
      </div>

      {/* 리퀘스트 예약 확인 모달 */}
      {confirmQuote && active && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-[440px] overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm font-bold text-slate-800">
              리퀘스트 예약 진행
            </div>
            <div className="px-5 py-5 text-[13px] text-slate-700">
              <p className="mb-3">
                <b>{confirmQuote.hotelName}</b> 견적으로 리퀘스트 예약을 진행합니다.
              </p>
              <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">고객가</span>
                  <b className="text-brand-600">{fmtMoney(applyMarkup(confirmQuote.netAmount, markup), confirmQuote.currency)}</b>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-slate-500">조건</span>
                  <span>{confirmQuote.condition}</span>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-amber-600">
                ※ 리퀘스트 예약은 <b>호텔 확정 응답 전까지 확정이 아닙니다.</b> 취소는 예약 전체 단위이며 호텔 취소규정을 따릅니다.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                onClick={() => setConfirmQuote(null)}
                className="rounded border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => placeRequest(active, confirmQuote)}
                className="rounded bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
              >
                리퀘스트 예약 진행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-lg bg-slate-800 px-5 py-3 text-[13px] text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── 목록 ───────────────────────────
function ListView({
  inquiries,
  markup,
  onOpen,
  showEllis,
  setShowEllis,
  setMarkup,
  showInternal,
  setShowInternal,
}: {
  inquiries: GroupInquiry[];
  markup: MarkupConfig;
  onOpen: (id: string) => void;
  showEllis: boolean;
  setShowEllis: (v: boolean) => void;
  setMarkup: (m: MarkupConfig) => void;
  showInternal: boolean;
  setShowInternal: (v: boolean) => void;
}) {
  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <th className="px-4 py-2.5 font-semibold">접수번호</th>
              <th className="px-4 py-2.5 font-semibold">목적지</th>
              <th className="px-4 py-2.5 font-semibold">기간</th>
              <th className="px-4 py-2.5 font-semibold">룸 / 인원</th>
              <th className="px-4 py-2.5 text-right font-semibold">예산</th>
              <th className="px-4 py-2.5 text-center font-semibold">견적</th>
              <th className="px-4 py-2.5 text-center font-semibold">상태</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.map((i) => (
              <tr
                key={i.id}
                onClick={() => onOpen(i.id)}
                className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-brand-50/40"
              >
                <td className="px-4 py-3 font-mono text-[12px] text-slate-700">{i.ref}</td>
                <td className="px-4 py-3 text-slate-700">
                  {i.country} · {i.region}
                  {i.hotelName && <span className="text-slate-400"> · {i.hotelName}</span>}
                  {i.anchorName && (
                    <div className="text-[11px] text-slate-400">📍 {i.anchorName.split('(')[0].trim()} · 차량 {i.anchorRadiusMin}분</div>
                  )}
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
                      <span className="text-slate-400"> /실·박</span>
                      <div className="text-[10px] text-slate-400">총 {fmtMoney(i.budgetTotal ?? 0, i.currency)}</div>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 text-center text-slate-600">{i.quotes.length || '—'}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[i.status]}`}>
                    {STATUS_LABEL[i.status]}
                  </span>
                </td>
              </tr>
            ))}
            {inquiries.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  아직 단체 문의가 없습니다. 우측 상단 <b>＋ 새 단체 문의</b>로 접수하세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ELLIS 내부 — 마크업 설정 (고객 비노출) */}
      <div className="mt-5 rounded-lg border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setShowEllis(!showEllis)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-[13px] font-bold text-slate-700">
            🔧 ELLIS 내부 — 마크업 설정
            <EnhBadge note="호텔 net 견적에 자동으로 얹는 우리 마진. 일률(글로벌) 설정 — 고객 비노출." />
          </span>
          <span className="text-slate-400">{showEllis ? '접기 ▲' : '펼치기 ▼'}</span>
        </button>
        {showEllis && (
          <div className="border-t border-slate-100 px-4 py-4">
            <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
              호텔이 부른 가격(net)은 우리 마크업 불포함일 수 있어, 시스템이 마크업을 자동으로 얹어 고객가(sell)를 만듭니다.
              값 변경 시 모든 견적의 고객가가 즉시 재계산됩니다. <b>고객·리스트업 어디에도 net·마크업률은 노출되지 않습니다.</b>
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-[12px] text-slate-600">
                방식
                <select
                  value={markup.type}
                  onChange={(e) => setMarkup({ ...markup, type: e.target.value as MarkupConfig['type'] })}
                  className="rounded border border-slate-300 px-2 py-1 text-[12px] focus:border-brand-400 focus:outline-none"
                >
                  <option value="pct">정률 (%)</option>
                  <option value="fixed">정액</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-[12px] text-slate-600">
                값
                <input
                  type="number"
                  value={markup.value}
                  min={0}
                  onChange={(e) => setMarkup({ ...markup, value: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-24 rounded border border-slate-300 px-2 py-1 text-[12px] focus:border-brand-400 focus:outline-none"
                />
                <span className="text-slate-400">{markup.type === 'pct' ? '%' : '(통화 단위)'}</span>
              </label>
              <span className="text-[12px] text-slate-400">
                예: net 600,000 → 고객가 <b className="text-brand-600">{fmtMoney(applyMarkup(600000, markup), 'JPY')}</b>
              </span>
              <label className="ml-auto flex cursor-pointer items-center gap-2 text-[12px] text-slate-600">
                <input type="checkbox" checked={showInternal} onChange={(e) => setShowInternal(e.target.checked)} />
                견적에 net·마진 표시(내부)
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── 새 문의 작성 ───────────────────────────
function NewInquiryForm({
  tree,
  onCancel,
  onSubmit,
}: {
  tree: Map<string, Map<string, { id: string; name: string; currency: string }[]>>;
  onCancel: () => void;
  onSubmit: (inq: GroupInquiry) => void;
}) {
  const countries = useMemo(() => Array.from(tree.keys()), [tree]);
  const [country, setCountry] = useState(countries[0] ?? 'Japan');
  const regions = useMemo(() => Array.from(tree.get(country)?.keys() ?? []), [tree, country]);
  const [region, setRegion] = useState(regions[0] ?? '');
  const hotels = useMemo(() => tree.get(country)?.get(region) ?? [], [tree, country, region]);
  const [hotelId, setHotelId] = useState('');

  const [anchorName, setAnchorName] = useState('');
  const [anchorRadiusMin, setAnchorRadiusMin] = useState<number>(30);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [rooms, setRooms] = useState<RoomReq[]>([{ roomType: 'Twin', count: 1 }]);
  const [mealPlan, setMealPlan] = useState('Room Only');
  const [guests, setGuests] = useState<number>(2);
  const [nationality, setNationality] = useState('');
  /** 예산 입력 = 1실·1박 기준. 총액은 × 실수 × 박수로 환산. */
  const [budgetPerNight, setBudgetPerNight] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  const currency = hotels[0]?.currency ?? 'JPY';
  const n = checkIn && checkOut ? calcNights(checkIn, checkOut) : 0;
  const budgetTotalCalc = budgetPerNight === '' ? 0 : Number(budgetPerNight) * roomsTotal(rooms) * (n || 0);
  const valid = region && checkIn && checkOut && n > 0 && roomsTotal(rooms) > 0 && guests > 0;

  // 국가 변경 시 지역/호텔 리셋
  function changeCountry(c: string) {
    setCountry(c);
    const firstRegion = Array.from(tree.get(c)?.keys() ?? [])[0] ?? '';
    setRegion(firstRegion);
    setHotelId('');
  }
  function changeRegion(r: string) {
    setRegion(r);
    setHotelId('');
  }

  function submit() {
    if (!valid) return;
    const now = new Date().toISOString();
    const hotel = hotels.find((h) => h.id === hotelId);
    const inq: GroupInquiry = {
      id: `gi-${Date.now()}`,
      ref: nextInquiryRef(),
      status: 'Submitted',
      country,
      region,
      hotelId: hotelId || undefined,
      hotelName: hotel?.name,
      anchorName: anchorName.trim() || undefined,
      anchorRadiusMin: anchorName.trim() ? anchorRadiusMin : undefined,
      checkIn,
      checkOut,
      nights: n,
      rooms: rooms.filter((r) => r.count > 0),
      mealPlan,
      guests,
      nationality: nationality.trim() || undefined,
      currency,
      budgetPerRoomNight: budgetPerNight === '' ? undefined : Number(budgetPerNight),
      budgetTotal: budgetPerNight === '' ? undefined : budgetTotalCalc,
      notes: notes.trim() || undefined,
      createdAt: now,
      submittedAt: now,
      quotes: [],
    };
    onSubmit(inq);
  }

  const fieldCls = 'w-full rounded border border-slate-300 px-2.5 py-1.5 text-[13px] focus:border-brand-400 focus:outline-none';
  const labelCls = 'mb-1 block text-[12px] font-semibold text-slate-600';

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-base font-bold text-slate-800">새 단체 문의 작성</h2>

        {/* 목적지 드릴다운 */}
        <div className="mb-4">
          <span className={labelCls}>목적지 <span className="font-normal text-slate-400">(국가 → 지역 → 호텔 · 호텔은 선택)</span></span>
          <div className="grid grid-cols-3 gap-3">
            <select value={country} onChange={(e) => changeCountry(e.target.value)} className={fieldCls}>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select value={region} onChange={(e) => changeRegion(e.target.value)} className={fieldCls}>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <select value={hotelId} onChange={(e) => setHotelId(e.target.value)} className={fieldCls}>
              <option value="">지역 전체 (호텔 미지정)</option>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
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
                <select
                  value={r.roomType}
                  onChange={(e) => setRooms((prev) => prev.map((x, i) => (i === idx ? { ...x, roomType: e.target.value } : x)))}
                  className="w-40 rounded border border-slate-300 px-2 py-1.5 text-[13px] focus:border-brand-400 focus:outline-none"
                >
                  {ROOM_TYPES.map((rt) => (
                    <option key={rt} value={rt}>{rt}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  value={r.count}
                  onChange={(e) => setRooms((prev) => prev.map((x, i) => (i === idx ? { ...x, count: Math.max(0, Number(e.target.value) || 0) } : x)))}
                  className="w-24 rounded border border-slate-300 px-2 py-1.5 text-[13px] focus:border-brand-400 focus:outline-none"
                />
                <span className="text-[12px] text-slate-400">실</span>
                {rooms.length > 1 && (
                  <button type="button" onClick={() => setRooms((prev) => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-500">✕</button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <button type="button" onClick={() => setRooms((prev) => [...prev, { roomType: 'Single', count: 1 }])} className="text-[12px] font-semibold text-brand-600 hover:underline">
              ＋ 룸타입 추가
            </button>
            <span className="text-[12px] text-slate-400">합계 {roomsTotal(rooms)}실</span>
          </div>
        </div>

        {/* 식사·인원·국적 */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div>
            <span className={labelCls}>식사조건</span>
            <select value={mealPlan} onChange={(e) => setMealPlan(e.target.value)} className={fieldCls}>
              {MEAL_PLANS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <span className={labelCls}>인원(총)</span>
            <input type="number" min={1} value={guests} onChange={(e) => setGuests(Math.max(1, Number(e.target.value) || 1))} className={fieldCls} />
          </div>
          <div>
            <span className={labelCls}>국적·비고 <span className="font-normal text-slate-400">(선택)</span></span>
            <input value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="예: 중국 대표팀" className={fieldCls} />
          </div>
        </div>

        {/* 예산·비고 */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div>
            <span className={labelCls}>예산 <span className="font-normal text-slate-400">(1실·1박 기준 · {currency})</span></span>
            <input type="number" min={0} value={budgetPerNight} onChange={(e) => setBudgetPerNight(e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0))} placeholder="예: 9100" className={fieldCls} />
            <p className="mt-1 text-[11px] text-slate-400">
              {budgetTotalCalc > 0
                ? `전체 환산: ${fmtMoney(budgetTotalCalc, currency)} (${roomsTotal(rooms)}실 × ${n}박)`
                : '1실·1박 금액 → 실수·박수로 총액 자동 환산'}
            </p>
          </div>
          <div className="col-span-2">
            <span className={labelCls}>비고 <span className="font-normal text-slate-400">(특수요건 — 선택)</span></span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="예: 선수단 단체 이동 — 동일 호텔 우선" className={fieldCls} />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          {!valid && <span className="mr-auto text-[12px] text-amber-600">목적지·기간·룸·인원을 입력하세요.</span>}
          <button type="button" onClick={onCancel} className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            취소
          </button>
          <button type="button" onClick={submit} disabled={!valid} className="rounded bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40">
            문의 제출 (메일 접수)
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── 상세 ───────────────────────────
function DetailView({
  inq,
  markup,
  showInternal,
  onSource,
  onSelectQuote,
  onConfirmHotel,
}: {
  inq: GroupInquiry;
  markup: MarkupConfig;
  showInternal: boolean;
  onSource: () => void;
  onSelectQuote: (q: HotelQuote) => void;
  onConfirmHotel: () => void;
}) {
  const selected = inq.quotes.find((q) => q.id === inq.selectedQuoteId) ?? null;
  const info = (label: string, value: ReactNode) => (
    <div>
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-[13px] text-slate-700">{value}</div>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* 요약 카드 */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-slate-700">{inq.ref}</span>
            <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[inq.status]}`}>{STATUS_LABEL[inq.status]}</span>
          </div>
          {inq.quoteDeadline && inq.status === 'Quoted' && (
            <span className="text-[11px] text-slate-400">견적 유효 ~ {fmtDate(inq.quoteDeadline)}</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {info('목적지', `${inq.country} · ${inq.region}${inq.hotelName ? ` · ${inq.hotelName}` : ''}`)}
          {info('기준점', inq.anchorName ? `${inq.anchorName.split('(')[0].trim()} · 차량 ${inq.anchorRadiusMin}분` : '—')}
          {info('기간', `${fmtDate(inq.checkIn)} ~ ${fmtDate(inq.checkOut)} (${inq.nights}박)`)}
          {info('식사', inq.mealPlan)}
          {info('룸', `${roomsSummary(inq.rooms)} (${roomsTotal(inq.rooms)}실)`)}
          {info('인원', `${inq.guests}명${inq.nationality ? ` · ${inq.nationality}` : ''}`)}
          {info(
            '예산',
            inq.budgetPerRoomNight
              ? `${fmtMoney(inq.budgetPerRoomNight, inq.currency)} /실·박 · 총 ${fmtMoney(inq.budgetTotal ?? 0, inq.currency)}`
              : '—',
          )}
          {info('비고', inq.notes ?? '—')}
        </div>
      </div>

      {/* 접수/소싱 — 역경매 견적 회수 */}
      {(inq.status === 'Submitted' || inq.status === 'Sourcing') && (
        <div className="mt-5 rounded-lg border border-dashed border-brand-300 bg-brand-50/50 p-6 text-center">
          <p className="text-[13px] text-slate-600">
            문의가 접수되었습니다. 대상 호텔에 <b>역경매(RFP)</b>로 뿌려 견적을 회수합니다.
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            대상은 지역·앵커 거리 기준의 <b>기존 계약 호텔군</b>입니다(신규 소싱은 필수 아님 — 재고 부족 시에만). 견적을 회수합니다. (아래는 프로토타입 시뮬레이트)
          </p>
          <button type="button" onClick={onSource} className="mt-4 rounded bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            역경매 견적 회수 (시뮬레이트)
          </button>
        </div>
      )}

      {/* 리스트업 — 회수 견적 */}
      {inq.quotes.length > 0 && inq.status !== 'Submitted' && inq.status !== 'Sourcing' && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">
              회수 견적 {inq.quotes.length}건 {inq.status === 'Quoted' && <span className="font-normal text-slate-400">— 원하는 호텔을 선택하세요</span>}
            </h3>
            {showInternal && <span className="text-[11px] text-amber-600">내부 보기: net·마진 표시 중</span>}
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {inq.quotes.map((q) => {
              const sell = applyMarkup(q.netAmount, markup);
              const overBudget = inq.budgetTotal ? sell > inq.budgetTotal : false;
              const isSelected = q.id === inq.selectedQuoteId;
              const dimmed = inq.status !== 'Quoted' && !isSelected;
              return (
                <div
                  key={q.id}
                  className={`rounded-lg border bg-white p-4 ${isSelected ? 'border-brand-500 ring-1 ring-brand-300' : 'border-slate-200'} ${dimmed ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-slate-800">{q.hotelName}</span>
                        {q.star && <span className="text-[11px] text-amber-500">{'★'.repeat(Math.round(q.star))}</span>}
                      </div>
                      <div className="mt-0.5 text-[12px] text-slate-500">
                        📍 {q.location}
                        {q.distanceMin != null && <span> · 차량 {q.distanceMin}분</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-extrabold ${overBudget ? 'text-slate-700' : 'text-brand-600'}`}>{fmtMoney(sell, q.currency)}</div>
                      <div className="text-[10px] text-slate-400">고객가 (총액)</div>
                      {inq.budgetTotal != null && (
                        <div className={`text-[10px] font-semibold ${overBudget ? 'text-red-500' : 'text-emerald-600'}`}>
                          {overBudget ? `예산 초과 +${fmtMoney(sell - inq.budgetTotal, q.currency)}` : `예산 이내 −${fmtMoney(inq.budgetTotal - sell, q.currency)}`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 border-t border-slate-100 pt-2 text-[12px] text-slate-600">
                    <div>{q.condition}</div>
                    <div className="mt-0.5 text-slate-500">취소: {q.cancellation}</div>
                    {showInternal && (
                      <div className="mt-1 rounded bg-slate-50 px-2 py-1 text-[11px] text-slate-500">
                        내부: net {fmtMoney(q.netAmount, q.currency)} · 마진 {fmtMoney(sell - q.netAmount, q.currency)} ({markup.type === 'pct' ? `${markup.value}%` : '정액'})
                      </div>
                    )}
                  </div>
                  {inq.status === 'Quoted' && (
                    <button type="button" onClick={() => onSelectQuote(q)} className="mt-3 w-full rounded bg-brand-500 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-600">
                      이 견적으로 예약 →
                    </button>
                  )}
                  {isSelected && <div className="mt-3 rounded bg-brand-50 py-1.5 text-center text-[12px] font-semibold text-brand-600">선택됨</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 리퀘스트 예약 — 호텔 확정 대기 */}
      {inq.status === 'Requested' && selected && (
        <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-5 text-center">
          <p className="text-[13px] text-slate-700">
            <b>{selected.hotelName}</b> 리퀘스트 예약이 접수되었습니다 — 호텔 확정 응답 대기 중입니다.
          </p>
          <button type="button" onClick={onConfirmHotel} className="mt-3 rounded border border-blue-300 bg-white px-4 py-1.5 text-[12px] font-semibold text-blue-600 hover:bg-blue-100">
            호텔 수락 (시뮬레이트)
          </button>
        </div>
      )}
      {inq.status === 'Confirmed' && selected && (
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-center text-[13px] font-semibold text-emerald-700">
          ✅ {selected.hotelName} 예약이 확정되었습니다.
        </div>
      )}
    </div>
  );
}
