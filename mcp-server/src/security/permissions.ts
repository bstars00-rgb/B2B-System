import type { AgentRole, AppConfig } from '../config/env.js';
import { ErrorCodes, ToolError } from '../errors/index.js';

/** 등록되는 조회 전용 도구 전체 목록 — 쓰기/예약 도구는 존재하지 않는다(구조적 차단). */
export const TOOL_NAMES = [
  'search_destinations',
  'search_hotels',
  'get_hotel_details',
  'search_hotel_rates',
  'compare_hotel_rates',
  'get_rate_details',
  'get_cancellation_policy',
  'get_recent_searches',
  'health_check',
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

const ALL_READ_TOOLS: ReadonlySet<string> = new Set(TOOL_NAMES);

/**
 * 롤별 도구 화이트리스트.
 * 현재 두 롤 모두 조회 도구 전체를 사용할 수 있으나,
 * 응답 필드 마스킹(net_price/markup/supplier_id)은 별도로 적용된다.
 */
const ROLE_ALLOWED_TOOLS: Record<AgentRole, ReadonlySet<string>> = {
  AGENT_ADMIN: ALL_READ_TOOLS,
  AGENT_USER: ALL_READ_TOOLS,
};

/** Agent 권한 검증 훅 — 도구 실행 전 호출된다. */
export function assertToolAllowed(role: AgentRole, toolName: string): void {
  const allowed = ROLE_ALLOWED_TOOLS[role];
  if (!allowed) {
    throw new ToolError(ErrorCodes.FORBIDDEN, `알 수 없는 권한 롤입니다: ${String(role)}`);
  }
  if (!allowed.has(toolName)) {
    throw new ToolError(
      ErrorCodes.FORBIDDEN,
      `현재 권한(${role})으로는 '${toolName}' 도구를 사용할 수 없습니다.`,
    );
  }
}

/** Agent 인증 컨텍스트 검증 — MOCK_MODE 가 아니면 자격증명이 반드시 필요하다. */
export function assertAgentContext(config: AppConfig): void {
  if (config.mockMode) return;
  if (config.gatewayApiKey.length === 0 || config.agentToken.length === 0) {
    throw new ToolError(
      ErrorCodes.UNAUTHORIZED,
      'Gateway 자격증명이 설정되지 않았습니다. 관리자에게 문의하세요.',
    );
  }
}
