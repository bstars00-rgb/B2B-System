import type { SearchHistoryItem } from '../types';
import { timeAgoLabel } from '../utils/format';

interface Props {
  history: SearchHistoryItem[];
  disabled: boolean;
  onRerun: (query: string) => void;
}

const STATUS_LABEL: Record<SearchHistoryItem['status'], { text: string; cls: string }> = {
  ok: { text: '성공', cls: 'text-emerald-600' },
  partial: { text: '부분', cls: 'text-amber-600' },
  empty: { text: '0건', cls: 'text-slate-400' },
  error: { text: '실패', cls: 'text-rose-600' },
};

/** 최근 검색 기록 — 클릭 시 동일 질문 재실행 */
export default function SearchHistoryPanel({ history, disabled, onRerun }: Props) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          최근 검색 기록
        </h3>
        <span className="text-[10px] text-slate-400">세션 내 최대 10건</span>
      </div>
      {history.length === 0 ? (
        <p className="px-4 py-3 text-xs text-slate-400">아직 검색 기록이 없습니다.</p>
      ) : (
        <ul className="max-h-48 divide-y divide-slate-100 overflow-y-auto">
          {history.map((h) => {
            const s = STATUS_LABEL[h.status];
            return (
              <li key={h.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onRerun(h.query)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-brand-50/60 disabled:cursor-not-allowed"
                  title="클릭하면 동일 질문으로 재검색합니다"
                >
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-700">{h.query}</span>
                  <span className={`shrink-0 text-[10px] font-medium ${s.cls}`}>
                    {s.text}
                    {h.status === 'ok' || h.status === 'partial' ? ` ${h.result_count}건` : ''}
                  </span>
                  <span className="shrink-0 text-[10px] text-slate-400">
                    {timeAgoLabel(h.searched_at)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
