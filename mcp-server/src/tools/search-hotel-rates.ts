import { searchHotelRatesSchema, searchHotelRatesShape } from '../schemas/search-hotel-rates.js';
import type { RateSearchRequest } from '../types/index.js';
import { defineTool } from './types.js';

export const searchHotelRatesTool = defineTool({
  name: 'search_hotel_rates',
  description:
    '목적지 또는 호텔 목록에 대해 체크인/아웃 날짜·객실 인원 기준의 판매 요금을 검색한다. ' +
    '금액은 Gateway(ELLIS 룰 엔진) 응답을 그대로 전달하며 이 서버는 어떤 금액도 계산하지 않는다. ' +
    '결과의 search_id 는 compare_hotel_rates / get_rate_details / get_cancellation_policy 에서 사용한다. 조회 전용.',
  shape: searchHotelRatesShape,
  schema: searchHotelRatesSchema,
  handler: async (input, ctx) => {
    // agent_id 는 신뢰 경계 밖 입력 — 항상 서버 세션 컨텍스트(env)로 덮어쓴다.
    if (input.agent_id !== undefined && input.agent_id !== ctx.config.agentId) {
      ctx.logger.warn('agent_id_input_ignored', {
        reason: '클라이언트가 전달한 agent_id 는 무시되고 서버 컨텍스트로 대체됨',
      });
    }

    const request: RateSearchRequest = {
      agent_id: ctx.config.agentId,
      destination_id: input.destination_id,
      hotel_ids: input.hotel_ids,
      check_in: input.check_in,
      check_out: input.check_out,
      rooms: input.rooms,
      nationality: input.nationality,
      residence_country: input.residence_country,
      currency: input.currency,
      meal_plan: input.meal_plan,
      refundable_only: input.refundable_only,
      max_total_price: input.max_total_price,
      max_nightly_price: input.max_nightly_price,
      star_rating: input.star_rating,
      sort_by: input.sort_by,
      result_limit: input.result_limit,
      include_tax: input.include_tax,
      include_markup: input.include_markup,
    };

    const result = await ctx.gateway.searchHotelRates(request, ctx.traceId);

    ctx.history.add({
      searched_at: new Date().toISOString(),
      tool: 'search_hotel_rates',
      summary: {
        destination_id: input.destination_id ?? null,
        hotel_ids: input.hotel_ids ?? null,
        check_in: input.check_in,
        check_out: input.check_out,
        rooms: input.rooms.length,
        currency: input.currency,
        refundable_only: input.refundable_only,
        meal_plan: input.meal_plan,
      },
      result_count: result.rates.length,
      search_id: result.search_id,
      trace_id: ctx.traceId,
    });

    if (result.status === 'no_results' || result.rates.length === 0) {
      return {
        kind: 'no_results',
        message: '조건에 맞는 요금이 없습니다.',
        suggestions: [
          '날짜를 변경해 보세요',
          '성급/식사/무료취소 필터를 완화해 보세요',
          'max_total_price / max_nightly_price 상한을 높여 보세요',
        ],
      };
    }

    // compare_hotel_rates 용 결과 캐시 (TTL 내 재사용, 재검색 없는 비교)
    ctx.resultCache.set(result.search_id, result.rates);

    const data = {
      search_id: result.search_id,
      agent_id: ctx.config.agentId,
      check_in: input.check_in,
      check_out: input.check_out,
      currency: input.currency,
      sort_by: input.sort_by,
      total_results: result.rates.length,
      rates: result.rates,
      failed_suppliers: result.failed_suppliers ?? [],
    };

    if (result.status === 'partial_success') {
      return { kind: 'partial', data, warnings: result.warnings };
    }
    return { kind: 'success', data, warnings: result.warnings };
  },
});
