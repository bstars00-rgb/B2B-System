import type { RateResult } from '../types';
import type { RateSeed } from './factory';

/**
 * 마켓 전용요금(Market Only Rate) 목데이터 — 기획: docs/plan/feature-market-only-rate-tag.md. **프로토타입 · 폐기 가능.**
 *
 * 실서비스(ELS-3838, PROD 2026-10-15): ELLIS Users > Customer > Traders 의 **Dotbiz Market 트레이더(comp code 300427)**
 * Seller Include Info(Rate Plans List · Promotion List)에 넣은 레이트플랜·프로모션 = 마켓 전용
 * (마켓 에이전시 전체 노출, B2C·API/OTA 비노출). 태그는 그 판정 결과를 가용성 응답 플래그로 받아 표시만 한다.
 *
 * 프로토타입은 요금이 생성형 목데이터라, 아래 규칙의 호텔에 전용 레이트플랜 1건을 추가해 시연한다
 * (기준 레이트플랜을 복제 → 이름·가격만 바꾸고 market_only 표시).
 */

export const DOTBIZ_MARKET_TRADER = { code: '300427', name: 'Dotbiz Market' } as const;

/** 일반 요금 대비 차이가 이 값(%) 이상일 때만 경쟁력 문구 표시 — 실서비스는 ELLIS 설정값 */
export const MARKET_ONLY_MIN_GAP_PCT = 3;

interface MarketOnlyRule {
  hotelId: string;
  /** 복제할 기준 레이트플랜 이름 */
  basePlan: string;
  /** 전용 레이트플랜 이름 */
  planName: string;
  /** 기준 대비 가격 배수 */
  factor: number;
  /** 시연 포인트 */
  note: string;
}

export const MARKET_ONLY_RULES: MarketOnlyRule[] = [
  { hotelId: 'HTL-TYO-11', basePlan: '베스트 플렉시블', planName: '스마트 플렉시블', factor: 0.9, note: '일반 요금보다 10% 낮음 → 전용 태그 + 경쟁력 문구' },
  { hotelId: 'HTL-TYO-14', basePlan: '베스트 플렉시블', planName: '스마트 플렉시블', factor: 0.99, note: '차이 1% → 기준(3%) 미만이라 전용 태그만' },
  { hotelId: 'HTL-OSA-11', basePlan: '베스트 플렉시블', planName: '스마트 플렉시블', factor: 0.92, note: '일반 요금보다 8% 낮음' },
];

/** 규칙 호텔의 기준 레이트플랜 바로 뒤에 전용 레이트플랜을 끼워 넣는다 */
export function withMarketOnly(seeds: RateSeed[]): RateSeed[] {
  const out: RateSeed[] = [];
  for (const s of seeds) {
    out.push(s);
    const rule = MARKET_ONLY_RULES.find((r) => r.hotelId === s.hotel_id && r.basePlan === s.rate_plan_name);
    if (!rule) continue;
    out.push({
      ...s,
      rate_plan_name: rule.planName,
      net_price: Math.round((s.net_price ?? 0) * rule.factor),
      availability: 'available',
      has_booking_token: true,
      warnings: [],
      market_only: true,
    });
  }
  return out;
}

const sumOf = (r: RateResult) => r.selling_price + r.tax;
const refundable = (r: RateResult) => r.cancellation_type !== 'non_refundable';

/**
 * 경쟁력 — 같은 검색 결과 안에서 **같은 룸타입 · 같은 식사 · 같은 환불 여부**의 일반(비전용·예약 가능) 요금 중 최저가 대비 몇 % 낮은지.
 * 비교 대상이 없거나 차이가 기준 미만이면 null (전용 태그만 표시). 외부 채널 가격과는 비교하지 않는다.
 */
export function marketOnlyGapPct(rate: RateResult, rates: RateResult[], minPct = MARKET_ONLY_MIN_GAP_PCT): number | null {
  if (!rate.market_only) return null;
  const peers = rates.filter(
    (r) =>
      !r.market_only &&
      r.availability === 'available' &&
      r.room_type_name === rate.room_type_name &&
      r.meal_plan === rate.meal_plan &&
      refundable(r) === refundable(rate),
  );
  if (peers.length === 0) return null;
  const regular = Math.min(...peers.map(sumOf));
  const pct = Math.floor(((regular - sumOf(rate)) / regular) * 100);
  return pct >= minPct ? pct : null;
}

export const hasMarketOnly = (rates: RateResult[]) => rates.some((r) => r.market_only);
