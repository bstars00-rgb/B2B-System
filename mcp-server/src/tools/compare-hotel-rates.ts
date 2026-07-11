import { compareHotelRatesSchema, compareHotelRatesShape } from '../schemas/tools.js';
import { ErrorCodes, ToolError } from '../errors/index.js';
import type { CancellationType, RateResult } from '../types/index.js';
import { defineTool } from './types.js';

const CANCEL_RANK: Record<CancellationType, number> = {
  free_cancellation: 0,
  partial_penalty: 1,
  non_refundable: 2,
};

interface HotelComparison {
  hotel_id: string;
  hotel_name: string;
  star_rating: number;
  cheapest_rate: RateResult;
  best_refundable_rate: RateResult | null;
  rate_count: number;
}

export const compareHotelRatesTool = defineTool({
  name: 'compare_hotel_rates',
  description:
    '직전 search_hotel_rates 결과(search_id)를 재검색 없이 캐시에서 불러와 호텔별로 비교한다. ' +
    'criteria=price 는 최저가 기준, criteria=cancellation 은 취소조건 우선 기준으로 정렬한다. ' +
    '캐시가 만료된 경우 STALE_RESULT 를 반환하므로 search_hotel_rates 를 다시 실행해야 한다. 조회 전용.',
  shape: compareHotelRatesShape,
  schema: compareHotelRatesSchema,
  handler: async (input, ctx) => {
    const rates = ctx.resultCache.get(input.search_id);
    if (!rates) {
      throw new ToolError(
        ErrorCodes.STALE_RESULT,
        `search_id(${input.search_id}) 결과가 만료되었거나 존재하지 않습니다. search_hotel_rates 를 다시 실행해 주세요.`,
      );
    }

    let pool = rates;
    if (input.hotel_ids && input.hotel_ids.length > 0) {
      const wanted = new Set(input.hotel_ids);
      pool = pool.filter((r) => wanted.has(r.hotel_id));
    }
    if (pool.length === 0) {
      return {
        kind: 'no_results',
        message: '지정한 호텔에 해당하는 캐시된 요금이 없습니다.',
        suggestions: ['hotel_ids 를 검색 결과에 포함된 호텔로 지정하세요'],
      };
    }

    // 호텔별 그룹핑 — 정렬/선택만 수행하며 금액을 새로 계산하지 않는다.
    const byHotel = new Map<string, RateResult[]>();
    for (const rate of pool) {
      const list = byHotel.get(rate.hotel_id);
      if (list) list.push(rate);
      else byHotel.set(rate.hotel_id, [rate]);
    }

    const comparisons: HotelComparison[] = [];
    for (const hotelRates of byHotel.values()) {
      const cheapest = [...hotelRates].sort((a, b) => a.selling_price - b.selling_price)[0]!;
      const refundables = hotelRates
        .filter((r) => r.cancellation_type === 'free_cancellation')
        .sort(
          (a, b) =>
            (b.cancellation_deadline ?? '').localeCompare(a.cancellation_deadline ?? '') ||
            a.selling_price - b.selling_price,
        );
      comparisons.push({
        hotel_id: cheapest.hotel_id,
        hotel_name: cheapest.hotel_name,
        star_rating: cheapest.star_rating,
        cheapest_rate: cheapest,
        best_refundable_rate: refundables[0] ?? null,
        rate_count: hotelRates.length,
      });
    }

    if (input.criteria === 'price') {
      comparisons.sort((a, b) => a.cheapest_rate.selling_price - b.cheapest_rate.selling_price);
    } else {
      comparisons.sort((a, b) => {
        const ra = a.best_refundable_rate ?? a.cheapest_rate;
        const rb = b.best_refundable_rate ?? b.cheapest_rate;
        return (
          CANCEL_RANK[ra.cancellation_type] - CANCEL_RANK[rb.cancellation_type] ||
          ra.selling_price - rb.selling_price
        );
      });
    }

    return {
      kind: 'success',
      data: {
        search_id: input.search_id,
        criteria: input.criteria,
        compared_hotels: comparisons.slice(0, input.limit),
        note: '캐시된 검색 결과 기반 비교입니다. 최신 요금은 search_hotel_rates 로 재조회하세요.',
      },
    };
  },
});
