import { getRateDetailsSchema, getRateDetailsShape } from '../schemas/tools.js';
import { defineTool } from './types.js';

export const getRateDetailsTool = defineTool({
  name: 'get_rate_details',
  description:
    'search_hotel_rates 결과의 특정 요금제(rate_plan_id)에 대한 상세 정보(박별 요금·포함 사항·비고)를 조회한다. ' +
    '검색 결과가 만료된 경우 STALE_RESULT 가 반환된다. 조회 전용.',
  shape: getRateDetailsShape,
  schema: getRateDetailsSchema,
  handler: async (input, ctx) => {
    const details = await ctx.gateway.getRateDetails(
      { search_id: input.search_id, rate_plan_id: input.rate_plan_id, hotel_id: input.hotel_id },
      ctx.traceId,
    );
    return {
      kind: 'success',
      data: {
        search_id: input.search_id,
        rate: details.rate,
        price_per_night: details.price_per_night,
        includes: details.includes,
        remarks: details.remarks,
      },
    };
  },
});
