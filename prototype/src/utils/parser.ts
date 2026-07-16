import type { SearchConditions } from '../types';
import { matchHotelName, ROOM_TYPE_MATCHERS } from '../mocks/hotelDb';

/**
 * 규칙 기반 mock 자연어 파서 (한국어 기준).
 * 실제 시스템에서는 LLM tool call(search_hotels 파라미터)이 이 역할을 담당하지만,
 * 프로토타입에서는 정규식 기반으로 "조건이 자동 추출된 것처럼" 시뮬레이션한다.
 */

const KNOWN_DESTINATIONS = [
  '마리나베이',
  '도쿄',
  '오사카',
  '후쿠오카',
  '삿포로',
  '교토',
  '싱가포르',
  '방콕',
  '다낭',
  '하노이',
  '호치민',
  '타이베이',
  '홍콩',
  '파리',
  '런던',
  '제주',
  '서울',
  '부산',
];

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * 연도 미지정 날짜의 연도 해석 — 오늘(실행 시점) 기준으로 이미 지난 날짜면 다음 해로.
 * 예: 오늘이 2026-07-16이면 "4월 15일" → 2027-04-15 (과거 날짜로 임의 단정 금지).
 */
function resolveYear(month: number, day: number): number {
  const now = new Date();
  const y = now.getFullYear();
  const todayMid = new Date(y, now.getMonth(), now.getDate());
  return new Date(y, month - 1, day) < todayMid ? y + 1 : y;
}

/** 질문에 명시된 연도 ("2027년 4월…") — 없으면 null */
function explicitYear(q: string): number | null {
  const m = q.match(/(20\d{2})\s*년/);
  return m ? Number(m[1]) : null;
}

interface DateRange {
  check_in: string | null;
  check_out: string | null;
  nights: number | null;
}

function parseDates(q: string): DateRange {
  const yearInQuery = explicitYear(q);

  // "8월 20일~23일", "8월 20일부터 8월 23일까지" — 종료일 숫자가 "N박"의 N이면 제외
  let m = q.match(
    /(\d{1,2})\s*월\s*(\d{1,2})\s*일?\s*(?:~|-|부터|에서)\s*(?:(\d{1,2})\s*월\s*)?(\d{1,2})(?!\s*박)\s*일?/,
  );
  if (m) {
    const m1 = Number(m[1]);
    const d1 = Number(m[2]);
    const m2 = m[3] ? Number(m[3]) : m1;
    const d2 = Number(m[4]);
    const y1 = yearInQuery ?? resolveYear(m1, d1);
    const y2 = m2 < m1 ? y1 + 1 : y1; // 월이 거꾸로면 해 넘김 (12월 30일~1월 2일)
    const ci = toIsoDate(y1, m1, d1);
    const co = toIsoDate(y2, m2, d2);
    const nights = Math.max(
      1,
      Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86400000),
    );
    return { check_in: ci, check_out: co, nights };
  }

  // "8/20~8/23", "8/20-23"
  m = q.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*(?:~|-)\s*(?:(\d{1,2})\s*\/\s*)?(\d{1,2})/);
  if (m) {
    const m1 = Number(m[1]);
    const d1 = Number(m[2]);
    const m2 = m[3] ? Number(m[3]) : m1;
    const d2 = Number(m[4]);
    const y1 = yearInQuery ?? resolveYear(m1, d1);
    const y2 = m2 < m1 ? y1 + 1 : y1;
    const ci = toIsoDate(y1, m1, d1);
    const co = toIsoDate(y2, m2, d2);
    const nights = Math.max(
      1,
      Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86400000),
    );
    return { check_in: ci, check_out: co, nights };
  }

  // "8월 20일 2박" / "8월 20일부터 3박"
  m = q.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  const nightsMatch = q.match(/(\d+)\s*박/);
  if (m) {
    const m1 = Number(m[1]);
    const d1 = Number(m[2]);
    const y1 = yearInQuery ?? resolveYear(m1, d1);
    const nights = nightsMatch ? Number(nightsMatch[1]) : 1;
    const ci = new Date(`${toIsoDate(y1, m1, d1)}T00:00:00`);
    const co = new Date(ci.getTime() + nights * 86400000);
    return {
      check_in: toIsoDate(y1, m1, d1),
      check_out: toIsoDate(co.getFullYear(), co.getMonth() + 1, co.getDate()),
      nights,
    };
  }

  if (nightsMatch) {
    return { check_in: null, check_out: null, nights: Number(nightsMatch[1]) };
  }

  return { check_in: null, check_out: null, nights: null };
}


