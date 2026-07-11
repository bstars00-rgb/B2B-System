import { z } from 'zod';

const RoleSchema = z.enum(['AGENT_ADMIN', 'AGENT_USER']);
export type AgentRole = z.infer<typeof RoleSchema>;

const LogLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);
export type LogLevel = z.infer<typeof LogLevelSchema>;

const BoolString = z
  .enum(['true', 'false', '1', '0'])
  .default('false')
  .transform((v) => v === 'true' || v === '1');

const EnvSchema = z.object({
  /** Search Gateway API base URL */
  ELLIS_GATEWAY_URL: z.string().url().default('http://localhost:8080'),
  /** Gateway 서비스 인증용 API Key */
  GATEWAY_API_KEY: z.string().default(''),
  /** Agent(셀러) 컨텍스트 토큰 */
  AGENT_TOKEN: z.string().default(''),
  /** 서버가 신뢰하는 agent_id — 도구 입력의 agent_id 는 항상 이 값으로 덮어쓴다 */
  AGENT_ID: z.string().min(1).default('AGENT-LOCAL'),
  /** 권한 롤: AGENT_ADMIN 은 net/markup/supplier 노출, AGENT_USER 는 마스킹 */
  ROLE: RoleSchema.default('AGENT_USER'),
  /** Gateway HTTP 요청 timeout (ms) */
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().max(120_000).default(20_000),
  /** 네트워크 오류 재시도 횟수 (4xx/5xx 는 재시도하지 않음) */
  MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  /** 재시도 지수 백오프 기본 지연 (ms) */
  RETRY_BACKOFF_MS: z.coerce.number().int().min(0).max(10_000).default(250),
  /** 도구 호출 분당 허용 횟수 (토큰버킷) */
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().max(1000).default(30),
  /** search_id 결과 캐시 TTL (ms) — compare 용도 */
  RESULT_CACHE_TTL_MS: z.coerce.number().int().positive().default(30 * 60 * 1000),
  /** true 면 실제 Gateway 대신 mock 데이터 사용 */
  MOCK_MODE: BoolString,
  LOG_LEVEL: LogLevelSchema.default('info'),
});

export interface AppConfig {
  gatewayUrl: string;
  gatewayApiKey: string;
  agentToken: string;
  agentId: string;
  role: AgentRole;
  requestTimeoutMs: number;
  maxRetries: number;
  retryBackoffMs: number;
  rateLimitPerMinute: number;
  resultCacheTtlMs: number;
  mockMode: boolean;
  logLevel: LogLevel;
}

/**
 * process.env 에서 설정을 로드/검증한다.
 * MOCK_MODE 가 아닌 경우 GATEWAY_API_KEY / AGENT_TOKEN 이 반드시 있어야 한다 (fail-fast).
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`환경변수 설정 오류: ${issues}`);
  }
  const e = parsed.data;

  if (!e.MOCK_MODE && (e.GATEWAY_API_KEY.length === 0 || e.AGENT_TOKEN.length === 0)) {
    throw new Error(
      'GATEWAY_API_KEY / AGENT_TOKEN 환경변수가 필요합니다. 로컬 테스트는 MOCK_MODE=true 로 실행하세요.',
    );
  }

  return {
    gatewayUrl: e.ELLIS_GATEWAY_URL.replace(/\/+$/, ''),
    gatewayApiKey: e.GATEWAY_API_KEY,
    agentToken: e.AGENT_TOKEN,
    agentId: e.AGENT_ID,
    role: e.ROLE,
    requestTimeoutMs: e.REQUEST_TIMEOUT_MS,
    maxRetries: e.MAX_RETRIES,
    retryBackoffMs: e.RETRY_BACKOFF_MS,
    rateLimitPerMinute: e.RATE_LIMIT_PER_MINUTE,
    resultCacheTtlMs: e.RESULT_CACHE_TTL_MS,
    mockMode: e.MOCK_MODE,
    logLevel: e.LOG_LEVEL,
  };
}
