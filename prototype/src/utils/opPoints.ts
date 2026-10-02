import type { Booking } from '../types';

/**
 * OP 포인트 엔진 — 3차 고도화(오피포인트). **프로토타입 · 폐기 가능 구조.**
 *
 * 정의(현업 2026-07-29 확정): OP = 마켓플레이스를 이용하는 고객(OP 개인). 마켓플레이스로 예약하고
 * **실제 투숙을 완료(체크아웃 경과)**하면 적립되는 고객 리워드. 취소·노쇼·환불 제외.
 * OP 개인에게 지급(법인 통제는 고객사 자율).
 *
 * 적립 방식 (현업 재정의):
 *   · **예약금액의 일정 %만** 적립(기본/보너스 없음).
 *   · **지정 호텔 배수 프로모** — ELLIS(내부)에서 호텔·기간·룸타입을 지정해 배수 조정.
 *     고객은 **계산식(요율)을 모른다.** "150% 적립" 같은 **배수 배지**만 노출.
 *   · **적립 한도 없음.**
 *   · 다통화 예약 → **환율로 공통 기준(KRW) 환산** 후 적립.
 *   · **화폐값을 노출하지 않는다.** 140,000원×1% = 1,400원 대신 **1.4 오마이포인트**로 표시.
 *     1P 가치·최소 교환은 **ELLIS 정책값**(PointPolicy, 기본 1P = ₩1,000 · 최소 14.8P).
 *   · 유효기간 **1년**.
 *
 * ※ 폐기 용이성: 예약 데이터를 읽기만 함(Booking·seed 불변). 폐기 = opPoints.ts +
 *   OpPointsPage.tsx + opPointsPromos.ts + opAccounts.ts + 사이드바 메뉴 한 줄 삭제.
 *   (교환은 자체 Gift Mall + Giftronaut Gift API — 카탈로그 예시: mocks/giftCatalog.ts, 2026-09-29 미팅 확정.)
 */

import type { PointPromo } from '../mocks/opPointsPromos';

/** 공통 기준통화 = KRW. 환율(1 외화 = N KRW) — 2026 근사, 정책 확정 시 갱신. */
export const FX_TO_KRW: Record<string, number> = {
  KRW: 1,
  USD: 1_480,
  JPY: 9.3,
  THB: 41,
  SGD: 1_090,
  VND: 0.058,
  CNY: 205, // Gift Mall 국가(중국)
  INR: 17, // Gift Mall 국가(인도)
  TWD: 46,
  HKD: 189,
};

export function toKRW(amount: number, currency: string): number {
  return amount * (FX_TO_KRW[currency] ?? 1);
}

/**
 * 포인트 정책 (내부 — 고객 비노출).
 * 기본 요율·포인트 단위는 화면에 드러내지 않는다. ELLIS 내부 뷰에서만 확인.
 */
export const OP_POINT_POLICY = {
  /** 기본 적립 요율 (%) — **1% 확정**(2026-10-02) = Bronze 적립률. 상위 등급은 DEFAULT_TIERS. 고객에겐 배지·포인트로만 표현. */
  baseRatePct: 1,
  /** 유효기간(개월) — 1년. 현업 2026-09: 회계년도 마감과 연동(정책 확정 대상). */
  expiryMonths: 12,
  /**
   * 기프트카드 유효기간(일) — 확정 2026-09-29: **180일, 미사용분은 환급 없이 소멸**
   * (Giftronaut `refundOption: false`). 내부 감사(Audit)로 발급·만료를 추적.
   */
  giftCardValidityDays: 180,
};

/**
 * ELLIS에서 설정하는 포인트 정책 — 2026-09-29 결정: **1P 가치·최소 교환은 지금 고정하지 않고 ELLIS 정책값**으로 둔다.
 * 아래 기본값은 기존 임시값(1P = ₩1,000 · 최소 교환 USD 10 상당).
 */
export interface PointPolicy {
  /** 1P 가치 표시 통화 */
  unitCurrency: 'KRW' | 'USD';
  /** 1P 가치 (unitCurrency 기준) */
  unitValue: number;
  /** 1회 최소 교환 포인트 */
  minRedeemPts: number;
}

export const DEFAULT_POINT_POLICY: PointPolicy = { unitCurrency: 'KRW', unitValue: 1_000, minRedeemPts: 14.8 };

