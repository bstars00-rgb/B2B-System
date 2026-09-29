import { useMemo, useState } from 'react';
import type { Booking } from '../types';
import EnhBadge from './EnhBadge';
import { todayIso } from '../utils/dashboardStats';
import { OP_POINT_POLICY, computeAccruals, summarize, tierFor, TIERS, faceToPoints, faceToUsd, usdToPoints, type Accrual } from '../utils/opPoints';
import { SEED_PROMOS, type PointPromo } from '../mocks/opPointsPromos';
import { OP_ACCOUNTS, opAccountIdFor } from '../mocks/opAccounts';
import { hotelCodeOf, cityOfHotel } from '../mocks/hotelDb';
import {
  GIFT_CATALOG,
  GIFT_COUNTRIES,
  SEED_DEPOSIT_USD,
  catalogOf,
  countryInfo,
  fmtFace,
  type GiftCountry,
  type GiftProduct,
  type GiftRedemption,
  type RedeemStatus,
} from '../mocks/giftCatalog';

export interface BookHotelTarget { code: string; destination: string; hotelName: string; }

/**
 * OP 포인트 — 오피포인트. **프로토타입 · 폐기 가능.**
 *
 * 포털(Dashboard) 카드 스타일과 통일한 풀폭 레이아웃.
 * OP = 마켓플레이스 이용 여행사 대표·직원. 예약·투숙 완료+지불 완료 시 자동 적립 → 등급제(Bronze~Diamond) → Gift Mall 교환.
 * 교환(2026-09-29 Giftronaut 미팅 확정): **OMH가 Gift Mall UI·정책 소유**, Giftronaut은 뒤에서 Gift API만 제공
 *   (국가별 상품·권종 선택 → `POST /orders/branded-cards` → 기프트카드를 OP 이메일로 발송, OMH USD Balance에서 차감).
 *   API 문서(https://api.giftronaut.com/docs/reference) 검토 반영: 주문 상태·반송(bounce)·재발송·idempotencyKey·Balance.
 * 적립 요율·계산식 비노출(배수 배지·상대 부스트만). 계정별 분리. 유효기간 1년.
 * ⚠ 미확정(결정 대기): 1P 가치 · 적립률 · 최소 교환 · 국가 노출 · 카드 타입(Branded/Choice) · 카드 유효기간(환급 옵션) — 현재 값은 기존 임시값.
 *
 * ※ 폐기: opPoints.ts + 이 파일 + opPointsPromos.ts + opAccounts.ts + giftCatalog.ts + 사이드바 메뉴 한 줄 삭제.
 */