export function parseQuery(query: string): SearchConditions {
  const q = query.trim();

  // 특정 호텔 지목 (예: "마리나 베이 샌즈", "마리나베이샌즈")
  const hotel_name = matchHotelName(q);

  // 목적지
  const destination = KNOWN_DESTINATIONS.find((d) => q.includes(d)) ?? null;

  // 날짜
  const { check_in, check_out, nights } = parseDates(q);

  // 인원
  let adults: number | null = null;
  let children: number | null = null;
  const adultMatch = q.match(/성인\s*(\d+)\s*(?:명|인)?|어른\s*(\d+)\s*(?:명|인)?/);
  if (adultMatch) adults = Number(adultMatch[1] ?? adultMatch[2]);
  const childMatch = q.match(/(?:아동|아이|어린이)\s*(\d+)\s*(?:명|인)?/);
  if (childMatch) children = Number(childMatch[1]);
  if (adults === null) {
    const genericMatch = q.match(/(\d+)\s*인(?!실)/);
    if (genericMatch) adults = Number(genericMatch[1]);
  }

  // 룸타입 ("더블+트윈", "트윈룸으로") — 분리 예약 요청 인식
  const room_types = Object.entries(ROOM_TYPE_MATCHERS)
    .filter(([, re]) => re.test(q))
    .map(([k]) => k);

  // 객실 수 ("객실 2개", "2룸", "방 1개")
  let rooms: number | null = null;
  const roomMatch = q.match(/객실\s*(\d+)|(\d+)\s*(?:개\s*)?객실|(\d+)\s*룸|(?:방|룸)\s*(\d+)\s*개/);
  if (roomMatch) rooms = Number(roomMatch[1] ?? roomMatch[2] ?? roomMatch[3] ?? roomMatch[4]);
  // "더블+트윈 각각 (방)1개씩" → 룸타입 수 × N개
  if (room_types.length >= 2 && /각각|각\s|씩/.test(q)) {
    const per = q.match(/각각?\s*(?:방|객실|룸)?\s*(\d+)\s*(?:개|실)?\s*씩?/);
    rooms = room_types.length * (per ? Number(per[1]) : 1);
  }

  // 성급
  let star_rating: number | null = null;
  const starMatch = q.match(/([2-5])\s*성/);
  if (starMatch) star_rating = Number(starMatch[1]);

  // 조식
  let breakfast_included: boolean | null = null;
  if (/조식\s*(없이|제외|불포함|미포함)/.test(q)) breakfast_included = false;
  else if (q.includes('조식')) breakfast_included = true;

  // 무료취소 / 환불불가
  let free_cancellation_only: boolean | null = null;
  if (/무료\s*취소|취소\s*가능|취소\s*무료/.test(q)) free_cancellation_only = true;
  else if (/환불\s*불가/.test(q)) free_cancellation_only = false;

  // 예산 ("30만원 이하", "예산 25만")
  let budget_max: number | null = null;
  const budgetMatch = q.match(/(\d+(?:\.\d+)?)\s*만\s*원?\s*(?:이하|이내|미만|대|정도)?/);
  if (budgetMatch) budget_max = Math.round(Number(budgetMatch[1]) * 10000);

  // 역/지하철 인접 ("역에서 가까운 곳만", "역세권", "지하철 근처")
  let near_station: boolean | null = null;
  if (/역\s*(?:에서)?\s*가까|역\s*근처|역세권|지하철\s*(?:역\s*)?(?:근처|인근|가까)|역\s*앞|역\s*도보/.test(q))
    near_station = true;

  return {
    raw_query: query,
    destination,
    hotel_name,
    check_in,
    check_out,
    nights,
    adults,
    children,
    rooms,
    star_rating,
    breakfast_included,
    free_cancellation_only,
    budget_max,
    budget_currency: 'KRW',
    near_station,
    room_types: room_types.length > 0 ? room_types : null,
  };
}

