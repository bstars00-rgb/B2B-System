import type { HotelGroup, RateResult } from '../types';
import { formatDateTime, formatMoney, starLabel, timeAgoLabel } from '../utils/format';
import SearchStatusBadge from './SearchStatusBadge';

interface Props {
  group: HotelGroup | null;
  internalView: boolean;
  onClose: () => void;
}

function RateBlock({ rate, internalView }: { rate: RateResult; internalView: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      {/* 요금제 헤더 */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">{rate.room_type_name}</h4>
          <p className="text-[11px] text-slate-500">
            {rate.rate_plan_name} · {rate.meal_plan} · {rate.total_nights}박 {rate.total_rooms}실
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <SearchStatusBadge variant={rate.availability} />
            <SearchStatusBadge variant={rate.cancellation_type} />
            <SearchStatusBadge variant={rate.booking_token ? 'bookable' : 'reference'} />
          </div>
        </div>
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

/** 우측 슬라이드 Drawer — 호텔의 전체 요금제 상세 */
export default function RateDetailDrawer({ group, internalView, onClose }: Props) {
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

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {group.rates.map((rate) => (
            <RateBlock key={rate.rate_plan_id} rate={rate} internalView={internalView} />
          ))}
        </div>

        <footer className="border-t border-slate-200 bg-white px-5 py-3">
          <a
            href="#legacy-search"
            onClick={(e) => e.preventDefault()}
            className="block w-full rounded-md bg-brand-500 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-600"
            title="더미 링크 — 검색 조건을 이어받아 기존 예약 화면으로 이동 (프로토타입)"
          >
            기존 검색 화면에서 확인
          </a>
          <p className="mt-1.5 text-center text-[10px] text-slate-400">
            예약 생성은 AI 검색에서 지원하지 않습니다 — 기존 예약 플로우를 이용하세요.
          </p>
        </footer>
      </aside>
    </div>
  );
}
