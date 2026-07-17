import type { Booking } from '../types';
import { cityOfHotel } from '../mocks/hotelDb';

/**
 * 대시보드 집계 — 전부 Bookings(예약 200건)에서 파생시킨다.
 *
 * 화면에 고정 수치를 적어두면 예약 데이터를 고치는 순간 어긋나고, 셀러가 Bookings 목록과
 * 대시보드를 나란히 놓고 보면 바로 들통난다. 그래서 KPI·차트·표의 모든 숫자가 이 파일을 거친다.
 *
 * 집계 기준일(Booking/Check-in/Check-out)과 기간 셀렉트도 여기서 실제로 동작한다.
 */

export type DateBasis = 'Booking Date' | 'Check-in Date' | 'Check-out Date';

export const DATE_BASES: DateBasis[] = ['Booking Date', 'Check-in Date', 'Check-out Date'];
export const PERIODS = [
  'This Month',
  'Last Month',
  'Last 30 Days',
  'This Quarter',
  'Last Quarter',
  'This Year',
  'Custom',
] as const;
export type Period = (typeof PERIODS)[number];

/** 목적지 파이 색상 — 원본 명세 팔레트(선두 색만 우리 브랜드 오렌지로 교체) */
export const DEST_COLORS = [
  '#EF7F29', '#FF8C00', '#0369A1', '#009505', '#7C3AED',
  '#F59E0B', '#EC4899', '#6366F1', '#0891B2', '#94A3B8',
];

const CANCEL_COLORS: Record<string, string> = {
  'Change of plans': '#EF7F29',
  'Guest cancelled': '#FF8C00',
  'Found better option': '#0369A1',
  'Date change needed': '#009505',
  'Duplicate booking': '#7C3AED',
};

/* ────────────── 날짜 유틸 ────────────── */

const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
const addDays = (s: string, n: number) => iso(new Date(new Date(`${s}T00:00:00Z`).getTime() + n * 86400000));

export function todayIso(): string {
  return iso(new Date());
}

/** 예약에서 집계 기준일 추출 */
export function dateOf(b: Booking, basis: DateBasis): string {
  if (basis === 'Check-in Date') return b.check_in;
  if (basis === 'Check-out Date') return b.check_out;
  return b.booking_date.slice(0, 10);
}

export interface Range {
  from: string;
  to: string;
  /** 델타 비교 대상 구간 */
  prevFrom: string;
  prevTo: string;
  label: string;
}

/**
 * 기간 프리셋 → 조회 구간 + 비교 구간.
 *
 * 진행 중인 기간(This Month/Quarter/Year)은 **같은 경과일끼리** 비교한다.
 * 7월 17일에 '이번 달 전체 vs 지난달 전체'를 비교하면 남은 2주 때문에 항상 마이너스로 보인다.
 */