/**
 * 대화 문맥 유지 — 이전 검색 조건에 새 질문의 변경분만 덮어쓴다 (NLU 규칙 ⑫⑬).
 * 새 질문에 목적지가 명시되면 이전 호텔 지목은 해제한다 (도시가 바뀌었으므로).
 */
export function mergeConditions(
  fresh: SearchConditions,
  prev: SearchConditions | null,
): SearchConditions {
  if (!prev) return fresh;
  return {
    ...fresh,
    destination: fresh.destination ?? prev.destination,
    hotel_name: fresh.hotel_name ?? (fresh.destination ? null : prev.hotel_name),
    check_in: fresh.check_in ?? prev.check_in,
    check_out: fresh.check_out ?? prev.check_out,
    nights: fresh.nights ?? prev.nights,
    adults: fresh.adults ?? prev.adults,
    children: fresh.children ?? prev.children,
    rooms: fresh.rooms ?? prev.rooms,
    star_rating: fresh.star_rating ?? prev.star_rating,
    breakfast_included: fresh.breakfast_included ?? prev.breakfast_included,
    free_cancellation_only: fresh.free_cancellation_only ?? prev.free_cancellation_only,
    budget_max: fresh.budget_max ?? prev.budget_max,
    near_station: fresh.near_station ?? prev.near_station,
    room_types: fresh.room_types ?? prev.room_types,
  };
}

/** 질문에서 조건이 하나라도 추출됐는지 (정제/신규 검색 판단용) */
export function hasAnySignal(c: SearchConditions): boolean {
  return Boolean(
    c.destination ||
      c.hotel_name ||
      c.check_in ||
      c.nights ||
      c.adults ||
      c.children ||
      c.rooms ||
      c.star_rating ||
      c.breakfast_included !== null ||
      c.free_cancellation_only !== null ||
      c.budget_max ||
      c.near_station !== null ||
      (c.room_types && c.room_types.length > 0),
  );
}

/** 새 질문에서 추출된 조건을 사람이 읽을 수 있는 라벨로 (정제 응답 문구용) */
export function describeSignals(c: SearchConditions): string[] {
  const labels: string[] = [];
  if (c.hotel_name) labels.push(`호텔 '${c.hotel_name}'`);
  else if (c.destination) labels.push(`목적지 ${c.destination}`);
  if (c.check_in && c.check_out) labels.push(`${c.check_in} ~ ${c.check_out}`);
  else if (c.nights) labels.push(`${c.nights}박`);
  if (c.adults) labels.push(`성인 ${c.adults}명`);
  if (c.children) labels.push(`아동 ${c.children}명`);
  if (c.rooms) labels.push(`객실 ${c.rooms}개`);
  if (c.room_types && c.room_types.length > 0) labels.push(`룸타입 ${c.room_types.join('+')}`);
  if (c.star_rating) labels.push(`${c.star_rating}성급 이상`);
  if (c.breakfast_included === true) labels.push('조식 포함만');
  if (c.breakfast_included === false) labels.push('조식 불포함만');
  if (c.free_cancellation_only === true) labels.push('무료취소만');
  if (c.free_cancellation_only === false) labels.push('환불불가 특가만');
  if (c.budget_max) labels.push(`1박 ₩${c.budget_max.toLocaleString()} 이하`);
  if (c.near_station) labels.push('역 근처만');
  return labels;
}
