import type { Booking } from '../types';
import { allHotels, toJpy } from './hotelDb';

/**
 * Bookings 초기 목데이터 — 총 200건.
 *
 * 대시보드가 이 배열에서 전부 파생되므로(utils/dashboardStats.ts), 여기 분포가 곧 통계다.
 * 손으로 쓴 앞의 7건은 상세 모달 데모용(투숙객 상세·특별요청·분쟁 필드)이라 그대로 두고,
 * 나머지는 실제 hotelDb 호텔·요금에서 생성한다 — 매출이 호텔 목록 요금과 같은 근거를 갖도록.
 *
 * 규칙 (2026-07-17 현업 지시):
 *   · 예약일은 2026-05-01 이후, 오늘을 넘지 않는다
 *   · 체크인은 예약일 이후 (5월 이후)
 *   · 난수는 시드 고정 — 새로고침·재빌드해도 같은 200건이어야 데모·QA가 재현된다
 */

/** 결정론적 PRNG (mulberry32) — Math.random을 쓰면 새로고침마다 통계가 바뀐다 */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HAND_WRITTEN: Booking[] = [
  {
    ellis_code: 'J26071210013H01', seller_code: 'ATTIC202607120004',
    booking_date: '2026-07-12T18:02:00', status: 'Confirmed', payment_status: 'Unpaid',
    hotel_id: 'HTL-OSA-04', hotel_name: 'Sotetsu Grand Fresa Osaka - Namba', region: 'Osaka',
    check_in: '2026-08-07', check_out: '2026-08-11', nights: 4,
    room_type: 'ECONOMY, DOUBLE BED', room_count: 1, traveler_name: 'Johanna', travelers: 2,
    currency: 'JPY', sum_amt: 39540, client_cancel_dl: '2026-08-04T17:00:00', cancel_date: null,
    travelers_detail: [
      { room: 1, gender: 'F', local: 'Johanna', lastEn: 'JOHANNA', firstEn: 'CATMUNAN' },
      { room: 1, gender: 'F', local: 'Lea', lastEn: 'LEA', firstEn: 'JAVIER' },
    ],
    special_request: { highFloor: true },
  },
  {
    ellis_code: 'J26071210008H01', seller_code: 'ATTIC202607120003',
    booking_date: '2026-07-12T16:41:00', status: 'Confirmed', payment_status: 'Unpaid',
    hotel_id: 'HTL-TYO-09', hotel_name: 'Sotetsu Fresa Inn Ginza Nanachome', region: 'Tokyo',
    check_in: '2026-11-08', check_out: '2026-11-10', nights: 2,
    room_type: 'TWIN NON SMOKING', room_count: 2, traveler_name: 'Karte', travelers: 4,
    currency: 'JPY', sum_amt: 80484, client_cancel_dl: '2026-11-05T17:00:00', cancel_date: null,
  },
  {
    ellis_code: 'J26071210004H01', seller_code: 'ATTIC202607120002',
    booking_date: '2026-07-12T13:20:00', status: 'Confirmed', payment_status: 'Fully Paid',
    hotel_id: 'HTL-BKK-05', hotel_name: 'Comfort Hotel Bangkok', region: 'Bangkok',
    check_in: '2026-11-19', check_out: '2026-11-23', nights: 4,
    room_type: '1 Double Bed Standard', room_count: 1, traveler_name: 'Louella', travelers: 2,
    currency: 'JPY', sum_amt: 60107, client_cancel_dl: '2026-11-16T17:00:00', cancel_date: null,
    invoice_no: 'INV-2607-00042',
  },
  {
    ellis_code: 'J26071210003H01', seller_code: 'ATTIC202607120001',
    booking_date: '2026-07-12T12:05:00', status: 'Confirmed', payment_status: 'Unpaid',
    hotel_id: 'HTL-BKK-06', hotel_name: 'Comfort Hotel Sathorn', region: 'Bangkok',
    check_in: '2026-12-19', check_out: '2026-12-26', nights: 7,
    room_type: '1 Double Bed Standard', room_count: 2, traveler_name: 'Michael', travelers: 3,
    currency: 'JPY', sum_amt: 217441, client_cancel_dl: '2026-12-16T17:00:00', cancel_date: null,
  },
  {
    ellis_code: 'J26071110007H01', seller_code: 'ATTIC202607110002',
    booking_date: '2026-07-11T18:30:00', status: 'Cancelled', payment_status: 'Refunded',
    hotel_id: 'HTL-OSA-03', hotel_name: 'Sotetsu Grand Fresa Osaka', region: 'Osaka',
    check_in: '2027-01-01', check_out: '2027-01-05', nights: 4,
    room_type: 'Economy Double Room for 2 People', room_count: 1, traveler_name: 'Corazon', travelers: 2,
    currency: 'JPY', sum_amt: 56522, client_cancel_dl: '2026-12-30T17:00:00',
    cancel_date: '2026-07-12T09:15:00', cancel_reason: 'Change of plans', invoice_no: 'INV-2607-00031',
    dispute: 'Closed', dispute_remark: 'Refund completed to seller credit',
  },
  {
    ellis_code: 'J26071110004H01', seller_code: 'ATTIC202607110001',
    booking_date: '2026-07-11T18:02:00', status: 'Confirmed', payment_status: 'Unpaid',
    hotel_id: 'HTL-TYO-08', hotel_name: 'Sotetsu Fresa Inn Tokyo Kinshicho', region: 'Tokyo',
    check_in: '2026-10-08', check_out: '2026-10-11', nights: 3,
    room_type: 'Twin Non Smoking', room_count: 1, traveler_name: 'Katherine', travelers: 2,
    currency: 'JPY', sum_amt: 73198, client_cancel_dl: '2026-10-05T17:00:00', cancel_date: null,
    invoice_no: 'INV-2607-00028',
  },
  {
    ellis_code: 'J26071010008H01', seller_code: 'ATTIC202607100001',
    booking_date: '2026-07-10T17:03:00', status: 'Confirmed', payment_status: 'Unpaid',
    hotel_id: 'HTL-OSA-04', hotel_name: 'Sotetsu Grand Fresa Osaka - Namba', region: 'Osaka',
    check_in: '2026-08-25', check_out: '2026-08-27', nights: 2,
    room_type: 'Economy Double Room for 2 People - Non-Smoking', room_count: 1, traveler_name: 'Jason', travelers: 2,
    currency: 'JPY', sum_amt: 115370, client_cancel_dl: '2026-08-23T17:00:00', cancel_date: null,
  },
];

