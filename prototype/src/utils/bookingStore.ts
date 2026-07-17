import type { Booking, BookingRoom, RateResult, SearchConditions } from '../types';
import { SEED_BOOKINGS } from '../mocks/seedBookings';

/**
 * 예약 목록 localStorage 영속 스토어.
 * - 새로고침 후에도 예약이 유지되고, 새 탭(호텔 룸리스트 페이지)에서 생성한 예약이
 *   'storage' 이벤트로 원래 탭의 Bookings 목록에 즉시 반영된다.
 * - 데이터 접근을 이 모듈로 일원화 — 추후 ELLIS API 연동 시 이 계층만 교체.
 */

const BOOKINGS_KEY = 'omh_bookings';
const SEQ_KEY = 'omh_booking_seq';
export const AUTH_KEY = 'omh_auth';

export function loadBookings(): Booking[] {
  try {
    const raw = localStorage.getItem(BOOKINGS_KEY);
    if (!raw) return SEED_BOOKINGS;
    const parsed = JSON.parse(raw) as Booking[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_BOOKINGS;
  } catch {
    return SEED_BOOKINGS;
  }
}

export function saveBookings(bookings: Booking[]): void {
  try {
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
  } catch {
    // 저장 실패(용량 등) 시 세션 메모리로만 동작
  }
}

/** 다른 탭의 예약 변경 구독 — 해제 함수 반환 */
export function subscribeBookings(onChange: (bookings: Booking[]) => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === BOOKINGS_KEY) onChange(loadBookings());
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

/** 예약 코드 일련번호 — 탭 간 공유 (기존 세션 시작값 3 유지) */
function nextSeq(): number {
  let seq = 3;
  try {
    seq = Number(localStorage.getItem(SEQ_KEY) ?? '3');
    if (!Number.isFinite(seq) || seq < 3) seq = 3;
  } catch {
    // localStorage 접근 불가 시 기본값
  }
  const next = seq + 1;
  try {
    localStorage.setItem(SEQ_KEY, String(next));
  } catch {
    // 무시
  }
  return next;
}

/** 룸타입별 개수 요약 — "Twin[2]" · 혼합이면 "Twin[1] + Suite[1]" (Bookings 그리드 Room Type/Count) */
export function summarizeRooms(rooms: BookingRoom[]): string {
  const counts = new Map<string, number>();
  rooms.forEach((r) => counts.set(r.room_type, (counts.get(r.room_type) ?? 0) + 1));
  return [...counts.entries()].map(([type, n]) => `${type}[${n}]`).join(' + ');
}

/**
 * 요금·조건으로 예약 객체 생성 (ELLIS/Seller 코드 발번) — AI 검색·Create Booking·새 탭 공용.
 *
 * 분리 예약(A안: 1코드 + N룸): `rates`에 룸별 요금을 담으면 예약 1건에 룸 명세가 함께 저장된다.
 * - 청구액 = 룸별 합
 * - 취소 마감 = **하나라도 환불불가면 예약 전체가 환불불가(null)**, 아니면 가장 이른 마감
 *   (취소는 예약 전체 단위 — 부분 취소 미지원 정책. feature-split-room-booking.md §5 참조)
 */
export function buildBooking(
  rates: RateResult[],
  conditions: SearchConditions | null,
  travelerName: string,
): Booking {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const ymd = `${String(now.getFullYear()).slice(-2)}${p(now.getMonth() + 1)}${p(now.getDate())}`;
  const seq = nextSeq();
  const first = rates[0];
  const split = rates.length > 1;

  const rooms: BookingRoom[] = rates.map((r) => ({
    room_type: r.room_type_name,
    rate_plan_name: r.rate_plan_name,
    meal_plan: r.meal_plan,
    sum_amt: r.selling_price + r.tax,
    cancellation_deadline: r.cancellation_deadline,
  }));

  // 취소 마감 합성: 환불불가 룸이 하나라도 있으면 전체 환불불가, 아니면 가장 이른 마감
  const anyNonRefundable = rooms.some((r) => r.cancellation_deadline === null);
  const earliestDl = anyNonRefundable
    ? null
    : rooms
        .map((r) => r.cancellation_deadline)
        .filter((d): d is string => Boolean(d))
        .sort()[0] ?? null;

  return {
    ellis_code: `J${ymd}1${String(seq).padStart(4, '0')}H01`,
    seller_code: `ATTIC20${ymd}${String(seq).padStart(4, '0')}`,
    booking_date: now.toISOString(),
    status: 'Confirmed',
    payment_status: 'Unpaid',
    hotel_id: first.hotel_id,
    hotel_name: first.hotel_name,
    region: first.destination,
    check_in: conditions?.check_in ?? '2026-08-20',
    check_out: conditions?.check_out ?? '2026-08-22',
    nights: first.total_nights,
    room_type: split ? rooms.map((r) => r.room_type).join(' + ') : first.room_type_name,
    room_count: split ? rooms.length : (conditions?.rooms ?? first.total_rooms),
    traveler_name: travelerName,
    travelers: (conditions?.adults ?? 2) + (conditions?.children ?? 0),
    currency: first.currency,
    sum_amt: rooms.reduce((s, r) => s + r.sum_amt, 0),
    client_cancel_dl: split ? earliestDl : first.cancellation_deadline,
    cancel_date: null,
    rooms: split ? rooms : undefined,
  };
}

/** 예약 1건 추가 후 저장된 전체 목록 반환 (새 탭에서 사용) */
export function addBooking(booking: Booking): Booking[] {
  const next = [booking, ...loadBookings()];
  saveBookings(next);
  return next;
}
