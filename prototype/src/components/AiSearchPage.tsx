import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ChatMsg,
  ScenarioId,
  SearchConditions,
  SearchHistoryItem,
  SearchResponse,
} from '../types';
import { SCENARIOS, nextSearchId, runMockSearch } from '../mocks';
import { parseQuery } from '../utils/parser';
import { groupByHotel } from '../utils/group';
import { formatDateTime } from '../utils/format';
import ChatPanel from './ChatPanel';
import SearchConditionPanel from './SearchConditionPanel';
import HotelResultList, { type ViewMode } from './HotelResultList';
import RateDetailDrawer from './RateDetailDrawer';
import HotelComparisonPanel from './HotelComparisonPanel';
import SearchHistoryPanel from './SearchHistoryPanel';
import ErrorAlert from './ErrorAlert';
import EmptyResult from './EmptyResult';
import LoadingSkeleton, { LOADING_STEPS } from './LoadingSkeleton';

type Phase = 'idle' | 'loading' | 'done';

/** 검색 단계별 지연 (ms) — setTimeout으로 MCP 도구 호출 시뮬레이션 */
const STEP_DELAYS = [450, 1050, 1900, 2500];
const COMPLETE_DELAY = 2900;

let msgSeq = 0;
function makeMsg(role: ChatMsg['role'], content: string): ChatMsg {
  msgSeq += 1;
  return { id: `msg-${Date.now()}-${msgSeq}`, role, content, timestamp: new Date().toISOString() };
}

function assistantSummary(res: SearchResponse): string {
  const groups = groupByHotel(res.results);
  switch (res.status) {
    case 'ok': {
      const base = `조건에 맞는 호텔 ${groups.length}곳, 요금제 ${res.results.length}건을 찾았습니다. 금액·취소조건 등 모든 숫자는 우측 결과 카드/표에서 확인해 주세요. [${res.search_id}]`;
      return res.is_stale
        ? `${base}\n\n⚠ 이 결과는 조회 후 30분이 지난 캐시(STALE)입니다. 확정 전 재검색을 권장합니다.`
        : base;
    }
    case 'partial':
      return `일부 공급사 응답이 실패하여 부분 결과(호텔 ${groups.length}곳, 요금제 ${res.results.length}건)만 표시합니다. 잠시 후 재검색하면 더 많은 요금이 나올 수 있습니다. [${res.search_id}]`;
    case 'empty':
      return '조건에 맞는 상품이 없습니다. 날짜를 바꾸거나 성급 조건을 낮춰볼까요? 조식/무료취소 필터를 해제하는 것도 방법입니다.';
    case 'error':
      if (res.error_code === 'UNAUTHORIZED')
        return '세션이 만료되었거나 AI 검색 권한이 없습니다. 다시 로그인해 주세요. 문제가 계속되면 기존 검색 화면을 이용해 주세요.';
      return '요금 시스템 응답이 지연되고 있습니다. 잠시 후 다시 시도하거나 기존 검색 화면을 이용해 주세요.';
  }
}

