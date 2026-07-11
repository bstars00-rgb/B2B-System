import { getCancellationPolicySchema, getCancellationPolicyShape } from '../schemas/tools.js';
import { defineTool } from './types.js';

export const getCancellationPolicyTool = defineTool({
  name: 'get_cancellation_policy',
  description:
    '특정 요금제(rate_plan_id)의 취소 정책 전문(단계별 위약금·취소 마감일시)을 조회한다. ' +
    '검색 결과가 만료된 경우 STALE_RESULT 가 반환된다. 조회 전용.',
  shape: getCancellationPolicyShape,
  schema: getCancellationPolicySchema,
  handler: async (input, ctx) => {
    const policy = await ctx.gateway.getCancellationPolicy(
      { search_id: input.search_id, rate_plan_id: input.rate_plan_id, hotel_id: input.hotel_id },
      ctx.traceId,
    );
    return { kind: 'success', data: { policy } };
  },
});
