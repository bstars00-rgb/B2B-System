import { describe, expect, it, vi } from 'vitest';
import { HttpGatewayClient } from '../src/clients/gateway-client.js';
import type { AppConfig } from '../src/config/env.js';
import { createLogger } from '../src/logging/logger.js';

function config(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    gatewayUrl: 'http://gateway.test',
    gatewayApiKey: 'test-key',
    agentToken: 'test-token',
    agentId: 'AGENT-TEST',
    role: 'AGENT_ADMIN',
    requestTimeoutMs: 5000,
    maxRetries: 2,
    retryBackoffMs: 1, // 테스트에서는 백오프 지연 최소화
    rateLimitPerMinute: 100,
    resultCacheTtlMs: 60_000,
    mockMode: false,
    logLevel: 'error',
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('HttpGatewayClient — timeout/retry/에러 매핑', () => {
  it('네트워크 오류는 최대 2회 재시도 후 성공하면 결과를 반환한다', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(jsonResponse({ destinations: [{ destination_id: 'DST-TYO' }] }));

    const client = new HttpGatewayClient(config(), createLogger('error'), fetchMock as never);
    const result = await client.searchDestinations({ query: 'tokyo', limit: 5 }, 'trace-1');
    expect(result).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(3); // 1회 + 재시도 2회
  });

  it('네트워크 오류가 계속되면 재시도 소진 후 ELLIS_ERROR 를 던진다', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    const client = new HttpGatewayClient(config(), createLogger('error'), fetchMock as never);
    await expect(client.healthCheck('trace-2')).rejects.toMatchObject({
      code: 'ELLIS_ERROR',
      retryable: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3); // 최초 1회 + 재시도 2회
  });

  it('4xx 응답은 재시도하지 않고 표준 에러 코드로 매핑한다', async () => {
    const cases: Array<[number, string]> = [
      [400, 'INVALID_QUERY'],
      [401, 'UNAUTHORIZED'],
      [403, 'FORBIDDEN'],
      [404, 'NO_RESULTS'],
      [429, 'RATE_LIMITED'],
    ];
    for (const [status, code] of cases) {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: 'boom' }, status));
      const client = new HttpGatewayClient(config(), createLogger('error'), fetchMock as never);
      await expect(client.healthCheck('trace-3')).rejects.toMatchObject({ code });
      expect(fetchMock).toHaveBeenCalledTimes(1); // 재시도 없음
    }
  });

  it('5xx 응답은 네트워크 오류가 아니므로 재시도하지 않는다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: 'internal' }, 500));
    const client = new HttpGatewayClient(config(), createLogger('error'), fetchMock as never);
    await expect(client.healthCheck('trace-4')).rejects.toMatchObject({
      code: 'ELLIS_ERROR',
      retryable: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('timeout(AbortError)은 ELLIS_TIMEOUT 으로 매핑되고 재시도된다', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    const fetchMock = vi.fn().mockRejectedValue(abortError);
    const client = new HttpGatewayClient(config(), createLogger('error'), fetchMock as never);
    await expect(client.healthCheck('trace-5')).rejects.toMatchObject({ code: 'ELLIS_TIMEOUT' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('모든 요청에 trace_id / api key / agent 헤더를 전파한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok' }));
    const client = new HttpGatewayClient(config(), createLogger('error'), fetchMock as never);
    await client.healthCheck('trace-abc-123');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['x-trace-id']).toBe('trace-abc-123');
    expect(headers['x-api-key']).toBe('test-key');
    expect(headers['authorization']).toBe('Bearer test-token');
    expect(headers['x-agent-id']).toBe('AGENT-TEST');
  });
});
