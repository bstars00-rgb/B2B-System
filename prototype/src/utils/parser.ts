import type { SearchConditions } from '../types';
import { matchHotelName } from '../mocks/hotelDb';

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

const BASE_YEAR = 2026;
const BASE_MONTH = 7; // 프로토타입 기준일 2026-07

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function resolveYear(month: number): number {
  return month < BASE_MONTH ? BASE_YEAR + 1 : BASE_YEAR;
}

interface DateRange {
  check_in: string | null;
  check_out: string | null;
  nights: number | null;
}

function parseDates(q: string): DateRange {
  // "8월 20일~23일", "8월 20일부터 8월 23일까지"
  let m = q.match(
    /(\d{1,2})\s*월\s*(\d{1,2})\s*일?\s*(?:~|-|부터|에서)\s*(?:(\d{1,2})\s*월\s*)?(\d{1,2})\s*일?/,
  );
  if (m) {
    const m1 = Number(m[1]);
    const d1 = Number(m[2]);
    const m2 = m[3] ? Number(m[3]) : m1;
    const d2 = Number(m[4]);
    const y1 = resolveYear(m1);
    const y2 = m2 < m1 ? y1 + 1 : resolveYear(m2);
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
    const y1 = resolveYear(m1);
    const y2 = m2 < m1 ? y1 + 1 : resolveYear(m2);
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
    const y1 = resolveYear(m1);
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

  // 객실 수
  let rooms: number | null = null;
  const roomMatch = q.match(/객실\s*(\d+)|(\d+)\s*(?:개\s*)?객실|(\d+)\s*룸/);
  if (roomMatch) rooms = Number(roomMatch[1] ?? roomMatch[2] ?? roomMatch[3]);

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
  };
}
