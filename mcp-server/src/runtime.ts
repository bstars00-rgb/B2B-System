import { randomUUID } from 'node:crypto';
import type { AppConfig } from './config/env.js';
import { HttpGatewayClient } from './clients/gateway-client.js';
import { MockGatewayClient } from './clients/mock-gateway.js';
import { ErrorCodes, ToolError, toToolError } from './errors/index.js';
import { createLogger, type Logger } from './logging/logger.js';
import { summarizeZodError } from './schemas/common.js';
import { applyRoleMasking } from './security/masking.js';
import { assertAgentContext, assertToolAllowed } from './security/permissions.js';
import { TokenBucket } from './security/rate-limit.js';
import { ResultCache } from './stores/result-cache.js';
import { SearchHistory } from './stores/search-history.js';
import { allTools } from './tools/registry.js';
import type { ToolContext, ToolDefinition, ToolOutcome } from './tools/types.js';
import type { GatewayClient } from './types/index.js';

export interface ExecuteResult {
  envelope: Record<string, unknown>;
  isError: boolean;
}

/**
 * 도구 실행 파이프라인:
 * trace_id 발급 → 인증 컨텍스트 확인 → 권한 훅 → rate limit → Zod 검증 →
 * 핸들러 실행 → 응답 봉투 구성 → 롤 기반 필드 마스킹 → 구조화 로그.
 */
export class Runtime {
  readonly tools: ToolDefinition[] = allTools;
  private readonly toolMap: Map<string, ToolDefinition>;
  private readonly bucket: TokenBucket;
  private readonly gateway: GatewayClient;
  private readonly resultCache: ResultCache;
  private readonly history: SearchHistory;
  readonly logger: Logger;

  constructor(
    readonly config: AppConfig,
    options: { logger?: Logger; gateway?: GatewayClient } = {},
  ) {
    this.logger = options.logger ?? createLogger(config.logLevel, { service: 'ellis-mcp' });
    this.gateway =
      options.gateway ??
      (config.mockMode
        ? new MockGatewayClient()
        : new HttpGatewayClient(config, this.logger));
    this.bucket = new TokenBucket(config.rateLimitPerMinute);
    this.resultCache = new ResultCache(config.resultCacheTtlMs);
    this.history = new SearchHistory();
    this.toolMap = new Map(this.tools.map((t) => [t.name, t]));
  }

  async execute(toolName: string, rawArgs: unknown): Promise<ExecuteResult> {
    const traceId = randomUUID();
    const started = Date.now();
    const log = this.logger.child({ tool: toolName, trace_id: traceId });

    try {
      const tool = this.toolMap.get(toolName);
      if (!tool) {
        throw new ToolError(ErrorCodes.INVALID_QUERY, `알 수 없는 도구입니다: ${toolName}`);
      }

      // 1) Agent 인증 컨텍스트 + 권한 훅
      assertAgentContext(this.config);
      assertToolAllowed(this.config.role, toolName);

      // 2) 토큰버킷 rate limit
      if (!this.bucket.tryConsume()) {
        throw new ToolError(
          ErrorCodes.RATE_LIMITED,
          `분당 도구 호출 한도(${this.config.rateLimitPerMinute}회)를 초과했습니다. 잠시 후 다시 시도해 주세요.`,
          { details: { retry_after_ms: this.bucket.retryAfterMs() } },
        );
      }

      // 3) Zod 입력 검증 (cross-field 검증 포함)
      const parsed = tool.schema.safeParse(rawArgs ?? {});
      if (!parsed.success) {
        throw new ToolError(ErrorCodes.INVALID_QUERY, summarizeZodError(parsed.error));
      }

      // 4) 핸들러 실행
      const ctx: ToolContext = {
        traceId,
        config: this.config,
        gateway: this.gateway,
        logger: log,
        resultCache: this.resultCache,
        history: this.history,
      };
      const outcome = await tool.handler(parsed.data, ctx);

      // 5) 봉투 구성 + 롤 마스킹 (AGENT_USER → net_price/markup/supplier_id 제거)
      const envelope = applyRoleMasking(
        buildEnvelope(toolName, traceId, outcome),
        this.config.role,
      );

      log.info('tool_call_completed', {
        status: envelope['status'],
        duration_ms: Date.now() - started,
      });
      return { envelope, isError: false };
    } catch (err) {
      const toolErr = toToolError(err);
      log.error('tool_call_failed', {
        code: toolErr.code,
        error_message: toolErr.message,
        duration_ms: Date.now() - started,
      });
      const envelope: Record<string, unknown> = {
        tool: toolName,
        trace_id: traceId,
        // NO_RESULTS 는 오류가 아닌 별도 상태로 구분해 반환한다
        status: toolErr.code === ErrorCodes.NO_RESULTS ? 'no_results' : 'error',
        error: {
          code: toolErr.code,
          message: toolErr.message,
          retryable: toolErr.retryable,
          ...(toolErr.details !== undefined ? { details: toolErr.details } : {}),
        },
      };
      return { envelope, isError: true };
    }
  }
}

function buildEnvelope(
  toolName: string,
  traceId: string,
  outcome: ToolOutcome,
): Record<string, unknown> {
  const base = { tool: toolName, trace_id: traceId };
  switch (outcome.kind) {
    case 'success':
      return { ...base, status: 'success', warnings: outcome.warnings ?? [], data: outcome.data };
    case 'partial':
      // 공급사 일부 실패 — 데이터는 반환하되 상태/경고로 명시
      return {
        ...base,
        status: 'partial_success',
        warning_code: ErrorCodes.SUPPLIER_PARTIAL_FAILURE,
        warnings: outcome.warnings,
        data: outcome.data,
      };
    case 'no_results':
      return {
        ...base,
        status: 'no_results',
        code: ErrorCodes.NO_RESULTS,
        message: outcome.message,
        suggestions: outcome.suggestions ?? [],
      };
  }
}
