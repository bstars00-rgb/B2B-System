import { useState } from 'react';
import type { SearchResponse } from '../types';

/** 파이프라인 노드 상태 */
type NodeState = 'idle' | 'active' | 'done' | 'error' | 'warn';

interface FlowNode {
  key: string;
  title: string;
  caption: string;
}

/** 실제 시스템 아키텍처와 동일한 구성 (docs/architecture/ellis-mcp-llm-search.md) */
const NODES: FlowNode[] = [
  { key: 'chat', title: 'Chat UI', caption: 'B2B Frontend' },
  { key: 'orch', title: 'Orchestrator', caption: '대화 관리 · 응답 검증' },
  { key: 'llm', title: 'LLM (Claude)', caption: '의도 추출 · tool 호출' },
  { key: 'mcp', title: 'MCP Server', caption: 'ellis-mcp · 조회 전용 도구' },
  { key: 'gw', title: 'Search Gateway', caption: '인증 · 감사로그 · 레이트리밋' },
  { key: 'ellis', title: 'ELLIS', caption: 'Search · Content · Rate · Pricing' },
];

interface Props {
  phase: 'idle' | 'loading' | 'done';
  /** 로딩 단계 인덱스 (LoadingSkeleton.LOADING_STEPS 와 동일 축) */
  step: number;
  response: SearchResponse | null;
}

/** 단계 → 활성 노드 매핑 (loading 중) */
function nodeStatesWhileLoading(step: number): Record<string, NodeState> {
  const s: Record<string, NodeState> = {
    chat: 'done',
    orch: 'done',
    llm: 'idle',
    mcp: 'idle',
    gw: 'idle',
    ellis: 'idle',
  };
  if (step <= 0) {
    s.llm = 'active';
  } else if (step === 1) {
    s.llm = 'done';
    s.mcp = 'active';
  } else if (step === 2) {
    s.llm = 'done';
    s.mcp = 'done';
    s.gw = 'active';
    s.ellis = 'active';
  } else {
    s.llm = 'done';
    s.mcp = 'done';
    s.gw = 'done';
    s.ellis = 'done';
    s.orch = 'active'; // Response Validator 단계
  }
  return s;
}

/** 완료/오류 시 노드 상태 */
function nodeStatesWhenDone(response: SearchResponse): Record<string, NodeState> {
  const all: Record<string, NodeState> = {
    chat: 'done',
    orch: 'done',
    llm: 'done',
    mcp: 'done',
    gw: 'done',
    ellis: 'done',
  };
  if (response.status === 'error') {
    if (response.error_code === 'UNAUTHORIZED') {
      // 게이트웨이 인증 단계에서 차단 → 이후 구간 미도달
      return { ...all, gw: 'error', ellis: 'idle', orch: 'done' };
    }
    // ELLIS_TIMEOUT 등
    return { ...all, ellis: 'error' };
  }
  if (response.status === 'partial') return { ...all, ellis: 'warn' };
  return all;
}

const NODE_STYLE: Record<NodeState, string> = {
  idle: 'border-slate-200 bg-slate-50 text-slate-400',
  active: 'border-brand-400 bg-brand-50 text-brand-700 shadow-sm ring-2 ring-brand-200',
  done: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  error: 'border-red-300 bg-red-50 text-red-700',
  warn: 'border-amber-300 bg-amber-50 text-amber-700',
};

const DOT_STYLE: Record<NodeState, string> = {
  idle: 'bg-slate-300',
  active: 'animate-pulse bg-brand-500',
  done: 'bg-emerald-500',
  error: 'bg-red-500',
  warn: 'bg-amber-500',
};

