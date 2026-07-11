import type { HotelGroup } from '../types';
import { formatMoney, starLabel, timeAgoLabel } from '../utils/format';
import SearchStatusBadge from './SearchStatusBadge';

interface Props {
  group: HotelGroup;
  compared: boolean;
  compareDisabled: boolean;
  internalView: boolean;
  onToggleCompare: (hotelId: string) => void;
  onOpenDetail: (hotelId: string) => void;
}

/** 호텔 결과 카드 — 대표(최저가) 요금 기준 요약 */
export default function HotelResultCard({
  group,
  compared,
  compareDisabled,
  internalView,
  onToggleCompare,
  onOpenDetail,
}: Props) {
  const r = group.min_rate;
  const mealPlans = [...new Set(group.rates.map((x) => x.meal_plan))];

  return (
    <article
      className={`flex flex-col rounded-lg border bg-white p-4 transition-shadow hover:shadow-md ${
        compared ? 'border-brand-400 ring-1 ring-brand-200' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="truncate text-sm font-semibold text-slate-900">{group.hotel_name}</h4>
            <span className="whitespace-nowrap text-[11px] text-amber-500">
              {starLabel(group.star_rating)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {group.destination} · {group.hotel_id} · 요금제 {group.rates.length}건
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            <SearchStatusBadge variant={r.availability} />
            <SearchStatusBadge variant={r.cancellation_type} />
            <SearchStatusBadge variant={r.booking_token ? 'bookable' : 'reference'} />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] text-slate-400">최저 판매가 ({r.total_nights}박 총액)</p>
          <p className="text-lg font-bold text-slate-900">
            {formatMoney(r.selling_price, r.currency)}
          </p>
          <p className="text-[10px] text-slate-400">세금 {formatMoney(r.tax, r.currency)} 별도</p>
          {internalView && (
            <p className="mt-0.5 rounded bg-slate-50 px-1 py-0.5 text-[10px] text-slate-500">
              net {formatMoney(r.net_price, r.currency)} + MU {formatMoney(r.markup, r.currency)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-2 text-[11px] text-slate-500">
        {r.room_type_name} · {r.rate_plan_name} · {mealPlans.join(' / ')}
      </div>

      {r.warnings.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {r.warnings.map((w) => (
            <li key={w} className="text-[11px] text-amber-700">
              ⚠ {w}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
        <span className="text-[10px] text-slate-400">
          갱신 {timeAgoLabel(r.last_updated_at)} · {r.supplier_id}
        </span>
        <div className="flex items-center gap-2">
          <label
            className={`flex items-center gap-1 text-[11px] ${
              compareDisabled && !compared ? 'cursor-not-allowed text-slate-300' : 'cursor-pointer text-slate-600'
            }`}
          >
            <input
              type="checkbox"
              checked={compared}
              disabled={compareDisabled && !compared}
              onChange={() => onToggleCompare(group.hotel_id)}
              className="h-3.5 w-3.5 accent-brand-500"
            />
            비교
          </label>
          <button
            type="button"
            onClick={() => onOpenDetail(group.hotel_id)}
            className="rounded border border-brand-300 bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 transition-colors hover:bg-brand-100"
          >
            요금 상세
          </button>
        </div>
      </div>
    </article>
  );
}
