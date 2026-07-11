import type { SearchResponse } from '../types';

/** 시나리오 ⑧ Timeout 에러 — ELLIS_TIMEOUT (1회 재시도 후 실패 가정) */
export function buildTimeout(searchId: string): SearchResponse {
  return {
    search_id: searchId,
    status: 'error',
    error_code: 'ELLIS_TIMEOUT',
    error_message:
      '요금 시스템(ELLIS) 응답이 지연되고 있습니다. 1회 재시도에도 실패했습니다. 잠시 후 다시 시도해 주세요.',
    searched_at: new Date().toISOString(),
    results: [],
  };
}
