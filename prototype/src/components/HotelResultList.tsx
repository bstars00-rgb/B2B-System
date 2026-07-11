import type { HotelGroup, SearchResponse } from '../types';
import { formatDateTime } from '../utils/format';
import HotelResultCard from './HotelResultCard';
import HotelResultTable from './HotelResultTable';
import SearchStatusBadge from './SearchStatusBadge';

export type ViewMode = 'card' | 'table';

interface Props {
  response: SearchResponse;
  groups: HotelGroup[];
  viewMode: ViewMode;
  comparedIds: string[];
  internalView: boolean;
  onViewModeChange: (mode: ViewMode) => void;
  onToggleCompare: (hotelId: string) => void;
  onOpenDetail: (hotelId: string) => void;
}

/** 결과 영역 — 경고 배너, 카드/표 전환, 결과 렌더링 */
export default function HotelResultList({
  response,
  groups,
  viewMode,
  comparedIds,
  internalView,
  onViewModeChange,
  onToggleCompare,
  onOpenDetail,
}: Props) {
  const compareDisabled = comparedIds.length >= 3;
  const rateCount = response.results.length;

  return (
    <div className="space-y-3">
      {/* 부분 실패 / STALE / 다중 통화 경고 배너 */}
      {response.warning_banner && (
        <div
          className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs leading-relaxed ${
            response.is_stale
              ? 'border-yellow-300 bg-yellow-50 text-yellow-800'
              : 'border-amber-300 bg-amber-50 text-amber-800'
          }`}
        >
          <span className="mt-0.5">⚠</span>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {response.is_stale && <SearchStatusBadge variant="stale" />}
              {response.status === 'partial' && <SearchStatusBadge variant="partial" />}
              <span>{response.warning_banner}</span>
            </div>
            {response.failed_suppliers && response.failed_suppliers.length > 0 && (
              <p className="mt-1 font-mono text-[10px] opacity-70">
                실패 공급사: {response.failed_suppliers.join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 헤더: 건수 + 뷰 전환 */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500">
          호텔 <b className="text-slate-800">{groups.length}</b>곳 · 요금제{' '}
          <b className="text-slate-800">{rateCount}</b>건
          <span className="ml-2 text-[10px] text-slate-400">
            조회 {formatDateTime(response.searched_at)} · {response.search_id}
          </span>
        </div>
        <div className="flex rounded-md border border-slate-200 bg-white p-0.5">
          {(['card', 'table'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewModeChange(mode)}
              className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-brand-500 text-white'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {mode === 'card' ? '카드' : '표'}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {groups.map((g) => (
            <HotelResultCard
              key={g.hotel_id}
              group={g}
              compared={comparedIds.includes(g.hotel_id)}
              compareDisabled={compareDisabled}
              internalView={internalView}
              onToggleCompare={onToggleCompare}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </div>
      ) : (
        <HotelResultTable
          groups={groups}
          comparedIds={comparedIds}
          compareDisabled={compareDisabled}
          internalView={internalView}
          onToggleCompare={onToggleCompare}
          onOpenDetail={onOpenDetail}
        />
      )}
    </div>
  );
}
