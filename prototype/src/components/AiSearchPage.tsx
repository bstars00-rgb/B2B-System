import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ChatMsg,
  ScenarioId,
  SearchConditions,
  SearchHistoryItem,
  SearchResponse,
} from '../types';
import { SCENARIOS, nextSearchId, runMockSearch } from '../mocks';
import { describeSignals, hasAnySignal, mergeConditions, parseQuery } from '../utils/parser';
import { groupByHotel } from '../utils/group';
import { formatDateTime } from '../utils/format';
import type { Booking, RateResult } from '../types';
import BoardPage from './BoardPage';
import BookingDetailModal from './BookingDetailModal';
import BookingsPage from './BookingsPage';
import ChatPanel from './ChatPanel';
import CreateBookingModal from './CreateBookingModal';
import CreateBookingPage from './CreateBookingPage';
import PortalSidebar, { type PortalView } from './PortalSidebar';
import SystemFlowPanel from './SystemFlowPanel';
import SearchConditionPanel from './SearchConditionPanel';
import HotelResultList, { type ViewMode } from './HotelResultList';
import RateDetailDrawer from './RateDetailDrawer';
import HotelComparisonPanel from './HotelComparisonPanel';
import SearchHistoryPanel from './SearchHistoryPanel';
import ErrorAlert from './ErrorAlert';
import EmptyResult from './EmptyResult';
import LoadingSkeleton, { LOADING_STEPS } from './LoadingSkeleton';

type Phase = 'idle' | 'loading' | 'done';

/** 탭 스트립 라벨 (실제 포털: 방문한 메뉴가 탭으로 열림) */
const TAB_LABELS: Record<PortalView, string> = {
  bookings: 'Bookings',
  'create-booking': 'Create Booking',
  ai: 'AI 요금 검색',
  faq: 'FAQ Board',
  notice: 'Notice Board',
};

/** 검색 단계별 지연 (ms) — setTimeout으로 MCP 도구 호출 시뮬레이션 */
const STEP_DELAYS = [450, 1050, 1900, 2500];
const COMPLETE_DELAY = 2900;

let msgSeq = 0;
function makeMsg(role: ChatMsg['role'], content: string): ChatMsg {
  msgSeq += 1;
  return { id: `msg-${Date.now()}-${msgSeq}`, role, content, timestamp: new Date().toISOString() };
}

