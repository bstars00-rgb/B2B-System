import { useEffect, useMemo, useState } from 'react';
import type { HotelGroup, RateResult } from '../types';
import { formatDateTime, formatMoney, starLabel, timeAgoLabel } from '../utils/format';
import SearchStatusBadge from './SearchStatusBadge';

interface Props {
  group: HotelGroup | null;
  internalView: boolean;
  onClose: () => void;
  /** "Create Booking 진행" 클릭 — 선택한 요금을 기존 Create Booking 플로우로 전달 */
  onProceedBooking: (rate: RateResult) => void;
}

function RateBlock({
  rate,
  internalView,
  selected,
  onSelect,
}: {
  rate: RateResult;
  internalView: boolean;
  selected: boolean;
  onSelect: (rate: RateResult) => void;
}) {
  const selectable = Boolean(rate.booking_token) && rate.availability !== 'unavailable';
  return (
    <div
      className={`rounded-lg border bg-white transition-colors ${
        selected ? 'border-brand-500 ring-2 ring-brand-200' : 'border-slate-200'
      }`}
    >
      {/* 요금제 헤더 + 선택 */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <label
          className={`flex items-start gap-2.5 ${selectable ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
        >
          <input
            type="radio"
            name="rate-select"
            checked={selected}
            disabled={!selectable}
            onChange={() => onSelect(rate)}
            className="mt-1 h-4 w-4 accent-brand-500"
            aria-label={`${rate.room_type_name} ${rate.rate_plan_name} 선택`}
          />
          <span>
            <h4 className="text-sm font-semibold text-slate-900">{rate.room_type_name}</h4>
            <p className="text-[11px] text-slate-500">
              {rate.rate_plan_name} · {rate.meal_plan} · {rate.total_nights}박 {rate.total_rooms}실
            </p>
            <span className="mt-1.5 flex flex-wrap gap-1">
              <SearchStatusBadge variant={rate.availability} />
              <SearchStatusBadge variant={rate.cancellation_type} />
              <SearchStatusBadge variant={rate.booking_token ? 'bookable' : 'reference'} />
            </span>
            {!selectable && (
              <span className="mt-1 block text-[10px] text-rose-500">
                참고용 요금 — 예약 진행 불가
              </span>
            )}
          </span>
        </label>
        <div className="shrink-0 text-right">
          <p className="text-base font-bold text-slate-900">
            {formatMoney(rate.selling_price, rate.currency)}
          </p>
          <p className="text-[10px] text-slate-400">판매가 (세금 별도)</p>
        </div>
      </div>

      {/* 금액 상세 */}
      <div className="px-4 py-3">
        <h5 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          금액 상세 ({rate.currency})
        </h5>
        <table className="mt-1.5 w-full text-xs">
          <tbody>
            {internalView && (
              <tr className="text-slate-600">
                <td className="py-0.5">Net (공급가)</td>
                <td className="py-0.5 text-right font-mono">
                  {formatMoney(rate.net_price, rate.currency)}
                </td>
              </tr>
            )}
            {internalView && (
              <tr className="text-slate-600">
                <td className="py-0.5">Markup</td>
                <td className="py-0.5 text-right font-mono">
                  {formatMoney(rate.markup, rate.currency)}
                </td>
              </tr>
            )}
            <tr className="font-medium text-slate-800">
              <td className="py-0.5">판매가 (Selling)</td>
              <td className="py-0.5 text-right font-mono">
                {formatMoney(rate.selling_price, rate.currency)}
              </td>
            </tr>
            <tr className="text-slate-600">
              <td className="py-0.5">세금/봉사료</td>
              <td className="py-0.5 text-right font-mono">{formatMoney(rate.tax, rate.currency)}</td>
            </tr>
            <tr className="border-t border-slate-200 font-semibold text-slate-900">
              <td className="pt-1">총액</td>
              <td className="pt-1 text-right font-mono">
                {formatMoney(rate.selling_price + rate.tax, rate.currency)}
              </td>
            </tr>
          </tbody>
        </table>
        {!internalView && (
          <p className="mt-1.5 text-[10px] text-slate-400">
            net/markup은 내부 권한 계정에만 표시됩니다. (상단 “내부 뷰” 토글)
          </p>
        )}
      </div>

      {/* 취소 정책 전문 */}
      <div className="border-t border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <h5 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            취소 정책
          </h5>
          {rate.cancellation_deadline ? (
            <span className="text-[11px] font-medium text-sky-700">
              무료취소 마감: {formatDateTime(rate.cancellation_deadline)}
            </span>
          ) : (
            <span className="text-[11px] font-medium text-rose-600">취소 마감 없음 (환불불가)</span>
          )}
        </div>
        <pre className="mt-1.5 whitespace-pre-wrap rounded bg-slate-50 p-2.5 font-sans text-[11px] leading-relaxed text-slate-600">
          {rate.cancellation_policy_text}
        </pre>
      </div>

      {/* 경고 */}
      {rate.warnings.length > 0 && (
        <div className="border-t border-slate-100 px-4 py-3">
          <ul className="space-y-1">
            {rate.warnings.map((w) => (
              <li key={w} className="text-[11px] text-amber-700">
                ⚠ {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 메타 정보 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-[10px] text-slate-400">
        <span>
          공급사 {rate.supplier_id} · {rate.rate_plan_id}
          {rate.booking_token ? (
            <span className="ml-1 font-mono">token: {rate.booking_token.slice(0, 18)}…</span>
          ) : (
            <span className="ml-1 text-rose-500">booking_token 없음 — 예약 진행 불가</span>
          )}
        </span>
        <span>
          최종 갱신 {formatDateTime(rate.last_updated_at)} ({timeAgoLabel(rate.last_updated_at)})
        </span>
      </div>
    </div>
  );
}

/** 우측 슬라이드 Drawer — 호텔의 룸타입별 요금제 상세 + 룸타입 선택 후 예약 진행 */
export default function RateDetailDrawer({ group, internalView, onClose, onProceedBooking }: Props) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // 다른 호텔을 열면 선택 초기화
  useEffect(() => {
    setSelectedPlanId(null);
  }, [group?.hotel_id]);

  /** 룸타입별 그룹핑 (표시 순서: 룸타입 내 최저가 오름차순) */
  const roomTypeGroups = useMemo(() => {
    if (!group) return [];
    const map = new Map<string, RateResult[]>();
    for (const r of group.rates) {
      const list = map.get(r.room_type_name) ?? [];
      list.push(r);
      map.set(r.room_type_name, list);
    }
    return [...map.entries()]
      .map(([roomType, rates]) => ({
        roomType,
        rates: [...rates].sort((a, b) => a.selling_price - b.selling_price),
      }))
      .sort(
        (a, b) => Math.min(...a.rates.map((r) => r.selling_price)) - Math.min(...b.rates.map((r) => r.selling_price)),
      );
  }, [group]);

  const selectedRate = useMemo(
    () => group?.rates.find((r) => r.rate_plan_id === selectedPlanId) ?? null,
    [group, selectedPlanId],
  );

  if (!group) return null;

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
      {/* backdrop */}
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-slate-900/30"
      />
      {/* drawer */}
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-slate-50 shadow-2xl transition-transform">
        <header className="flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">{group.hotel_name}</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              <span className="text-amber-500">{starLabel(group.star_rating)}</span> ·{' '}
              {group.destination} · {group.hotel_id} · 좌표 {group.latitude.toFixed(4)},{' '}
              {group.longitude.toFixed(4)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Drawer 닫기"
          >
            ✕
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <p className="text-[11px] text-slate-500">
            룸타입 <b className="text-slate-700">{roomTypeGroups.length}</b>종 · 요금제{' '}
            <b className="text-slate-700">{group.rates.length}</b>건 — 예약할 룸타입·요금제를
            선택하세요.
          </p>
          {roomTypeGroups.map(({ roomType, rates }) => (
            <section key={roomType}>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  룸타입
                </span>
                <h4 className="text-sm font-bold text-slate-800">{roomType}</h4>
                <span className="text-[10px] text-slate-400">요금제 {rates.length}건</span>
              </div>
              <div className="space-y-3">
                {rates.map((rate) => (
                  <RateBlock
                    key={rate.rate_plan_id}
                    rate={rate}
                    internalView={internalView}
                    selected={rate.rate_plan_id === selectedPlanId}
                    onSelect={(r) => setSelectedPlanId(r.rate_plan_id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="border-t border-slate-200 bg-white px-5 py-3">
          {selectedRate && (
            <div className="mb-2 flex items-center justify-between rounded-md bg-brand-50 px-3 py-2 text-[11px]">
              <span className="font-medium text-brand-700">
                선택: {selectedRate.room_type_name} · {selectedRate.rate_plan_name}
              </span>
              <span className="font-bold text-brand-700">
                {formatMoney(selectedRate.selling_price + selectedRate.tax, selectedRate.currency)}{' '}
                <span className="font-normal text-brand-500">(세금 포함)</span>
              </span>
            </div>
          )}
          <button
            type="button"
            disabled={!selectedRate}
            onClick={() => selectedRate && onProceedBooking(selectedRate)}
            className="block w-full rounded-md bg-brand-500 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            title="선택한 룸타입·요금제를 이어받아 기존 Create Booking 화면으로 이동"
          >
            {selectedRate
              ? '선택한 요금으로 Create Booking 진행'
              : '룸타입·요금제를 먼저 선택하세요'}
          </button>
          <p className="mt-1.5 text-center text-[10px] text-slate-400">
            선택한 요금이 기존 Create Booking 화면으로 전달됩니다. (예약 생성은 기존 플로우 담당)
          </p>
        </footer>
      </aside>
    </div>
  );
}
