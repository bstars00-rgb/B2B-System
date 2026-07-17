import type { Booking, RateResult, SearchConditions } from '../types';
import { SEED_BOOKINGS } from '../mocks/seedBookings';

/**
 * 예약 목록 localStorage 영속 스토어.
 * - 새로고침 후에도 예약이 유지되고, 새 탭(호텔 룸리스트 페이지)에서 생성한 예약이
 *   'storage' 이벤트로 원래 탭의 Bookings 목록에 즉시 반영된다.
 * - 데이터 접근을 이 모듈로 일원화 — 추후 ELLIS API 연동 시 이 계층만 교체.
 */

const BOOKINGS_KEY = 'omh_bookings';
const SEQ_KEY = 'omh_booking_seq';
const SEED_VERSION_KEY = 'omh_seed_version';
export const AUTH_KEY = 'omh_auth';

/**
 * 시드 데이터 버전 — 올리면 저장된 예약을 새 시드로 교체한다.
 * 시드를 바꿔도 이미 방문한 브라우저는 localStorage의 옛 목록을 계속 읽어
 * (예: 예약 7건 시절 데이터) 대시보드가 텅 빈 것처럼 보였다.
 * v2: 예약 200건 + 대시보드 파생 (2026-07-17)
 */
const SEED_VERSION = '2';

export function loadBookings(): Booking[] {
  try {
    if (localStorage.getItem(SEED_VERSION_KEY) !== SEED_VERSION) {
      localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
      saveBookings(SEED_BOOKINGS);
      return SEED_BOOKINGS;
    }
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

/** 요금·조건으로 예약 객체 생성 (ELLIS/Seller 코드 발번) — AI 검색·Create Booking·새 탭 공용 */
export function buildBooking(
  rate: RateResult,
  conditions: SearchConditions | null,
  travelerName: string,
): Booking {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const ymd = `${String(now.getFullYear()).slice(-2)}${p(now.getMonth() + 1)}${p(now.getDate())}`;
  const seq = nextSeq();
  return {
    ellis_code: `J${ymd}1${String(seq).padStart(4, '0')}H01`,
    seller_code: `ATTIC20${ymd}${String(seq).padStart(4, '0')}`,
    booking_date: now.toISOString(),
    status: 'Confirmed',
    payment_status: 'Unpaid',
    hotel_id: rate.hotel_id,
    hotel_name: rate.hotel_name,
    region: rate.destination,
    check_in: conditions?.check_in ?? '2026-08-20',
    check_out: conditions?.check_out ?? '2026-08-22',
    nights: rate.total_nights,
    room_type: rate.room_type_name,
    room_count: conditions?.rooms ?? rate.total_rooms,
    traveler_name: travelerName,
    travelers: (conditions?.adults ?? 2) + (conditions?.children ?? 0),
    currency: rate.currency,
    sum_amt: rate.selling_price + rate.tax,
    client_cancel_dl: rate.cancellation_deadline,
    cancel_date: null,
  };
}

/** 예약 1건 추가 후 저장된 전체 목록 반환 (새 탭에서 사용) */
export function addBooking(booking: Booking): Booking[] {
  const next = [booking, ...loadBookings()];
  saveBookings(next);
  return next;
}
