import type { AppConfig } from '../config/env.js';
import { ErrorCodes, ToolError, toToolError } from '../errors/index.js';
import type { Logger } from '../logging/logger.js';
import type {
  CancellationPolicyResult,
  DestinationHit,
  DestinationSearchParams,
  GatewayClient,
  HealthStatus,
  HotelDetails,
  HotelSearchParams,
  HotelSummary,
  RateDetailsResult,
  RateLookupParams,
  RateSearchRequest,
  RateSearchResult,
} from '../types/index.js';

type FetchLike = typeof globalThis.fetch;

interface RequestOptions {
  method: 'GET' | 'POST';
  path: string;
  traceId: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Search Gateway HTTP 클라이언트 (fetch 기반).
 * - 요청당 timeout (기본 20s, env 조정)
 * - 네트워크 계층 오류(연결 실패/타임아웃)만 최대 MAX_RETRIES 회 지수 백오프 재시도
 * - 4xx/5xx HTTP 응답은 재시도하지 않고 표준 에러 코드로 매핑
 * - 모든 요청에 X-Trace-Id 전파
 */
export class HttpGatewayClient implements GatewayClient {
  constructor(
    private readonly config: AppConfig,
    private readonly logger: Logger,
    private readonly fetchImpl: FetchLike = globalThis.fetch,
  ) {}

  /* ---------------- public API ---------------- */

  async searchDestinations(
    params: DestinationSearchParams,
    traceId: string,
  ): Promise<DestinationHit[]> {
    const res = await this.request<{ destinations: DestinationHit[] }>({
      method: 'GET',
      path: '/v1/destinations',
      traceId,
      query: { query: params.query, language: params.language, limit: params.limit },
    });
    return res.destinations ?? [];
  }

  async searchHotels(params: HotelSearchParams, traceId: string): Promise<HotelSummary[]> {
    const res = await this.request<{ hotels: HotelSummary[] }>({
      method: 'GET',
      path: '/v1/hotels',
      traceId,
      query: {
        destination_id: params.destination_id,
        query: params.query,
        star_rating: params.star_rating?.join(','),
        limit: params.limit,
      },
    });
    return res.hotels ?? [];
  }

  async getHotelDetails(hotelId: string, traceId: string): Promise<HotelDetails> {
    return this.request<HotelDetails>({
      method: 'GET',
      path: `/v1/hotels/${encodeURIComponent(hotelId)}`,
      traceId,
    });
  }

  async searchHotelRates(request: RateSearchRequest, traceId: string): Promise<RateSearchResult> {
    return this.request<RateSearchResult>({
      method: 'POST',
      path: '/v1/rates/search',
      traceId,
      body: request,
    });
  }

  async getRateDetails(params: RateLookupParams, traceId: string): Promise<RateDetailsResult> {
    return this.request<RateDetailsResult>({
      method: 'GET',
      path: `/v1/rates/${encodeURIComponent(params.rate_plan_id)}`,
      traceId,
      query: { search_id: params.search_id, hotel_id: params.hotel_id },
    });
  }

  async getCancellationPolicy(
    params: RateLookupParams,
    traceId: string,
  ): Promise<CancellationPolicyResult> {
    return this.request<CancellationPolicyResult>({
      method: 'GET',
      path: `/v1/rates/${encodeURIComponent(params.rate_plan_id)}/cancellation-policy`,
      traceId,
      query: { search_id: params.search_id, hotel_id: params.hotel_id },
    });
  }

  async healthCheck(traceId: string): Promise<HealthStatus> {
    const started = Date.now();
    const res = await this.request<{ status?: 'ok' | 'degraded' | 'down' }>({
      method: 'GET',
      path: '/v1/health',
      traceId,
    });
    return {
      status: res.status ?? 'ok',
      latency_ms: Date.now() - started,
      mock_mode: false,
      checked_at: new Date().toISOString(),
    };
  }

  /* ---------------- internals ---------------- */

