#!/usr/bin/env node
/**
 * ELLIS 호텔 검색 MCP Server (조회 전용) — stdio transport.
 *
 * 주의: stdout 은 MCP 프로토콜 통신 전용이다.
 * 모든 로그는 logging/logger.ts 를 통해 stderr 로만 출력한다.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config/env.js';
import { Runtime } from './runtime.js';

const SERVER_NAME = 'ellis-mcp';
const SERVER_VERSION = '0.1.0';

async function main(): Promise<void> {
  const config = loadConfig();
  const runtime = new Runtime(config);
  const logger = runtime.logger;

  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  for (const tool of runtime.tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.shape,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      (async (args: Record<string, unknown>) => {
        const { envelope, isError } = await runtime.execute(tool.name, args ?? {});
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(envelope, null, 2) }],
          isError,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('server_started', {
    name: SERVER_NAME,
    version: SERVER_VERSION,
    mock_mode: config.mockMode,
    role: config.role,
    tool_count: runtime.tools.length,
    rate_limit_per_minute: config.rateLimitPerMinute,
  });
}

main().catch((err: unknown) => {
  // 초기화 실패도 stderr 로만 출력
  process.stderr.write(
    `${JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'server_fatal',
      error: err instanceof Error ? err.message : String(err),
    })}\n`,
  );
  process.exit(1);
});
