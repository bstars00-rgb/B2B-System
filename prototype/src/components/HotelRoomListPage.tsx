import { useMemo, useState } from 'react';
import type { HotelGroup, RateResult, SearchConditions } from '../types';
import { buildCityResults, hotelContentOf } from '../mocks/hotelDb';
import { nextSearchId } from '../mocks';
import { formatDateTime } from '../utils/format';
import DatePicker from './DatePicker';
import HotelPhoto from './HotelPhoto';

interface Props {
  group: HotelGroup;
  conditions: SearchConditions;
  onBack: () => void;
  /** 요금제 Select — 기존 Create Hotel Booking 모달로 진행 */
  onSelectRate: (rate: RateResult) => void;
  /** 조건 변경 재검색 시 부모에 통지 (예약 모달 조건 동기화) */
  onConditionsChange?: (conditions: SearchConditions) => void;
  /** 새 탭 전용 페이지로 열린 경우 (뒤로가기 버튼 숨김 — 상단 바에 ✕ Close 존재) */
  standalone?: boolean;
}

const nf = new Intl.NumberFormat('en-US');

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function diffNights(ci: string, co: string): number {
  return Math.max(1, Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86400000));
}

interface RoomCfg {
  adt: number;
  chd: number;
  ages: number[];
}

/** 적용 조건(총 인원·객실 수) → 룸별 구성 초기화 (성인 균등 배분, 아동은 Room 1) */
function cfgFromConditions(c: SearchConditions): RoomCfg[] {
  const n = Math.max(1, c.rooms ?? 1);
  const adults = Math.max(1, c.adults ?? 2);
  const children = Math.max(0, c.children ?? 0);
  const perRoom = Math.max(1, Math.floor(adults / n));
  return Array.from({ length: n }, (_, i) => {
    const adt = i === 0 ? Math.max(1, adults - perRoom * (n - 1)) : perRoom;
    const chd = i === 0 ? children : 0;
    return { adt, chd, ages: Array.from({ length: chd }, () => 1) };
  });
}

const barSelect =
  'rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-brand-400 focus:outline-none';

/**
 * 실제 포털 호텔 룸리스트 화면 클론 (/hotel/room/list/...).
 * 호텔 헤더 → 조건 바(검색 후에도 체크인/아웃·Nights·Rooms·인원 변경 → Select 재검색) →
 * 요금제 테이블(Billing Curr/Gross/Discount/Sum·취소정책·Select) →
 * Show more → 지도/호텔정보/Neighborhood → Description → Photo.
 */
