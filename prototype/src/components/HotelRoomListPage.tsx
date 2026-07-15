import { useMemo, useState } from 'react';
import type { HotelGroup, RateResult, SearchConditions } from '../types';
import { buildCityResults, hotelContentOf } from '../mocks/hotelDb';
import { nextSearchId } from '../mocks';
import { formatDateTime } from '../utils/format';

interface Props {
  group: HotelGroup;
  conditions: SearchConditions;
  onBack: () => void;
  /** 요금제 Select — 기존 Create Hotel Booking 모달로 진행 */
  onSelectRate: (rate: RateResult) => void;
  /** 새 탭 전용 페이지로 열린 경우 (뒤로가기 버튼 숨김 — 상단 바에 ✕ Close 존재) */
  standalone?: boolean;
}

const nf = new Intl.NumberFormat('en-US');

/**
 * 실제 포털 호텔 룸리스트 화면 클론 (/hotel/room/list/...).
 * 호텔 헤더 → 조건 바 → 요금제 테이블(Billing Curr/Gross/Discount/Sum·취소정책·Select) →
 * Show more → 지도/호텔정보/Neighborhood → Description → Photo.
 */
export default function HotelRoomListPage({ group, conditions, onBack, onSelectRate, standalone }: Props) {
  const [showAll, setShowAll] = useState(false);

  // 지목 호텔의 전체 요금제 재생성 (target 흐름)
  const rates = useMemo(() => {
    const { results } = buildCityResults(nextSearchId(), {
      ...conditions,
      hotel_name: group.hotel_name,
    });
    return results.length > 0 ? results : group.rates;
  }, [group, conditions]);

  const visibleRates = showAll ? rates : rates.slice(0, 4);
  const content = hotelContentOf(group.hotel_id, group.destination);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-white p-4">
      {!standalone && (
        <button
          type="button"
          onClick={onBack}
          className="mb-3 rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:border-brand-400 hover:text-brand-600"
        >
          ← 검색 결과로
        </button>
      )}

      {/* 호텔 헤더 */}
      <div className="rounded border border-slate-200 px-5 py-4">
        <h3 className="text-base font-bold text-slate-900">
          [{content.code}] {group.hotel_name}{' '}
          <span className="ml-1 text-xs font-semibold text-amber-500">{group.star_rating} Star</span>
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">{content.address}</p>
      </div>

      {/* 조건 바 */}
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs text-slate-700">
        <span>
          Check-in <b className="text-rose-500">*</b>{' '}
          <span className="ml-1 rounded border border-slate-300 bg-white px-2.5 py-1">{conditions.check_in}</span>
        </span>
        <span>
          Check-out <b className="text-rose-500">*</b>{' '}
          <span className="ml-1 rounded border border-slate-300 bg-white px-2.5 py-1">{conditions.check_out}</span>
        </span>
        <span className="rounded border border-slate-300 bg-white px-2.5 py-1">{conditions.nights} Nights</span>
        <span>
          Rooms <b className="text-rose-500">*</b>{' '}
          <span className="ml-1 rounded border border-slate-300 bg-white px-2.5 py-1">{conditions.rooms ?? 1}</span>
        </span>
        <span className="rounded border border-slate-300 bg-white px-2.5 py-1">ADT {conditions.adults ?? 2}</span>
        <span className="rounded border border-slate-300 bg-white px-2.5 py-1">CHD {conditions.children ?? 0}</span>
        <span className="ml-auto flex gap-1.5">
          <span className="cursor-not-allowed rounded bg-brand-500 px-4 py-1.5 font-semibold text-white opacity-80" title="프로토타입 — 조건 재검색은 이전 화면에서">
            Select
          </span>
          <span className="cursor-not-allowed rounded border border-slate-300 bg-white px-4 py-1.5 text-slate-500">
            Reset
          </span>
        </span>
      </div>

      {/* 요금제 테이블 */}
      <div className="mt-3 overflow-x-auto rounded border border-slate-200">
        <table className="w-full min-w-[860px] text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <th className="px-4 py-2.5 text-left font-semibold" />
              <th className="px-3 py-2.5 font-semibold">Billing Curr.</th>
              <th className="px-3 py-2.5 font-semibold">Billing Gross</th>
              <th className="px-3 py-2.5 font-semibold">Billing Discount</th>
              <th className="px-3 py-2.5 font-semibold">Billing Sum</th>
              <th className="px-3 py-2.5 font-semibold">Cancellation policy</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {visibleRates.map((r) => {
              const sum = r.selling_price + r.tax;
              return (
                <tr key={r.rate_plan_id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-3">
                    <p className="text-[13px] font-bold text-slate-900">{r.room_type_name}</p>
                    <p className="text-[11px] text-slate-400">
                      {r.rate_plan_name} [Plan Code : {r.rate_plan_id}] / Origin Plan Code : {r.rate_plan_id}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      ☕ {r.meal_plan === '조식 포함' ? 'Breakfast included' : 'No breakfast service'}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-center text-slate-600">{r.currency}</td>
                  <td className="px-3 py-3 text-right text-slate-700">{nf.format(sum)}</td>
                  <td className="px-3 py-3 text-right text-slate-700">0</td>
                  <td className="px-3 py-3 text-right font-medium text-slate-800">{nf.format(sum)}</td>
                  <td className="px-3 py-3 text-center text-[11px]">
                    {r.cancellation_deadline ? (
                      <span className="text-slate-600">
                        Free cancellation until
                        <br />
                        {formatDateTime(r.cancellation_deadline)}
                      </span>
                    ) : (
                      <span className="font-semibold text-rose-600">Non-refundable</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectRate(r)}
                      className="rounded border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 hover:border-brand-400 hover:text-brand-600"
                    >
                      Select
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rates.length > 4 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="block w-full border-t border-slate-200 py-2.5 text-center text-xs text-slate-600 hover:bg-slate-50"
          >
            {showAll ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      {/* 지도 + 호텔 정보 */}
      <div className="mt-4 flex flex-col gap-4 rounded border border-slate-200 p-4 lg:flex-row">
        <div className="flex h-64 w-full items-center justify-center rounded bg-slate-200 text-xs text-slate-400 lg:w-[420px]">
          MAP — {group.latitude.toFixed(4)}, {group.longitude.toFixed(4)}
        </div>
        <div className="flex-1 space-y-3 text-[13px] text-slate-700">
          <div>
            <p className="font-bold text-slate-900">Check-in/out</p>
            <p>{content.checkInOut}</p>
          </div>
          <div>
            <p className="font-bold text-slate-900">Address</p>
            <p>{content.address}</p>
          </div>
          <div>
            <p className="font-bold text-slate-900">Mobile Phone Number</p>
            <p>{content.phone}</p>
          </div>
          <div>
            <p className="font-bold text-slate-900">Fax</p>
          </div>
          <div>
            <p className="font-bold text-slate-900">Neighborhood</p>
            {content.neighborhood.map((n) => (
              <p key={n} className="mt-1">{n}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Description */}
      <h4 className="mt-5 text-sm font-bold text-slate-900">Description</h4>
      <div className="mt-2 space-y-3 rounded border border-slate-200 p-4 text-[13px] leading-relaxed text-slate-700">
        <div>
          <p className="font-bold text-slate-900">Introduction</p>
          {content.introduction.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        <div>
          <p className="font-bold text-slate-900">Room Facility</p>
          <p>{content.roomFacility}</p>
        </div>
        <div>
          <p className="font-bold text-slate-900">Hotel Facility</p>
          <p>{content.hotelFacility}</p>
        </div>
        <div>
          <p className="font-bold text-slate-900">Caution</p>
          {content.caution.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>

      {/* Photo */}
      <h4 className="mt-5 text-sm font-bold text-slate-900">Photo</h4>
      <div className="mt-2 flex flex-wrap gap-3 rounded border border-slate-200 p-4">
        {Array.from({ length: content.photoCount }, (_, i) => (
          <div
            key={i}
            className="flex h-24 w-36 items-center justify-center rounded bg-slate-200 text-[10px] text-slate-400"
          >
            PHOTO {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}