/* ────────────────── 생성 파라미터 ────────────────── */

/** 예약일 시작 — 현업 지시 (2026-05-01 이후) */
const BOOKING_START = '2026-05-01';
const TOTAL = 200;

/**
 * 월 성장률 — 예약 건수를 월별로 명시 배분할 때 쓴다.
 *
 * 예약일을 연속 확률분포로 뽑으면 이번 달이 '오늘까지'라 일수가 짧은 탓에
 * 일 단위 밀도가 튀어 KPI 델타가 +139% 같은 비현실적 값이 됐다.
 * 월별 목표 건수를 먼저 정하고 그 안에서 날짜를 뽑아야 증가율이 통제된다.
 */
const MONTHLY_GROWTH = 1.08;

/**
 * 취소 비율 — 확률 추첨(rnd < 0.095)에 맡기면 표본 200건에서 5~9%로 널뛴다.
 * 지표가 흔들리면 안 되므로 정확히 이 비율만큼 결정론적으로 취소 처리한다.
 */
const CANCEL_RATE = 0.095;

/**
 * 성급별 선택 가중치 — 도시 안에서 호텔을 균등 추첨하면 1박 ¥62,000짜리 5성이
 * ¥4,102짜리 3성만큼 팔려 월 매출이 +125%씩 튄다. ATTIC TOURS 실제 예약은
 * 비즈니스호텔(3성) 위주라 저가에 무게를 준다 — 금액 편차도 함께 줄어든다.
 */
function starWeight(star: number): number {
  if (star <= 3) return 5;
  if (star <= 3.5) return 3;
  if (star <= 4) return 1.5;
  return 0.4;
}

/** 취소 사유 — Cancel Reasons 분포의 원천. 가중치 합이 곧 사유별 비중이 된다. */
const CANCEL_REASONS: { reason: string; w: number }[] = [
  { reason: 'Change of plans', w: 34 },
  { reason: 'Guest cancelled', w: 25 },
  { reason: 'Found better option', w: 16 },
  { reason: 'Date change needed', w: 15 },
  { reason: 'Duplicate booking', w: 10 },
];

/**
 * 도시 가중치 — ATTIC TOURS는 일본계 여행사라 일본이 대부분이고,
 * 나머지는 실제 판매 비중에 가깝게 한국 > 태국 > 베트남 > 기타 순.
 */
const CITY_WEIGHT: Record<string, number> = {
  Tokyo: 30, Osaka: 26, Kyoto: 8, Fukuoka: 5, Sapporo: 4,
  Seoul: 9, Busan: 3, Jeju: 2,
  Bangkok: 5, Singapore: 2,
  'Da Nang': 2, Hanoi: 1, 'Ho Chi Minh City': 1,
  Taipei: 1, 'Hong Kong': 1,
};

