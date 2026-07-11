/**
 * 표준 에러 코드 및 도구 오류 타입.
 * 모든 도구 실행 오류는 ToolError 로 정규화되어 구조화 응답으로 변환된다.
 */
export const ErrorCodes = {
  INVALID_QUERY: 'INVALID_QUERY',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NO_RESULTS: 'NO_RESULTS',
  RATE_LIMITED: 'RATE_LIMITED',
  ELLIS_TIMEOUT: 'ELLIS_TIMEOUT',
  ELLIS_ERROR: 'ELLIS_ERROR',
  SUPPLIER_PARTIAL_FAILURE: 'SUPPLIER_PARTIAL_FAILURE',
  STALE_RESULT: 'STALE_RESULT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export interface ToolErrorOptions {
  /** 네트워크 계층 오류 여부 — true 인 경우에만 gateway client 가 재시도한다. */
  retryable?: boolean;
  details?: unknown;
}

export class ToolError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, options: ToolErrorOptions = {}) {
    super(message);
    this.name = 'ToolError';
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.details = options.details;
  }
}

/** 임의의 예외를 ToolError 로 정규화한다 (알 수 없는 오류 → INTERNAL_ERROR). */
export function toToolError(err: unknown): ToolError {
  if (err instanceof ToolError) return err;
  const message = err instanceof Error ? err.message : String(err);
  return new ToolError(ErrorCodes.INTERNAL_ERROR, message);
}