export function periodRange(period: Period, today: string, customFrom: string, customTo: string): Range {
  const d = new Date(`${today}T00:00:00Z`);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const q = Math.floor(m / 3);

  const elapsed = (start: Date) => Math.round((d.getTime() - start.getTime()) / 86400000);

  switch (period) {
    case 'This Month': {
      const start = utc(y, m, 1);
      const prevStart = utc(y, m - 1, 1);
      return {
        from: iso(start),
        to: today,
        prevFrom: iso(prevStart),
        prevTo: iso(new Date(prevStart.getTime() + elapsed(start) * 86400000)),
        label: 'vs 지난달 같은 기간',
      };
    }
    case 'Last Month': {
      const start = utc(y, m - 1, 1);
      return {
        from: iso(start),
        to: iso(utc(y, m, 0)),
        prevFrom: iso(utc(y, m - 2, 1)),
        prevTo: iso(utc(y, m - 1, 0)),
        label: 'vs 2개월 전',
      };
    }
    case 'Last 30 Days':
      return {
        from: addDays(today, -29),
        to: today,
        prevFrom: addDays(today, -59),
        prevTo: addDays(today, -30),
        label: 'vs 이전 30일',
      };
    case 'This Quarter': {
      const start = utc(y, q * 3, 1);
      const prevStart = utc(y, (q - 1) * 3, 1);
      return {
        from: iso(start),
        to: today,
        prevFrom: iso(prevStart),
        prevTo: iso(new Date(prevStart.getTime() + elapsed(start) * 86400000)),
        label: 'vs 지난 분기 같은 기간',
      };
    }
    case 'Last Quarter': {
      const start = utc(y, (q - 1) * 3, 1);
      return {
        from: iso(start),
        to: iso(utc(y, q * 3, 0)),
        prevFrom: iso(utc(y, (q - 2) * 3, 1)),
        prevTo: iso(utc(y, (q - 1) * 3, 0)),
        label: 'vs 2개 분기 전',
      };
    }
    case 'This Year': {
      const start = utc(y, 0, 1);
      const prevStart = utc(y - 1, 0, 1);
      return {
        from: iso(start),
        to: today,
        prevFrom: iso(prevStart),
        prevTo: iso(new Date(prevStart.getTime() + elapsed(start) * 86400000)),
        label: 'vs 작년 같은 기간',
      };
    }
    default: {
      const span = Math.max(
        1,
        Math.round(
          (new Date(`${customTo}T00:00:00Z`).getTime() - new Date(`${customFrom}T00:00:00Z`).getTime()) / 86400000,
        ) + 1,
      );
      return {
        from: customFrom,
        to: customTo,
        prevFrom: addDays(customFrom, -span),
        prevTo: addDays(customFrom, -1),
        label: `vs 직전 ${span}일`,
      };
    }
  }
}

/* ────────────── 기본 집계 ────────────── */

export function inRange(b: Booking, basis: DateBasis, from: string, to: string): boolean {
  const d = dateOf(b, basis);
  return d >= from && d <= to;
}

const confirmed = (list: Booking[]) => list.filter((b) => b.status === 'Confirmed');
const roomNights = (b: Booking) => b.nights * b.room_count;

const sum = (list: Booking[], f: (b: Booking) => number) => list.reduce((s, b) => s + f(b), 0);