/** 정책 → 1P의 KRW 가치 (내부 계산 기준통화 KRW) */
export const unitKRWOf = (p: PointPolicy): number => toKRW(p.unitValue, p.unitCurrency);
const DEFAULT_UNIT_KRW = unitKRWOf(DEFAULT_POINT_POLICY);

const round1 = (n: number) => Math.round(n * 10) / 10;

/** 예약금액(로컬통화) → 오마이포인트. KRW 환산 × 등급 적립률 × 프로모 배수 / 1P 가치(KRW). */
export function pointsFor(amount: number, currency: string, multiplier: number, unitKRW = DEFAULT_UNIT_KRW, ratePct = OP_POINT_POLICY.baseRatePct): number {
  const krwValue = toKRW(amount, currency) * (ratePct / 100) * multiplier;
  return round1(krwValue / unitKRW);
}

/** USD 금액 → 포인트 (표시용) */
export function usdToPoints(usd: number, unitKRW = DEFAULT_UNIT_KRW): number {
  return round1(toKRW(usd, 'USD') / unitKRW);
}

/** 포인트 → USD 상당 (ELLIS 표시용) */
export function pointsToUsd(points: number, unitKRW = DEFAULT_UNIT_KRW): number {
  return Math.round(((points * unitKRW) / FX_TO_KRW.USD) * 100) / 100;
}

/** 기프트카드 권종(현지통화) → 필요 포인트 (소수 첫째 자리 올림). 1P 가치는 ELLIS 정책값. */
export function faceToPoints(face: number, currency: string, unitKRW = DEFAULT_UNIT_KRW): number {
  return Math.ceil((toKRW(face, currency) / unitKRW) * 10) / 10;
}

/**
 * 권종 → USD (Balance 차감 시연용 환산).
 * 실제 차감 = 액면가를 **Giftronaut 상품 환율**로 USD 환산한 금액(API 문서) — 우리 환율표와 차이 가능(주문 전 견적 방법 확인 필요).
 */
export function faceToUsd(face: number, currency: string): number {
  return Math.round((toKRW(face, currency) / FX_TO_KRW.USD) * 100) / 100;
}

/**
 * ELLIS 프로모 매칭 — 예약이 지정 호텔·기간·룸타입에 해당하면 배수 반환.
 * 기간은 **예약일(booking_date)** 기준(프로모 기간에 예약하면 배수 락인).
 * 중복 시 가장 높은 배수 적용. 없으면 1(기본).
 */
export function promoFor(b: Booking, promos: PointPromo[]): { multiplier: number; label: string | null } {
  const bookedOn = b.booking_date.slice(0, 10);
  let best = 1;
  let label: string | null = null;
  const room = (b.room_type || '').toLowerCase();
  for (const p of promos) {
    if (!p.active || p.hotelId !== b.hotel_id) continue;
    if (bookedOn < p.start || bookedOn > p.end) continue;
    // 룸타입 / 레이트플랜 지정 시 예약의 room_type(부분일치)으로 판정. 'all'=전체.
    if (p.roomType !== 'all' && !p.roomType.some((rt) => room.includes(rt.toLowerCase()))) continue;
    if (p.ratePlan !== 'all' && !p.ratePlan.some((rp) => room.includes(rp.toLowerCase()))) continue;
    if (p.multiplier > best) {
      best = p.multiplier;
      label = `${Math.round(p.multiplier * 100)}%`;
    }
  }
  return { multiplier: best, label };
}

export interface Accrual {
  ellisCode: string;
  hotelName: string;
  stayCompleted: string;
  /** 결재 완료일 — Fully Paid만 값, 지불 대기(미완결)는 null. Booking에 없어 파생(아래). */
  paidAt: string | null;
  currency: string;
  amount: number;
  paymentStatus: string;
  /** 배수(1=기본). 고객 뷰에선 배지("150%")로만, 요율은 숨김 */
  multiplier: number;
  promoLabel: string | null;
  /** 체크아웃 시점 등급 · 그 등급 적립률(%) — 적용 시점 = 체크아웃 후(2026-10-02) */
  tierName: string;
  tierRatePct: number;
  points: number;
}

const addDays = (iso: string, n: number) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * 결재 완료일 파생 — Booking에 결제 일자가 없어 프로토타입용으로 결정론적 생성.
 * 선불(예약 시 결제): 예약일 직후. 후불(체크아웃 후 결제): 체크아웃 직후.
 * Fully Paid는 오늘까지 결제 완료됐으므로 오늘 이하로 클램프. 미완결은 null.
 */