const FIRST_NAMES = [
  'Johanna', 'Karte', 'Louella', 'Michael', 'Corazon', 'Katherine', 'Jason', 'Emily', 'Daniel', 'Sophia',
  'Hiroshi', 'Yuki', 'Kenji', 'Aiko', 'Takeshi', 'Naomi', 'Satoshi', 'Rina', 'Kazuo', 'Miyu',
  'Minjun', 'Seoyeon', 'Jihoon', 'Hayoung', 'Somchai', 'Ananya', 'Wei', 'Mei', 'Linh', 'Duc',
  'Robert', 'Laura', 'Thomas', 'Anna', 'Peter', 'Grace', 'Oliver', 'Chloe', 'Ethan', 'Mia',
];

const ROOM_TYPES = [
  'Standard Double (Non Smoking)', 'Standard Twin Non Smoking', 'Moderate Twin Non Smoking',
  'ECONOMY, DOUBLE BED', 'Superior Double Room', 'Deluxe Twin Room', 'Semi Double Room Non Smoking',
  'Studio King No Smoking', '1 Double Bed Standard', 'MODERATE, TWIN BEDS, SMOKING',
];

/** 가중 추첨 */
function pick<T>(rnd: () => number, items: T[], weight: (t: T) => number): T {
  const total = items.reduce((s, it) => s + weight(it), 0);
  let r = rnd() * total;
  for (const it of items) {
    r -= weight(it);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const p2 = (n: number) => String(n).padStart(2, '0');

interface MonthSlot {
  y: number;
  m: number;
  /** 예약 가능한 첫/마지막 일 — 시작월은 BOOKING_START부터, 이번 달은 오늘까지 */
  firstDay: number;
  lastDay: number;
  target: number;
}

/**
 * 월별 예약 건수 배분 — BOOKING_START부터 오늘까지, 월 MONTHLY_GROWTH씩 성장.
 * 손으로 쓴 예약이 속한 달은 그만큼 목표를 깎아 전체가 정확히 TOTAL이 되게 한다.
 */
function monthPlan(today: string): MonthSlot[] {
  const start = new Date(`${BOOKING_START}T00:00:00Z`);
  const end = new Date(`${today}T00:00:00Z`);
  const slots: (Omit<MonthSlot, 'target'> & { weight: number })[] = [];

  for (let d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)), i = 0; d <= end; i++) {
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const isFirst = y === start.getUTCFullYear() && m === start.getUTCMonth();
    const isCurrent = y === end.getUTCFullYear() && m === end.getUTCMonth();
    const firstDay = isFirst ? start.getUTCDate() : 1;
    const lastDay = isCurrent ? end.getUTCDate() : new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    slots.push({ y, m, firstDay, lastDay, weight: (lastDay - firstDay + 1) * Math.pow(MONTHLY_GROWTH, i) });
    d = new Date(Date.UTC(y, m + 1, 1));
  }

  /* 손으로 쓴 예약을 해당 월에서 차감 */
  const handPerMonth = new Map<string, number>();
  for (const b of HAND_WRITTEN) {
    const k = b.booking_date.slice(0, 7);
    handPerMonth.set(k, (handPerMonth.get(k) ?? 0) + 1);
  }

  const totalWeight = slots.reduce((s, x) => s + x.weight, 0);
  const toGenerate = TOTAL - HAND_WRITTEN.length;

  const out = slots.map((s) => ({
    y: s.y,
    m: s.m,
    firstDay: s.firstDay,
    lastDay: s.lastDay,
    target: Math.max(0, Math.round((s.weight / totalWeight) * TOTAL) - (handPerMonth.get(`${s.y}-${p2(s.m + 1)}`) ?? 0)),
  }));

  /* 반올림 오차를 마지막 달에서 보정 — 합계가 정확히 맞아야 200건이 된다 */
  const diff = toGenerate - out.reduce((s, x) => s + x.target, 0);
  out[out.length - 1].target += diff;
  return out;
}

/**
 * 생성 200건 - 손으로 쓴 7건.
 * 오늘까지만 예약이 존재한다 — 미래 날짜로 예약을 만들 수는 없으므로.
 */