export default function HotelRoomListPage({ group, conditions, onBack, onSelectRate, onConditionsChange, standalone }: Props) {
  const [showAll, setShowAll] = useState(false);

  /** 적용된 검색 조건 (초기값 = 진입 조건, Select 재검색 시 갱신) */
  const [conds, setConds] = useState<SearchConditions>(conditions);
  /** 조건 바 편집값 (Select 전까지는 요금에 미반영) */
  const [ci, setCi] = useState(conditions.check_in ?? '2026-08-20');
  const [nights, setNights] = useState(conditions.nights ?? 1);
  /** 룸별 인원 구성 — Rooms 변경 시 룸이 추가/제거되고 룸마다 ADT/CHD(아동 나이) 편집 */
  const [roomCfg, setRoomCfg] = useState<RoomCfg[]>(() => cfgFromConditions(conditions));
  const co = addDays(ci, nights);

  const setRooms = (n: number) => {
    setRoomCfg((prev) => {
      const next = [...prev];
      while (next.length < n) next.push({ adt: 2, chd: 0, ages: [] });
      return next.slice(0, n);
    });
  };
  const setRoom = (i: number, patch: Partial<RoomCfg>) => {
    setRoomCfg((prev) =>
      prev.map((r, idx) => {
        if (idx !== i) return r;
        const merged = { ...r, ...patch };
        while (merged.ages.length < merged.chd) merged.ages.push(1);
        merged.ages = merged.ages.slice(0, merged.chd);
        return merged;
      }),
    );
  };

  const applyConditions = () => {
    const next: SearchConditions = {
      ...conds,
      check_in: ci,
      check_out: co,
      nights,
      rooms: roomCfg.length,
      adults: roomCfg.reduce((s, r) => s + r.adt, 0),
      children: roomCfg.reduce((s, r) => s + r.chd, 0),
    };
    setConds(next);
    onConditionsChange?.(next);
  };
  const resetConditions = () => {
    setCi(conds.check_in ?? '2026-08-20');
    setNights(conds.nights ?? 1);
    setRoomCfg(cfgFromConditions(conds));
  };

  // 지목 호텔의 전체 요금제 재생성 (target 흐름) — 조건 재검색 시 갱신
  const rates = useMemo(() => {
    const { results } = buildCityResults(nextSearchId(), {
      ...conds,
      hotel_name: group.hotel_name,
    });
    return results.length > 0 ? results : group.rates;
  }, [group, conds]);

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

      {/* 조건 바 — 검색 후에도 변경 가능 (실사이트 동일: 변경 → Select 재검색) */}
      <div className="mt-3 rounded border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs text-slate-700">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium">
            Check-in <b className="text-rose-500">*</b>
          </span>
          <DatePicker value={ci} onChange={(v) => v && setCi(v)} className="w-32" />
          <span className="font-medium">
            Check-out <b className="text-rose-500">*</b>
          </span>
          <DatePicker
            value={co}
            onChange={(v) => {
              if (v && v > ci) setNights(diffNights(ci, v));
            }}
            className="w-32"
          />
          <select value={nights} onChange={(e) => setNights(Number(e.target.value))} className={barSelect}>
            {Array.from({ length: 14 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n} Nights</option>
            ))}
          </select>
          <span className="text-slate-600">Night</span>
          <span className="ml-auto flex gap-1.5">
            <button
              type="button"
              onClick={applyConditions}
              className="rounded bg-brand-500 px-4 py-1.5 font-semibold text-white hover:bg-brand-600"
            >
              Select
            </button>
            <button
              type="button"
              onClick={resetConditions}
              className="rounded border border-slate-300 bg-white px-4 py-1.5 text-slate-600 hover:bg-slate-50"
            >
              Reset
            </button>
          </span>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-3">
          <span className="font-medium">
            Rooms <b className="text-rose-500">*</b>
          </span>
          <select value={roomCfg.length} onChange={(e) => setRooms(Number(e.target.value))} className={barSelect}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          {roomCfg.map((r, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="text-slate-600">Room {i + 1}</span>
              <select value={r.adt} onChange={(e) => setRoom(i, { adt: Number(e.target.value) })} className={barSelect}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>ADT {n}</option>
                ))}
              </select>
              <select value={r.chd} onChange={(e) => setRoom(i, { chd: Number(e.target.value) })} className={barSelect}>
                {[0, 1, 2, 3].map((n) => (
                  <option key={n} value={n}>CHD {n}</option>
                ))}
              </select>
              {r.ages.map((age, ai) => (
                <select
                  key={ai}
                  value={age}
                  onChange={(e) =>
                    setRoom(i, { ages: r.ages.map((a, x) => (x === ai ? Number(e.target.value) : a)) })
                  }
                  className={barSelect}
                >
                  {Array.from({ length: 17 }, (_, x) => x + 1).map((y) => (
                    <option key={y} value={y}>{y}years old</option>
                  ))}
                </select>
              ))}
            </span>
          ))}
        </div>
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

      {/* Photo — 호텔별 결정론적 갤러리 (데모용 실사진) */}
      <h4 className="mt-5 text-sm font-bold text-slate-900">Photo</h4>
      <div className="mt-2 flex flex-wrap gap-3 rounded border border-slate-200 p-4">
        {Array.from({ length: content.photoCount }, (_, i) => (
          <HotelPhoto
            key={i}
            hotelId={group.hotel_id}
            alt={`${group.hotel_name} photo ${i + 1}`}
            variant={i}
            width={288}
            height={192}
            className="h-24 w-36 rounded"
          />
        ))}
      </div>
    </div>
  );
}