/** 진행 단계별 호출 트레이스 (프로세스 로그) */
function buildTrace(phase: Props['phase'], step: number, response: SearchResponse | null): string[] {
  if (phase === 'idle') return [];
  const lines: string[] = [];
  lines.push('① 사용자 질문 수신 → LLM이 검색 의도·조건 추출');
  if (phase === 'done' || step >= 1)
    lines.push('② LLM tool_use → MCP 도구 호출 (resolve_destination → search_hotels)');
  if (phase === 'done' || step >= 2)
    lines.push('③ MCP → Search Gateway → ELLIS 요금·콘텐츠 조회 (셀러 컨텍스트 서버 주입)');
  if (phase === 'done' || step >= 3)
    lines.push('④ Response Validator — LLM 텍스트의 숫자를 도구 결과와 대조 검증');
  if (phase === 'done' && response) {
    switch (response.status) {
      case 'ok':
        lines.push(
          `⑤ 완료 — 요금제 ${response.results.length}건 반환 [${response.search_id}]${response.is_stale ? ' · ⚠ STALE 캐시' : ''}`,
        );
        break;
      case 'partial':
        lines.push(
          `⑤ 부분 성공 — 공급사 일부 실패(${(response.failed_suppliers ?? []).join(', ') || '일부'}), ${response.results.length}건만 반환`,
        );
        break;
      case 'empty':
        lines.push('⑤ 완료 — 결과 0건 (NO_RESULTS를 그대로 표시, 임의 생성 없음)');
        break;
      case 'error':
        lines.push(
          response.error_code === 'UNAUTHORIZED'
            ? '✕ Gateway 인증 실패 (UNAUTHORIZED) — ELLIS 미호출, 세션 재로그인 필요'
            : '✕ ELLIS 응답 지연 (ELLIS_TIMEOUT) — 재시도 1회 후 실패 반환',
        );
        break;
    }
  }
  return lines;
}

/**
 * 시스템 프로세스 패널 — 실제 아키텍처(Chat UI→Orchestrator→LLM→MCP→Gateway→ELLIS)를
 * 그대로 보여주고, 검색 진행에 따라 각 구간에 불이 들어와 처리 과정을 시각화한다.
 */
export default function SystemFlowPanel({ phase, step, response }: Props) {
  const [open, setOpen] = useState(true);

  const states: Record<string, NodeState> =
    phase === 'loading'
      ? nodeStatesWhileLoading(step)
      : phase === 'done' && response
        ? nodeStatesWhenDone(response)
        : Object.fromEntries(NODES.map((n) => [n.key, 'idle' as NodeState]));

  const trace = buildTrace(phase, step, response);

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
            시스템 프로세스
          </span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
            실제 구조 기준 시뮬레이션
          </span>
          {phase === 'loading' && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-brand-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
              처리 중…
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400">{open ? '접기 ▲' : '펼치기 ▼'}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-3 pt-3">
          {/* 파이프라인 다이어그램 */}
          <div className="flex flex-wrap items-stretch gap-y-2">
            {NODES.map((node, i) => {
              const st = states[node.key];
              return (
                <div key={node.key} className="flex items-center">
                  <div
                    className={`min-w-[118px] rounded-md border px-2.5 py-1.5 transition-colors duration-300 ${NODE_STYLE[st]}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_STYLE[st]}`} />
                      <span className="text-[11px] font-bold leading-tight">{node.title}</span>
                    </div>
                    <div className="mt-0.5 text-[9px] leading-tight opacity-80">{node.caption}</div>
                  </div>
                  {i < NODES.length - 1 && (
                    <span
                      className={`px-1 text-sm transition-colors duration-300 ${
                        states[NODES[i + 1].key] !== 'idle' ? 'text-brand-400' : 'text-slate-300'
                      }`}
                    >
                      →
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 호출 트레이스 */}
          {trace.length > 0 && (
            <ol className="mt-3 space-y-1 rounded-md bg-slate-50 px-3 py-2 font-mono text-[10.5px] leading-relaxed text-slate-600">
              {trace.map((line) => (
                <li key={line} className={line.startsWith('✕') ? 'text-red-600' : undefined}>
                  {line}
                </li>
              ))}
            </ol>
          )}

          <p className="mt-2 text-[10px] text-slate-400">
            LLM은 ELLIS에 직접 접근하지 않습니다(MCP·Gateway 2중 경계). 화면의 모든 금액·취소조건은
            MCP 도구가 반환한 구조화 데이터에서만 렌더링되며, LLM 텍스트는 Validator로 대조
            검증됩니다.
          </p>
        </div>
      )}
    </section>
  );
}