function generate(): Booking[] {
  const rnd = seeded(20260517);
  const hotels = allHotels();
  const hotelsPerCity: Record<string, number> = {};
  for (const h of hotels) hotelsPerCity[h.city.nameEn] = (hotelsPerCity[h.city.nameEn] ?? 0) + 1;

  /* 월별 목표 건수만큼 예약일을 먼저 깔아둔다 — 월 단위 증가율을 통제하기 위해 */
  const dates: Date[] = [];
  for (const slot of monthPlan(iso(new Date()))) {
    const span = slot.lastDay - slot.firstDay + 1;
    for (let k = 0; k < slot.target; k++) {
      dates.push(new Date(Date.UTC(slot.y, slot.m, slot.firstDay + Math.floor(rnd() * span))));
    }
  }

  const out: Booking[] = [];
  for (let i = 0; i < dates.length; i++) {
    const bDate = dates[i];
    const hh = 9 + Math.floor(rnd() * 11);
    const mm = Math.floor(rnd() * 60);
    const booking_date = `${iso(bDate)}T${p2(hh)}:${p2(mm)}:00`;

    /* 호텔 — 도시 비중 × 성급 가중치.
       도시 몫을 그 도시 호텔 수로 나눠야 CITY_WEIGHT가 '도시 비중'이 된다
       (안 나누면 호텔이 많은 도시에 가중치가 곱해져 쏠린다). */
    const h = pick(
      rnd,
      hotels,
      (x) => ((CITY_WEIGHT[x.city.nameEn] ?? 1) / hotelsPerCity[x.city.nameEn]) * starWeight(x.star),
    );

    /* 체크인 — 예약일 다음날 ~ 6개월 후. 리드타임이 짧은 예약이 더 흔하다. */
    const lead = 1 + Math.floor(Math.pow(rnd(), 1.7) * 175);
    const ci = addDays(bDate, lead);
    const nights = 1 + Math.floor(Math.pow(rnd(), 1.8) * 7);
    const co = addDays(ci, nights);
    const room_count = rnd() < 0.68 ? 1 : rnd() < 0.8 ? 2 : 3;

    /* 금액 — 호텔 1박 net(현지통화) × 박수 × 실수, ±18% 변동 후 JPY 환산 */
    const variance = 0.82 + rnd() * 0.36;
    const local = h.base * nights * room_count * variance;
    const sum_amt = toJpy(local, h.city.currency);

    const seq = i + 4;
    const ymd = `${String(bDate.getUTCFullYear()).slice(-2)}${p2(bDate.getUTCMonth() + 1)}${p2(bDate.getUTCDate())}`;
    const paidRoll = rnd();

    out.push({
      ellis_code: `J${ymd}1${p2(seq)}${p2(Math.floor(rnd() * 99))}H01`,
      seller_code: `ATTIC20${ymd}${String(seq).padStart(4, '0')}`,
      booking_date,
      status: 'Confirmed',
      payment_status: paidRoll < 0.45 ? 'Unpaid' : paidRoll < 0.85 ? 'Fully Paid' : 'Partially Paid',
      hotel_id: h.id,
      hotel_name: h.name,
      region: h.city.nameEn,
      check_in: iso(ci),
      check_out: iso(co),
      nights,
      room_type: h.roomType ?? ROOM_TYPES[Math.floor(rnd() * ROOM_TYPES.length)],
      room_count,
      traveler_name: FIRST_NAMES[Math.floor(rnd() * FIRST_NAMES.length)],
      travelers: room_count * (rnd() < 0.7 ? 2 : 1) + (rnd() < 0.15 ? 1 : 0),
      currency: 'JPY',
      sum_amt,
      client_cancel_dl: `${iso(addDays(ci, -3))}T17:00:00`,
      cancel_date: null,
      cancel_reason: null,
      invoice_no: paidRoll >= 0.45 ? `INV-${ymd.slice(0, 4)}-${String(10000 + seq).slice(1)}` : null,
    });
  }

  applyCancellations(out, rnd);
  return out;
}

/**
 * 취소 처리 — 목표 건수만큼 정확히. 예약 간격을 두고 고르게 집어 특정 달에 몰리지 않게 한다.
 * (확률 추첨은 표본이 작아 실제 비율이 목표의 절반까지 벌어졌다.)
 */
function applyCancellations(list: Booking[], rnd: () => number): void {
  const target = Math.round(TOTAL * CANCEL_RATE) - HAND_WRITTEN.filter((b) => b.status === 'Cancelled').length;
  const stride = list.length / target;

  for (let k = 0; k < target; k++) {
    const b = list[Math.min(list.length - 1, Math.floor(k * stride + rnd() * stride))];
    if (b.status === 'Cancelled') continue;

    const bDay = new Date(`${b.booking_date.slice(0, 10)}T00:00:00Z`);
    const lead = Math.round((new Date(`${b.check_in}T00:00:00Z`).getTime() - bDay.getTime()) / 86400000);
    b.status = 'Cancelled';
    b.payment_status = rnd() < 0.75 ? 'Refunded' : 'Partially Refunded';
    b.cancel_date = `${iso(addDays(bDay, 1 + Math.floor(rnd() * Math.max(1, Math.min(lead - 1, 30)))))}T${p2(10 + Math.floor(rnd() * 8))}:00:00`;
    b.cancel_reason = pick(rnd, CANCEL_REASONS, (r) => r.w).reason;
  }
}

/** 예약일 내림차순 — 실제 포털 목록과 같은 정렬(최신이 위) */
export const SEED_BOOKINGS: Booking[] = [...HAND_WRITTEN, ...generate()].sort((a, b) =>
  b.booking_date.localeCompare(a.booking_date),
);