function paidDate(b: Booking, today: string): string | null {
  if (b.payment_status !== 'Fully Paid') return null;
  const h = hashCode(b.ellis_code);
  const raw =
    h % 2 === 0
      ? addDays(b.booking_date.slice(0, 10), 1 + (h % 3)) // 선불
      : addDays(b.check_out, 1 + (h % 7)); // 후불
  return raw > today ? today : raw;
}

/** 투숙 완료됐나 (Confirmed·체크아웃 경과) — 지불 여부는 별도 */
function isStayed(b: Booking, today: string): boolean {
  return b.status === 'Confirmed' && b.check_out < today;
}
/** 지불 완료 = Fully Paid. 선불 업체는 체크아웃 시점에 이미 완료, 후불 업체는 체크아웃 후 완료. */
function isPaid(b: Booking): boolean {
  return b.payment_status === 'Fully Paid';
}

function toAccrual(b: Booking, promos: PointPromo[], today: string, unitKRW: number, tiers: Tier[], all: Booking[]): Accrual {
  const { multiplier, label } = promoFor(b, promos);
  // 체크아웃 시점의 등급(그 시점까지 최근 12개월 월 평균 예약액)으로 적립률 결정
  const tier = tierFor(monthlyAvgKRW(all, b.check_out), tiers).tier;
  return {
    ellisCode: b.ellis_code,
    hotelName: b.hotel_name,
    stayCompleted: b.check_out,
    paidAt: paidDate(b, today),
    currency: b.currency,
    amount: b.sum_amt,
    paymentStatus: b.payment_status,
    multiplier,
    promoLabel: label,
    tierName: tier.name,
    tierRatePct: tier.ratePct,
    points: pointsFor(b.sum_amt, b.currency, multiplier, unitKRW, tier.ratePct),
  };
}

/**
 * 확정 적립 — **투숙 완료 + 지불 완료(Fully Paid)** 건만. 투숙 완료일 내림차순. 한도 없음.
 * (현업 2026-07-29: 체크아웃 기준이라도 지불 완료된 건만 적립.)
 */
export function computeAccruals(bookings: Booking[], today: string, promos: PointPromo[], unitKRW = DEFAULT_UNIT_KRW, tiers: Tier[] = DEFAULT_TIERS): Accrual[] {
  return bookings
    .filter((b) => isStayed(b, today) && isPaid(b))
    .sort((a, b) => b.check_out.localeCompare(a.check_out))
    .map((b) => toAccrual(b, promos, today, unitKRW, tiers, bookings));
}

/**
 * 적립 예정(지불 대기) — 투숙은 완료됐으나 아직 지불 미완결(후불 업체 등)인 건.
 * 지불이 완료되면 적립된다. 투숙 완료일 내림차순.
 */
export function computePending(bookings: Booking[], today: string, promos: PointPromo[], unitKRW = DEFAULT_UNIT_KRW, tiers: Tier[] = DEFAULT_TIERS): Accrual[] {
  return bookings
    .filter((b) => isStayed(b, today) && !isPaid(b))
    .sort((a, b) => b.check_out.localeCompare(a.check_out))
    .map((b) => toAccrual(b, promos, today, unitKRW, tiers, bookings));
}

export interface OpPointSummary {
  earned: number;
  eligibleCount: number;
  promoCount: number;
  /** 최근 30일 적립(투숙 완료 기준) */
  recentEarned: number;
}

export function summarize(accruals: Accrual[], today: string): OpPointSummary {
  const cutoff = new Date(new Date(`${today}T00:00:00Z`).getTime() - 30 * 86400000).toISOString().slice(0, 10);
  return {
    earned: round1(accruals.reduce((s, a) => s + a.points, 0)),
    eligibleCount: accruals.length,
    promoCount: accruals.filter((a) => a.multiplier > 1).length,
    recentEarned: round1(accruals.filter((a) => a.stayCompleted >= cutoff).reduce((s, a) => s + a.points, 0)),
  };
}