/** 증감률 — 비교 대상이 0이면 표기하지 않는다(0에서 늘어난 걸 %로 쓰면 무한대) */
function delta(curr: number, prev: number): string | undefined {
  if (!prev) return undefined;
  const pct = ((curr - prev) / prev) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

export interface Kpi {
  totalBookings: number;
  revenue: number;
  roomNights: number;
  avgBookingValue: number;
  bookingsChange?: string;
  revenueChange?: string;
  nightsChange?: string;
  avgChange?: string;
}

/** 확정 예약 기준 4 KPI (취소는 매출에서 제외) */
export function computeKpi(bookings: Booking[], basis: DateBasis, r: Range): Kpi {
  const cur = confirmed(bookings.filter((b) => inRange(b, basis, r.from, r.to)));
  const prev = confirmed(bookings.filter((b) => inRange(b, basis, r.prevFrom, r.prevTo)));

  const mk = (list: Booking[]) => {
    const n = list.length;
    const rev = sum(list, (b) => b.sum_amt);
    return { n, rev, nights: sum(list, roomNights), avg: n ? Math.round(rev / n) : 0 };
  };
  const c = mk(cur);
  const p = mk(prev);

  return {
    totalBookings: c.n,
    revenue: c.rev,
    roomNights: c.nights,
    avgBookingValue: c.avg,
    bookingsChange: delta(c.n, p.n),
    revenueChange: delta(c.rev, p.rev),
    nightsChange: delta(c.nights, p.nights),
    avgChange: delta(c.avg, p.avg),
  };
}

/* ────────────── 시계열 ────────────── */

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `Apr-25` 형식 — 12개월을 걸치면 같은 월 이름이 두 번 나와 연도 없이는 구분이 안 된다 */
const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
const monthLabel = (d: Date) => `${MONTH_ABBR[d.getUTCMonth()]}-${String(d.getUTCFullYear()).slice(-2)}`;

/** 최근 n개월(이번 달 포함) 키·라벨 */
function lastMonths(today: string, n: number) {
  const d = new Date(`${today}T00:00:00Z`);
  const out: { key: string; label: string; long: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const m = utc(d.getUTCFullYear(), d.getUTCMonth() - i, 1);
    out.push({
      key: monthKey(m),
      label: monthLabel(m),
      long: `${MONTH_ABBR[m.getUTCMonth()]} ${m.getUTCFullYear()}`,
    });
  }
  return out;
}

/** 12개월 TTV — 확정 예약의 청구액 합계를 예약 월로 묶는다 */
export function ttvTrend(bookings: Booking[], basis: DateBasis, today: string) {
  const list = confirmed(bookings);
  return lastMonths(today, 12).map((m) => ({
    month: m.label,
    amount: sum(list.filter((b) => dateOf(b, basis).startsWith(m.key)), (b) => b.sum_amt),
  }));
}

export interface DailyRow {
  date: string;
  bookingCount: number;
  bookingAmount: number;
  nights: number;
}

/** 일별 시계열 — 예약이 없는 날도 0으로 채운다(빠뜨리면 그래프가 날짜를 건너뛴다) */
export function dailySeries(bookings: Booking[], basis: DateBasis, from: string, to: string): DailyRow[] {
  const acc = new Map<string, DailyRow>();
  for (let d = from; d <= to; d = addDays(d, 1)) acc.set(d, { date: d, bookingCount: 0, bookingAmount: 0, nights: 0 });

  for (const b of confirmed(bookings)) {
    const d = dateOf(b, basis);
    const row = acc.get(d);
    if (!row) continue;
    row.bookingCount += 1;
    row.bookingAmount += b.sum_amt;
    row.nights += roomNights(b);
  }
  return [...acc.values()];
}

/* ────────────── 목적지 ────────────── */

export interface DestRow {
  name: string;
  bookings: number;
  amount: number;
  nights: number;
  color: string;
}

/**
 * 목적지 집계 — 도시/국가는 예약의 `region` 문자열이 아니라 hotel_id로 조회한다.
 * (`region`은 생성 경로에 따라 한/영이 섞인다. hotelDb에 없는 호텔만 region으로 대체.)
 */
export function destinationStats(bookings: Booking[], view: 'country' | 'city', basis: DateBasis, r: Range): DestRow[] {
  const acc = new Map<string, { bookings: number; amount: number; nights: number }>();

  for (const b of confirmed(bookings.filter((x) => inRange(x, basis, r.from, r.to)))) {
    const city = cityOfHotel(b.hotel_id);
    const name = view === 'city' ? (city?.nameEn ?? b.region) : (city?.country ?? 'Others');
    const cur = acc.get(name) ?? { bookings: 0, amount: 0, nights: 0 };
    cur.bookings += 1;
    cur.amount += b.sum_amt;
    cur.nights += roomNights(b);
    acc.set(name, cur);
  }

  const rows = [...acc.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.bookings - a.bookings);

  /* 파이 조각이 너무 잘게 쪼개지면 읽을 수 없다 — 상위 8개만 남기고 나머지는 Others로 */
  const TOP = 8;
  const head = rows.slice(0, TOP);
  const tail = rows.slice(TOP);
  if (tail.length) {
    head.push({
      name: 'Others',
      bookings: tail.reduce((s, x) => s + x.bookings, 0),
      amount: tail.reduce((s, x) => s + x.amount, 0),
      nights: tail.reduce((s, x) => s + x.nights, 0),
    });
  }
  return head.map((x, i) => ({
    ...x,
    color: x.name === 'Others' ? '#94A3B8' : DEST_COLORS[i % DEST_COLORS.length],
  }));
}

/* ────────────── Data Center ────────────── */

export interface MonthlyBookingRow {
  month: string;
  confirmed: number;
  cancelled: number;
  deferredCredit: number;
}

/**
 * 월별 확정/취소/이연 — 예약일 기준(취소 건도 '언제 예약됐나'로 묶어야 취소율 분모가 맞는다).
 *
 * Deferred Credit: 확정됐지만 미수(Unpaid)인 예약 — 여신으로 나간 뒤 아직 정산되지 않은 건.
 * [확인 필요] 닷비즈의 실제 'Deferred Credit' 정의와 일치하는지 재무 확인 필요.
 */
export function monthlyBookingStats(bookings: Booking[], today: string, months = 6): MonthlyBookingRow[] {
  return lastMonths(today, months).map((m) => {
    const inMonth = bookings.filter((b) => b.booking_date.startsWith(m.key));
    return {
      month: m.long,
      confirmed: inMonth.filter((b) => b.status === 'Confirmed').length,
      cancelled: inMonth.filter((b) => b.status === 'Cancelled').length,
      deferredCredit: inMonth.filter((b) => b.status === 'Confirmed' && b.payment_status === 'Unpaid').length,
    };
  });
}

/** 취소율 = 취소 / (확정 + 취소) */
export function monthlyCancelRate(rows: MonthlyBookingRow[]) {
  return rows.map((m) => {
    const total = m.confirmed + m.cancelled;
    return {
      month: m.month,
      rate: total ? Number(((m.cancelled / total) * 100).toFixed(1)) : 0,
      count: m.cancelled,
    };
  });
}

/** 취소 사유 분포 — 최근 n개월 누적. 합계가 monthlyBookingStats의 취소 합계와 같다. */
export function cancelReasonStats(bookings: Booking[], today: string, months = 6) {
  const keys = new Set(lastMonths(today, months).map((m) => m.key));
  const acc = new Map<string, number>();
  for (const b of bookings) {
    if (b.status !== 'Cancelled' || !keys.has(b.booking_date.slice(0, 7))) continue;
    const reason = b.cancel_reason ?? 'Unspecified';
    acc.set(reason, (acc.get(reason) ?? 0) + 1);
  }
  return [...acc.entries()]
    .map(([reason, count]) => ({ reason, count, color: CANCEL_COLORS[reason] ?? '#94A3B8' }))
    .sort((a, b) => b.count - a.count);
}

export interface YearTotal {
  year: number;
  ytd: boolean;
  bookings: number;
  revenue: number;
  roomNights: number;
  /** 해당 연도에 예약 데이터가 아예 없음 */
  empty: boolean;
}

/**
 * 연간 비교 — 재작년/작년/올해.
 *
 * 예약 데이터가 2026-05부터라 이전 연도는 비어 있다. 비어 있는 걸 그리는 대신
 * empty로 표시해 화면에서 안내한다 — 없는 데이터를 지어내면 '실제 예약과 매칭'이 깨진다.
 */
export function yearEndStats(bookings: Booking[], today: string) {
  const thisYear = new Date(`${today}T00:00:00Z`).getUTCFullYear();
  const years = [thisYear - 2, thisYear - 1, thisYear];
  const list = confirmed(bookings);

  const monthly = MONTH_ABBR.map((month, m) => {
    const row: Record<string, string | number> = { month };
    years.forEach((y, i) => {
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      row[`y${i}`] = list.filter((b) => b.booking_date.startsWith(key)).length;
    });
    return row as { month: string; y0: number; y1: number; y2: number };
  });

  const totals: YearTotal[] = years.map((year) => {
    const inYear = list.filter((b) => b.booking_date.startsWith(String(year)));
    return {
      year,
      ytd: year === thisYear,
      bookings: inYear.length,
      revenue: sum(inYear, (b) => b.sum_amt),
      roomNights: sum(inYear, roomNights),
      empty: inYear.length === 0,
    };
  });

  return { years, monthly, totals };
}

/** 예약 데이터가 시작되는 달 — 그 이전 구간이 비어 보이는 이유를 화면에 밝히기 위한 값 */
export function dataStartMonth(bookings: Booking[]): string {
  if (!bookings.length) return '';
  return bookings.reduce((min, b) => (b.booking_date < min ? b.booking_date : min), bookings[0].booking_date).slice(0, 7);
}