function assistantSummary(
  res: SearchResponse,
  searchedHotelName?: string | null,
  refinementLabels?: string[] | null,
): string {
  const groups = groupByHotel(res.results);
  const refinePrefix =
    refinementLabels && refinementLabels.length > 0
      ? `이전 검색 조건을 유지한 채 ${refinementLabels.join(' · ')} 조건을 반영했습니다.\n`
      : '';
  switch (res.status) {
    case 'ok': {
      const recCount = groupByHotel(res.recommended_results ?? []).length;
      const base =
        searchedHotelName && recCount > 0
          ? `${refinePrefix}요청하신 '${searchedHotelName}'의 요금제 ${res.results.length}건을 찾았고, 같은 도시의 추천 호텔 ${recCount}곳을 함께 제안합니다. 금액·취소조건 등 모든 숫자는 우측 결과 카드/표에서 확인해 주세요. [${res.search_id}]`
          : `${refinePrefix}조건에 맞는 호텔 ${groups.length}곳, 요금제 ${res.results.length}건을 찾았습니다. 금액·취소조건 등 모든 숫자는 우측 결과 카드/표에서 확인해 주세요. [${res.search_id}]`;
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

/** 상단 우측 계정 메뉴 (실제 포털과 동일 구성 — 더미) */
function PortalAccountMenu() {
  const item = 'cursor-not-allowed text-[12px] text-slate-600 hover:text-slate-800';
  return (
    <div className="flex items-center gap-3" title="프로토타입 — 실제 포털의 계정 메뉴 (더미)">
      <span className={item}>🌐 English</span>
      <span className="text-slate-300">|</span>
      <span className="text-[12px] font-semibold text-slate-700">ATTIC TOURS</span>
      <span className="text-slate-300">|</span>
      <span className={item}>Change password</span>
      <span className="text-slate-300">|</span>
      <span className={item}>Log out</span>
    </div>
  );
}

/** ELLIS MCP AI 요금 검색 — 실제 Ohmy Partners 포털 셸(사이드바·탭·헤더·푸터) 안에 배치 */
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
  /** 기존 Create Booking 화면으로 전달된 요금 (모달 표시) */
  const [bookingRate, setBookingRate] = useState<RateResult | null>(null);
  /** 예약 모달에 전달할 검색 조건 (AI 채팅 또는 Create Booking 폼) */
  const [bookingConditions, setBookingConditions] = useState<SearchConditions | null>(null);
  /** 현재 화면: AI 요금 검색 / Bookings 목록 / Create Booking / FAQ / Notice */
  const [view, setView] = useState<PortalView>('ai');
  /** 열려 있는 탭들 (실제 포털처럼 방문한 메뉴가 탭으로 추가·✕로 닫힘) */
  const [openTabs, setOpenTabs] = useState<PortalView[]>(['bookings', 'ai']);

  const navigate = useCallback((v: PortalView) => {
    setOpenTabs((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setView(v);
  }, []);
  const closeTab = useCallback(
    (v: PortalView) => {
      setOpenTabs((prev) => {
        const next = prev.filter((x) => x !== v);
        if (next.length === 0) next.push('ai');
        if (view === v) setView(next[next.length - 1]);
        return next;
      });
    },
    [view],
  );
  /** 생성된 예약 목록 (세션 내 mock 저장) */
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const bookingSeqRef = useRef(3);

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
  const recommendedGroups = useMemo(
    () => (response?.recommended_results ? groupByHotel(response.recommended_results) : []),
    [response],
  );
  /** 비교·상세는 검색 호텔 + 추천 호텔 모두에서 선택 가능 */
  const allGroups = useMemo(
    () => [...groups, ...recommendedGroups],
    [groups, recommendedGroups],
  );
  const comparedGroups = useMemo(
    () => allGroups.filter((g) => comparedIds.includes(g.hotel_id)),
    [allGroups, comparedIds],
  );
  const detailGroup = useMemo(
    () => allGroups.find((g) => g.hotel_id === detailHotelId) ?? null,
    [allGroups, detailHotelId],
  );

  const runSearch = useCallback(
    (query: string) => {
      if (phase === 'loading') return;
      clearTimers();

      setMessages((prev) => [...prev, makeMsg('user', query)]);

      // 대화 문맥 유지 — 새 질문의 변경분만 이전 조건에 덮어쓰기 (NLU 규칙 ⑫⑬)
      const fresh = parseQuery(query);
      const parsed = mergeConditions(fresh, conditions);

      // 후속 질문인데 조건을 하나도 추출하지 못한 경우 — 검색하지 않고 되묻기
      if (conditions && !hasAnySignal(fresh)) {
        setMessages((prev) => [
          ...prev,
          makeMsg(
            'assistant',
            '어떤 조건을 바꿀지 이해하지 못했습니다. 예: "역에서 가까운 곳만", "무료취소만", "5성급만", "예산 30만원 이하", "조식 포함으로" 처럼 말씀해 주세요.',
          ),
        ]);
        return;
      }

      // 목적지도 호텔도 없는 첫 검색 — 임의 도시로 검색하지 않고 되묻기
      if (!parsed.destination && !parsed.hotel_name) {
        setMessages((prev) => [
          ...prev,
          makeMsg(
            'assistant',
            '어느 도시(또는 호텔)의 요금을 찾아드릴까요? 예: "방콕 8월 15일~17일 성인 2명 무료취소" 처럼 목적지와 날짜를 함께 알려주시면 바로 조회하겠습니다.',
          ),
        ]);
        return;
      }

      // 정제 질문 여부 — 목적지/호텔은 그대로 두고 조건만 추가·변경한 경우
      const refinementLabels =
        conditions && !fresh.destination && !fresh.hotel_name ? describeSignals(fresh) : null;

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
          const res = runMockSearch(scenario, searchId, parsed);
          setResponse(res);
          setPhase('done');
          setMessages((prev) => [
            ...prev,
            makeMsg('assistant', assistantSummary(res, parsed.hotel_name, refinementLabels)),
          ]);
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
    [phase, scenario, conditions, clearTimers],
  );

  /** 예약 생성 — 실제 포털과 동일하게 ELLIS/Seller 코드 발번 후 Bookings 목록에 추가 */
  const createBooking = useCallback(
    (travelerName: string) => {
      if (!bookingRate) return;
      const conds = bookingConditions ?? conditions;
      const now = new Date();
      const p = (n: number) => String(n).padStart(2, '0');
      const ymd = `${String(now.getFullYear()).slice(-2)}${p(now.getMonth() + 1)}${p(now.getDate())}`;
      const seq = bookingSeqRef.current + 1;
      bookingSeqRef.current = seq;
      const booking: Booking = {
        ellis_code: `J${ymd}1${String(seq).padStart(4, '0')}H01`,
        seller_code: `ATTIC20${ymd}${String(seq).padStart(4, '0')}`,
        booking_date: now.toISOString(),
        status: 'Confirmed',
        payment_status: 'Unpaid',
        hotel_id: bookingRate.hotel_id,
        hotel_name: bookingRate.hotel_name,
        region: bookingRate.destination,
        check_in: conds?.check_in ?? '2026-08-20',
        check_out: conds?.check_out ?? '2026-08-22',
        nights: bookingRate.total_nights,
        room_type: bookingRate.room_type_name,
        room_count: conds?.rooms ?? bookingRate.total_rooms,
        traveler_name: travelerName,
        travelers: (conds?.adults ?? 2) + (conds?.children ?? 0),
        currency: bookingRate.currency,
        sum_amt: bookingRate.selling_price + bookingRate.tax,
        client_cancel_dl: bookingRate.cancellation_deadline,
        cancel_date: null,
      };
      setBookings((prev) => [booking, ...prev]);
      setBookingRate(null);
      setBookingConditions(null);
      setView('bookings');
    },
    [bookingRate, bookingConditions, conditions],
  );

  /** 예약 취소 — 상태 변경 + 취소 일시 기록 */
  const cancelBooking = useCallback((ellisCode: string) => {
    const cancelledAt = new Date().toISOString();
    setBookings((prev) =>
      prev.map((b) =>
        b.ellis_code === ellisCode ? { ...b, status: 'Cancelled', cancel_date: cancelledAt } : b,
      ),
    );
    setDetailBooking((prev) =>
      prev && prev.ellis_code === ellisCode
        ? { ...prev, status: 'Cancelled', cancel_date: cancelledAt }
        : prev,
    );
  }, []);

  const toggleCompare = useCallback((hotelId: string) => {
    setComparedIds((prev) => {
      if (prev.includes(hotelId)) return prev.filter((id) => id !== hotelId);
      if (prev.length >= 3) return prev;
      return [...prev, hotelId];
    });
  }, []);

  const scenarioMeta = SCENARIOS.find((s) => s.id === scenario);

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900">
      {/* ── 실제 포털 좌측 사이드바 (Seller 메뉴 + AI 요금 검색 신규 메뉴) ── */}
      <PortalSidebar view={view} onNavigate={navigate} />

      <div className="flex min-h-0 flex-1 flex-col">
        {/* ── 포털 상단 헤더 (실제 구성: 햄버거 + English | ATTIC TOURS | Change password | Log out) ── */}
        <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded border border-slate-200 text-slate-500"
              title="프로토타입 — 메뉴 접기 (더미)"
              aria-hidden
            >
              ☰
            </span>
            <span className="text-[11px] text-slate-400">
              Ohmy Partners · <b className="text-brand-500">ELLIS AI 요금 검색</b> Prototype
            </span>
          </div>
          <PortalAccountMenu />
        </header>

        {/* ── 포털 탭 스트립 + 프로토타입 컨트롤 ── */}
        <div className="flex shrink-0 items-end justify-between border-b border-slate-200 bg-slate-50 px-3 pt-2">
          <div className="flex items-end gap-1">
            {openTabs.map((t) => (
              <span
                key={t}
                className={`flex items-center gap-1.5 rounded-t border border-b-0 border-slate-200 px-3 py-1.5 text-xs ${
                  view === t
                    ? 'border-t-2 border-t-brand-500 bg-white font-bold text-slate-800'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                <button type="button" onClick={() => setView(t)} className="hover:text-slate-800">
                  {TAB_LABELS[t]}
                  {t === 'bookings' && bookings.length > 0 && (
                    <span className="ml-1 rounded-full bg-brand-500 px-1.5 text-[9px] font-bold text-white">
                      {bookings.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  aria-label={`${TAB_LABELS[t]} 탭 닫기`}
                  onClick={() => closeTab(t)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3 pb-1.5">
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
              <span className="text-[10px] font-semibold uppercase text-slate-400">
                DEV 시나리오
              </span>
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
              title="더미 링크 — 기존 포털 Create Booking 화면 (프로토타입)"
            >
              기존 검색 화면 ↗
            </a>
          </div>
        </div>

        {/* ── 본문: Bookings / Create Booking / AI 검색 (좌 채팅 / 우 조건+결과) ── */}
        {view === 'bookings' ? (
          <BookingsPage bookings={bookings} onOpenDetail={setDetailBooking} />
        ) : view === 'faq' ? (
          <BoardPage kind="faq" />
        ) : view === 'notice' ? (
          <BoardPage kind="notice" />
        ) : view === 'create-booking' ? (
          <CreateBookingPage
            onProceedBooking={(rate, conds) => {
              setBookingConditions(conds);
              setBookingRate(rate);
            }}
          />
        ) : (
        <div className="flex min-h-0 flex-1">
          <div className="w-[380px] shrink-0 border-r border-slate-200">
            <ChatPanel messages={messages} loading={phase === 'loading'} onSubmit={runSearch} />
          </div>

          <main className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <SystemFlowPanel phase={phase} step={loadingStep} response={response} />
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
                    recommendedGroups={recommendedGroups}
                    searchedHotelName={conditions?.hotel_name}
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
        )}

        {/* ── 하단: 상태 바 + 실제 포털 푸터 ── */}
        <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-1.5 text-[10px] text-slate-400">
          <div className="flex items-center justify-between">
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
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-1 text-[9px] text-slate-300">
            <span>
              © 2025 OHMYHOTEL GLOBAL PTE. LTD. All rights reserved. · Business number 105-87-71311
              · Ceo : Lee Mi Soon
            </span>
            <span>
              6th floor, GT Dongdaemun Building, 328 Jong-ro, Jongno-gu, Seoul ·
              cscenter@ohmyhotel.com · 02-733-0550
            </span>
          </div>
        </footer>
      </div>

      {/* 요금 상세 Drawer */}
      <RateDetailDrawer
        group={detailGroup}
        internalView={internalView}
        onClose={() => setDetailHotelId(null)}
        onProceedBooking={(rate) => {
          setDetailHotelId(null);
          setBookingConditions(conditions);
          setBookingRate(rate);
        }}
      />

      {/* 기존 포털 Create Booking 화면 재현 — AI 검색 조건·요금 전달, Create 시 예약 생성 */}
      <CreateBookingModal
        rate={bookingRate}
        conditions={bookingConditions ?? conditions}
        onClose={() => setBookingRate(null)}
        onCreate={createBooking}
      />

      {/* 예약 상세 모달 (Bookings 목록에서 ELLIS 코드 클릭) */}
      <BookingDetailModal
        booking={detailBooking}
        onClose={() => setDetailBooking(null)}
        onCancelBooking={cancelBooking}
      />
    </div>
  );
}
