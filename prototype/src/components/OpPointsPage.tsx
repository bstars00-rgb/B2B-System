import { useMemo, useState } from 'react';
import type { Booking } from '../types';
import EnhBadge from './EnhBadge';
import { todayIso } from '../utils/dashboardStats';
import {
  OP_POINT_POLICY, DEFAULT_POINT_POLICY, DEFAULT_TIERS, FX_TO_KRW, TIER_MIN_DIVISOR_MONTHS, TIER_WINDOW_MONTHS, computeAccruals, monthlyAvgKRW, summarize,
  tierBoostPct, tierFor, faceToPoints, pointsToUsd, unitKRWOf, toKRW, type Accrual, type PointPolicy, type Tier,
} from '../utils/opPoints';
import { SEED_PROMOS, type PointPromo } from '../mocks/opPointsPromos';
import { OP_ACCOUNTS, opAccountIdFor } from '../mocks/opAccounts';
import { hotelCodeOf, cityOfHotel } from '../mocks/hotelDb';
import {
  CHOICE_CARD,
  CHOICE_VALUES_USD,
  SEED_DEPOSIT_USD,
  countryInfo,
  expiryOf,
  redeemFace,
  redeemName,
  seedRedemptions,
  type GiftRedemption,
  type RedeemStatus,
} from '../mocks/giftCatalog';

export interface BookHotelTarget { code: string; destination: string; hotelName: string; }

/**
 * OP 포인트 — 오피포인트. **프로토타입 · 폐기 가능.**
 *
 * 포털(Dashboard) 카드 스타일과 통일한 풀폭 레이아웃.
 * OP = 마켓플레이스 이용 여행사 대표·직원. 예약·투숙 완료+지불 완료 시 자동 적립 → 등급제(Bronze~Diamond) → 포인트 교환.
 * 교환(2026-10-02 · HBX 방식 · 심플하게): 포인트 카드의 **[포인트 교환]** → 금액(USD)만 선택 → Giftronaut **초이스 카드**
 *   (`POST /orders/choice-cards`) → 이메일 링크에서 수령자가 거주 국가 브랜드를 직접 선택. 국가별 상품 진열 없음. OMH USD Balance 차감.
 *   API 문서(https://api.giftronaut.com/docs/reference) 검토 반영: 주문 상태·반송(bounce)·재발송·idempotencyKey·Balance.
 * 적립 요율·계산식 비노출(배수 배지·상대 부스트만). 계정별 분리. 유효기간 1년.
 * 결정(2026-09-29): 1P 가치·최소 교환 = **ELLIS 정책값**(지금 고정 안 함) · 기프트카드 **180일, 미사용 소멸(환급 없음) + 내부 Audit** ·
 *   Balance 충전 = **해외송금만**, 잔액은 ELLIS에서 `GET /balance`로 확인(고객 비노출, 별도 알림 없음).
 * 카드 타입 = 초이스 카드 하나(2026-10-02) → '국가 노출' 문제도 해소(브랜드·통화는 수령자가 선택). 적립률 = 1% 확정(2026-10-02).
 * 초이스 카드 금액 범위(min~max)·주문 한도는 API 연동 시 확인 → 금액 칸(CHOICE_VALUES_USD) 조정.
 *
 * ※ 폐기: opPoints.ts + 이 파일 + opPointsPromos.ts + opAccounts.ts + giftCatalog.ts + 사이드바 메뉴 한 줄 삭제.
 */

const pt = (n: number) => `${n.toLocaleString('ko-KR', { maximumFractionDigits: 1 })} P`;
const r1 = (n: number) => Math.round(n * 10) / 10;
/** 원화 금액 — 1만 원 이상은 'N만 원'(예: 1,000만 원) · 등급 기준 표시용 */
const won = (n: number) => (n >= 10000 ? `${Math.round(n / 10000).toLocaleString('ko-KR')}만 원` : `${Math.round(n).toLocaleString('ko-KR')}원`);
/** 콤마 구분 문자열 ↔ 리스트('all'=전체). ELLIS 룸타입·레이트플랜 편집용. */
const listStr = (v: string[] | 'all') => (v === 'all' ? 'all' : v.join(', '));
const parseList = (s: string): string[] | 'all' => {
  const t = s.trim();
  if (!t || t.toLowerCase() === 'all') return 'all';
  return t.split(',').map((x) => x.trim()).filter(Boolean);
};
const r2 = (n: number) => Math.round(n * 100) / 100;
const usd = (n: number) => `USD ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/** 로컬 시각 'YYYY-MM-DD HH:mm' — 감사 이력용 */
const stamp = () => {
  const d = new Date();
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`;
};
const daysBetween = (a: string, b: string) => Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86400000);
const VALID_DAYS = OP_POINT_POLICY.giftCardValidityDays;
/** 고객 화면용 실패 문구 — 내부 사유(API 코드·Balance 부족)는 고객에게 노출하지 않는다 */
const CUSTOMER_FAIL_MSG = '일시적인 오류로 교환되지 않았습니다 · 포인트는 복원되었습니다';

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
 * ※ 자동 적립이라 'Join'/'Opt out' 카드는 제외. 등급·프로모·포인트 교환 중심.
 */
