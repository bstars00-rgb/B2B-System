import type { SearchConditions, SearchResponse } from '../types';
import { buildCityResults } from './hotelDb';

/**
 * 시나리오 ① 정상 결과 — 목적지 인식형.
 * - 검색 조건의 목적지(방콕/서울/싱가포르 등 15개 도시)에 맞는 호텔을 현지 통화로 반환
 * - 특정 호텔 지목 시 해당 호텔만 results로, 동일 도시 유사 성급 호텔을 recommended_results로 반환
 * - 성급·조식·무료취소 필터 적용, 미등록 도시는 제네릭 세트로 대체
 */
export function buildNormal(searchId: string, conditions?: SearchConditions | null): SearchResponse {
  const { results, recommended } = buildCityResults(searchId, conditions);
  return {
    search_id: searchId,
    status: 'ok',
    searched_at: new Date().toISOString(),
    results,
    recommended_results: recommended.length > 0 ? recommended : undefined,
  };
}
