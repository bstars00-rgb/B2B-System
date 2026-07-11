import { searchDestinationsSchema, searchDestinationsShape } from '../schemas/tools.js';
import { defineTool } from './types.js';

export const searchDestinationsTool = defineTool({
  name: 'search_destinations',
  description:
    '자연어 검색어로 목적지(도시/지역/랜드마크)를 검색해 destination_id 후보 목록을 반환한다. ' +
    '요금 검색(search_hotel_rates) 전에 목적지 ID 를 확정하는 용도. 조회 전용.',
  shape: searchDestinationsShape,
  schema: searchDestinationsSchema,
  handler: async (input, ctx) => {
    const destinations = await ctx.gateway.searchDestinations(
      { query: input.query, language: input.language, limit: input.limit },
      ctx.traceId,
    );
    if (destinations.length === 0) {
      return {
        kind: 'no_results',
        message: `'${input.query}'에 해당하는 목적지를 찾지 못했습니다.`,
        suggestions: ['영문 도시명으로 다시 검색해 보세요', '도시 단위 명칭(예: Tokyo, Singapore)으로 검색해 보세요'],
      };
    }
    return {
      kind: 'success',
      data: { query: input.query, total: destinations.length, destinations },
    };
  },
});
