import type { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import type { Logger } from '../logging/logger.js';
import type { ResultCache } from '../stores/result-cache.js';
import type { SearchHistory } from '../stores/search-history.js';
import type { GatewayClient } from '../types/index.js';

export interface ToolContext {
  traceId: string;
  config: AppConfig;
  gateway: GatewayClient;
  logger: Logger;
  resultCache: ResultCache;
  history: SearchHistory;
}

/**
 * 도구 실행 결과.
 * - success / partial: 정상 데이터 (partial 은 공급사 일부 실패 — warnings 필수)
 * - no_results: 오류가 아닌 "결과 없음" — API 오류(ELLIS_ERROR 등)와 구조적으로 구분된다
 * - 오류는 ToolError throw 로 표현한다
 */
export type ToolOutcome =
  | { kind: 'success'; data: Record<string, unknown>; warnings?: string[] }
  | { kind: 'partial'; data: Record<string, unknown>; warnings: string[] }
  | { kind: 'no_results'; message: string; suggestions?: string[] };

export interface ToolDefinition<S extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  /** MCP tool 등록용 raw shape (JSON Schema 로 노출) */
  shape: z.ZodRawShape;
  /** 런타임 검증용 전체 스키마 (cross-field 검증 포함) */
  schema: S;
  handler: (input: z.infer<S>, ctx: ToolContext) => Promise<ToolOutcome>;
}

/** 제네릭 유지가 어려운 목록 컨텍스트에서 사용하는 헬퍼 */
export function defineTool<S extends z.ZodTypeAny>(def: ToolDefinition<S>): ToolDefinition {
  return def as unknown as ToolDefinition;
}
