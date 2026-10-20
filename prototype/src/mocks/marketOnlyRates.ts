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
  { hotelId: 'HTL-TYO-11', basePlan: '베스트 플렉시블', planName: '스마트 플렉시블', factor: 0.9, note: '일반 요금보다 낮은 전용요금' },
  { hotelId: 'HTL-TYO-14', basePlan: '베스트 플렉시블', planName: '스마트 플렉시블', factor: 1.05, note: '일반 요금보다 높은 전용요금 — 태그는 같다' },
  { hotelId: 'HTL-OSA-11', basePlan: '베스트 플렉시블', planName: '스마트 플렉시블', factor: 0.92, note: '일반 요금보다 낮은 전용요금' },
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

export const hasMarketOnly = (rates: RateResult[]) => rates.some((r) => r.market_only);
