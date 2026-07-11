import { describe, expect, it } from 'vitest';
import type { AppConfig } from '../src/config/env.js';
import { Runtime } from '../src/runtime.js';
import { createLogger } from '../src/logging/logger.js';

function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function mockConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    gatewayUrl: 'http://localhost:8080',
    gatewayApiKey: '',
    agentToken: '',
    agentId: 'AGENT-TEST-001',
    role: 'AGENT_ADMIN',
    requestTimeoutMs: 5000,
    maxRetries: 2,
    retryBackoffMs: 1,
    rateLimitPerMinute: 1000,
    resultCacheTtlMs: 60_000,
    mockMode: true,
    logLevel: 'error',
    ...overrides,
  };
}

function createRuntime(overrides: Partial<AppConfig> = {}): Runtime {
  const config = mockConfig(overrides);
  return new Runtime(config, { logger: createLogger('error') });
}

const baseRateArgs = {
  destination_id: 'DST-TYO',
  check_in: futureDate(30),
  check_out: futureDate(33),
  rooms: [{ adults: 2, children: 0, children_ages: [] }],
  currency: 'USD',
};

type Envelope = Record<string, any>;

async function call(runtime: Runtime, tool: string, args: unknown): Promise<Envelope> {
  const { envelope } = await runtime.execute(tool, args);
  return envelope as Envelope;
}

