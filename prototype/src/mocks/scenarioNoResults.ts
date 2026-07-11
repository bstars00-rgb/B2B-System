import type { SearchResponse } from '../types';

/** 시나리오 ⑦ 결과 없음 — NO_RESULTS (빈 결과를 그대로 전달, 임의 채움 금지) */
export function buildNoResults(searchId: string): SearchResponse {
  return {
    search_id: searchId,
    status: 'empty',
    error_code: 'NO_RESULTS',
    error_message: '조건에 맞는 호텔/요금이 없습니다.',
    searched_at: new Date().toISOString(),
    results: [],
  };
}
