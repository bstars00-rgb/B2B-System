import type { SearchResponse } from '../types';

/** 시나리오 ⑨ 권한 없음 — UNAUTHORIZED (세션 만료/AI 검색 미개통 셀러) */
export function buildUnauthorized(searchId: string): SearchResponse {
  return {
    search_id: searchId,
    status: 'error',
    error_code: 'UNAUTHORIZED',
    error_message:
      '세션이 만료되었거나 AI 요금 검색 권한이 없는 계정입니다. 다시 로그인하거나 관리자에게 문의해 주세요.',
    searched_at: new Date().toISOString(),
    results: [],
  };
}