/** ELLIS MCP AI 요금 검색 — 메인 페이지 (좌: 채팅 / 우: 조건+결과 / 상단 컨텍스트 바 / 하단 상태 바) */
export default function AiSearchPage() {
  const [scenario, setScenario] = useState<ScenarioId>('normal');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [conditions, setConditions] = useState<SearchConditions | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [loadingStep, setLoadingStep] = useState(0);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [detailHotelId, setDetailHotelId] = useState<string | null>(null);
  const [internalView, setInternalView] = useState(false);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  const timersRef = useRef<number[]>([]);
  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const groups = useMemo(
    () => (response ? groupByHotel(response.results) : []),
    [response],
  );
  const comparedGroups = useMemo(
    () => groups.filter((g) => comparedIds.includes(g.hotel_id)),
    [groups, comparedIds],
  );
  const detailGroup = useMemo(
    () => groups.find((g) => g.hotel_id === detailHotelId) ?? null,
    [groups, detailHotelId],
  );

  const runSearch = useCallback(
    (query: string) => {
      if (phase === 'loading') return;
      clearTimers();

      const parsed = parseQuery(query);
      setMessages((prev) => [...prev, makeMsg('user', query)]);
      setConditions(parsed);
      setPhase('loading');
      setLoadingStep(0);
      setResponse(null);
      setComparedIds([]);
      setDetailHotelId(null);

      // 단계 진행 시뮬레이션
      STEP_DELAYS.forEach((delay, i) => {
        timersRef.current.push(
          window.setTimeout(() => setLoadingStep(Math.min(i + 1, LOADING_STEPS.length - 1)), delay),
        );
      });

      // 응답 시뮬레이션
      timersRef.current.push(
        window.setTimeout(() => {
          const searchId = nextSearchId();
          const res = runMockSearch(scenario, searchId);
          setResponse(res);
          setPhase('done');
          setMessages((prev) => [...prev, makeMsg('assistant', assistantSummary(res))]);
          setHistory((prev) =>
            [
              {
                id: searchId,
                query,
                conditions: parsed,
                scenario,
                result_count: res.results.length,
                status: res.status,
                searched_at: res.searched_at,
              },
              ...prev,
            ].slice(0, 10),
          );
        }, COMPLETE_DELAY),
      );
    },
    [phase, scenario, clearTimers],
  );

  const toggleCompare = useCallback((hotelId: string) => {
    setComparedIds((prev) => {
      if (prev.includes(hotelId)) return prev.filter((id) => id !== hotelId);
      if (prev.length >= 3) return prev;
      return [...prev, hotelId];
    });
  }, []);

  const scenarioMeta = SCENARIOS.find((s) => s.id === scenario);

  return (
    <div className="flex h-screen flex-col bg-slate-100 text-slate-900">
      {/* ── 상단 Agent/통화 컨텍스트 바 ── */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-brand-500 text-sm font-black text-white">
              O
            </span>
            <div className="leading-tight">
              <div className="text-sm font-bold text-slate-900">
                Ohmy <span className="text-brand-500">Partners</span>
              </div>
              <div className="text-[10px] text-slate-400">ELLIS AI 요금 검색 · Prototype</div>
            </div>
          </div>
          <div className="ml-3 hidden items-center gap-2 border-l border-slate-200 pl-4 text-[11px] text-slate-500 md:flex">
            <span>
              Agent: <b className="text-slate-700">한빛투어 (SEL-0042)</b>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              마켓: <b className="text-slate-700">KR</b>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              기준 통화: <b className="text-slate-700">KRW</b>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 권한 토글 — 내부 뷰 (net/markup) */}
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-600">
            <span>내부 뷰 (net/markup)</span>
            <button
              type="button"
              role="switch"
              aria-checked={internalView}
              onClick={() => setInternalView((v) => !v)}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                internalView ? 'bg-brand-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  internalView ? 'translate-x-[18px]' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>

          {/* 개발용 시나리오 스위처 */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase text-slate-400">DEV 시나리오</span>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value as ScenarioId)}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 focus:border-brand-400 focus:outline-none"
            >
              {SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <a
            href="#legacy-search"
            onClick={(e) => e.preventDefault()}
            className="rounded border border-slate-300 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600"
            title="더미 링크 — 기존 포털 검색 화면 (프로토타입)"
          >
            기존 검색 화면 ↗
          </a>
        </div>
      </header>

      {/* ── 본문: 좌 채팅 / 우 조건+결과 ── */}
      <div className="flex min-h-0 flex-1">
        <div className="w-[380px] shrink-0 border-r border-slate-200">
          <ChatPanel messages={messages} loading={phase === 'loading'} onSubmit={runSearch} />
        </div>

        <main className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            <SearchConditionPanel conditions={conditions} />
            <SearchHistoryPanel
              history={history}
              disabled={phase === 'loading'}
              onRerun={runSearch}
            />

            {phase === 'idle' && (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
                <p className="text-sm font-medium text-slate-500">
                  좌측 채팅에서 자연어로 요금을 검색하세요
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  결과 카드·표·비교·요금 상세가 이 영역에 표시됩니다. (상단 DEV 시나리오로 응답
                  케이스 전환 가능)
                </p>
              </div>
            )}

            {phase === 'loading' && <LoadingSkeleton step={loadingStep} />}

            {phase === 'done' && response && response.status === 'error' && (
              <ErrorAlert
                code={response.error_code}
                title={
                  response.error_code === 'UNAUTHORIZED'
                    ? '접근 권한이 없습니다'
                    : '요금 시스템 응답 지연'
                }
                message={response.error_message ?? '알 수 없는 오류가 발생했습니다.'}
                onRetry={
                  response.error_code === 'UNAUTHORIZED'
                    ? undefined
                    : () => conditions && runSearch(conditions.raw_query)
                }
              />
            )}

            {phase === 'done' && response && response.status === 'empty' && (
              <EmptyResult onSuggestion={runSearch} />
            )}

            {phase === 'done' &&
              response &&
              (response.status === 'ok' || response.status === 'partial') && (
                <HotelResultList
                  response={response}
                  groups={groups}
                  viewMode={viewMode}
                  comparedIds={comparedIds}
                  internalView={internalView}
                  onViewModeChange={setViewMode}
                  onToggleCompare={toggleCompare}
                  onOpenDetail={setDetailHotelId}
                />
              )}
          </div>

          {/* 비교 패널 (하단 도킹) */}
          <HotelComparisonPanel
            groups={comparedGroups}
            onRemove={toggleCompare}
            onClear={() => setComparedIds([])}
          />
        </main>
      </div>

      {/* ── 하단 상태 바 ── */}
      <footer className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-1.5 text-[10px] text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            MCP 미연결 — Mock Data 모드
          </span>
          <span>
            시나리오: <b className="text-slate-600">{scenarioMeta?.label}</b> (
            {scenarioMeta?.description})
          </span>
        </div>
        <div className="flex items-center gap-3">
          {response && (
            <span>
              마지막 검색: {response.search_id} · {formatDateTime(response.searched_at)}
            </span>
          )}
          <span>ellis-mcp v0.1 · 조회 전용 (예약/결제 도구 없음)</span>
        </div>
      </footer>

      {/* 요금 상세 Drawer */}
      <RateDetailDrawer
        group={detailGroup}
        internalView={internalView}
        onClose={() => setDetailHotelId(null)}
      />
    </div>
  );
}
