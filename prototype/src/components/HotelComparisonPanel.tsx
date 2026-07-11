import type { ReactNode } from 'react';
import type { HotelGroup } from '../types';
import { formatDateTime, formatMoney } from '../utils/format';
import SearchStatusBadge from './SearchStatusBadge';

interface Props {
  groups: HotelGroup[];
  onRemove: (hotelId: string) => void;
  onClear: () => void;
}

/** 하단 도킹 비교 패널 — 최대 3개 호텔 나란히 비교 */
export default function HotelComparisonPanel({ groups, onRemove, onClear }: Props) {
  if (groups.length === 0) return null;

  const rows: { label: string; render: (g: HotelGroup) => ReactNode }[] = [
    {
      label: '최저 판매가',
      render: (g) => (
        <span className="font-mono font-semibold text-slate-900">
          {formatMoney(g.min_rate.selling_price, g.min_rate.currency)}
        </span>
      ),
    },
    {
      label: '세금',
      render: (g) => (
        <span className="font-mono">{formatMoney(g.min_rate.tax, g.min_rate.currency)}</span>
      ),
    },
    { label: '성급', render: (g) => `${g.star_rating}성` },
    { label: '객실/요금제', render: (g) => `${g.min_rate.room_type_name}` },
    { label: '식사', render: (g) => g.min_rate.meal_plan },
    {
      label: '취소 조건',
      render: (g) => <SearchStatusBadge variant={g.min_rate.cancellation_type} />,
    },
    {
      label: '취소 마감',
      render: (g) =>
        g.min_rate.cancellation_deadline
          ? formatDateTime(g.min_rate.cancellation_deadline)
          : '—',
    },
    { label: '재고', render: (g) => <SearchStatusBadge variant={g.min_rate.availability} /> },
    {
      label: '요금 상태',
      render: (g) => (
        <SearchStatusBadge variant={g.min_rate.booking_token ? 'bookable' : 'reference'} />
      ),
    },
  ];

  return (
    <div className="border-t-2 border-brand-400 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.06)] transition-all">
      <div className="flex items-center justify-between px-4 py-2">
        <h3 className="text-xs font-semibold text-slate-700">
          호텔 비교 <span className="text-brand-600">({groups.length}/3)</span>
          <span className="ml-2 font-normal text-slate-400">
            — 대표(최저가) 요금 기준 · 통화가 다른 호텔 간 금액 비교 주의
          </span>
        </h3>
        <button
          type="button"
          onClick={onClear}
          className="rounded border border-slate-200 px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-50"
        >
          전체 해제
        </button>
      </div>
      <div className="overflow-x-auto px-4 pb-3">
        <table className="min-w-full text-xs">
          <thead>
            <tr>
              <th className="w-28 py-1.5 pr-3 text-left text-[10px] font-semibold uppercase text-slate-400">
                항목
              </th>
              {groups.map((g) => (
                <th key={g.hotel_id} className="min-w-[180px] py-1.5 pr-3 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-slate-800">{g.hotel_name}</span>
                    <button
                      type="button"
                      onClick={() => onRemove(g.hotel_id)}
                      className="shrink-0 text-slate-300 hover:text-rose-500"
                      aria-label={`${g.hotel_name} 비교 제거`}
                    >
                      ✕
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="py-1.5 pr-3 text-[11px] text-slate-400">{row.label}</td>
                {groups.map((g) => (
                  <td key={g.hotel_id} className="py-1.5 pr-3 text-slate-700">
                    {row.render(g)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
