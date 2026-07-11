import type { RateResult } from '../types/index.js';

interface CacheEntry {
  rates: RateResult[];
  createdAt: number;
}

/**
 * search_id → 요금 결과 캐시 (compare_hotel_rates 용).
 * TTL 초과 항목은 조회 시 제거된다. 비교는 항상 실조회 결과 캐시로만 수행한다.
 */
export class ResultCache {
  private readonly map = new Map<string, CacheEntry>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number = 50,
  ) {}

  set(searchId: string, rates: RateResult[], now: number = Date.now()): void {
    this.prune(now);
    if (this.map.size >= this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(searchId, { rates, createdAt: now });
  }

  get(searchId: string, now: number = Date.now()): RateResult[] | undefined {
    const entry = this.map.get(searchId);
    if (!entry) return undefined;
    if (now - entry.createdAt > this.ttlMs) {
      this.map.delete(searchId);
      return undefined;
    }
    return entry.rates;
  }

  private prune(now: number): void {
    for (const [key, entry] of this.map) {
      if (now - entry.createdAt > this.ttlMs) this.map.delete(key);
    }
  }
}
