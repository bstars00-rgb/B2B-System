import type { AgentRole } from '../config/env.js';

/**
 * AGENT_USER 권한에서 응답 전 제거되는 민감 필드.
 * - net_price / markup / supplier_id: 내부 원가·마진·공급사 정보
 * - failed_suppliers: 공급사 식별자 목록 (동일 사유로 마스킹)
 */
const MASKED_KEYS: ReadonlySet<string> = new Set([
  'net_price',
  'markup',
  'supplier_id',
  'failed_suppliers',
]);

function maskDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(maskDeep);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (MASKED_KEYS.has(k)) continue;
      out[k] = maskDeep(v);
    }
    return out;
  }
  return value;
}

/** 롤에 따라 응답 전체를 재귀 순회하며 민감 필드를 제거한다. */
export function applyRoleMasking<T>(value: T, role: AgentRole): T {
  if (role === 'AGENT_ADMIN') return value;
  return maskDeep(value) as T;
}
