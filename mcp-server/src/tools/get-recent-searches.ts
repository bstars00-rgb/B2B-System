import { getRecentSearchesSchema, getRecentSearchesShape } from '../schemas/tools.js';
import { defineTool } from './types.js';

export const getRecentSearchesTool = defineTool({
  name: 'get_recent_searches',
  description:
    '현재 세션에서 수행한 최근 검색(호텔/요금)의 요약 이력을 조회한다. 개인정보는 저장/반환하지 않는다. 조회 전용.',
  shape: getRecentSearchesShape,
  schema: getRecentSearchesSchema,
  handler: async (input, ctx) => {
    const searches = ctx.history.list(input.limit);
    return {
      kind: 'success',
      data: { total: searches.length, searches },
    };
  },
});
