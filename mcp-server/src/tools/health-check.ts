import { healthCheckSchema, healthCheckShape } from '../schemas/tools.js';
import { defineTool } from './types.js';

export const healthCheckTool = defineTool({
  name: 'health_check',
  description: 'MCP 서버와 Search Gateway 연결 상태를 점검한다. 조회 전용.',
  shape: healthCheckShape,
  schema: healthCheckSchema,
  handler: async (_input, ctx) => {
    const gateway = await ctx.gateway.healthCheck(ctx.traceId);
    return {
      kind: 'success',
      data: {
        server: 'ok',
        server_version: '0.1.0',
        role: ctx.config.role,
        mock_mode: ctx.config.mockMode,
        gateway,
      },
    };
  },
});
