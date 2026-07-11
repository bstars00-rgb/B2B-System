import type { RecentSearchEntry } from '../types/index.js';

/**
 * 세션(프로세스) 단위 최근 검색 이력 저장소.
 * 개인정보는 저장하지 않는다 — 검색 조건 요약과 결과 건수만 기록한다.
 */
export class SearchHistory {
  private items: RecentSearchEntry[] = [];

  constructor(private readonly maxItems: number = 100) {}

  add(entry: RecentSearchEntry): void {
    this.items.unshift(entry);
    if (this.items.length > this.maxItems) {
      this.items.length = this.maxItems;
    }
  }

  list(limit: number): RecentSearchEntry[] {
    return this.items.slice(0, limit);
  }
}
