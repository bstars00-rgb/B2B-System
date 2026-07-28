/**
 * 검색 ID 시퀀스 — Create Booking 흐름(호텔 목록·룸리스트)에서 조회 식별자 발번에 사용.
 *
 * ※ 이 파일은 원래 AI 요금 검색(ELLIS MCP)의 mock 시나리오 엔진이었으나, 2026-07-27
 *   AI 요금 검색이 닷비즈에서 삭제되며(고객사 Claude 플러그인 방식으로 전환) 시나리오·
 *   runMockSearch는 제거됐다. Create Booking이 쓰는 nextSearchId만 남는다.
 */

let searchSeq = 0;

export function nextSearchId(): string {
  searchSeq += 1;
  return `SRCH-${String(Date.now()).slice(-6)}-${searchSeq}`;
}