const pt = (n: number) => `${n.toLocaleString('ko-KR', { maximumFractionDigits: 1 })} P`;
const r1 = (n: number) => Math.round(n * 10) / 10;
/** 콤마 구분 문자열 ↔ 리스트('all'=전체). ELLIS 룸타입·레이트플랜 편집용. */
const listStr = (v: string[] | 'all') => (v === 'all' ? 'all' : v.join(', '));
const parseList = (s: string): string[] | 'all' => {
  const t = s.trim();
  if (!t || t.toLowerCase() === 'all') return 'all';
  return t.split(',').map((x) => x.trim()).filter(Boolean);
};
const r2 = (n: number) => Math.round(n * 100) / 100;
const usd = (n: number) => `USD ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/** 최소 교환 — 기존 임시값(USD 10 상당). ⚠ 미확정: Open API 수령 후 결정 */
const MIN_REDEEM_PTS = usdToPoints(OP_POINT_POLICY.redeemMinUSD);
/** Balance 잔액 경고 표시(시연). ⚠ 실제 알림 기준 미확정 */
const DEPOSIT_WARN_USD = 300;

const REDEEM_STYLE: Record<RedeemStatus, { label: string; cls: string }> = {
  processing: { label: '처리 중 · 포인트 보류', cls: 'bg-amber-50 text-amber-600' },
  sent: { label: '이메일 발송', cls: 'bg-emerald-50 text-emerald-600' },
  bounced: { label: '이메일 반송 · 재발송 필요', cls: 'bg-orange-50 text-orange-600' },
  failed: { label: '실패 · 포인트 복원', cls: 'bg-rose-50 text-rose-600' },
};

/** ELLIS 시연 — 다음 교환에 적용할 API 결과 */
type SimOutcome = 'ok' | 'validation' | 'insufficient' | 'bounce';
const SIM_LABEL: Record<SimOutcome, string> = {
  ok: '정상 (COMPLETE)',
  validation: '400 VALIDATION_ERROR',
  insufficient: '402 INSUFFICIENT_BALANCE',
  bounce: 'order.bounced (이메일 반송)',
};

/**
 * 리워드 가이드 — Bedsonline Rewards Guide 구조 참고(우리 프로그램에 맞게 재구성).
 * ※ 자동 적립이라 'Join'/'Opt out' 카드는 제외. 등급·프로모·Gift Mall 중심.
 */
const GUIDE_ITEMS: { key: string; icon: string; title: string; desc: string; body: string }[] = [
  { key: 'earn', icon: '✨', title: '적립 방법', desc: '포인트는 어떻게 쌓이나요?',
    body: '마켓플레이스에서 예약하고 투숙을 마친 뒤 지불이 완료되면 자동으로 적립됩니다(별도 가입 없음). 취소·노쇼·환불은 제외되며, 선불 업체는 체크아웃 시점에, 후불 업체는 지불 완료 시점에 적립됩니다.' },
  { key: 'tiers', icon: '🏆', title: '등급', desc: '등급 혜택 알아보기',
    body: '최근 12개월 적립 포인트로 Bronze · Silver · Gold · Diamond 등급이 결정되며 연간 재산정됩니다. 등급이 오를수록 적립 부스트가 커져, 예약을 많이 할수록 더 많이 적립됩니다.' },
  { key: 'campaign', icon: '🎁', title: '리워드 X2 캠페인', desc: '추가 적립 받는 법',
    body: '지정된 프로모션 호텔에서 예약하면 리워드가 2배(2X) 등으로 추가 적립됩니다. 호텔별·룸타입별·레이트플랜별·기간(예약일)별로 운영되며, 목록·검색에 "200% 적립" 같은 배수 배지로 표시됩니다. 요율·계산식은 내부에서 관리되어 고객에겐 배지로만 노출됩니다.' },
  { key: 'points', icon: '⭐', title: '포인트 · 유효기간', desc: '포인트는 어떻게 구분되나요?',
    body: '포인트는 사용 가능 · 총적립(12개월) · 만료 예정으로 구분됩니다. 유효기간은 1년이며 회계년도 마감에 맞춰 관리됩니다. 포인트는 예약 담당자(OP) 개인 계정에 적립되어 계정별로 분리됩니다.' },
  { key: 'redeem', icon: '💎', title: '교환 (Gift Mall)', desc: '포인트 교환하는 법',
    body: 'Gift Mall에서 상품과 권종을 고르면 포인트로 교환되고, 기프트카드가 등록 이메일로 발송됩니다. 이메일의 Redeem 버튼을 누른 뒤 이메일 인증(1-클릭 링크)을 거치면 사용할 수 있습니다. 기프트카드는 국가별 상품이라 소속 거래처 국가에서 사용할 수 있는 상품이 노출됩니다. 교환은 취소할 수 없으며, 주문이 처리되지 않으면 포인트는 자동으로 복원됩니다. 이메일이 반송되면 교환 내역에서 이메일을 확인해 재발송할 수 있습니다.' },
  { key: 'support', icon: '❓', title: '고객지원', desc: '문의하기',
    body: '포인트 미적립, 캠페인 적립 오류, 기프트카드 미수신·이메일 반송, 등급 관련 문의 등은 마켓플레이스 고객지원으로 연락해 주세요.' },
];

function PromoBadge({ label }: { label: string }) {
  return <span className="ml-1 rounded-sm bg-brand-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{label} 적립</span>;
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

export default function OpPointsPage({
  bookings,
  onOpenBooking,
  onBookHotel,
}: {
  bookings: Booking[];
  onOpenBooking: (ellisCode: string) => void;
  /** 캠페인 호텔 카드 클릭 → Create Booking으로 이동(호텔 프리필) */
  onBookHotel?: (target: BookHotelTarget) => void;
}) {
  const today = todayIso();
  const [promos, setPromos] = useState<PointPromo[]>(SEED_PROMOS);
  const [toast, setToast] = useState<string | null>(null);
  const [showEllis, setShowEllis] = useState(false);
  const [guide, setGuide] = useState<string | null>(null);

  const accountId = OP_ACCOUNTS[0].id;
  const account = OP_ACCOUNTS.find((a) => a.id === accountId) ?? OP_ACCOUNTS[0];
  const myBookings = useMemo(() => bookings.filter((b) => opAccountIdFor(b.ellis_code) === accountId), [bookings, accountId]);

  // ── Gift Mall (자체 UI) + Giftronaut Gift API(시연) ──
  const mallCountry: GiftCountry = account.country; // 기존 결정: 거래처 국가 1개 노출 (⚠ 노출 방식 미확정)
  const mallProducts = useMemo(() => catalogOf(mallCountry), [mallCountry]);
  const [redemptions, setRedemptions] = useState<GiftRedemption[]>([]); // 전 계정 주문 로그(ELLIS) — 고객 화면은 본인 것만
  const [deposit, setDeposit] = useState(SEED_DEPOSIT_USD);
  const [simNext, setSimNext] = useState<SimOutcome>('ok');
  /** 반송 건 재발송 — 이메일 확인·수정(`updatedEmail`) */
  const [resend, setResend] = useState<{ id: string; email: string } | null>(null);
  const [giftProduct, setGiftProduct] = useState<GiftProduct | null>(null);
  const [giftFace, setGiftFace] = useState<number | null>(null);
  const [previewCountry, setPreviewCountry] = useState<GiftCountry>('CN');
  const redeemed = useMemo(() => redemptions.filter((x) => x.accountId === accountId), [redemptions, accountId]);

  const accruals = useMemo(() => computeAccruals(myBookings, today, promos), [myBookings, today, promos]);
  const summary = useMemo(() => summarize(accruals, today), [accruals, today]);
  // 처리 중(보류)·발송·반송은 차감 — 반송은 카드가 이미 발급돼 재발송 대상. 실패(주문 미생성)만 복원되어 잔액에 포함
  const redeemedPts = r1(redeemed.filter((x) => x.status !== 'failed').reduce((s, x) => s + x.points, 0));
  const balance = r1(summary.earned - redeemedPts);

  const tierStatus = useMemo(() => tierFor(summary.earned), [summary.earned]);
  const boostPct = Math.round((tierStatus.tier.boost - 1) * 100);

  // 진행 중인 배수 캠페인 (2X 이상) — 고객 카드용
  const campaigns = useMemo(() => promos.filter((p) => p.active && p.multiplier >= 2).sort((a, b) => b.multiplier - a.multiplier), [promos]);
  const bookTarget = (p: PointPromo): BookHotelTarget => ({ code: hotelCodeOf(p.hotelId), destination: cityOfHotel(p.hotelId)?.destination ?? '', hotelName: p.hotelName });

  const expiryCut = useMemo(() => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - 11);
    return d.toISOString().slice(0, 10);
  }, [today]);
  const expiringPoints = r1(accruals.filter((a) => a.stayCompleted < expiryCut).reduce((s, a) => s + a.points, 0));

  // 적립 내역 기간 필터 (최근 N개월 / 전체)
  const [period, setPeriod] = useState<'3m' | '6m' | '1y' | 'all'>('6m');
  const shownAccruals = useMemo(() => {
    if (period === 'all') return accruals;
    const months = period === '3m' ? 3 : period === '6m' ? 6 : 12;
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - months);
    const cut = d.toISOString().slice(0, 10);
    return accruals.filter((a) => a.stayCompleted >= cut);
  }, [accruals, period, today]);

  /**
   * 교환 — 포인트 보류(processing) → `POST /orders/branded-cards`(IMMEDIATE, idempotencyKey) →
   *  · 201 생성 → COMPLETE(`order.delivery_complete`): 이메일 발송·Balance 차감(sent)
   *  · 201 생성 → `order.bounced`: 카드 발급·Balance 차감됨 → 포인트 유지, 이메일 확인 후 재발송(bounced)
   *  · 402/400 거절: 주문 미생성 → 포인트 자동 복원(failed)
   * (타임아웃 등 결과 불명 시엔 키를 바꿔 재시도하지 않고 `GET /orders?clientOrderId={key}`로 확인 — 실서비스 처리)
   */
  const doRedeem = (product: GiftProduct, face: number) => {
    const cur = countryInfo(product.country).currency;
    const points = faceToPoints(face, cur);
    const cost = faceToUsd(face, cur);
    if (balance < points) { setToast(`포인트가 부족합니다 (필요 ${pt(points)}, 사용 가능 ${pt(balance)})`); return; }
    const id = `${Date.now()}`;
    const rec: GiftRedemption = {
      id, idempotencyKey: `omh-rdm-${id}`, accountId, email: account.id, productId: product.id, country: product.country,
      face, points, usd: cost, at: today, status: 'processing',
    };
    const sim = simNext;
    const outcome: SimOutcome = sim === 'ok' && deposit < cost ? 'insufficient' : sim;
    setSimNext('ok');
    setRedemptions((prev) => [rec, ...prev]);
    setGiftProduct(null);
    setGiftFace(null);
    setToast(`주문 접수 — Giftronaut 발송 처리 중 (${pt(points)} 보류)`);
    window.setTimeout(() => {
      if (outcome === 'validation' || outcome === 'insufficient') {
        const reason = outcome === 'validation' ? '400 VALIDATION_ERROR — 유효하지 않은 권종' : '402 INSUFFICIENT_BALANCE — Balance 부족';
        setRedemptions((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'failed', failReason: reason } : x)));
        setToast(`✕ 주문 실패(${reason}) — ${pt(points)} 복원되었습니다`);
        return;
      }
      const orderNo = `OT${today.replace(/-/g, '')}${id.slice(-6)}`;
      setDeposit((d) => r2(d - cost));
      if (outcome === 'bounce') {
        setRedemptions((prev) => prev.map((x) => (x.id === id ? { ...x, orderNo, status: 'bounced', failReason: '이메일 반송(order.bounced)' } : x)));
        setToast(`⚠ ${account.id}로 보낸 기프트카드 이메일이 반송되었습니다 — 교환 내역에서 이메일 확인 후 재발송하세요`);
        return;
      }
      setRedemptions((prev) => prev.map((x) => (x.id === id ? { ...x, orderNo, status: 'sent' } : x)));
      setToast(`✓ ${product.name} ${fmtFace(face, product.country)} — ${account.id}로 기프트카드가 발송되었습니다 (시연)`);
    }, 1200);
  };

  /** 반송 건 재발송 — `POST /orders/{orderId}/resend` { recipients: [{ email, updatedEmail }] }. 추가 차감 없음 */
  const doResend = (recId: string, email: string) => {
    const to = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) { setToast('이메일 형식을 확인해 주세요'); return; }
    setResend(null);
    setRedemptions((prev) => prev.map((x) => (x.id === recId ? { ...x, email: to, status: 'processing', failReason: undefined } : x)));
    setToast(`재발송 요청 — ${to}`);
    window.setTimeout(() => {
      setRedemptions((prev) => prev.map((x) => (x.id === recId ? { ...x, status: 'sent', resent: (x.resent ?? 0) + 1 } : x)));
      setToast(`✓ ${to}로 기프트카드를 재발송했습니다 (시연)`);
    }, 1000);
  };

  const setPromo = (id: string, patch: Partial<PointPromo>) =>
    setPromos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const Stat = ({ label, value, cls = 'text-slate-800' }: { label: string; value: string; cls?: string }) => (
    <div className="px-4">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className={`text-xl font-extrabold ${cls}`}>{value}</p>
    </div>
  );

  return (
    <div className="min-h-0 w-full flex-1 overflow-y-auto bg-slate-50 p-4">
      <div className="space-y-3">
        {/* 헤더 */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-[15px] font-bold text-slate-800">
            OP Points — 리워드
            <EnhBadge note="오피포인트 — 자동 적립 + 등급제 + Gift Mall 교환(자체 UI · Giftronaut Gift API). 프로토타입" />
          </h2>
          <span className="text-[11px] text-slate-400">{account.name} · <span className="font-mono">{account.id}</span></span>
        </div>

        {/* 등급 + 포인트 스트립 (풀폭) */}
        <Card className="!p-0">
          <div className="flex flex-col gap-4 p-4 xl:flex-row xl:items-center">
            {/* 등급 */}
            <div className="flex shrink-0 items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg text-lg font-black text-white shadow-sm" style={{ background: tierStatus.tier.color }}>
                {tierStatus.tier.name[0]}
              </span>
              <div>
                <p className="text-[11px] text-slate-500">현재 등급</p>
                <p className="text-lg font-extrabold leading-tight" style={{ color: tierStatus.tier.color }}>
                  {tierStatus.tier.name} <span className="text-[12px] font-bold text-brand-600">{boostPct > 0 ? `+${boostPct}% 적립` : '기본'}</span>
                </p>
              </div>
            </div>

            {/* 진행 막대 (가운데, 늘어남) */}
            <div className="min-w-0 flex-1 xl:px-4">
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">
                  {tierStatus.next ? <>다음 등급 <b style={{ color: tierStatus.next.color }}>{tierStatus.next.name}</b>까지 <b className="text-brand-600">{pt(tierStatus.toNext)}</b></> : <b className="text-slate-700">최고 등급 달성 🎉</b>}
                </span>
                <span className="text-slate-400">12개월 총적립 {pt(summary.earned)}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(tierStatus.progress * 100)}%`, background: tierStatus.tier.color }} />
              </div>
              <div className="mt-1 flex justify-between">
                {TIERS.map((t, i) => (
                  <span key={t.name} className={`text-[10px] font-semibold ${i === tierStatus.index ? '' : 'text-slate-300'}`} style={i === tierStatus.index ? { color: t.color } : undefined}>{t.name}</span>
                ))}
              </div>
            </div>

            {/* 포인트 통계 (우측) */}
            <div className="flex shrink-0 items-center divide-x divide-slate-200 rounded-lg bg-slate-50 py-2">
              <Stat label="사용 가능" value={pt(balance)} cls="text-brand-600" />
              <Stat label="총적립" value={pt(summary.earned)} />
              <Stat label="사용(교환)" value={pt(redeemedPts)} />
              <Stat label="만료 예정" value={pt(expiringPoints)} cls="text-rose-500" />
            </div>
          </div>
        </Card>

        {/* 리워드 X2 캠페인 — 호텔 프로모 카드 (호텔 교섭 프로모 · 클릭 시 예약 페이지 이동) */}
        {campaigns.length > 0 && (
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="text-[15px] font-bold text-slate-800">🎁 리워드 X2 캠페인</p>
              <span className="text-[11px] text-slate-400">호텔 프로모션 · 카드를 누르면 해당 호텔 예약 페이지로 이동합니다</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onBookHotel?.(bookTarget(c))}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-brand-300 hover:shadow-md"
                >
                  {/* 호텔 사진 영역 */}
                  <div className="relative h-32 overflow-hidden">
                    {c.image ? (
                      <img src={c.image} alt={c.hotelName} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-400 to-brand-600 text-white">
                        <span className="text-4xl opacity-90" aria-hidden>🏨</span>
                      </div>
                    )}
                    <span className="absolute left-2 top-2 rounded-md bg-white/95 px-2 py-1 text-[13px] font-extrabold text-brand-600 shadow">{c.multiplier}X 리워드</span>
                    <span className="absolute right-2 top-2 rounded-sm bg-slate-900/70 px-1.5 py-0.5 text-[9px] font-bold text-white">{Math.round(c.multiplier * 100)}% 적립</span>
                  </div>
                  {/* 정보 */}
                  <div className="p-3">
                    <p className="truncate text-[13px] font-bold text-slate-800">{c.hotelName}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">예약 기간 {c.start} ~ {c.end} <span className="text-slate-300">(예약일 기준)</span></p>
                    <p className="mt-2 flex items-center justify-between text-[12px] font-bold text-brand-600">
                      <span>이 호텔 예약 시 {c.multiplier}배 적립</span>
                      <span className="transition group-hover:translate-x-0.5">예약하기 →</span>
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Gift Mall — 자체 UI · 거래처 국가 카탈로그 · Giftronaut API 발송 */}
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-bold text-slate-800">💎 Gift Mall</p>
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {countryInfo(mallCountry).flag} {countryInfo(mallCountry).name} 기프트카드
            </span>
            <span className="text-[11px] text-slate-400">상품·권종을 고르면 기프트카드가 등록 이메일로 발송됩니다 · 교환 취소 불가</span>
            <span className="ml-auto text-[12px] text-slate-500">사용 가능 <b className="text-brand-600">{pt(balance)}</b></span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {mallProducts.map((p) => {
              const cur = countryInfo(p.country).currency;
              const minPts = faceToPoints(Math.min(...p.prices), cur);
              const affordable = balance >= minPts;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setGiftProduct(p); setGiftFace(null); }}
                  className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-50 text-2xl" aria-hidden>{p.icon}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{p.category}</span>
                  </div>
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{p.brand}</p>
                  <p className="text-[13px] font-bold leading-snug text-slate-800">{p.name}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {fmtFace(Math.min(...p.prices), p.country)} ~ {fmtFace(Math.max(...p.prices), p.country)}
                  </p>
                  <p className="mt-auto flex items-center justify-between pt-3 text-[12px]">
                    <b className={affordable ? 'text-brand-600' : 'text-slate-400'}>{pt(minPts)}~</b>
                    <span className="text-[11px] text-slate-400 transition group-hover:text-brand-600">{affordable ? '교환하기 →' : '포인트 부족'}</span>
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 본문 2단 (풀폭) — 좌: 적립 내역(넓게) / 우: 교환 내역 */}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
          {/* 적립 내역 */}
          <Card className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-bold text-slate-800">
                적립 내역 <span className="text-[11px] font-normal text-slate-400">(표시 {shownAccruals.length}건 / 전체 {accruals.length}건 · 투숙+지불 완료 자동 적립)</span>
              </p>
              <div className="flex items-center gap-2">
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as '3m' | '6m' | '1y' | 'all')}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 focus:border-brand-400 focus:outline-none"
                  title="적립 내역 기간"
                >
                  <option value="3m">최근 3개월</option>
                  <option value="6m">최근 6개월</option>
                  <option value="1y">최근 1년</option>
                  <option value="all">전체</option>
                </select>
                <span className="text-[10px] text-slate-400">예약 코드 클릭 시 이동</span>
              </div>
            </div>
            <div className="max-h-[560px] overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 [&>th]:sticky [&>th]:top-0 [&>th]:bg-slate-50">
                    <th className="px-4 py-2.5 text-left font-semibold">날짜</th>
                    <th className="px-4 py-2.5 text-left font-semibold">예약 코드</th>
                    <th className="px-4 py-2.5 text-left font-semibold">호텔</th>
                    <th className="px-4 py-2.5 text-right font-semibold">적립 포인트</th>
                  </tr>
                </thead>
                <tbody>
                  {shownAccruals.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-[11px] text-slate-400">{accruals.length === 0 ? '아직 적립 내역이 없습니다.' : '선택한 기간에 해당하는 적립 내역이 없습니다.'}</td></tr>}
                  {shownAccruals.map((a: Accrual) => (
                    <tr key={a.ellisCode} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                      <td className="px-4 py-2.5 text-slate-600">{a.stayCompleted}</td>
                      <td className="px-4 py-2.5">
                        <button type="button" onClick={() => onOpenBooking(a.ellisCode)} className="font-mono text-[11px] text-brand-600 underline underline-offset-2 hover:text-brand-700" title="이 예약을 Bookings에서 보기">{a.ellisCode}</button>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{a.hotelName}{a.promoLabel && <PromoBadge label={a.promoLabel} />}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-brand-600">+{pt(a.points)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* 교환 내역 — 상태: 처리 중(보류) · 이메일 발송 · 반송(재발송) · 실패(포인트 복원) */}
          <div className="min-w-0 space-y-3">
            <Card>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[13px] font-bold text-slate-800">교환 내역</p>
                <span className="text-[10px] text-slate-400">발송 이메일 {account.id}</span>
              </div>
              <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-center">
                <p className="text-[10px] text-brand-600/80">사용 가능</p>
                <p className="text-2xl font-extrabold text-brand-600">{pt(balance)}</p>
              </div>
              <div className="mt-3 space-y-1.5">
                {redeemed.length === 0 && (
                  <p className="py-6 text-center text-[11px] text-slate-400">아직 교환 내역이 없습니다.<br />위 Gift Mall에서 상품을 골라 교환하세요.</p>
                )}
                {redeemed.map((v) => {
                  const prod = GIFT_CATALOG.find((x) => x.id === v.productId);
                  const st = REDEEM_STYLE[v.status];
                  return (
                    <div key={v.id} className="rounded border border-slate-200 px-3 py-2 text-[11px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold text-slate-700">{prod?.icon} {prod?.name ?? v.productId}</span>
                        <span className={`shrink-0 font-bold ${v.status === 'failed' ? 'text-slate-400 line-through' : 'text-brand-600'}`}>−{pt(v.points)}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-slate-400">{v.at} · {fmtFace(v.face, v.country)}</span>
                        <span className={`rounded-sm px-1.5 py-px text-[9px] font-bold ${st.cls}`}>{st.label}</span>
                      </div>
                      {v.failReason && <p className={`mt-1 text-[10px] ${v.status === 'bounced' ? 'text-orange-600' : 'text-rose-500'}`}>사유: {v.failReason}</p>}
                      {v.status === 'bounced' && (
                        <button
                          type="button"
                          onClick={() => setResend({ id: v.id, email: v.email })}
                          className="mt-1.5 w-full rounded border border-orange-300 bg-orange-50 px-2 py-1 text-[11px] font-semibold text-orange-700 hover:bg-orange-100"
                        >
                          이메일 확인 후 재발송
                        </button>
                      )}
                      {v.status === 'sent' && v.resent ? <p className="mt-1 text-[10px] text-slate-400">재발송 {v.resent}회 · {v.email}</p> : null}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>

        {/* 리워드 가이드 */}
        <div>
          <p className="mb-2 text-[15px] font-bold text-slate-800">리워드 가이드</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {GUIDE_ITEMS.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setGuide(g.key)}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:border-brand-300 hover:shadow"
              >
                <span className="text-2xl leading-none" aria-hidden>{g.icon}</span>
                <span className="text-[13px] font-bold text-slate-800">{g.title}</span>
                <span className="text-[10px] text-brand-600 underline underline-offset-2">{g.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-[10px] leading-relaxed text-slate-400">
          예약이 <b>투숙 완료 + 지불 완료</b>되면 <b>자동 적립</b>(취소·노쇼·환불 제외). 등급이 오를수록 더 많이 적립되고, 프로모션 호텔은 추가 적립(배수 배지). 포인트는 <b>OP 계정별 분리</b>({account.name} 예약 {myBookings.length}건 중 {summary.eligibleCount}건 적립)·<b>유효기간 1년(회계년도 기준)</b>. 교환은 <b>자체 Gift Mall</b>에서 하고 발송은 <b>Giftronaut Gift API</b>가 처리(USD Balance 차감). 교환은 세션 내 표시(새로고침 시 초기화). <b>미확정(결정 대기)</b>: 1P 가치 · 적립률 · 최소 교환 · 국가 노출 · 카드 타입(Branded/Choice) · 카드 유효기간(환급 옵션) — 현재 표시는 기존 임시값. 그 외 정책: 등급 임계값/부스트·세무.
        </p>

        {/* ELLIS 내부 프로모 관리 (고객 비노출) */}
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-100/60 p-3">
          <button type="button" onClick={() => setShowEllis((v) => !v)} className="flex w-full items-center justify-between text-left">
            <span className="text-[12px] font-bold text-slate-700">🔧 ELLIS 내부 — 포인트 프로모 · Gift API 관리 <span className="font-normal text-slate-400">(고객 비노출 · 시연)</span></span>
            <span className="text-[10px] text-slate-400">{showEllis ? '접기 ▲' : '펼치기 ▼'}</span>
          </button>
          {showEllis && (
            <div className="mt-3">
              {/* Giftronaut Gift API — Balance · 주문 로그 · 실패/반송 처리 · 국가 카탈로그 */}
              <div className="mb-4 rounded border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-bold text-slate-800">Giftronaut Gift API</span>
                  <span className="rounded-sm bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">SANDBOX</span>
                  <span className="text-[10px] text-slate-400">api.giftronaut.com/api/v1 · OAuth2 client_credentials · Production 전환 = 새 App + 서버 IP 허용목록 승인</span>
                  <label className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-600">
                    다음 교환 결과
                    <select
                      value={simNext}
                      onChange={(e) => setSimNext(e.target.value as SimOutcome)}
                      className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] focus:border-brand-400 focus:outline-none"
                      title="다음 교환에 적용할 API 결과(시연)"
                    >
                      {(Object.keys(SIM_LABEL) as SimOutcome[]).map((k) => <option key={k} value={k}>{SIM_LABEL[k]}</option>)}
                    </select>
                  </label>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className={`rounded border px-3 py-2 ${deposit < DEPOSIT_WARN_USD ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
                    <p className="text-[10px] text-slate-500">Balance (USD 선충전 · <code>GET /balance</code>)</p>
                    <p className={`text-[15px] font-extrabold ${deposit < DEPOSIT_WARN_USD ? 'text-rose-600' : 'text-slate-800'}`}>{usd(deposit)}</p>
                    {deposit < DEPOSIT_WARN_USD && <p className="text-[10px] text-rose-500">잔액 부족 임박 — 충전 필요</p>}
                    <p className="text-[9px] text-slate-400">Production 가정 시연 (Sandbox는 가상 $10,000 자동 보충)</p>
                  </div>
                  <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] text-slate-500">발송 / 반송 / 실패</p>
                    <p className="text-[15px] font-extrabold text-slate-800">
                      {redemptions.filter((x) => x.status === 'sent').length} / <span className="text-orange-500">{redemptions.filter((x) => x.status === 'bounced').length}</span> / <span className="text-rose-500">{redemptions.filter((x) => x.status === 'failed').length}</span>
                    </p>
                    <p className="text-[9px] text-slate-400">웹훅: delivery_complete · bounced(5분 배치) — HMAC 서명 검증</p>
                  </div>
                  <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] leading-relaxed text-slate-500">
                    충전(포털 Add Funds, USD만): Wire <b>무수수료</b>·1–2영업일 · 카드 <b>3%</b>·~10분 · API 충전(ACH)은 미국 EIN 필요<br />
                    잔액 알림: low_balance 웹훅 <b>미제공(예정)</b> → 자체 조회로 알림 · 기준 <b className="text-amber-600">미확정</b><br />
                    일·월 주문 한도(USD): 계정 설정값 <b className="text-amber-600">확인 필요</b> · 증액은 요청 API
                  </div>
                </div>

                {/* 주문 로그 */}
                <div className="mt-3 overflow-x-auto rounded border border-slate-200">
                  <table className="w-full min-w-[720px] text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                        <th className="px-3 py-1.5 text-left font-semibold">orderId · idempotencyKey</th>
                        <th className="px-3 py-1.5 text-left font-semibold">계정 · 발송 이메일</th>
                        <th className="px-3 py-1.5 text-left font-semibold">상품 · 권종</th>
                        <th className="px-3 py-1.5 text-right font-semibold">포인트</th>
                        <th className="px-3 py-1.5 text-right font-semibold">Balance 차감</th>
                        <th className="px-3 py-1.5 text-center font-semibold">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {redemptions.length === 0 && (
                        <tr><td colSpan={6} className="px-3 py-4 text-center text-slate-400">주문 없음 — 고객이 Gift Mall에서 교환하면 여기에 기록됩니다.</td></tr>
                      )}
                      {redemptions.map((x) => {
                        const prod = GIFT_CATALOG.find((g) => g.id === x.productId);
                        const st = REDEEM_STYLE[x.status];
                        return (
                          <tr key={x.id} className="border-b border-slate-100 last:border-0">
                            <td className="px-3 py-1.5 font-mono text-slate-600">
                              {x.orderNo ?? <span className="text-slate-400">— (미생성)</span>}
                              <span className="block text-[9px] text-slate-400">{x.idempotencyKey}</span>
                            </td>
                            <td className="px-3 py-1.5 text-slate-600">
                              {x.accountId}
                              {x.email !== x.accountId && <span className="block text-[9px] text-orange-600">→ {x.email}</span>}
                            </td>
                            <td className="px-3 py-1.5 text-slate-700">{prod?.name ?? x.productId} · {fmtFace(x.face, x.country)}</td>
                            <td className="px-3 py-1.5 text-right text-slate-700">{pt(x.points)}</td>
                            <td className="px-3 py-1.5 text-right text-slate-700">{x.orderNo ? usd(x.usd) : '—'}</td>
                            <td className="px-3 py-1.5 text-center"><span className={`rounded-sm px-1.5 py-px text-[9px] font-bold ${st.cls}`}>{st.label}</span>{x.failReason && <span className="ml-1 text-[10px] text-rose-500">{x.failReason}</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 국가별 카탈로그 미리보기 */}
                <div className="mt-3">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-600">국가별 카탈로그</span>
                    {GIFT_COUNTRIES.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => setPreviewCountry(c.code)}
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${previewCountry === c.code ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                      >
                        {c.flag} {c.code}{(c.code === 'CN' || c.code === 'IN') && ' ★'}
                      </button>
                    ))}
                    <span className="text-[10px] text-slate-400">★ 사업 우선순위 · 브랜드 = Giftronaut 공개 카탈로그 · 권종 예시 — 국가별 Top 5 + 권종 수령 후 교체 (<code>GET /catalog/branded-cards</code>, countryCode {countryInfo(previewCountry).iso3})</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-5">
                    {catalogOf(previewCountry).map((p) => (
                      <div key={p.id} className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px]">
                        <p className="font-semibold text-slate-700">{p.icon} {p.name}</p>
                        <p className="text-slate-500">{p.priceType} · {p.prices.map((d) => fmtFace(d, p.country)).join(' · ')}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
                    고객 노출: 거래처 국가 1개(현재 {countryInfo(mallCountry).name}) — <b className="text-amber-600">노출 방식 미확정</b>.
                    대안: <b className="text-slate-600">Choice Card</b>(USD 액면 · 수령자가 225개국 브랜드 중 선택, <code>POST /orders/choice-cards</code>) — <b className="text-amber-600">도입 여부 미확정</b>.
                  </p>
                </div>
              </div>

              <p className="mb-2 text-[11px] leading-relaxed text-slate-500">
                리워드 배수(예: <b className="text-slate-700">2X 리워드</b>)는 <b className="text-slate-700">ELLIS 내부</b>에서 설정 — <b>호텔별 · 룸타입별 · 레이트플랜별</b>(+ 예약일 기준 기간). 고객 화면엔 요율(내부 기본 {OP_POINT_POLICY.baseRatePct}%)이 아니라 <b>배수 배지</b>(예: 200% 적립)로만 노출. 값 변경 시 위 적립 내역 즉시 재계산. (룸타입·레이트플랜은 콤마로 여러 개, <code>all</code>=전체)
              </p>
              <div className="overflow-x-auto rounded border border-slate-200 bg-white">
                <table className="w-full min-w-[860px] text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                      <th className="px-3 py-2 text-left font-semibold">호텔 (지정)</th>
                      <th className="px-3 py-2 text-left font-semibold">룸타입</th>
                      <th className="px-3 py-2 text-left font-semibold">레이트플랜</th>
                      <th className="px-3 py-2 text-left font-semibold">기간(예약일)</th>
                      <th className="px-3 py-2 text-center font-semibold">배수</th>
                      <th className="px-3 py-2 text-center font-semibold">고객 표시</th>
                      <th className="px-3 py-2 text-center font-semibold">활성</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promos.map((p) => (
                      <tr key={p.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2 text-slate-700">{p.hotelName} <span className="font-mono text-[10px] text-slate-400">{p.hotelId}</span></td>
                        <td className="px-3 py-2">
                          <input type="text" value={listStr(p.roomType)} onChange={(e) => setPromo(p.id, { roomType: parseList(e.target.value) })}
                            className="w-28 rounded border border-slate-300 px-1.5 py-0.5 text-[11px] focus:border-brand-400 focus:outline-none" placeholder="all / Twin, 더블" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="text" value={listStr(p.ratePlan)} onChange={(e) => setPromo(p.id, { ratePlan: parseList(e.target.value) })}
                            className="w-24 rounded border border-slate-300 px-1.5 py-0.5 text-[11px] focus:border-brand-400 focus:outline-none" placeholder="all / RP-1" />
                        </td>
                        <td className="px-3 py-2 text-slate-600">{p.start} ~ {p.end}</td>
                        <td className="px-3 py-2 text-center">
                          <input type="number" step="0.1" min="1" value={p.multiplier}
                            onChange={(e) => setPromo(p.id, { multiplier: Math.max(1, Number(e.target.value) || 1) })}
                            className="w-16 rounded border border-slate-300 px-1.5 py-0.5 text-right text-[11px] focus:border-brand-400 focus:outline-none" />
                          ×
                        </td>
                        <td className="px-3 py-2 text-center"><span className="rounded-sm bg-brand-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{Math.round(p.multiplier * 100)}% 적립</span></td>
                        <td className="px-3 py-2 text-center"><input type="checkbox" checked={p.active} onChange={(e) => setPromo(p.id, { active: e.target.checked })} className="accent-brand-500" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gift Mall 상품 상세 — 권종 선택 → 교환 확인 */}
      {giftProduct && (() => {
        const p = giftProduct;
        const cur = countryInfo(p.country).currency;
        const selPts = giftFace !== null ? faceToPoints(giftFace, cur) : null;
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setGiftProduct(null)}>
            <div className="w-[440px] max-w-full overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-800"><span className="text-xl" aria-hidden>{p.icon}</span>{p.name}</span>
                <button type="button" onClick={() => setGiftProduct(null)} className="text-slate-400 hover:text-slate-700" aria-label="닫기">✕</button>
              </div>
              <div className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{p.brand}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{p.category}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{countryInfo(p.country).flag} {countryInfo(p.country).name}에서 사용</span>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-slate-600">{p.desc}</p>

                <p className="mb-1.5 mt-4 text-[12px] font-bold text-slate-800">권종 선택</p>
                <div className="grid grid-cols-3 gap-2">
                  {p.prices.map((d) => {
                    const need = faceToPoints(d, cur);
                    const belowMin = need < MIN_REDEEM_PTS;
                    const ok = balance >= need && !belowMin;
                    const on = giftFace === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={!ok}
                        onClick={() => setGiftFace(d)}
                        className={`rounded-lg border p-2.5 text-center transition ${on ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-300' : ok ? 'border-slate-200 hover:border-brand-300' : 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60'}`}
                      >
                        <p className="text-[13px] font-extrabold text-slate-800">{fmtFace(d, p.country)}</p>
                        <p className={`mt-0.5 text-[11px] font-bold ${ok ? 'text-brand-600' : 'text-slate-400'}`}>{pt(need)}</p>
                        {!ok && <p className="text-[9px] text-slate-400">{belowMin ? '최소 교환 미만' : '포인트 부족'}</p>}
                      </button>
                    );
                  })}
                </div>

                {selPts !== null && (
                  <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px]">
                    <span className="text-slate-600">차감 <b className="text-brand-600">{pt(selPts)}</b></span>
                    <span className="text-slate-400">교환 후 사용 가능 {pt(r1(balance - selPts))}</span>
                  </div>
                )}
                <div className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
                  <p>발송 이메일 <b className="font-mono text-slate-800">{account.id}</b></p>
                  <p className="text-slate-500">받은 이메일의 <b>Redeem</b> 버튼 → 이메일 인증(1-클릭 링크, 10분 유효) 후 사용합니다. 받는 사람이 이 메일함에 접근할 수 있어야 합니다.</p>
                </div>
                <p className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium leading-relaxed text-rose-600">
                  ⚠ 교환은 <b>취소할 수 없습니다.</b> 주문이 처리되지 않으면 포인트는 자동 복원되고, 이메일이 반송되면 교환 내역에서 재발송할 수 있습니다.
                </p>
              </div>
              <div className="flex gap-2 border-t border-slate-200 px-5 py-3">
                <button type="button" onClick={() => setGiftProduct(null)} className="flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">닫기</button>
                <button
                  type="button"
                  disabled={giftFace === null}
                  onClick={() => giftFace !== null && doRedeem(p, giftFace)}
                  className="flex-1 rounded bg-brand-500 px-3 py-2 text-[12px] font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  교환하기
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 반송 건 재발송 — 이메일 확인·수정 (추가 포인트 차감 없음) */}
      {resend && (() => {
        const rec = redemptions.find((x) => x.id === resend.id);
        const prod = rec && GIFT_CATALOG.find((g) => g.id === rec.productId);
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setResend(null)}>
            <div className="w-[420px] max-w-full overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
                <span className="text-sm font-bold text-slate-800">기프트카드 재발송</span>
                <button type="button" onClick={() => setResend(null)} className="text-slate-400 hover:text-slate-700" aria-label="닫기">✕</button>
              </div>
              <div className="px-5 py-4 text-[12px] text-slate-600">
                <p>{prod?.icon} <b className="text-slate-800">{prod?.name}</b>{rec && <> · {fmtFace(rec.face, rec.country)}</>}</p>
                <p className="mt-1 text-[11px] text-orange-600">이전 발송 이메일이 반송되었습니다. 받을 이메일을 확인해 주세요.</p>
                <label className="mt-3 block text-[11px] font-semibold text-slate-700" htmlFor="resend-email">받을 이메일</label>
                <input
                  id="resend-email"
                  type="email"
                  value={resend.email}
                  onChange={(e) => setResend({ ...resend, email: e.target.value })}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 font-mono text-[12px] focus:border-brand-400 focus:outline-none"
                />
                <p className="mt-2 text-[10px] text-slate-400">이미 발급된 기프트카드를 다시 보내므로 포인트는 추가로 차감되지 않습니다.</p>
              </div>
              <div className="flex gap-2 border-t border-slate-200 px-5 py-3">
                <button type="button" onClick={() => setResend(null)} className="flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">닫기</button>
                <button type="button" onClick={() => doResend(resend.id, resend.email)} className="flex-1 rounded bg-brand-500 px-3 py-2 text-[12px] font-semibold text-white hover:bg-brand-600">재발송</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 리워드 가이드 모달 */}
      {guide && (() => {
        const g = GUIDE_ITEMS.find((x) => x.key === guide);
        if (!g) return null;
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setGuide(null)}>
            <div className="w-[440px] max-w-full overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-800"><span className="text-lg" aria-hidden>{g.icon}</span>{g.title}</span>
                <button type="button" onClick={() => setGuide(null)} className="text-slate-400 hover:text-slate-700" aria-label="닫기">✕</button>
              </div>
              <div className="px-5 py-4">
                <p className="text-[12px] leading-relaxed text-slate-600">{g.body}</p>
              </div>
              <div className="border-t border-slate-200 px-5 py-3">
                <button type="button" onClick={() => setGuide(null)} className="w-full rounded bg-slate-800 px-3 py-2 text-[12px] font-semibold text-white hover:bg-slate-900">닫기</button>
              </div>
            </div>
          </div>
        );
      })()}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-white shadow-lg">
          <span>{toast}</span>
          <button type="button" onClick={() => setToast(null)} className="ml-3 text-slate-400 hover:text-white">✕</button>
        </div>
      )}
    </div>
  );
}
