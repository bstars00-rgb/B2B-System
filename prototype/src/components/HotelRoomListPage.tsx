import { useEffect, useState } from 'react';
import type { HotelGroup, RateResult, SearchConditions } from '../types';
import { buildCityResults, hotelContentOf } from '../mocks/hotelDb';
import { nextSearchId } from '../mocks';
import { formatDateTime } from '../utils/format';
import { allSameOccupancy, cfgFromConditions, cfgLabel, type RoomCfg } from '../utils/roomConfig';
import DatePicker from './DatePicker';
import EnhBadge from './EnhBadge';
import HotelPhoto from './HotelPhoto';

interface Props {
  group: HotelGroup;
  conditions: SearchConditions;
  onBack: () => void;
  /** 예약 진행 — 룸 슬롯에 담긴 요금들(단일 객실이면 1개)로 Create Hotel Booking 모달 오픈 */
  onProceed: (rates: RateResult[]) => void;
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

const barSelect =
  'rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-brand-400 focus:outline-none';

/**
 * 실제 포털 호텔 룸리스트 화면 클론 (/hotel/room/list/...).
 * 호텔 헤더 → 조건 바(검색 후에도 체크인/아웃·Nights·Rooms·인원 변경 → Select 재검색) →
 * 요금제 테이블(Billing Curr/Gross/Discount/Sum·취소정책·Select) →
 * Show more → 지도/호텔정보/Neighborhood → Description → Photo.
 *
 * 고도화 — 분리 예약(룸 슬롯): 객실 2개 이상이면 룸마다 **다른 상품**(룸타입·요금제·식사·취소정책)을
 * 담아 한 번에 예약한다. 이때 요금표는 **1실 단가**로 표기하고 슬롯 합계를 별도로 보여준다.
 * 기획: docs/plan/feature-split-room-booking.md
 */
export default function HotelRoomListPage({ group, conditions, onBack, onProceed, onConditionsChange, standalone }: Props) {
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
      child_ages: roomCfg.flatMap((r) => r.ages),
    };
    setConds(next);
    onConditionsChange?.(next);
  };
  const resetConditions = () => {
    setCi(conds.check_in ?? '2026-08-20');
    setNights(conds.nights ?? 1);
    setRoomCfg(cfgFromConditions(conds));
  };

  /** 적용 조건의 룸별 구성 (슬롯 = 이 배열의 각 룸) */
  const appliedCfgs = cfgFromConditions(conds);
  const roomCount = appliedCfgs.length;
  const splitMode = roomCount > 1;

  /** 룸 슬롯에 담긴 요금 (분리 예약) — 재검색 시 초기화 */
  const [slots, setSlots] = useState<(RateResult | null)[]>(() => Array(roomCount).fill(null));

  // 지목 호텔의 전체 요금제 재생성 (target 흐름) — 조건 재검색 시 갱신.
  // 실사이트 동작 재현: 요금 데이터 조회 지연 후 표시 (최초 진입·Select 재검색 공통)
  // ※ rooms:1로 조회해 **1실 단가**를 받는다 — 혼합 구성은 배수 계산이 성립하지 않으므로
  //   슬롯에 담긴 단가의 합으로 총액을 만든다 (기획 §4.1).
  const [rates, setRates] = useState<RateResult[]>([]);
  const [loadingRates, setLoadingRates] = useState(true);
  useEffect(() => {
    setLoadingRates(true);
    setSlots(Array(Math.max(1, conds.rooms ?? 1)).fill(null));
    const t = window.setTimeout(() => {
      const { results } = buildCityResults(nextSearchId(), {
        ...conds,
        rooms: 1,
        hotel_name: group.hotel_name,
      });
      setRates(results.length > 0 ? results : group.rates);
      setLoadingRates(false);
    }, 1000 + Math.random() * 900);
    return () => window.clearTimeout(t);
  }, [group, conds]);

  const assignSlot = (i: number, rate: RateResult) =>
    setSlots((prev) => prev.map((s, x) => (x === i ? rate : s)));
  const clearSlot = (i: number) => setSlots((prev) => prev.map((s, x) => (x === i ? null : s)));
  const assignAll = (rate: RateResult) => setSlots((prev) => prev.map(() => rate));

  const slotTotal = slots.reduce((sum, s) => sum + (s ? s.selling_price + s.tax : 0), 0);
  const allFilled = slots.length > 0 && slots.every(Boolean);
  const quickFill = splitMode && allSameOccupancy(appliedCfgs);

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
            minDate={addDays(ci, 1)}
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
              disabled={loadingRates}
              className="rounded bg-brand-500 px-4 py-1.5 font-semibold text-white hover:bg-brand-600 disabled:cursor-wait disabled:opacity-60"
            >
              {loadingRates ? 'Searching…' : 'Select'}
            </button>
            <button
              type="button"
              onClick={resetConditions}
              disabled={loadingRates}
              className="rounded border border-slate-300 bg-white px-4 py-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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

      {/* ── 룸 슬롯 바 (분리 예약) — 객실 2개 이상일 때만 ── */}
      {splitMode && !loadingRates && (
        <div className="mt-3 rounded border border-violet-200 bg-violet-50/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-slate-800">룸 구성</span>
            <EnhBadge note="분리 예약 — 룸마다 다른 룸타입·요금제를 담아 한 번에 예약 (원본은 전 객실 동일 상품만 가능)" />
            <span className="text-[11px] text-slate-500">
              아래 요금표에서 각 룸에 담아주세요 · 요금은 <b>1실 단가</b>입니다
            </span>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-2">
            {slots.map((s, i) => (
              <div
                key={i}
                className={`flex min-w-[240px] flex-1 items-center justify-between gap-3 rounded border px-3 py-2 ${
                  s ? 'border-brand-300 bg-white' : 'border-dashed border-slate-300 bg-white/60'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500">
                    Room {i + 1} · {cfgLabel(appliedCfgs[i])}
                  </p>
                  {s ? (
                    <>
                      <p className="truncate text-[13px] font-bold text-slate-900">{s.room_type_name}</p>
                      <p className="truncate text-[11px] text-slate-500">
                        {s.rate_plan_name} · {s.meal_plan} ·{' '}
                        {s.cancellation_deadline ? (
                          <span className="text-slate-600">무료취소</span>
                        ) : (
                          <span className="font-semibold text-rose-600">환불불가</span>
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="text-[12px] italic text-slate-400">비어 있음 — 요금을 담아주세요</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {s && (
                    <>
                      <span className="text-[13px] font-bold text-slate-800">
                        {nf.format(s.selling_price + s.tax)}
                      </span>
                      <button
                        type="button"
                        aria-label={`Room ${i + 1} 비우기`}
                        onClick={() => clearSlot(i)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center justify-end gap-3">
            <span className="text-[12px] text-slate-600">
              합계{' '}
              <b className="text-[15px] text-slate-900">
                {rates[0]?.currency ?? ''} {nf.format(slotTotal)}
              </b>
            </span>
            <button
              type="button"
              disabled={!allFilled}
              onClick={() => onProceed(slots.filter((s): s is RateResult => Boolean(s)))}
              className="rounded bg-brand-500 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              title={allFilled ? '예약서 작성' : '모든 룸에 요금을 담아주세요'}
            >
              Create Booking
            </button>
          </div>
          {!allFilled && (
            <p className="mt-1 text-right text-[11px] text-slate-400">
              {slots.map((s, i) => (s ? null : `Room ${i + 1}`)).filter(Boolean).join(', ')} 을(를) 선택해 주세요
            </p>
          )}
        </div>
      )}

      {/* 요금제 테이블 */}
      <div className="mt-3 overflow-x-auto rounded border border-slate-200">
        <table className="w-full min-w-[860px] text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <th className="px-4 py-2.5 text-left font-semibold" />
              <th className="px-3 py-2.5 font-semibold">Billing Curr.</th>
              <th className="px-3 py-2.5 font-semibold">Billing Gross</th>
              <th className="px-3 py-2.5 font-semibold">Billing Discount</th>
              <th className="px-3 py-2.5 font-semibold">
                Billing Sum{splitMode && <span className="ml-1 font-normal text-[10px] text-violet-600">(1실 단가)</span>}
              </th>
              <th className="px-3 py-2.5 font-semibold">Cancellation policy</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {loadingRates && (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-500" />
                  <p className="text-xs font-medium text-slate-500">Searching…</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">요금 데이터를 조회하고 있습니다</p>
                </td>
              </tr>
            )}
            {!loadingRates && visibleRates.map((r) => {
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
                    {splitMode ? (
                      /* 분리 예약 — 룸 슬롯에 담기 */
                      <div className="flex flex-wrap justify-center gap-1">
                        {slots.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => assignSlot(i, r)}
                            title={`Room ${i + 1}(${cfgLabel(appliedCfgs[i])})에 담기`}
                            className={`rounded border px-2 py-1 text-[11px] font-medium ${
                              s?.rate_plan_id === r.rate_plan_id
                                ? 'border-brand-500 bg-brand-50 font-bold text-brand-600'
                                : 'border-slate-300 text-slate-600 hover:border-brand-400 hover:text-brand-600'
                            }`}
                          >
                            Room {i + 1}
                          </button>
                        ))}
                        {quickFill && (
                          <button
                            type="button"
                            onClick={() => assignAll(r)}
                            title="모든 룸에 이 요금 담기 (같은 방 N개 예약)"
                            className="rounded border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-brand-400 hover:text-brand-600"
                          >
                            전체
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onProceed([r])}
                        className="rounded border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 hover:border-brand-400 hover:text-brand-600"
                      >
                        Select
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loadingRates && rates.length > 4 && (
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
