import type { ScenarioId, SearchResponse } from '../types';
import { buildNormal } from './scenarioNormal';
import { buildFreeCancelOnly } from './scenarioFreeCancelOnly';
import { buildNonRefundable } from './scenarioNonRefundable';
import { buildMixedBreakfast } from './scenarioMixedBreakfast';
import { buildMultiCurrency } from './scenarioMultiCurrency';
import { buildPartialFailure } from './scenarioPartialFailure';
import { buildNoResults } from './scenarioNoResults';
import { buildTimeout } from './scenarioTimeout';
import { buildUnauthorized } from './scenarioUnauthorized';
import { buildStale } from './scenarioStale';

export interface ScenarioMeta {
  id: ScenarioId;
  label: string;
  description: string;
}

/** 개발용 시나리오 스위처 목록 */
export const SCENARIOS: ScenarioMeta[] = [
  { id: 'normal', label: '① 정상 결과 10개', description: '도쿄 — 호텔별 요금제 혼합' },
  { id: 'free_cancel_only', label: '② 무료 취소만', description: '전 요금제 무료취소' },
  { id: 'non_refundable', label: '③ 환불 불가', description: '논리펀더블 특가만' },
  { id: 'mixed_breakfast', label: '④ 조식 포함/불포함 혼합', description: '동일 호텔 2요금제' },
  { id: 'multi_currency', label: '⑤ 여러 통화 (KRW/JPY/SGD)', description: '공급사별 통화 혼재' },
  { id: 'partial_failure', label: '⑥ 공급사 일부 실패', description: '경고 배너 + 부분 결과' },
  { id: 'no_results', label: '⑦ 결과 없음', description: 'NO_RESULTS' },
  { id: 'timeout', label: '⑧ Timeout 에러', description: 'ELLIS_TIMEOUT' },
  { id: 'unauthorized', label: '⑨ 권한 없음', description: 'UNAUTHORIZED' },
  { id: 'stale', label: '⑩ 오래된 검색 결과', description: 'STALE 경고 (TTL 초과)' },
];

const builders: Record<ScenarioId, (searchId: string) => SearchResponse> = {
  normal: buildNormal,
  free_cancel_only: buildFreeCancelOnly,
  non_refundable: buildNonRefundable,
  mixed_breakfast: buildMixedBreakfast,
  multi_currency: buildMultiCurrency,
  partial_failure: buildPartialFailure,
  no_results: buildNoResults,
  timeout: buildTimeout,
  unauthorized: buildUnauthorized,
  stale: buildStale,
};

let searchSeq = 0;

export function nextSearchId(): string {
  searchSeq += 1;
  return `SRCH-${String(Date.now()).slice(-6)}-${searchSeq}`;
}

/** 지연 시뮬레이션 포함 mock 검색 실행 (MCP 미연결 상태) */
export function runMockSearch(scenario: ScenarioId, searchId: string): SearchResponse {
  return builders[scenario](searchId);
}
