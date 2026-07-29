import type { Booking } from '../types';

/**
 * OP 포인트 엔진 — 3차 고도화(오피포인트). **프로토타입 · 폐기 가능 구조.**
 *
 * 정의(현업 2026-07-29 확정): OP = 닷비즈를 이용하는 고객(OP 개인). 닷비즈로 예약하고
 * **실제 투숙을 완료(체크아웃 경과)**하면 적립되는 고객 리워드. 취소·노쇼·환불 제외.
 * OP 개인에게 지급(법인 통제는 고객사 자율).
 *
 * 적립 방식 (현업 재정의):
 *   · **예약금액의 일정 %만** 적립(기본/보너스 없음).
 *   · **지정 호텔 배수 프로모** — ELLIS(내부)에서 호텔·기간·룸타입을 지정해 배수 조정.
 *     고객은 **계산식(요율)을 모른다.** "150% 적립" 같은 **배수 배지**만 노출.
 *   · **적립 한도 없음.**
 *   · 다통화 예약 → **환율로 공통 기준(KRW) 환산** 후 적립.
 *   · **화폐값을 노출하지 않는다.** 140,000원×1% = 1,400원 대신 **1.4 오마이포인트**로 표시
 *     (1 포인트 = 1,000원 value). 리딤은 **USD 기준**(최소 USD 10부터, 포인트로 안내).
 *   · 유효기간 **1년**.
 *
 * ※ 폐기 용이성: 예약 데이터를 읽기만 함(Booking·seed 불변). 폐기 = opPoints.ts +
 *   OpPointsPage.tsx + opPointsMall.ts + opPointsPromos.ts + 사이드바 메뉴 한 줄 삭제.
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
  /** 기본 적립 요율 (%) — 내부값. 고객에겐 배수(배지)로만 표현. */
  baseRatePct: 1,
  /** 1 오마이포인트 = N KRW value (화폐값 은닉용 환산 단위) */
  pointUnitKRW: 1_000,
  /** 리딤 최소 (USD) */
  redeemMinUSD: 10,
  /** 유효기간(개월) */
  expiryMonths: 12,
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** 예약금액(로컬통화) → 오마이포인트. KRW 환산 × 요율 × 배수 / 포인트 단위. */
export function pointsFor(amount: number, currency: string, multiplier: number): number {
  const krwValue = toKRW(amount, currency) * (OP_POINT_POLICY.baseRatePct / 100) * multiplier;
  return round1(krwValue / OP_POINT_POLICY.pointUnitKRW);
}

/** USD 금액 → 필요 포인트 (리딤 표시용) */
export function usdToPoints(usd: number): number {
  return round1(toKRW(usd, 'USD') / OP_POINT_POLICY.pointUnitKRW);
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
  for (const p of promos) {
    if (!p.active || p.hotelId !== b.hotel_id) continue;
    if (bookedOn < p.start || bookedOn > p.end) continue;
    if (p.roomTypes !== 'all' && !p.roomTypes.some((rt) => b.room_type.includes(rt))) continue;
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
  currency: string;
  amount: number;
  /** 배수(1=기본). 고객 뷰에선 배지("150%")로만, 요율은 숨김 */
  multiplier: number;
  promoLabel: string | null;
  points: number;
}

/** 투숙이 완료됐고 취소되지 않은 예약만 적립 대상 */
function isEligible(b: Booking, today: string): boolean {
  return b.status === 'Confirmed' && b.check_out < today;
}

/** 완료 투숙 건별 적립 — 투숙 완료일 내림차순. 한도 없음. */
export function computeAccruals(bookings: Booking[], today: string, promos: PointPromo[]): Accrual[] {
  return bookings
    .filter((b) => isEligible(b, today))
    .sort((a, b) => b.check_out.localeCompare(a.check_out))
    .map((b) => {
      const { multiplier, label } = promoFor(b, promos);
      return {
        ellisCode: b.ellis_code,
        hotelName: b.hotel_name,
        stayCompleted: b.check_out,
        currency: b.currency,
        amount: b.sum_amt,
        multiplier,
        promoLabel: label,
        points: pointsFor(b.sum_amt, b.currency, multiplier),
      };
    });
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