  private buildUrl(path: string, query?: RequestOptions['query']): string {
    const url = new URL(`${this.config.gatewayUrl}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private async request<T>(options: RequestOptions): Promise<T> {
    let attempt = 0;
    for (;;) {
      try {
        return await this.requestOnce<T>(options);
      } catch (err) {
        const toolErr = toToolError(err);
        // 네트워크 계층 오류(retryable=true)만 재시도. 4xx/5xx 는 즉시 실패.
        if (!toolErr.retryable || attempt >= this.config.maxRetries) throw toolErr;
        const backoffMs = this.config.retryBackoffMs * 2 ** attempt;
        this.logger.warn('gateway_retry', {
          trace_id: options.traceId,
          path: options.path,
          attempt: attempt + 1,
          backoff_ms: backoffMs,
          code: toolErr.code,
        });
        await sleep(backoffMs);
        attempt += 1;
      }
    }
  }

  private async requestOnce<T>(options: RequestOptions): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);
    const started = Date.now();
    let response: Response;
    try {
      response = await this.fetchImpl(this.buildUrl(options.path, options.query), {
        method: options.method,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-api-key': this.config.gatewayApiKey,
          authorization: `Bearer ${this.config.agentToken}`,
          'x-trace-id': options.traceId,
          'x-agent-id': this.config.agentId,
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      // fetch 거부 = HTTP 응답을 받지 못한 네트워크 계층 오류 → 재시도 대상
      if (err instanceof Error && err.name === 'AbortError') {
        throw new ToolError(
          ErrorCodes.ELLIS_TIMEOUT,
          `Gateway 응답이 ${this.config.requestTimeoutMs}ms 내에 도착하지 않았습니다`,
          { retryable: true },
        );
      }
      throw new ToolError(ErrorCodes.ELLIS_ERROR, 'Gateway 에 연결할 수 없습니다', {
        retryable: true,
      });
    } finally {
      clearTimeout(timer);
    }

    this.logger.debug('gateway_response', {
      trace_id: options.traceId,
      path: options.path,
      status: response.status,
      duration_ms: Date.now() - started,
    });

    if (response.ok) {
      try {
        return (await response.json()) as T;
      } catch {
        throw new ToolError(ErrorCodes.ELLIS_ERROR, 'Gateway 응답 JSON 파싱에 실패했습니다');
      }
    }

    throw await this.mapHttpError(response);
  }

  private async mapHttpError(response: Response): Promise<ToolError> {
    let upstreamMessage = '';
    try {
      const body = (await response.json()) as { message?: string; code?: string };
      if (typeof body.message === 'string') upstreamMessage = body.message.slice(0, 300);
    } catch {
      /* body 없음/비 JSON — 무시 */
    }
    const suffix = upstreamMessage ? ` — ${upstreamMessage}` : '';
    const status = response.status;

    // 4xx 는 재시도 금지 (retryable=false 기본값)
    if (status === 400 || status === 422) {
      return new ToolError(ErrorCodes.INVALID_QUERY, `Gateway 가 요청을 거부했습니다${suffix}`);
    }
    if (status === 401) {
      return new ToolError(ErrorCodes.UNAUTHORIZED, `인증에 실패했습니다${suffix}`);
    }
    if (status === 403) {
      return new ToolError(ErrorCodes.FORBIDDEN, `요청 권한이 없습니다${suffix}`);
    }
    if (status === 404) {
      return new ToolError(ErrorCodes.NO_RESULTS, `요청한 리소스를 찾을 수 없습니다${suffix}`);
    }
    if (status === 429) {
      return new ToolError(ErrorCodes.RATE_LIMITED, `Gateway 호출 한도를 초과했습니다${suffix}`);
    }
    if (status === 408 || status === 504) {
      return new ToolError(ErrorCodes.ELLIS_TIMEOUT, `상위 시스템 응답이 지연되었습니다${suffix}`);
    }
    // 5xx 포함 나머지 — HTTP 응답을 받았으므로 네트워크 오류가 아님 → 재시도하지 않음
    return new ToolError(
      ErrorCodes.ELLIS_ERROR,
      `Gateway 오류가 발생했습니다 (HTTP ${status})${suffix}`,
    );
  }
}
