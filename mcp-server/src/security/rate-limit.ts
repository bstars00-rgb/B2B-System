/**
 * 간단한 토큰버킷 rate limiter.
 * 용량 = 분당 허용 호출 수. 시간 경과에 비례해 토큰이 리필된다.
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number,
    private readonly refillIntervalMs: number = 60_000,
    now: number = Date.now(),
  ) {
    this.tokens = capacity;
    this.lastRefill = now;
  }

  private refill(now: number): void {
    const elapsed = now - this.lastRefill;
    if (elapsed <= 0) return;
    this.tokens = Math.min(
      this.capacity,
      this.tokens + (elapsed * this.capacity) / this.refillIntervalMs,
    );
    this.lastRefill = now;
  }

  /** 토큰 1개 소비 시도. 실패 시 false. */
  tryConsume(now: number = Date.now()): boolean {
    this.refill(now);
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /** 다음 토큰이 생길 때까지 남은 대략적인 시간 (ms). */
  retryAfterMs(now: number = Date.now()): number {
    this.refill(now);
    if (this.tokens >= 1) return 0;
    return Math.ceil(((1 - this.tokens) * this.refillIntervalMs) / this.capacity);
  }
}