describe('mock 기반 도구 통합 테스트', () => {
  it('search_destinations: 검색어로 목적지 후보를 반환한다', async () => {
    const rt = createRuntime();
    const env = await call(rt, 'search_destinations', { query: '도쿄' });
    expect(env.status).toBe('success');
    expect(env.trace_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(env.data.destinations[0].destination_id).toBe('DST-TYO');
  });

  it('search_hotels: 성급 필터가 적용된 호텔 목록을 반환한다', async () => {
    const rt = createRuntime();
    const env = await call(rt, 'search_hotels', { destination_id: 'DST-TYO', star_rating: [5] });
    expect(env.status).toBe('success');
    expect(env.data.hotels.every((h: Envelope) => h.star_rating === 5)).toBe(true);
  });

  it('get_hotel_details: 호텔 상세를 반환하고, 없는 호텔은 no_results 를 반환한다', async () => {
    const rt = createRuntime();
    const ok = await call(rt, 'get_hotel_details', { hotel_id: 'HTL-SIN-001' });
    expect(ok.status).toBe('success');
    expect(ok.data.hotel.hotel_name).toBe('Marina Bay Grand');

    const missing = await call(rt, 'get_hotel_details', { hotel_id: 'HTL-NOPE' });
    expect(missing.status).toBe('no_results');
    expect(missing.error.code).toBe('NO_RESULTS');
  });

  it('search_hotel_rates: 요금 결과를 반환하며 필수 필드가 모두 존재한다', async () => {
    const rt = createRuntime();
    const env = await call(rt, 'search_hotel_rates', baseRateArgs);
    expect(env.status).toBe('success');
    expect(env.data.search_id).toMatch(/^SRCH-/);
    expect(env.data.total_results).toBeGreaterThan(0);
    const rate = env.data.rates[0];
    for (const field of [
      'search_id', 'hotel_id', 'hotel_name', 'destination', 'star_rating', 'latitude', 'longitude',
      'room_type_id', 'room_type_name', 'rate_plan_id', 'rate_plan_name', 'meal_plan',
      'cancellation_type', 'cancellation_policy_text', 'selling_price', 'tax', 'currency',
      'total_nights', 'total_rooms', 'availability', 'last_updated_at', 'warnings',
    ]) {
      expect(rate).toHaveProperty(field);
    }
    expect(rate.total_nights).toBe(3);
    // price_asc 정렬 확인
    const prices = env.data.rates.map((r: Envelope) => r.selling_price);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  it('search_hotel_rates: 입력 agent_id 를 무시하고 서버 컨텍스트 값으로 덮어쓴다', async () => {
    const rt = createRuntime();
    const env = await call(rt, 'search_hotel_rates', { ...baseRateArgs, agent_id: 'HACKER-999' });
    expect(env.status).toBe('success');
    expect(env.data.agent_id).toBe('AGENT-TEST-001');
    expect(JSON.stringify(env)).not.toContain('HACKER-999');
  });

  it('AGENT_USER 롤: net_price / markup / supplier_id 가 응답에서 제거된다', async () => {
    const rt = createRuntime({ role: 'AGENT_USER' });
    const env = await call(rt, 'search_hotel_rates', baseRateArgs);
    expect(env.status).toBe('success');
    for (const rate of env.data.rates) {
      expect(rate).not.toHaveProperty('net_price');
      expect(rate).not.toHaveProperty('markup');
      expect(rate).not.toHaveProperty('supplier_id');
      expect(rate).toHaveProperty('selling_price');
    }
    expect(env.data).not.toHaveProperty('failed_suppliers');
  });

  it('AGENT_ADMIN 롤: net_price / markup / supplier_id 가 유지된다', async () => {
    const rt = createRuntime({ role: 'AGENT_ADMIN' });
    const env = await call(rt, 'search_hotel_rates', baseRateArgs);
    const rate = env.data.rates[0];
    expect(typeof rate.net_price).toBe('number');
    expect(typeof rate.markup).toBe('number');
    expect(typeof rate.supplier_id).toBe('string');
  });

  it('search_hotel_rates: 결과 없음은 error 가 아닌 no_results 구조로 반환한다', async () => {
    const rt = createRuntime();
    const env = await call(rt, 'search_hotel_rates', { ...baseRateArgs, destination_id: 'DST-EMPTY' });
    expect(env.status).toBe('no_results');
    expect(env.code).toBe('NO_RESULTS');
    expect(Array.isArray(env.suggestions)).toBe(true);
    expect(env.error).toBeUndefined();
  });

  it('search_hotel_rates: 공급사 일부 실패 시 partial_success + warnings 로 반환한다', async () => {
    const rt = createRuntime();
    const env = await call(rt, 'search_hotel_rates', { ...baseRateArgs, destination_id: 'DST-PARTIAL' });
    expect(env.status).toBe('partial_success');
    expect(env.warning_code).toBe('SUPPLIER_PARTIAL_FAILURE');
    expect(env.warnings.length).toBeGreaterThan(0);
    expect(env.data.rates.length).toBeGreaterThan(0);
    expect(env.data.failed_suppliers).toEqual(['SUP-HBD']); // AGENT_ADMIN 은 노출
  });

  it('search_hotel_rates: ELLIS 타임아웃은 ELLIS_TIMEOUT 에러 구조로 반환한다', async () => {
    const rt = createRuntime();
    const env = await call(rt, 'search_hotel_rates', { ...baseRateArgs, destination_id: 'DST-TIMEOUT' });
    expect(env.status).toBe('error');
    expect(env.error.code).toBe('ELLIS_TIMEOUT');
    expect(env.error.retryable).toBe(true);
  });

  it('search_hotel_rates: ELLIS 오류는 ELLIS_ERROR 에러 구조로 반환한다', async () => {
    const rt = createRuntime();
    const env = await call(rt, 'search_hotel_rates', { ...baseRateArgs, destination_id: 'DST-FAIL' });
    expect(env.status).toBe('error');
    expect(env.error.code).toBe('ELLIS_ERROR');
  });

  it('search_hotel_rates: 잘못된 입력은 INVALID_QUERY 로 반환한다', async () => {
    const rt = createRuntime();
    const env = await call(rt, 'search_hotel_rates', { ...baseRateArgs, check_in: '2019-01-01' });
    expect(env.status).toBe('error');
    expect(env.error.code).toBe('INVALID_QUERY');
  });

  it('refundable_only + meal_plan 필터가 적용된다', async () => {
    const rt = createRuntime();
    const env = await call(rt, 'search_hotel_rates', {
      ...baseRateArgs,
      refundable_only: true,
      meal_plan: 'breakfast_included',
    });
    expect(env.status).toBe('success');
    for (const rate of env.data.rates) {
      expect(rate.cancellation_type).toBe('free_cancellation');
      expect(rate.meal_plan).toBe('breakfast_included');
    }
  });

  it('compare_hotel_rates: 캐시된 search_id 로 재검색 없이 비교하고, 미지의 search_id 는 STALE_RESULT', async () => {
    const rt = createRuntime();
    const search = await call(rt, 'search_hotel_rates', baseRateArgs);
    const searchId = search.data.search_id as string;

    const cmp = await call(rt, 'compare_hotel_rates', { search_id: searchId, criteria: 'price' });
    expect(cmp.status).toBe('success');
    const hotels = cmp.data.compared_hotels;
    expect(hotels.length).toBeGreaterThan(1);
    const cheapest = hotels.map((h: Envelope) => h.cheapest_rate.selling_price);
    expect([...cheapest].sort((a, b) => a - b)).toEqual(cheapest);

    const stale = await call(rt, 'compare_hotel_rates', { search_id: 'SRCH-unknown', criteria: 'price' });
    expect(stale.status).toBe('error');
    expect(stale.error.code).toBe('STALE_RESULT');
  });

  it('get_rate_details / get_cancellation_policy: 검색 결과 기반 상세를 반환한다', async () => {
    const rt = createRuntime();
    const search = await call(rt, 'search_hotel_rates', baseRateArgs);
    const rate = search.data.rates[0];

    const details = await call(rt, 'get_rate_details', {
      search_id: rate.search_id,
      rate_plan_id: rate.rate_plan_id,
      hotel_id: rate.hotel_id,
    });
    expect(details.status).toBe('success');
    expect(details.data.rate.rate_plan_id).toBe(rate.rate_plan_id);
    expect(details.data.price_per_night).toHaveLength(3);

    const policy = await call(rt, 'get_cancellation_policy', {
      search_id: rate.search_id,
      rate_plan_id: rate.rate_plan_id,
    });
    expect(policy.status).toBe('success');
    expect(policy.data.policy.rate_plan_id).toBe(rate.rate_plan_id);
    expect(['free_cancellation', 'non_refundable', 'partial_penalty']).toContain(
      policy.data.policy.cancellation_type,
    );
    expect(policy.data.policy.penalties.length).toBeGreaterThan(0);
  });

  it('get_recent_searches: 세션 검색 이력을 반환한다', async () => {
    const rt = createRuntime();
    await call(rt, 'search_hotel_rates', baseRateArgs);
    await call(rt, 'search_hotels', { destination_id: 'DST-SIN' });
    const env = await call(rt, 'get_recent_searches', { limit: 5 });
    expect(env.status).toBe('success');
    expect(env.data.total).toBe(2);
    expect(env.data.searches[0].tool).toBe('search_hotels'); // 최신순
    expect(env.data.searches[1].tool).toBe('search_hotel_rates');
    expect(env.data.searches[1].search_id).toMatch(/^SRCH-/);
  });

  it('health_check: 서버/게이트웨이 상태를 반환한다', async () => {
    const rt = createRuntime();
    const env = await call(rt, 'health_check', {});
    expect(env.status).toBe('success');
    expect(env.data.server).toBe('ok');
    expect(env.data.mock_mode).toBe(true);
    expect(env.data.gateway.status).toBe('ok');
  });

  it('rate limit: 분당 한도 초과 시 RATE_LIMITED 를 반환한다', async () => {
    const rt = createRuntime({ rateLimitPerMinute: 2 });
    expect((await call(rt, 'health_check', {})).status).toBe('success');
    expect((await call(rt, 'health_check', {})).status).toBe('success');
    const third = await call(rt, 'health_check', {});
    expect(third.status).toBe('error');
    expect(third.error.code).toBe('RATE_LIMITED');
    expect(third.error.details.retry_after_ms).toBeGreaterThan(0);
  });

  it('알 수 없는 도구 이름은 INVALID_QUERY 를 반환한다', async () => {
    const rt = createRuntime();
    const env = await call(rt, 'create_booking', {});
    expect(env.status).toBe('error');
    expect(env.error.code).toBe('INVALID_QUERY');
  });
});
