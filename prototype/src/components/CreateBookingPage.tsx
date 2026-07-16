import { useEffect, useMemo, useRef, useState } from 'react';
import type { HotelGroup, SearchConditions } from '../types';
import {
  buildCityResults,
  cityEnOf,
  hotelCodeOf,
  hotelMetaOf,
  searchAutocomplete,
  type AutocompleteEntry,
} from '../mocks/hotelDb';
import { nextSearchId } from '../mocks';
import { groupByHotel } from '../utils/group';
import { formatMoney } from '../utils/format';
import DatePicker from './DatePicker';
import HotelPhoto from './HotelPhoto';

interface RoomCfg {
  adt: number;
  chd: number;
  ages: number[];
}

type SortKey = 'rec' | 'starAsc' | 'starDesc' | 'rateAsc' | 'rateDesc';

/** 페이지당 호텔 수 (실사이트 페이저 재현) */
const PAGE_SIZE = 10;

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function diffNights(ci: string, co: string): number {
  return Math.max(1, Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86400000));
}

const selectCls =
  'rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-brand-400 focus:outline-none';

/**
 * 실제 포털 Create Booking 화면 클론.
 * 목적지(지역/호텔) 자동완성(코드-이름, 한/영) → 날짜·Nights 연동 → 룸별 인원(아동 나이) → 검색 →
 * 좌측 필터(Rate 슬라이더·성급·Property Type·Hotel Chain Brand — 결과 기반) + 정렬 + 페이저 →
 * Select 시 새 탭으로 호텔 룸리스트 열림 (원래 검색 결과 유지 — 실사이트 프로세스).
 */