/**
 * 등급제 (HBX 벤치마크 · 현업 2026-08 도입 → **2026-10-02 확정**).
 * - 등급 = **월 평균 예약액**(KRW, 체크아웃 완료·취소 제외)으로 결정. 최근 12개월 합계 ÷ 활동 개월 수(최소 3 · 최대 12).
 * - **등급별 적립률**(예약금액 대비): Bronze 1.0% · Silver 1.2% · Gold 1.3% · Diamond 1.5%. 지정 호텔 프로모 배수는 그 위에 곱한다.
 * - **적용 시점 = 체크아웃 후** — 각 예약은 체크아웃 시점의 등급 적립률로 적립.
 * - 등급 기준(월 평균 금액)은 ELLIS 정책값. 기본값은 현업 예시(1천만/2천만/3천만) — 실데이터 보정 후 확정.
 * 고객 화면엔 절대 요율 대신 상대 부스트(+20%·+30%·+50%)만 노출.
 */
export interface Tier {
  name: string;
  /** 승급 기준 — 월 평균 예약액(KRW) 이상 */
  minMonthlyKRW: number;
  /** 등급 적립률(%) — 예약금액 대비 */
  ratePct: number;
  /** 배지 색 */
  color: string;
}

export const DEFAULT_TIERS: Tier[] = [
  { name: 'Bronze', minMonthlyKRW: 0, ratePct: 1.0, color: '#b45309' },
  { name: 'Silver', minMonthlyKRW: 10_000_000, ratePct: 1.2, color: '#64748b' },
  { name: 'Gold', minMonthlyKRW: 20_000_000, ratePct: 1.3, color: '#ca8a04' },
  { name: 'Diamond', minMonthlyKRW: 30_000_000, ratePct: 1.5, color: '#0891b2' },
];

/** 등급 산정 기간(개월) · 최소 나눗수(신규 OP의 한 달 대형 예약으로 바로 최상위가 되는 것 방지) */
export const TIER_WINDOW_MONTHS = 12;
export const TIER_MIN_DIVISOR_MONTHS = 3;

const monthsBack = (iso: string, n: number) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - n);
  return d.toISOString().slice(0, 10);
};

/**
 * 월 평균 예약액(KRW) — asOf 이전 12개월 동안 체크아웃한(취소 제외) 예약 합계 ÷ 활동 개월 수.
 * 활동 개월 수 = 첫 체크아웃부터 asOf까지(개월, 올림) · 최소 3 · 최대 12.
 */
export function monthlyAvgKRW(bookings: Booking[], asOf: string): number {
  const from = monthsBack(asOf, TIER_WINDOW_MONTHS);
  const q = bookings.filter((b) => b.status !== 'Cancelled' && b.check_out < asOf.slice(0, 10) && b.check_out >= from);
  if (q.length === 0) return 0;
  const total = q.reduce((s, b) => s + toKRW(b.sum_amt, b.currency), 0);
  const first = q.reduce((m, b) => (b.check_out < m ? b.check_out : m), q[0].check_out);
  const days = (new Date(`${asOf.slice(0, 10)}T00:00:00Z`).getTime() - new Date(`${first}T00:00:00Z`).getTime()) / 86400000;
  const months = Math.min(TIER_WINDOW_MONTHS, Math.max(TIER_MIN_DIVISOR_MONTHS, Math.ceil(days / 30.44)));
  return Math.round(total / months);
}

export interface TierStatus {
  tier: Tier;
  index: number;
  next: Tier | null;
  /** 다음 등급까지 필요한 월 평균 예약액(KRW, 없으면 0) */
  toNext: number;
  /** 현재 구간 진행률 0~1 (막대용) */
  progress: number;
}

/** 월 평균 예약액(KRW) → 등급 상태 */
export function tierFor(monthlyKRW: number, tiers: Tier[] = DEFAULT_TIERS): TierStatus {
  let index = 0;
  for (let i = 0; i < tiers.length; i += 1) if (monthlyKRW >= tiers[i].minMonthlyKRW) index = i;
  const tier = tiers[index];
  const next = index < tiers.length - 1 ? tiers[index + 1] : null;
  const toNext = next ? Math.max(0, Math.round(next.minMonthlyKRW - monthlyKRW)) : 0;
  const span = next ? next.minMonthlyKRW - tier.minMonthlyKRW : 1;
  const progress = next ? Math.min(1, Math.max(0, (monthlyKRW - tier.minMonthlyKRW) / (span || 1))) : 1;
  return { tier, index, next, toNext, progress };
}

/** 고객 표시용 상대 부스트(%) — Bronze 대비 (절대 요율 비노출) */
export const tierBoostPct = (tier: Tier, tiers: Tier[] = DEFAULT_TIERS) => Math.round((tier.ratePct / tiers[0].ratePct - 1) * 100);
