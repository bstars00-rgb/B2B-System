export const LOADING_STEPS = [
  '질문 분석 중 (LLM 의도 추출)',
  '검색 조건 확정 (resolve_destination)',
  'ELLIS 요금 조회 (search_hotels / get_hotel_rates)',
  '결과 정규화 및 검증 (Response Validator)',
] as const;

interface Props {
  /** 현재 진행 중인 단계 인덱스 (0-base) */
  step: number;
}

/** 검색 중 스켈레톤 + MCP 도구 호출 단계 표시 */
export default function LoadingSkeleton({ step }: Props) {
  return (
    <div className="space-y-4">
      {/* 단계 표시 */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <ol className="space-y-2">
          {LOADING_STEPS.map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={label} className="flex items-center gap-2 text-xs">
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors duration-300 ${
                    done
                      ? 'bg-emerald-500 text-white'
                      : active
                        ? 'animate-pulse bg-brand-500 text-white'
                        : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {done ? '✓' : i + 1}
                </span>
                <span
                  className={
                    done ? 'text-slate-400 line-through' : active ? 'font-medium text-slate-800' : 'text-slate-400'
                  }
                >
                  {label}
                </span>
                {active && <span className="text-brand-500">…</span>}
              </li>
            );
          })}
        </ol>
      </div>

      {/* 결과 카드 스켈레톤 */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/5 rounded bg-slate-200" />
                <div className="h-3 w-2/5 rounded bg-slate-100" />
                <div className="mt-3 flex gap-1.5">
                  <div className="h-4 w-14 rounded bg-slate-100" />
                  <div className="h-4 w-14 rounded bg-slate-100" />
                </div>
              </div>
              <div className="space-y-2 text-right">
                <div className="ml-auto h-5 w-24 rounded bg-slate-200" />
                <div className="ml-auto h-3 w-16 rounded bg-slate-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