export default function CreateBookingPage() {
  // ── 검색 폼 상태 (실사이트: 첫 진입 시 Check In/Out 빈 상태) ──
  const [destQuery, setDestQuery] = useState('');
  const [entry, setEntry] = useState<AutocompleteEntry | null>(null);
  const [showAuto, setShowAuto] = useState(false);
  const [checkIn, setCheckIn] = useState('');
  const [nights, setNights] = useState(1);
  const [roomsCount, setRoomsCount] = useState(1);
  const [roomCfg, setRoomCfg] = useState<RoomCfg[]>([{ adt: 2, chd: 0, ages: [] }]);
  const [formError, setFormError] = useState<string | null>(null);
  const blurTimer = useRef<number | null>(null);

  const checkOut = checkIn ? addDays(checkIn, nights) : '';
  const autoItems = useMemo(() => (showAuto ? searchAutocomplete(destQuery) : []), [destQuery, showAuto]);

  // ── 결과 상태 ──
  const [searched, setSearched] = useState<{
    groups: HotelGroup[];
    conditions: SearchConditions;
  } | null>(null);
  /** 조회 중 (실사이트: 데이터 조회 지연) */
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<number | null>(null);
  useEffect(() => () => { if (searchTimer.current) window.clearTimeout(searchTimer.current); }, []);
  const [sort, setSort] = useState<SortKey>('rec');
  const [nameFilter, setNameFilter] = useState('');
  const [starSel, setStarSel] = useState<number[]>([]);
  const [typeSel, setTypeSel] = useState<string[]>([]);
  const [brandSel, setBrandSel] = useState<string[]>([]);
  const [rateMax, setRateMax] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const setRooms = (n: number) => {
    setRoomsCount(n);
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

  const runSearch = () => {
    if (!entry) {
      setFormError('Destination을 목록에서 선택해 주세요.');
      return;
    }
    if (!checkIn) {
      setFormError('Check In/Out 날짜를 선택해 주세요.');
      return;
    }
    setFormError(null);
    const conditions: SearchConditions = {
      raw_query: `[Create Booking] ${entry.label}`,
      destination: entry.destination,
      hotel_name: entry.hotel_name,
      check_in: checkIn,
      check_out: checkOut,
      nights,
      adults: roomCfg.reduce((s, r) => s + r.adt, 0),
      children: roomCfg.reduce((s, r) => s + r.chd, 0),
      rooms: roomsCount,
      star_rating: null,
      breakfast_included: null,
      free_cancellation_only: null,
      budget_max: null,
      budget_currency: 'KRW',
      near_station: null,
    };
    // 실사이트 동작 재현 — 공급사/ELLIS 요금 조회 지연 후 결과 표시
    setSearching(true);
    setSearched(null);
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      // 지역 검색은 상한 없이 전체 호텔 반환 (실사이트: "601 Properties" + 페이저)
      const { results } = buildCityResults(nextSearchId(), conditions, { maxHotels: 999, maxRates: 999 });
      const groups = groupByHotel(results);
      setSearched({ groups, conditions });
      setSort('rec');
      setNameFilter('');
      setStarSel([]);
      setTypeSel([]);
      setBrandSel([]);
      setRateMax(null);
      setPage(1);
      setSearching(false);
    }, 1300 + Math.random() * 1200);
  };

  // ── 필터·정렬 적용 ──
  const priceOf = (g: HotelGroup) => g.min_rate.selling_price + g.min_rate.tax;
  const priceBounds = useMemo(() => {
    if (!searched || searched.groups.length === 0) return { min: 0, max: 0 };
    const ps = searched.groups.map(priceOf);
    return { min: Math.min(...ps), max: Math.max(...ps) };
  }, [searched]);

  // ── 결과 기반 필터 옵션 (결과가 많을수록 필터값이 풍부해짐 — 실사이트 동작) ──
  const starOptions = useMemo(
    () => (searched ? [...new Set(searched.groups.map((g) => g.star_rating))].sort((a, b) => b - a) : []),
    [searched],
  );
  const typeOptions = useMemo(
    () => (searched ? [...new Set(searched.groups.map((g) => hotelMetaOf(g.hotel_id).propertyType))].sort() : []),
    [searched],
  );
  const brandOptions = useMemo(
    () => (searched ? [...new Set(searched.groups.map((g) => hotelMetaOf(g.hotel_id).chainBrand))].sort() : []),
    [searched],
  );

  const visibleGroups = useMemo(() => {
    if (!searched) return [];
    let list = [...searched.groups];
    if (nameFilter.trim())
      list = list.filter((g) => g.hotel_name.toLowerCase().includes(nameFilter.trim().toLowerCase()));
    if (starSel.length > 0) list = list.filter((g) => starSel.includes(g.star_rating));
    if (typeSel.length > 0) list = list.filter((g) => typeSel.includes(hotelMetaOf(g.hotel_id).propertyType));
    if (brandSel.length > 0) list = list.filter((g) => brandSel.includes(hotelMetaOf(g.hotel_id).chainBrand));
    if (rateMax !== null) list = list.filter((g) => priceOf(g) <= rateMax);
    switch (sort) {
      case 'starAsc': list.sort((a, b) => a.star_rating - b.star_rating); break;
      case 'starDesc': list.sort((a, b) => b.star_rating - a.star_rating); break;
      case 'rateAsc': list.sort((a, b) => priceOf(a) - priceOf(b)); break;
      case 'rateDesc': list.sort((a, b) => priceOf(b) - priceOf(a)); break;
      default: break;
    }
    return list;
  }, [searched, sort, nameFilter, starSel, typeSel, brandSel, rateMax]);

  // 필터·정렬 변경 시 1페이지로
  useEffect(() => {
    setPage(1);
  }, [sort, nameFilter, starSel, typeSel, brandSel, rateMax]);

  const pageCount = Math.max(1, Math.ceil(visibleGroups.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedGroups = visibleGroups.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  /** Select — 실사이트와 동일하게 새 탭으로 룸리스트 열기 (검색 결과는 이 탭에 유지) */
  const openHotelTab = (g: HotelGroup) => {
    if (!searched) return;
    const c = searched.conditions;
    const q = new URLSearchParams({
      hotel: hotelCodeOf(g.hotel_id),
      ci: c.check_in ?? '',
      co: c.check_out ?? '',
      nights: String(c.nights ?? 1),
      rooms: String(c.rooms ?? 1),
      adt: String(c.adults ?? 2),
      chd: String(c.children ?? 0),
    });
    window.open(`${window.location.pathname}?${q.toString()}`, '_blank');
  };

  const sortBtn = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => setSort(key)}
      className={`rounded border px-3 py-1.5 text-xs ${
        sort === key
          ? 'border-brand-400 bg-brand-50 font-semibold text-brand-600'
          : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="rounded-lg bg-white p-4 shadow-sm">
        {/* ── 검색 폼 (실제 포털 레이아웃) ── */}
        <div className="rounded border border-slate-200 bg-slate-50/50 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-medium text-slate-700">
              Destination <b className="text-rose-500">*</b>
            </label>
            <div className="relative">
              <div className="flex">
                <input
                  value={destQuery}
                  placeholder="Name or Code"
                  onChange={(e) => {
                    setDestQuery(e.target.value);
                    setEntry(null);
                    setShowAuto(true);
                  }}
                  onFocus={() => setShowAuto(true)}
                  onBlur={() => {
                    blurTimer.current = window.setTimeout(() => setShowAuto(false), 200);
                  }}
                  className="w-[340px] rounded-l border border-slate-300 px-3 py-1.5 text-xs placeholder:italic placeholder:text-slate-400 focus:border-brand-400 focus:outline-none"
                />
                <span className="flex items-center rounded-r border border-l-0 border-slate-300 bg-slate-500 px-2.5 text-white">
                  🔍
                </span>
              </div>
              {showAuto && autoItems.length > 0 && (
                <ul className="absolute left-0 top-full z-20 mt-0.5 max-h-56 w-[420px] overflow-y-auto rounded border border-slate-200 bg-white shadow-lg">
                  {autoItems.map((it) => (
                    <li key={`${it.type}-${it.code}`}>
                      <button
                        type="button"
                        onMouseDown={() => {
                          if (blurTimer.current) window.clearTimeout(blurTimer.current);
                          setEntry(it);
                          setDestQuery(it.label);
                          setShowAuto(false);
                        }}
                        className="block w-full border-b border-slate-100 px-3 py-2 text-left text-xs text-slate-600 last:border-b-0 hover:bg-slate-50"
                      >
                        {it.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <label className="ml-2 text-xs font-medium text-slate-700">
              Check In/Out <b className="text-rose-500">*</b>
            </label>
            <DatePicker value={checkIn} onChange={(v) => v && setCheckIn(v)} className="w-32" placeholder=" " />
            <span className="text-slate-400">~</span>
            <DatePicker
              value={checkOut}
              onChange={(v) => {
                if (v && checkIn && v > checkIn) setNights(diffNights(checkIn, v));
              }}
              className="w-32"
              placeholder=" "
            />
            <select
              value={nights}
              onChange={(e) => setNights(Number(e.target.value))}
              className={selectCls}
            >
              {Array.from({ length: 14 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="text-xs text-slate-600">Nights</span>

            <div className="ml-auto flex gap-1.5">
              <button
                type="button"
                onClick={runSearch}
                disabled={searching}
                className="rounded bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:cursor-wait disabled:opacity-60"
              >
                {searching ? 'Searching…' : 'Search'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDestQuery(''); setEntry(null); setSearched(null); setFormError(null);
                  setCheckIn(''); setNights(1);
                  setRooms(1); setRoomCfg([{ adt: 2, chd: 0, ages: [] }]);
                }}
                className="rounded border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Rooms 구성 */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="text-xs font-medium text-slate-700">
              Rooms <b className="text-rose-500">*</b>
            </label>
            <select value={roomsCount} onChange={(e) => setRooms(Number(e.target.value))} className={selectCls}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            {roomCfg.map((r, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="text-xs text-slate-600">Room {i + 1}</span>
                <select value={r.adt} onChange={(e) => setRoom(i, { adt: Number(e.target.value) })} className={selectCls}>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>ADT {n}</option>
                  ))}
                </select>
                <select value={r.chd} onChange={(e) => setRoom(i, { chd: Number(e.target.value) })} className={selectCls}>
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
                    className={selectCls}
                  >
                    {Array.from({ length: 17 }, (_, x) => x + 1).map((y) => (
                      <option key={y} value={y}>{y}years old</option>
                    ))}
                  </select>
                ))}
              </span>
            ))}
          </div>
          {formError && <p className="mt-2 text-xs text-rose-600">{formError}</p>}
        </div>

        {/* ── 결과 ── */}
        {searching ? (
          /* 실사이트 동작 재현 — 공급사/ELLIS 요금 조회 중 */
          <div className="px-6 py-24 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-500" />
            <p className="text-sm font-medium text-slate-600">Searching…</p>
            <p className="mt-1 text-xs text-slate-400">호텔·요금 데이터를 조회하고 있습니다. 잠시만 기다려 주세요.</p>
          </div>
        ) : !searched ? (
          <div className="px-6 py-24 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-400 text-2xl font-black text-white">!</div>
            <p className="text-sm text-slate-500">Please search for a hotel to reserve.</p>
          </div>
        ) : (
          <div className="mt-4 flex gap-4">
            {/* 좌측 필터 */}
            <aside className="w-[230px] shrink-0 rounded border border-slate-200 bg-slate-50/60 p-3">
              <h4 className="text-[13px] font-bold text-slate-800">Search by Property Name</h4>
              <input
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                placeholder="e.g. HIL"
                className="mt-2 w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs placeholder:italic placeholder:text-slate-400"
              />
              <h4 className="mt-5 text-[13px] font-bold text-slate-800">Filter By</h4>
              <div className="mt-2 border-b border-dashed border-slate-300 pb-3">
                <p className="text-xs font-semibold text-slate-700">Rate</p>
                <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                  <span>{formatMoney(priceBounds.min, searched.groups[0]?.min_rate.currency ?? 'KRW')}</span>
                  <span>{formatMoney(rateMax ?? priceBounds.max, searched.groups[0]?.min_rate.currency ?? 'KRW')}</span>
                </div>
                <input
                  type="range"
                  min={priceBounds.min}
                  max={priceBounds.max}
                  value={rateMax ?? priceBounds.max}
                  onChange={(e) => setRateMax(Number(e.target.value))}
                  className="mt-1 w-full accent-brand-500"
                />
              </div>
              <div className="border-b border-dashed border-slate-300 py-3">
                <p className="text-xs font-semibold text-slate-700">Star Rating</p>
                <label className="mt-1.5 flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={starSel.length === 0}
                    onChange={() => setStarSel([])}
                    className="accent-brand-500"
                  />
                  All
                </label>
                {starOptions.map((s) => (
                  <label key={s} className="mt-1.5 flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={starSel.includes(s)}
                      onChange={(e) =>
                        setStarSel((prev) => (e.target.checked ? [...prev, s] : prev.filter((x) => x !== s)))
                      }
                      className="accent-brand-500"
                    />
                    {s} Star
                  </label>
                ))}
              </div>
              <div className="border-b border-dashed border-slate-300 py-3">
                <p className="text-xs font-semibold text-slate-700">Property Type</p>
                <label className="mt-1.5 flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={typeSel.length === 0}
                    onChange={() => setTypeSel([])}
                    className="accent-brand-500"
                  />
                  All
                </label>
                {typeOptions.map((t) => (
                  <label key={t} className="mt-1.5 flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={typeSel.includes(t)}
                      onChange={(e) =>
                        setTypeSel((prev) => (e.target.checked ? [...prev, t] : prev.filter((x) => x !== t)))
                      }
                      className="accent-brand-500"
                    />
                    {t}
                  </label>
                ))}
              </div>
              {brandOptions.length > 0 && (
                <div className="py-3">
                  <p className="text-xs font-semibold text-slate-700">Hotel Chain Brand</p>
                  <label className="mt-1.5 flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={brandSel.length === 0}
                      onChange={() => setBrandSel([])}
                      className="accent-brand-500"
                    />
                    All
                  </label>
                  <div className="max-h-64 overflow-y-auto">
                    {brandOptions.map((b) => (
                      <label key={b} className="mt-1.5 flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={brandSel.includes(b)}
                          onChange={(e) =>
                            setBrandSel((prev) => (e.target.checked ? [...prev, b] : prev.filter((x) => x !== b)))
                          }
                          className="accent-brand-500"
                        />
                        <span className="min-w-0 flex-1 break-words">{b}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </aside>

            {/* 우측 결과 목록 */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-brand-500">{visibleGroups.length} Properties</span>
                <div className="flex flex-wrap gap-1.5">
                  {sortBtn('rec', 'Recommendation')}
                  {sortBtn('starAsc', 'Star Rating ▲')}
                  {sortBtn('starDesc', 'Star Rating ▼')}
                  {sortBtn('rateAsc', 'Rate ▲')}
                  {sortBtn('rateDesc', 'Rate ▼')}
                </div>
              </div>

              <div className="mt-3 space-y-3">
                {visibleGroups.length === 0 && (
                  <p className="rounded border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                    조건에 맞는 호텔이 없습니다 — 필터를 완화해 보세요.
                  </p>
                )}
                {pagedGroups.map((g) => (
                  <div key={g.hotel_id} className="flex items-center gap-4 rounded border border-slate-200 bg-white p-4">
                    <HotelPhoto
                      hotelId={g.hotel_id}
                      alt={g.hotel_name}
                      width={224}
                      height={160}
                      className="h-20 w-28 shrink-0 rounded"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-slate-500">
                        [Hotel Code : {hotelCodeOf(g.hotel_id)}]{' '}
                        <span className="font-medium text-amber-500">{g.star_rating} Star</span>
                      </p>
                      <h4 className="truncate text-sm font-bold text-slate-900">{g.hotel_name}</h4>
                      <p className="text-[11px] text-slate-500">◎ {cityEnOf(g.destination)}</p>
                    </div>
                    <div className="hidden text-xs text-slate-500 md:block">{g.min_rate.room_type_name}</div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-bold text-slate-900">
                        {formatMoney(priceOf(g), g.min_rate.currency)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openHotelTab(g)}
                      title="새 탭에서 룸리스트 열기 — 이 검색 결과는 유지됩니다 (실사이트 동일)"
                      className="shrink-0 rounded border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 hover:border-brand-400 hover:text-brand-600"
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>

              {/* 페이저 (실제 포털 형태 — 페이지 클릭 이동) */}
              <div className="mt-4 flex justify-center">
                <div className="flex overflow-hidden rounded border border-slate-200 text-xs">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage(safePage - 1)}
                    className="px-4 py-2 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    Previous
                  </button>
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={
                        n === safePage
                          ? 'bg-brand-500 px-4 py-2 font-bold text-white'
                          : 'px-4 py-2 text-slate-500 hover:bg-slate-50'
                      }
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={safePage >= pageCount}
                    onClick={() => setPage(safePage + 1)}
                    className="px-4 py-2 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <p className="mt-2 text-[10px] text-slate-400">
        실제 포털 Create Booking 화면 클론 (Mock Data) — 호텔 사진은 데모용 실사진, 지도는 자리 표시자입니다.
      </p>
    </div>
  );
}
