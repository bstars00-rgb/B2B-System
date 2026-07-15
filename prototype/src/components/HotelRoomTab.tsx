import { useMemo, useState } from 'react';
import type { Booking, RateResult, SearchConditions } from '../types';
import { buildCityResults, hotelByCode } from '../mocks/hotelDb';
import { nextSearchId } from '../mocks';
import { groupByHotel } from '../utils/group';
import { addBooking, buildBooking } from '../utils/bookingStore';
import CreateBookingModal from './CreateBookingModal';
import HotelRoomListPage from './HotelRoomListPage';

interface Props {
  /** 호텔 코드 (?hotel=155719) */
  code: string;
  /** 검색 조건 쿼리 파라미터 (ci·co·nights·rooms·adt·chd) */
  params: URLSearchParams;
}

/**
 * Select 클릭 시 새 탭으로 열리는 호텔 룸리스트 페이지 (실사이트 프로세스 재현).
 * 원래 탭의 검색 결과는 그대로 남아 다른 호텔을 계속 비교·검색할 수 있다.
 * 여기서 생성한 예약은 localStorage로 공유되어 원래 탭 Bookings에 즉시 반영된다.
 */
export default function HotelRoomTab({ code, params }: Props) {
  const hotel = hotelByCode(code);

  /** 검색 조건 — 진입 시 쿼리 파라미터로 초기화, 룸리스트 조건 바에서 변경(재검색) 가능 */
  const [conditions, setConditions] = useState<SearchConditions | null>(() => {
    if (!hotel) return null;
    const nights = Number(params.get('nights') ?? '1') || 1;
    return {
      raw_query: `[Hotel Room List] ${hotel.hotelName}`,
      destination: hotel.destination,
      hotel_name: hotel.hotelName,
      check_in: params.get('ci') ?? '2026-08-20',
      check_out: params.get('co') ?? '2026-08-21',
      nights,
      adults: Number(params.get('adt') ?? '2') || 2,
      children: Number(params.get('chd') ?? '0') || 0,
      rooms: Number(params.get('rooms') ?? '1') || 1,
      star_rating: null,
      breakfast_included: null,
      free_cancellation_only: null,
      budget_max: null,
      budget_currency: 'KRW',
      near_station: null,
    };
  });

  const group = useMemo(() => {
    if (!conditions) return null;
    const { results } = buildCityResults(nextSearchId(), conditions);
    return groupByHotel(results)[0] ?? null;
  }, [conditions]);

  const [bookingRate, setBookingRate] = useState<RateResult | null>(null);
  const [created, setCreated] = useState<Booking | null>(null);

  if (!hotel || !conditions || !group) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 text-slate-600">
        <p className="text-sm font-semibold">호텔을 찾을 수 없습니다 (Code: {code})</p>
        <button
          type="button"
          onClick={() => window.close()}
          className="mt-4 rounded border border-slate-300 bg-white px-4 py-1.5 text-xs hover:bg-slate-50"
        >
          ✕ Close
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-white text-slate-900">
      {/* 새 탭 상단 바 — 포털 로고 + 닫기 */}
      <header className="flex h-[46px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
        <span className="text-[13px] font-extrabold tracking-wide text-slate-700">
          OHMYHOTEL<span className="text-brand-500">&amp;CO</span>
          <span className="ml-3 text-[11px] font-medium text-slate-400">Hotel Room List</span>
        </span>
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:border-brand-400 hover:text-brand-600"
        >
          ✕ Close
        </button>
      </header>

      <HotelRoomListPage
        group={group}
        conditions={conditions}
        standalone
        onBack={() => window.close()}
        onSelectRate={setBookingRate}
        onConditionsChange={setConditions}
      />

      {/* Create Hotel Booking 모달 — 생성 시 localStorage 공유 (원래 탭 Bookings 반영) */}
      <CreateBookingModal
        rate={bookingRate}
        conditions={conditions}
        onClose={() => setBookingRate(null)}
        onCreate={(travelerName) => {
          if (!bookingRate) return;
          const booking = buildBooking(bookingRate, conditions, travelerName);
          addBooking(booking);
          setBookingRate(null);
          setCreated(booking);
        }}
      />

      {/* 생성 완료 안내 */}
      {created && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50">
          <div className="w-[420px] overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-center text-sm font-bold text-slate-800">
              Booking Created
            </div>
            <div className="px-6 py-5 text-center text-[13px] text-slate-700">
              <p className="font-semibold text-emerald-600">✓ 예약이 생성되었습니다.</p>
              <p className="mt-2">
                ELLIS Booking Code <b>{created.ellis_code}</b>
                <br />
                Seller Booking Code <b>{created.seller_code}</b>
              </p>
              <p className="mt-2 text-[11px] text-slate-400">
                원래 탭의 Bookings 목록에 자동 반영됩니다. 이 창은 닫아도 됩니다.
              </p>
            </div>
            <div className="flex justify-center gap-2 pb-5">
              <button
                type="button"
                onClick={() => window.close()}
                className="rounded bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
              >
                ✕ Close this tab
              </button>
              <button
                type="button"
                onClick={() => setCreated(null)}
                className="rounded border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                계속 보기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