const GUIDE_ITEMS: { key: string; icon: string; title: string; desc: string; body: string }[] = [
  { key: 'earn', icon: '✨', title: '적립 방법', desc: '포인트는 어떻게 쌓이나요?',
    body: '마켓플레이스에서 예약하고 투숙을 마친 뒤 지불이 완료되면 자동으로 적립됩니다(별도 가입 없음). 적립률은 체크아웃 시점의 등급을 따릅니다. 취소·노쇼·환불은 제외되며, 선불 업체는 체크아웃 시점에, 후불 업체는 지불 완료 시점에 적립됩니다.' },
  { key: 'tiers', icon: '🏆', title: '등급', desc: '등급 혜택 알아보기',
    body: '등급은 매월 1일, 직전 6개월의 월 평균 예약액(체크아웃 완료 기준)으로 정해집니다 — 기본 Bronze, 월 평균 300만 원 이상 Silver(+20% 적립), 1,500만 원 이상 Gold(+30%), 3,000만 원 이상 Diamond(+50%). 각 예약은 체크아웃한 달의 등급으로 적립됩니다. 처음 이용하신 분은 최소 3개월로 나눠 계산합니다.' },
  { key: 'campaign', icon: '🎁', title: '리워드 X2 캠페인', desc: '추가 적립 받는 법',
    body: '지정된 프로모션 호텔에서 예약하면 리워드가 2배(2X) 등으로 추가 적립됩니다. 호텔별·룸타입별·레이트플랜별·기간(예약일)별로 운영되며, 목록·검색에 "200% 적립" 같은 배수 배지로 표시됩니다. 요율·계산식은 내부에서 관리되어 고객에겐 배지로만 노출됩니다.' },
  { key: 'points', icon: '⭐', title: '포인트 · 유효기간', desc: '포인트는 어떻게 구분되나요?',
    body: '포인트는 사용 가능 · 총적립(12개월) · 만료 예정으로 구분됩니다. 유효기간은 1년이며 회계년도 마감에 맞춰 관리됩니다. 포인트는 예약 담당자(OP) 개인 계정에 적립되어 계정별로 분리됩니다.' },
  { key: 'redeem', icon: '💎', title: '포인트 교환', desc: '포인트 교환하는 법',
    body: '상단 [포인트 교환]을 누르고 금액을 고르면 등록 이메일로 기프트카드 링크가 발송됩니다. 링크에서 원하는 브랜드를 직접 골라 거주 국가 통화로 받을 수 있고, 사용할 때 이메일 인증(1-클릭 링크)을 거칩니다. 교환은 취소할 수 없으며, 주문이 처리되지 않으면 포인트는 자동으로 복원됩니다. 이메일이 반송되면 교환 내역에서 이메일을 확인해 재발송할 수 있습니다. 기프트카드 유효기간은 발송일로부터 180일이며, 기간 내 사용하지 않으면 소멸됩니다(환불 없음).' },
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

  // ── ELLIS 포인트 정책 (2026-09-29 결정: 1P 가치·최소 교환은 ELLIS 정책값) ──
  const [policy, setPolicy] = useState<PointPolicy>(DEFAULT_POINT_POLICY);
  const [policyDraft, setPolicyDraft] = useState<PointPolicy>(DEFAULT_POINT_POLICY);
  /** 정책 변경 이력 — 감사용(append-only) */
  const [policyLog, setPolicyLog] = useState<{ at: string; item: string; from: string; to: string }[]>([]);
  const unitKRW = unitKRWOf(policy);
  const minRedeemPts = policy.minRedeemPts;
  const fmtUnit = (p: PointPolicy) => (p.unitCurrency === 'USD' ? `US$${p.unitValue}` : `₩${p.unitValue.toLocaleString()}`);
  const draftValid = policyDraft.unitValue > 0 && policyDraft.minRedeemPts > 0;
  const draftChanged = JSON.stringify(policyDraft) !== JSON.stringify(policy);
  const applyPolicy = () => {
    if (!draftValid || !draftChanged) return;
    const at = stamp();
    const logs: { at: string; item: string; from: string; to: string }[] = [];
    if (policyDraft.unitCurrency !== policy.unitCurrency || policyDraft.unitValue !== policy.unitValue) logs.push({ at, item: '1P 가치', from: fmtUnit(policy), to: fmtUnit(policyDraft) });
    if (policyDraft.minRedeemPts !== policy.minRedeemPts) logs.push({ at, item: '최소 교환', from: pt(policy.minRedeemPts), to: pt(policyDraft.minRedeemPts) });
    setPolicyLog((prev) => [...logs, ...prev]);
    setPolicy(policyDraft);
    setToast('포인트 정책을 적용했습니다 (변경 이력 기록)');
  };

  // ── 포인트 교환 (HBX 방식 · 초이스 카드) + Giftronaut Gift API(시연) ──
  // 전 계정 주문 로그(ELLIS · 감사) — 고객 화면은 본인 것만. 과거 사례(다른 OP 계정) 시드 포함
  const [redemptions, setRedemptions] = useState<GiftRedemption[]>(() => seedRedemptions(todayIso()));
  const [deposit, setDeposit] = useState(SEED_DEPOSIT_USD);
  const [simNext, setSimNext] = useState<SimOutcome>('ok');
  /** 반송 건 재발송 — 이메일 확인·수정(`updatedEmail`) */
  const [resend, setResend] = useState<{ id: string; email: string } | null>(null);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemUsd, setRedeemUsd] = useState<number | null>(null);
  const redeemed = useMemo(() => redemptions.filter((x) => x.accountId === accountId), [redemptions, accountId]);
  const addEvent = (recId: string, text: string, patch: Partial<GiftRedemption> = {}) =>
    setRedemptions((prev) => prev.map((x) => (x.id === recId ? { ...x, ...patch, events: [...x.events, { at: stamp(), text }] } : x)));

  // ── 등급 정책 (2026-10-02 확정: 등급별 적립률 · 월 평균 예약액 기준 · 체크아웃 시점 적용) — ELLIS에서 기준·적립률 설정 ──
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS);
  const [tierDraft, setTierDraft] = useState<Tier[]>(DEFAULT_TIERS);
  const tierDraftValid = tierDraft.every((t, i) => t.ratePct > 0 && (i === 0 ? t.minMonthlyKRW === 0 : t.minMonthlyKRW > tierDraft[i - 1].minMonthlyKRW));
  const tierDraftChanged = JSON.stringify(tierDraft) !== JSON.stringify(tiers);
  const applyTiers = () => {
    if (!tierDraftValid || !tierDraftChanged) return;
    const at = stamp();
    const logs = tierDraft.flatMap((t, i) => {
      const o = tiers[i];
      const out: { at: string; item: string; from: string; to: string }[] = [];
      if (o.minMonthlyKRW !== t.minMonthlyKRW) out.push({ at, item: `${t.name} 기준(월 평균)`, from: won(o.minMonthlyKRW), to: won(t.minMonthlyKRW) });
      if (o.ratePct !== t.ratePct) out.push({ at, item: `${t.name} 적립률`, from: `${o.ratePct}%`, to: `${t.ratePct}%` });
      return out;
    });
    setPolicyLog((prev) => [...logs, ...prev]);
    setTiers(tierDraft);
    setToast('등급 정책을 적용했습니다 (변경 이력 기록)');
  };

  const accruals = useMemo(() => computeAccruals(myBookings, today, promos, unitKRW, tiers), [myBookings, today, promos, unitKRW, tiers]);
  const summary = useMemo(() => summarize(accruals, today), [accruals, today]);
  // 처리 중(보류)·발송·반송은 차감 — 반송은 카드가 이미 발급돼 재발송 대상. 실패(주문 미생성)만 복원되어 잔액에 포함
  const redeemedPts = r1(redeemed.filter((x) => x.status !== 'failed').reduce((s, x) => s + x.points, 0));
  const balance = r1(summary.earned - redeemedPts);
  const redeemedThisYear = r1(redeemed.filter((x) => x.status !== 'failed' && x.at.slice(0, 4) === today.slice(0, 4)).reduce((s, x) => s + x.points, 0));

  /** 현재 월 평균 예약액(최근 12개월 · 체크아웃 완료) → 현재 등급 */
  const monthlyAvg = useMemo(() => monthlyAvgKRW(myBookings, today), [myBookings, today]);
  const tierStatus = useMemo(() => tierFor(monthlyAvg, tiers), [monthlyAvg, tiers]);
  const boostPct = tierBoostPct(tierStatus.tier, tiers);

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

  // ── 감사(Audit) 집계 — 발급(주문 생성) 건 기준. 유효기간 180일, 미사용분 환급 없이 소멸 ──
  const issued = redemptions.filter((x) => x.orderNo);
  const expiringSoon = issued.filter((x) => {
    const d = daysBetween(today, expiryOf(x.at, VALID_DAYS));
    return d >= 0 && d <= 30;
  });
  const expired = issued.filter((x) => expiryOf(x.at, VALID_DAYS) < today);
  const issuedUsd = r2(issued.reduce((s, x) => s + x.usd, 0));

  /**
   * 교환 — 포인트 보류(processing) → `POST /orders/choice-cards`(초이스 카드 · USD · IMMEDIATE, idempotencyKey, refundOption=false) →
   *  · 201 생성 → COMPLETE(`order.delivery_complete`): 이메일 발송·Balance 차감(sent)
   *  · 201 생성 → `order.bounced`: 카드 발급·Balance 차감됨 → 포인트 유지, 이메일 확인 후 재발송(bounced)
   *  · 402/400 거절: 주문 미생성 → 포인트 자동 복원(failed). 사유는 ELLIS에만, 고객에겐 일반 문구
   * (타임아웃 등 결과 불명 시엔 키를 바꿔 재시도하지 않고 `GET /orders?clientOrderId={key}`로 확인 — 실서비스 처리)
   */
  const doRedeem = (face: number) => {
    const points = faceToPoints(face, 'USD', unitKRW);
    const cost = face; // 초이스 카드는 USD 액면 = Balance 차감액
    if (balance < points) { setToast(`포인트가 부족합니다 (필요 ${pt(points)}, 사용 가능 ${pt(balance)})`); return; }
    const id = `${Date.now()}`;
    const rec: GiftRedemption = {
      id, idempotencyKey: `omh-rdm-${id}`, accountId, email: account.id, productId: CHOICE_CARD.id, country: account.country,
      face, currency: 'USD', points, usd: cost, at: today, status: 'processing',
      events: [{ at: stamp(), text: `교환 요청 · ${pt(points)} 보류 (1P = ${fmtUnit(policy)})` }],
    };
    const sim = simNext;
    const outcome: SimOutcome = sim === 'ok' && deposit < cost ? 'insufficient' : sim;
    setSimNext('ok');
    setRedemptions((prev) => [rec, ...prev]);
    setRedeemOpen(false);
    setRedeemUsd(null);
    setToast(`교환 요청 접수 — 기프트카드 발송 처리 중 (${pt(points)} 보류)`);
    window.setTimeout(() => {
      if (outcome === 'validation' || outcome === 'insufficient') {
        const reason = outcome === 'validation' ? '400 VALIDATION_ERROR — 유효하지 않은 권종' : '402 INSUFFICIENT_BALANCE — Balance 부족';
        addEvent(id, `주문 거절 ${reason} · ${pt(points)} 복원`, { status: 'failed', failReason: reason });
        setToast(`✕ ${CUSTOMER_FAIL_MSG}`);
        return;
      }
      const orderNo = `OT${today.replace(/-/g, '')}${id.slice(-6)}`;
      const created = { at: stamp(), text: `주문 생성 ${orderNo} · Balance −${usd(cost)}` };
      setDeposit((d) => r2(d - cost));
      if (outcome === 'bounce') {
        setRedemptions((prev) => prev.map((x) => (x.id === id ? {
          ...x, orderNo, status: 'bounced', failReason: '이메일 반송(order.bounced)',
          events: [...x.events, created, { at: stamp(), text: '이메일 반송 (order.bounced)' }],
        } : x)));
        setToast(`⚠ ${account.id}로 보낸 기프트카드 이메일이 반송되었습니다 — 교환 내역에서 이메일 확인 후 재발송하세요`);
        return;
      }
      setRedemptions((prev) => prev.map((x) => (x.id === id ? {
        ...x, orderNo, status: 'sent',
        events: [...x.events, created, { at: stamp(), text: '발송 완료 (order.delivery_complete)' }],
      } : x)));
      setToast(`✓ US$${face} 기프트카드 링크가 ${account.id}로 발송되었습니다 — 링크에서 브랜드를 고르세요 (시연)`);
    }, 1200);
  };

  /** 반송 건 재발송 — `POST /orders/{orderId}/resend` { recipients: [{ email, updatedEmail }] }. 추가 차감 없음 */
  const doResend = (recId: string, email: string) => {
    const to = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) { setToast('이메일 형식을 확인해 주세요'); return; }
    const prevEmail = redemptions.find((x) => x.id === recId)?.email ?? '';
    setResend(null);
    addEvent(recId, `재발송 ${prevEmail}${to !== prevEmail ? ` → ${to}` : ' (동일 주소)'}`, { email: to, status: 'processing', failReason: undefined });
    setToast(`재발송 요청 — ${to}`);
    window.setTimeout(() => {
      setRedemptions((prev) => prev.map((x) => (x.id === recId ? {
        ...x, status: 'sent', resent: (x.resent ?? 0) + 1, events: [...x.events, { at: stamp(), text: '발송 완료 (order.delivery_complete)' }],
      } : x)));
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
            <EnhBadge note="오피포인트 — 자동 적립 + 등급제 + 포인트 교환(HBX 방식 · Giftronaut 초이스 카드). 프로토타입" />
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
                  {tierStatus.next ? <>다음 등급 <b style={{ color: tierStatus.next.color }}>{tierStatus.next.name}</b>까지 월 평균 <b className="text-brand-600">{won(tierStatus.toNext)}</b> 더</> : <b className="text-slate-700">최고 등급 달성 🎉</b>}
                </span>
                <span className="text-slate-400">월 평균 예약 {won(monthlyAvg)} <span className="text-slate-300">(직전 {TIER_WINDOW_MONTHS}개월 · 매월 1일 산정)</span></span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(tierStatus.progress * 100)}%`, background: tierStatus.tier.color }} />
              </div>
              <div className="mt-1 flex justify-between">
                {tiers.map((t, i) => (
                  <span key={t.name} className={`text-[10px] font-semibold ${i === tierStatus.index ? '' : 'text-slate-300'}`} style={i === tierStatus.index ? { color: t.color } : undefined}>
                    {t.name}{i > 0 && <span className="font-normal"> {won(t.minMonthlyKRW)}↑ · +{tierBoostPct(t, tiers)}%</span>}
                  </span>
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
            <button
              type="button"
              onClick={() => { setRedeemUsd(null); setRedeemOpen(true); }}
              className="shrink-0 rounded-lg bg-brand-500 px-5 py-3 text-[13px] font-bold text-white shadow-sm hover:bg-brand-600"
            >
              💎 포인트 교환
            </button>
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
                      <td className="px-4 py-2.5 text-right font-bold text-brand-600">
                        +{pt(a.points)}
                        <span className="ml-1 rounded-sm px-1 py-px text-[9px] font-bold text-white" style={{ background: tiers.find((t) => t.name === a.tierName)?.color ?? '#94a3b8' }} title="체크아웃 시점 등급">{a.tierName}</span>
                      </td>
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
                  <p className="py-6 text-center text-[11px] text-slate-400">아직 교환 내역이 없습니다.<br />상단 <b>💎 포인트 교환</b>으로 교환하세요.</p>
                )}
                {redeemed.map((v) => {
                  const st = REDEEM_STYLE[v.status];
                  return (
                    <div key={v.id} className="rounded border border-slate-200 px-3 py-2 text-[11px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold text-slate-700">💎 {redeemName(v)}</span>
                        <span className={`shrink-0 font-bold ${v.status === 'failed' ? 'text-slate-400 line-through' : 'text-brand-600'}`}>−{pt(v.points)}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-slate-400">{v.at} · {redeemFace(v)}</span>
                        <span className={`rounded-sm px-1.5 py-px text-[9px] font-bold ${st.cls}`}>{st.label}</span>
                      </div>
                      {/* 고객에겐 일반 문구만 — 내부 사유(API 코드·Balance 부족)는 ELLIS 감사 로그에만 */}
                      {v.status === 'failed' && <p className="mt-1 text-[10px] text-rose-500">{CUSTOMER_FAIL_MSG}</p>}
                      {v.status === 'bounced' && <p className="mt-1 text-[10px] text-orange-600">받는 이메일로 전달되지 않았습니다(반송).</p>}
                      {v.orderNo && v.status !== 'bounced' && <p className="mt-1 text-[10px] text-slate-400">유효기간 ~ {expiryOf(v.at, VALID_DAYS)} (미사용 시 소멸)</p>}
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
          예약이 <b>투숙 완료 + 지불 완료</b>되면 <b>자동 적립</b>(취소·노쇼·환불 제외). 등급(월 평균 예약액 기준)이 오를수록 더 많이 적립되고(체크아웃 시점 등급 적용), 프로모션 호텔은 추가 적립(배수 배지). 포인트는 <b>OP 계정별 분리</b>({account.name} 예약 {myBookings.length}건 중 {summary.eligibleCount}건 적립)·<b>유효기간 1년(회계년도 기준)</b>. 교환은 상단 <b>💎 포인트 교환</b>에서 금액만 고르면 <b>Giftronaut 초이스 카드</b> 링크가 이메일로 발송되고(USD Balance 차감), 브랜드는 링크에서 직접 고릅니다. 교환은 세션 내 표시(새로고침 시 초기화). <b>1P 가치·최소 교환은 ELLIS 정책값</b>(아래 ELLIS 패널에서 변경 · 이력 기록). 기프트카드 <b>유효기간 180일 · 미사용 소멸(환불 없음)</b>. 적립률 <b>1%</b>(확정). 등급 적립률 Bronze 1% · Silver 1.2% · Gold 1.3% · Diamond 1.5%(확정) — 등급 기준 금액은 ELLIS 설정. 그 외: 세무.
        </p>

        {/* ELLIS 내부 프로모 관리 (고객 비노출) */}
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-100/60 p-3">
          <button type="button" onClick={() => setShowEllis((v) => !v)} className="flex w-full items-center justify-between text-left">
            <span className="text-[12px] font-bold text-slate-700">🔧 ELLIS 내부 — 포인트 정책 · Gift API · 감사 · 프로모 관리 <span className="font-normal text-slate-400">(고객 비노출 · 시연)</span></span>
            <span className="text-[10px] text-slate-400">{showEllis ? '접기 ▲' : '펼치기 ▼'}</span>
          </button>
          {showEllis && (
            <div className="mt-3">
              {/* 포인트 정책 (ELLIS 설정) — 1P 가치·최소 교환은 지금 고정하지 않고 ELLIS에서 결정 (2026-09-29) */}
              <div className="mb-4 rounded border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-bold text-slate-800">포인트 정책</span>
                  <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">ELLIS 설정값</span>
                  <span className="text-[10px] text-slate-400">변경 시 이력 기록(감사) · 시연은 즉시 재계산</span>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-4">
                  <label className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                    <span className="block text-[10px] text-slate-500">1P 가치</span>
                    <span className="mt-1 flex items-center gap-1.5">
                      <select
                        value={policyDraft.unitCurrency}
                        onChange={(e) => setPolicyDraft({ ...policyDraft, unitCurrency: e.target.value as PointPolicy['unitCurrency'] })}
                        className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] focus:border-brand-400 focus:outline-none"
                        title="1P 가치 통화"
                      >
                        <option value="KRW">KRW</option>
                        <option value="USD">USD</option>
                      </select>
                      <input
                        type="number"
                        min={0}
                        step={policyDraft.unitCurrency === 'USD' ? 0.1 : 100}
                        value={policyDraft.unitValue}
                        onChange={(e) => setPolicyDraft({ ...policyDraft, unitValue: Number(e.target.value) || 0 })}
                        className="w-24 rounded border border-slate-300 px-1.5 py-0.5 text-right text-[11px] focus:border-brand-400 focus:outline-none"
                        title="1P 가치 금액"
                      />
                    </span>
                    <span className="mt-1 block text-[10px] text-slate-400">
                      ≈ ₩{Math.round(toKRW(policyDraft.unitValue, policyDraft.unitCurrency)).toLocaleString()} · US${pointsToUsd(1, toKRW(policyDraft.unitValue, policyDraft.unitCurrency) || 1)}
                    </span>
                  </label>
                  <label className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                    <span className="block text-[10px] text-slate-500">최소 교환 (1회)</span>
                    <span className="mt-1 flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={policyDraft.minRedeemPts}
                        onChange={(e) => setPolicyDraft({ ...policyDraft, minRedeemPts: Number(e.target.value) || 0 })}
                        className="w-24 rounded border border-slate-300 px-1.5 py-0.5 text-right text-[11px] focus:border-brand-400 focus:outline-none"
                        title="최소 교환 포인트"
                      />
                      P
                    </span>
                    <span className="mt-1 block text-[10px] text-slate-400">≈ US${pointsToUsd(policyDraft.minRedeemPts, toKRW(policyDraft.unitValue, policyDraft.unitCurrency) || 1)}</span>
                  </label>
                  <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] leading-relaxed text-slate-500">
                    <span className="block text-slate-500">기프트카드 유효기간 <span className="rounded-sm bg-emerald-50 px-1 font-bold text-emerald-600">확정</span></span>
                    <b className="text-[12px] text-slate-800">{VALID_DAYS}일 · 미사용 소멸</b><br />
                    환급 없음 (<code>refundOption: false</code>) · 발급·만료는 아래 감사 로그로 추적
                  </div>
                  <div className="flex flex-col justify-between gap-1.5 rounded border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-[10px] text-slate-500">현재 적용: 1P = <b className="text-slate-700">{fmtUnit(policy)}</b> · 최소 <b className="text-slate-700">{pt(policy.minRedeemPts)}</b></span>
                    <span className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={applyPolicy}
                        disabled={!draftValid || !draftChanged}
                        className="flex-1 rounded bg-brand-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        정책 적용
                      </button>
                      <button
                        type="button"
                        onClick={() => setPolicyDraft(policy)}
                        disabled={!draftChanged}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      >
                        되돌리기
                      </button>
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-slate-500">
                  <span className="font-semibold text-slate-600">변경 이력</span>{' '}
                  {policyLog.length === 0 ? <span className="text-slate-400">없음 (초기값 1P = ₩1,000 · 최소 14.8 P)</span> : (
                    <span className="mt-1 block space-y-0.5">
                      {policyLog.map((l, i) => (
                        <span key={`${l.at}-${i}`} className="block font-mono">{l.at} · {l.item} {l.from} → <b className="text-slate-700">{l.to}</b> · ELLIS 관리자(시연)</span>
                      ))}
                    </span>
                  )}
                  <span className="mt-1 block text-slate-400">실서비스: 변경 적용일 이후 적립·교환부터 반영 — 기존 잔액 환산 규칙은 정책 변경 시 함께 정한다. 이미 교환된 건의 포인트·USD는 당시 값으로 저장(불변).</span>
                </div>
              </div>

              {/* 등급 정책 (ELLIS 설정) — 등급별 적립률 · 월 평균 예약액 기준 · 체크아웃 시점 적용 (2026-10-02 확정) */}
              <div className="mb-4 rounded border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-bold text-slate-800">등급 정책</span>
                  <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">ELLIS 설정값</span>
                  <span className="text-[10px] text-slate-400">
                    매월 1일 산정 · 월 평균 예약액 = 직전 {TIER_WINDOW_MONTHS}개월 체크아웃 완료(취소 제외) 합계 ÷ 첫 예약 이후 경과 월(최소 {TIER_MIN_DIVISOR_MONTHS} · 최대 {TIER_WINDOW_MONTHS}) · 각 예약은 <b>체크아웃한 달의 등급</b> 적립률 × 프로모 배수
                  </span>
                </div>
                <div className="mt-2 overflow-x-auto rounded border border-slate-200">
                  <table className="w-full min-w-[620px] text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                        <th className="px-3 py-1.5 text-left font-semibold">등급</th>
                        <th className="px-3 py-1.5 text-left font-semibold">기준 — 월 평균 예약액(₩) 이상</th>
                        <th className="px-3 py-1.5 text-left font-semibold">적립률(%)</th>
                        <th className="px-3 py-1.5 text-left font-semibold">고객 표시</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tierDraft.map((t, i) => (
                        <tr key={t.name} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-1.5 font-bold" style={{ color: t.color }}>{t.name}</td>
                          <td className="px-3 py-1.5">
                            {i === 0 ? <span className="text-slate-400">0 (기본)</span> : (
                              <input
                                type="number" min={0} step={1000000} value={t.minMonthlyKRW}
                                onChange={(e) => setTierDraft((prev) => prev.map((x, j) => (j === i ? { ...x, minMonthlyKRW: Number(e.target.value) || 0 } : x)))}
                                className="w-36 rounded border border-slate-300 px-1.5 py-0.5 text-right text-[11px] focus:border-brand-400 focus:outline-none"
                                title={`${t.name} 기준 월 평균 예약액`}
                              />
                            )}
                            {i > 0 && <span className="ml-1.5 text-slate-400">{won(t.minMonthlyKRW)}</span>}
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="number" min={0} step={0.1} value={t.ratePct}
                              onChange={(e) => setTierDraft((prev) => prev.map((x, j) => (j === i ? { ...x, ratePct: Number(e.target.value) || 0 } : x)))}
                              className="w-20 rounded border border-slate-300 px-1.5 py-0.5 text-right text-[11px] focus:border-brand-400 focus:outline-none"
                              title={`${t.name} 적립률`}
                            /> %
                          </td>
                          <td className="px-3 py-1.5 text-slate-500">{i === 0 ? '기본' : `+${tierBoostPct(t, tierDraft)}% 적립`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={applyTiers} disabled={!tierDraftValid || !tierDraftChanged}
                    className="rounded bg-brand-500 px-3 py-1 text-[11px] font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40">등급 정책 적용</button>
                  <button type="button" onClick={() => setTierDraft(tiers)} disabled={!tierDraftChanged}
                    className="rounded border border-slate-300 bg-white px-3 py-1 text-[11px] text-slate-600 hover:bg-slate-50 disabled:opacity-40">되돌리기</button>
                  {!tierDraftValid && <span className="text-[10px] text-rose-600">기준은 위 등급보다 커야 하고 적립률은 0보다 커야 합니다.</span>}
                  <span className="text-[10px] text-slate-400">현재 이 계정: 월 평균 {won(monthlyAvg)} → <b style={{ color: tierStatus.tier.color }}>{tierStatus.tier.name}</b> · 기준값 = ELLIS 실데이터 보정(마켓 셀러 18곳·12개월) — 2027-02 재보정 · 변경 이력은 위 포인트 정책 이력에 기록</span>
                </div>
              </div>

              {/* Giftronaut Gift API — Balance · 감사 로그 · 실패/반송 처리 · 국가 카탈로그 */}
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
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] text-slate-500">남은 Balance (<code>GET /balance</code>)</p>
                    <p className="text-[15px] font-extrabold text-slate-800">{usd(deposit)}</p>
                    <p className="text-[9px] text-slate-400">송금 확인 대기(pendingBalance) USD 0.00 · 고객 비노출</p>
                  </div>
                  <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] text-slate-500">발송 / 반송 / 실패</p>
                    <p className="text-[15px] font-extrabold text-slate-800">
                      {redemptions.filter((x) => x.status === 'sent').length} / <span className="text-orange-500">{redemptions.filter((x) => x.status === 'bounced').length}</span> / <span className="text-rose-500">{redemptions.filter((x) => x.status === 'failed').length}</span>
                    </p>
                    <p className="text-[9px] text-slate-400">웹훅: delivery_complete · bounced(5분 배치) — HMAC 서명 검증</p>
                  </div>
                  <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] text-slate-500">발급 누계 (Balance 차감)</p>
                    <p className="text-[15px] font-extrabold text-slate-800">{usd(issuedUsd)}</p>
                    <p className="text-[9px] text-slate-400">원장 대사: <code>GET /balance/ledger</code> referenceNumber = orderId 1:1</p>
                  </div>
                  <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] leading-relaxed text-slate-500">
                    충전: <b className="text-slate-700">해외송금(Wire)만</b> <span className="rounded-sm bg-emerald-50 px-1 font-bold text-emerald-600">확정</span> · 무수수료·1–2영업일 (포털 Add Funds, USD)<br />
                    잔액은 ELLIS에서 조회 — 별도 알림 없음<br />
                    일·월 주문 한도(USD): 계정 설정값 <b className="text-amber-600">확인 필요</b>
                  </div>
                </div>

                {/* 감사(Audit) 로그 — 발급·발송·반송·재발송(이메일 변경)·실패·만료를 추가 전용으로 기록 */}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="font-semibold text-slate-700">교환 감사 로그</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">전체 {redemptions.length}건</span>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">30일 내 만료 {expiringSoon.length}건</span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">만료·소멸 {expired.length}건 · {usd(r2(expired.reduce((s, x) => s + x.usd, 0)))}</span>
                  <span className="text-[10px] text-slate-400">사용 여부는 Giftronaut <code>recipient.redeemed</code> 웹훅(제공 예정) 필요 — 그 전까진 “확인 불가”</span>
                </div>
                <div className="mt-1.5 overflow-x-auto rounded border border-slate-200">
                  <table className="w-full min-w-[980px] text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                        <th className="px-3 py-1.5 text-left font-semibold">요청일 · orderId · idempotencyKey</th>
                        <th className="px-3 py-1.5 text-left font-semibold">계정 · 발송 이메일</th>
                        <th className="px-3 py-1.5 text-left font-semibold">상품 · 권종</th>
                        <th className="px-3 py-1.5 text-right font-semibold">포인트</th>
                        <th className="px-3 py-1.5 text-right font-semibold">Balance 차감</th>
                        <th className="px-3 py-1.5 text-center font-semibold">상태</th>
                        <th className="px-3 py-1.5 text-left font-semibold">유효기간 · 사용</th>
                        <th className="px-3 py-1.5 text-left font-semibold">이력</th>
                      </tr>
                    </thead>
                    <tbody>
                      {redemptions.length === 0 && (
                        <tr><td colSpan={8} className="px-3 py-4 text-center text-slate-400">주문 없음 — 고객이 포인트 교환을 하면 여기에 기록됩니다.</td></tr>
                      )}
                      {redemptions.map((x) => {
                        const st = REDEEM_STYLE[x.status];
                        const exp = x.orderNo ? expiryOf(x.at, VALID_DAYS) : null;
                        const left = exp ? daysBetween(today, exp) : null;
                        return (
                          <tr key={x.id} className="border-b border-slate-100 align-top last:border-0">
                            <td className="px-3 py-1.5 font-mono text-slate-600">
                              <span className="block text-[10px] text-slate-500">{x.at}</span>
                              {x.orderNo ?? <span className="text-slate-400">— (미생성)</span>}
                              <span className="block text-[9px] text-slate-400">{x.idempotencyKey}</span>
                            </td>
                            <td className="px-3 py-1.5 text-slate-600">
                              {x.accountId}
                              {x.email !== x.accountId && <span className="block text-[9px] text-orange-600">→ {x.email}</span>}
                            </td>
                            <td className="px-3 py-1.5 text-slate-700">{redeemName(x)} · {redeemFace(x)}</td>
                            <td className="px-3 py-1.5 text-right text-slate-700">{pt(x.points)}</td>
                            <td className="px-3 py-1.5 text-right text-slate-700">{x.orderNo ? usd(x.usd) : '—'}</td>
                            <td className="px-3 py-1.5 text-center">
                              <span className={`rounded-sm px-1.5 py-px text-[9px] font-bold ${st.cls}`}>{st.label}</span>
                              {x.failReason && <span className="mt-0.5 block text-[10px] text-rose-500">{x.failReason}</span>}
                            </td>
                            <td className="px-3 py-1.5 text-[10px] text-slate-600">
                              {exp === null ? <span className="text-slate-400">— (미발급)</span> : (
                                <>
                                  <span className="block">~ {exp}</span>
                                  {left !== null && left < 0
                                    ? <span className="font-semibold text-slate-500">만료 · 소멸(환급 없음)</span>
                                    : <span className={left !== null && left <= 30 ? 'font-semibold text-amber-600' : 'text-slate-400'}>D-{left}</span>}
                                  <span className="block text-slate-400">사용: 확인 불가</span>
                                </>
                              )}
                            </td>
                            <td className="px-3 py-1.5 text-[10px] text-slate-500">
                              {x.events.map((e, i) => <span key={i} className="block whitespace-nowrap"><span className="font-mono text-slate-400">{e.at.slice(5)}</span> {e.text}</span>)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 교환 상품 — 초이스 카드 하나 (HBX 방식) */}
                <div className="mt-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
                  <b className="text-slate-800">교환 상품: Giftronaut 초이스 카드</b> (<code>POST /orders/choice-cards</code> · USD 정수 액면) — 금액 {CHOICE_VALUES_USD.map((v) => `US$${v}`).join(' · ')}.
                  수령자가 이메일 링크에서 <b>거주 국가 브랜드·통화를 직접 선택</b>(225개국)하므로 국가별 상품 진열·관리가 필요 없습니다.
                  <span className="text-slate-500"> 계정별 초이스 카드 금액 범위(min~max)·국가별 선택 가능 브랜드는 <b>API 연동 시 확인</b> → 금액 칸 조정.</span>
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

      {/* 포인트 교환 — HBX 방식: 금액만 고르면 이메일로 기프트카드 링크 발송, 브랜드는 링크에서 수령자가 선택 */}
      {redeemOpen && (() => {
        const localCur = countryInfo(account.country).currency;
        const localApprox = (usdAmt: number) => {
          const v = toKRW(usdAmt, 'USD') / (FX_TO_KRW[localCur] ?? 1);
          return `${countryInfo(account.country).symbol}${Math.round(v).toLocaleString()}`;
        };
        const selPts = redeemUsd !== null ? faceToPoints(redeemUsd, 'USD', unitKRW) : null;
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setRedeemOpen(false)}>
            <div className="w-[560px] max-w-full overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                <span className="text-[15px] font-bold text-slate-800">💎 기프트카드 교환</span>
                <button type="button" onClick={() => setRedeemOpen(false)} className="text-slate-400 hover:text-slate-700" aria-label="닫기">✕</button>
              </div>
              <div className="px-5 py-5">
                <div className="text-center">
                  <p className="text-3xl font-extrabold text-slate-800">{pt(balance)}</p>
                  <p className="text-[12px] text-slate-500">사용 가능 포인트</p>
                  <p className="mt-1 text-[11px] text-slate-400">올해 교환 {pt(redeemedThisYear)}</p>
                </div>

                <p className="mb-2 mt-5 text-[12px] font-bold text-slate-700">교환 금액 선택</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {CHOICE_VALUES_USD.map((v) => {
                    const need = faceToPoints(v, 'USD', unitKRW);
                    const belowMin = need < minRedeemPts;
                    const ok = balance >= need && !belowMin;
                    const on = redeemUsd === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        disabled={!ok}
                        onClick={() => setRedeemUsd(v)}
                        className={`rounded-lg border px-2 py-3 text-center transition ${on ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-300' : ok ? 'border-slate-200 bg-slate-50 hover:border-brand-300' : 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-50'}`}
                      >
                        <p className="text-[16px] font-extrabold text-slate-800">US${v}</p>
                        <p className="text-[10px] text-slate-400">≈ {localApprox(v)}</p>
                        <p className={`mt-1 text-[11px] font-bold ${ok ? 'text-brand-600' : 'text-slate-400'}`}>−{pt(need)}</p>
                        {!ok && <p className="text-[9px] text-slate-400">{belowMin ? '최소 교환 미만' : '포인트 부족'}</p>}
                      </button>
                    );
                  })}
                </div>

                <p className="mt-4 text-[12px] leading-relaxed text-slate-600">
                  교환하면 <b className="font-mono">{account.id}</b>로 기프트카드 링크가 발송됩니다. 링크에서 <b>원하는 브랜드를 직접 고르면</b> 거주 국가 통화로 받을 수 있습니다.
                  사용 가능 포인트는 자동으로 차감됩니다.
                </p>
                <p className="mt-2 text-[11px] text-slate-400">유효기간 발송일로부터 {VALID_DAYS}일(미사용 시 소멸) · 교환 취소 불가</p>
                {selPts !== null && <p className="mt-2 text-[12px] text-slate-600">교환 후 사용 가능 <b className="text-brand-600">{pt(r1(balance - selPts))}</b></p>}
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-3">
                <button type="button" onClick={() => setRedeemOpen(false)} className="text-[12px] font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-700">취소</button>
                <button
                  type="button"
                  disabled={redeemUsd === null}
                  onClick={() => redeemUsd !== null && doRedeem(redeemUsd)}
                  className="rounded bg-brand-500 px-5 py-2 text-[12px] font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
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
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setResend(null)}>
            <div className="w-[420px] max-w-full overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
                <span className="text-sm font-bold text-slate-800">기프트카드 재발송</span>
                <button type="button" onClick={() => setResend(null)} className="text-slate-400 hover:text-slate-700" aria-label="닫기">✕</button>
              </div>
              <div className="px-5 py-4 text-[12px] text-slate-600">
                <p>💎 {rec && <><b className="text-slate-800">{redeemName(rec)}</b> · {redeemFace(rec)}</>}</p>
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
