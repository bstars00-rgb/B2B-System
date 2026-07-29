import type { Booking } from '../types';
import { hotelMetaOf } from '../mocks/hotelDb';

/**
 * OP 포인트 엔진 — 3차 고도화(오피포인트). **프로토타입 · 폐기 가능 구조.**
 *
 * 정의(현업 2026-07-29): OP 포인트는 **닷비즈를 이용하는 고객(OP = 셀러/여행사)**이 닷비즈
 * 마켓플레이스로 호텔을 예약할 때, **실제 투숙이 완료된 예약 실적**에 따라 지급되는
 * **채널 로열티 리워드**다. (사내 직원 포인트가 아니다. 업무성과 포인트도 아니다.)
 *
 * 적립 원칙:
 *   · 닷비즈 예약 완료 → **투숙 완료 확인** → 적립 → 포인트몰 리딤
 *   · **취소·환불 예약은 적립하지 않는다.** 실제 투숙 완료 건만 대상.
 *   · 자기/가족 제한 없음 — OP가 (고객을 위해) 넣은 예약이면 완료 시 적립.
 *
 * 지급 기준(고가 예약 과잉 집중 방지):
 *   · 예약 1건당 기본 포인트
 *   · 예약금액에 따른 추가 포인트(건당 상한)
 *   · 추천/프로모션 호텔 예약 시 보너스
 *   · 월별 적립 한도(초과분 미지급)
 *
 * ※ 폐기 용이성: 이 파일은 예약 데이터를 **읽기만** 한다. Booking 타입·seed를 건드리지 않는다.
 *   폐기 = 이 파일 + OpPointsPage + 포인트몰 목데이터 + 사이드바 메뉴 한 줄 삭제로 끝.
 */

export interface OpPointRules {
  /** 예약 1건당 기본 포인트 */
  base: number;
  /** 예약금액 N엔당 추가 포인트 */
  amountPerYen: number;
  amountUnitYen: number;
  /** 예약금액 추가 포인트의 건당 상한 (고가 예약 과잉 집중 방지) */
  amountCapPerBooking: number;
  /** 추천/프로모션 호텔 보너스 */
  promoBonus: number;
  /** 월별 적립 한도 (투숙 완료 월 기준, 초과분 미지급) */
  monthlyCap: number;
}

/** 기본 규칙 — 운영에서 조정 가능한 파라미터. 프로토타입 시연용 값. */
export const OP_POINT_RULES: OpPointRules = {
  base: 100,
  amountPerYen: 20,
  amountUnitYen: 10_000,
  amountCapPerBooking: 300,
  promoBonus: 200,
  monthlyCap: 5_000,
};

export interface Accrual {
  ellisCode: string;
  hotelName: string;
  /** 투숙 완료일(check_out) — 적립 발생 시점 */
  stayCompleted: string;
  amount: number;
  promo: boolean;
  base: number;
  amountPts: number;
  bonus: number;
  /** 예약별 포인트(기본+금액+보너스). 월 한도는 월 단위(MonthlyRollup)에서 적용. */
  points: number;
  month: string;
}

/** 월별 롤업 — 예약별 포인트 소계에 월 한도를 적용해 실적립을 낸다. */
export interface MonthlyRollup {
  month: string;
  count: number;
  /** 그 달 예약별 포인트 합(한도 전) */
  subtotal: number;
  /** 월 한도 적용 후 실적립 */
  awarded: number;
  /** 한도로 미지급된 포인트 */
  capped: number;
}

/** 투숙이 완료됐고 취소되지 않은 예약만 적립 대상 */
function isAccrualEligible(b: Booking, today: string): boolean {
  return b.status === 'Confirmed' && b.check_out < today;
}

/** 완료 투숙 건별 포인트 — 투숙 완료일 내림차순. 월 한도는 여기서 적용하지 않는다(월 롤업에서). */
export function computeAccruals(bookings: Booking[], today: string, rules: OpPointRules = OP_POINT_RULES): Accrual[] {
  return bookings
    .filter((b) => isAccrualEligible(b, today))
    .sort((a, b) => b.check_out.localeCompare(a.check_out))
    .map((b) => {
      const promo = hotelMetaOf(b.hotel_id).recommended;
      const amountPts = Math.min(
        Math.floor(b.sum_amt / rules.amountUnitYen) * rules.amountPerYen,
        rules.amountCapPerBooking,
      );
      const bonus = promo ? rules.promoBonus : 0;
      return {
        ellisCode: b.ellis_code,
        hotelName: b.hotel_name,
        stayCompleted: b.check_out,
        amount: b.sum_amt,
        promo,
        base: rules.base,
        amountPts,
        bonus,
        points: rules.base + amountPts + bonus,
        month: b.check_out.slice(0, 7),
      };
    });
}

/** 월별 롤업(투숙 완료 월 기준) — 최신 월 먼저 */
export function monthlyRollup(accruals: Accrual[], rules: OpPointRules = OP_POINT_RULES): MonthlyRollup[] {
  const byMonth = new Map<string, { count: number; subtotal: number }>();
  for (const a of accruals) {
    const cur = byMonth.get(a.month) ?? { count: 0, subtotal: 0 };
    cur.count += 1;
    cur.subtotal += a.points;
    byMonth.set(a.month, cur);
  }
  return [...byMonth.entries()]
    .map(([month, v]) => {
      const awarded = Math.min(v.subtotal, rules.monthlyCap);
      return { month, count: v.count, subtotal: v.subtotal, awarded, capped: v.subtotal - awarded };
    })
    .sort((a, b) => b.month.localeCompare(a.month));
}

export interface OpPointSummary {
  earned: number;
  thisMonthEarned: number;
  thisMonthCapUsage: number;
  eligibleCount: number;
  cappedTotal: number;
}

export function summarize(
  accruals: Accrual[],
  today: string,
  rules: OpPointRules = OP_POINT_RULES,
): OpPointSummary {
  const rollup = monthlyRollup(accruals, rules);
  const thisMonth = today.slice(0, 7);
  const tm = rollup.find((r) => r.month === thisMonth);
  return {
    earned: rollup.reduce((s, r) => s + r.awarded, 0),
    thisMonthEarned: tm?.awarded ?? 0,
    thisMonthCapUsage: Math.min(1, (tm?.awarded ?? 0) / rules.monthlyCap),
    eligibleCount: accruals.length,
    cappedTotal: rollup.reduce((s, r) => s + r.capped, 0),
  };
}
