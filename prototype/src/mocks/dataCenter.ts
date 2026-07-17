/**
 * Data Center 목데이터 — 대시보드의 Booking / Cancellation / Year-End 탭.
 *
 * 원본 명세의 수치를 유지하되 기간을 오늘 기준으로 돌리고, 파생 가능한 값은 전부 파생시킨다.
 * (취소율·연간 합계를 손으로 적어두면 월별 값을 고칠 때 반드시 어긋난다.)
 *
 * Daily 탭은 별도 배열을 두지 않고 dashboard.ts의 dailyBookingStats를 함께 쓴다 —
 * 원본은 nights가 빠진 사본을 따로 갖고 있어 명세의 3개 지표를 다 못 보여줬다.
 */
import { JPY, MONTH_ABBR, THIS_MONTH, THIS_YEAR, kpi, monthLabelLong, seeded } from './dashboard';

/** 최근 6개월 확정/취소/이연 — 마지막 원소가 이번 달이고, 확정 건수는 kpi.totalBookings와 일치한다. */
const BOOKING_SHAPE = [
  { confirmed: 128, cancelled: 12, deferredCredit: 8 },
  { confirmed: 135, cancelled: 15, deferredCredit: 10 },
  { confirmed: 162, cancelled: 18, deferredCredit: 12 },
  { confirmed: 118, cancelled: 14, deferredCredit: 7 },
  { confirmed: 142, cancelled: 11, deferredCredit: 9 },
  { confirmed: kpi.totalBookings, cancelled: 16, deferredCredit: 11 },
];

export const monthlyBookingStats = BOOKING_SHAPE.map((v, i) => ({
  month: monthLabelLong(BOOKING_SHAPE.length - 1 - i),
  ...v,
}));

/** 취소율 = 취소 / (확정 + 취소) */
export const monthlyCancelRate = monthlyBookingStats.map((m) => ({
  month: m.month,
  rate: Number(((m.cancelled / (m.confirmed + m.cancelled)) * 100).toFixed(1)),
  count: m.cancelled,
}));

/** 취소 사유 분포 — 6개월 누적이라 합계가 monthlyBookingStats의 취소 합계와 같다. */
export const cancelReasons = [
  { reason: 'Change of plans', count: 32, color: '#EF7F29' },
  { reason: 'Guest cancelled', count: 24, color: '#FF8C00' },
  { reason: 'Found better option', count: 15, color: '#0369A1' },
  { reason: 'Date change needed', count: 10, color: '#009505' },
  { reason: 'Duplicate booking', count: 5, color: '#7C3AED' },
];

/* ── Year-End 비교 — 재작년 / 작년 / 올해(YTD) ── */
export const YEARS = [THIS_YEAR - 2, THIS_YEAR - 1, THIS_YEAR] as const;

const CONFIRMED_PREV2 = [95, 88, 102, 110, 125, 138, 152, 148, 130, 118, 108, 142];
const CONFIRMED_PREV1 = [108, 115, 128, 135, 142, 155, 168, 160, 145, 128, 135, 162];

/**
 * 올해 월별 확정 건수 — 이번 달까지만 채우고 이후는 0(아직 오지 않은 달).
 * 최근 6개월 구간은 monthlyBookingStats와 같은 값을 쓰고, 그 이전 달만 시드로 생성한다.
 */
const CONFIRMED_CURR = (() => {
  const rnd = seeded(THIS_YEAR);
  const arr: number[] = [];
  for (let m = 0; m <= THIS_MONTH; m++) {
    const back = THIS_MONTH - m;
    arr.push(
      back < BOOKING_SHAPE.length
        ? BOOKING_SHAPE[BOOKING_SHAPE.length - 1 - back].confirmed
        : Math.round(110 + rnd() * 60),
    );
  }
  while (arr.length < 12) arr.push(0);
  return arr;
})();

export const yearEndStats = MONTH_ABBR.map((month, m) => ({
  month,
  prev2: CONFIRMED_PREV2[m],
  prev1: CONFIRMED_PREV1[m],
  curr: CONFIRMED_CURR[m],
}));

/** 연평균 예약가·예약당 박수 — 원본 연간 합계에서 역산한 값 */
function yearTotal(year: number, series: number[], avgValueUsd: number, nightsPerBooking: number, ytd = false) {
  const bookings = series.reduce((s, v) => s + v, 0);
  return {
    year,
    ytd,
    bookings,
    revenue: Math.round(bookings * avgValueUsd * JPY),
    roomNights: Math.round(bookings * nightsPerBooking),
  };
}

export const yearTotals = [
  yearTotal(YEARS[0], CONFIRMED_PREV2, 291, 2.67),
  yearTotal(YEARS[1], CONFIRMED_PREV1, 305, 2.69),
  yearTotal(YEARS[2], CONFIRMED_CURR, 309, 2.69, true),
];
