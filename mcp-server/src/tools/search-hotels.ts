import { searchHotelsSchema, searchHotelsShape } from '../schemas/tools.js';
import { defineTool } from './types.js';

export const searchHotelsTool = defineTool({
  name: 'search_hotels',
  description:
    '목적지 ID 또는 호텔명 검색어로 호텔 목록(콘텐츠 요약)을 조회한다. 요금은 포함하지 않는다 — ' +
    '요금은 search_hotel_rates 를 사용할 것. 조회 전용.',
  shape: searchHotelsShape,
  schema: searchHotelsSchema,
  handler: async (input, ctx) => {
    const hotels = await ctx.gateway.searchHotels(
      {
        destination_id: input.destination_id,
        query: input.query,
        star_rating: input.star_rating,
        limit: input.limit,
      },
      ctx.traceId,
    );

    ctx.history.add({
      searched_at: new Date().toISOString(),
      tool: 'search_hotels',
      summary: {
        destination_id: input.destination_id ?? null,
        query: input.query ?? null,
        star_rating: input.star_rating ?? null,
      },
      result_count: hotels.length,
      trace_id: ctx.traceId,
    });

    if (hotels.length === 0) {
      return {
        kind: 'no_results',
        message: '조건에 맞는 호텔이 없습니다.',
        suggestions: ['성급 조건을 완화해 보세요', 'search_destinations 로 목적지 ID 를 다시 확인해 보세요'],
      };
    }
    return { kind: 'success', data: { total: hotels.length, hotels } };
  },
});
