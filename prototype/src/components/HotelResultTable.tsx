import type { HotelGroup } from '../types';
import { formatDateTime, formatMoney, timeAgoLabel } from '../utils/format';
import SearchStatusBadge from './SearchStatusBadge';

interface Props {
  groups: HotelGroup[];
  comparedIds: string[];
  compareDisabled: boolean;
  internalView: boolean;
  onToggleCompare: (hotelId: string) => void;
  onOpenDetail: (hotelId: string) => void;
}

/** 표(테이블) 뷰 — 요금제 단위 행, 정보 밀도 높은 B2B 스타일 */
export default function HotelResultTable({
  groups,
  comparedIds,
  compareDisabled,
  internalView,
  onToggleCompare,
  onOpenDetail,
}: Props) {
  const th = 'px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500';
  const td = 'px-2 py-2 align-top text-[12px] text-slate-700';

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className={th}>비교</th>
            <th className={th}>호텔 / 성급</th>
            <th className={th}>객실 · 요금제</th>
            <th className={th}>식사</th>
            <th className={th}>취소</th>
            <th className={th}>재고</th>
            {internalView && <th className={`${th} text-right`}>Net</th>}
            {internalView && <th className={`${th} text-right`}>Markup</th>}
            <th className={`${th} text-right`}>판매가</th>
            <th className={`${th} text-right`}>세금</th>
            <th className={th}>통화</th>
            <th className={th}>요금 상태</th>
            <th className={th}>갱신</th>
            <th className={th}></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {groups.flatMap((g) =>
            g.rates.map((r, idx) => {
              const compared = comparedIds.includes(g.hotel_id);
              return (
                <tr key={r.rate_plan_id} className="hover:bg-brand-50/40">
                  <td className={td}>
                    {idx === 0 && (
                      <input
                        type="checkbox"
                        checked={compared}
                        disabled={compareDisabled && !compared}
                        onChange={() => onToggleCompare(g.hotel_id)}
                        className="h-3.5 w-3.5 accent-brand-500"
                      />
                    )}
                  </td>
                  <td className={td}>
                    {idx === 0 ? (
                      <>
                        <div className="font-medium text-slate-900">{g.hotel_name}</div>
                        <div className="text-[10px] text-slate-400">
                          {g.destination} · {g.star_rating}성 · {g.hotel_id}
                        </div>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-300">〃</span>
                    )}
                  </td>
                  <td className={td}>
                    <div>{r.room_type_name}</div>
                    <div className="text-[10px] text-slate-400">{r.rate_plan_name}</div>
                  </td>
                  <td className={td}>{r.meal_plan}</td>
                  <td className={td}>
                    <SearchStatusBadge variant={r.cancellation_type} />
                    {r.cancellation_deadline && (
                      <div className="mt-0.5 text-[10px] text-slate-400">
                        ~{formatDateTime(r.cancellation_deadline)}
                      </div>
                    )}
                  </td>
                  <td className={td}>
                    <SearchStatusBadge variant={r.availability} />
                  </td>
                  {internalView && (
                    <td className={`${td} text-right font-mono`}>
                      {formatMoney(r.net_price, r.currency)}
                    </td>
                  )}
                  {internalView && (
                    <td className={`${td} text-right font-mono`}>
                      {formatMoney(r.markup, r.currency)}
                    </td>
                  )}
                  <td className={`${td} text-right font-mono font-semibold text-slate-900`}>
                    {formatMoney(r.selling_price, r.currency)}
                  </td>
                  <td className={`${td} text-right font-mono`}>{formatMoney(r.tax, r.currency)}</td>
                  <td className={td}>{r.currency}</td>
                  <td className={td}>
                    <SearchStatusBadge variant={r.booking_token ? 'bookable' : 'reference'} />
                  </td>
                  <td className={`${td} whitespace-nowrap text-[10px] text-slate-400`}>
                    {timeAgoLabel(r.last_updated_at)}
                  </td>
                  <td className={td}>
                    <button
                      type="button"
                      onClick={() => onOpenDetail(g.hotel_id)}
                      className="whitespace-nowrap rounded border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 hover:border-brand-300 hover:text-brand-700"
                    >
                      상세
                    </button>
                  </td>
                </tr>
              );
            }),
          )}
        </tbody>
      </table>
    </div>
  );
}
