import type { SearchConditions, SearchResponse } from '../types';
import { buildCityResults } from './hotelDb';

/**
 * 시나리오 ① 정상 결과 — 목적지 인식형.
 * 검색 조건의 목적지(방콕/서울/싱가포르 등 15개 도시)에 맞는 호텔을 현지 통화 요금으로
 * 반환하고, 성급·조식·무료취소 필터를 적용한다. 미등록 도시는 제네릭 세트로 대체.
 */
export function buildNormal(searchId: string, conditions?: SearchConditions | null): SearchResponse {
  return {
    search_id: searchId,
    status: 'ok',
    searched_at: new Date().toISOString(),
    results: buildCityResults(searchId, conditions),
  };
}
