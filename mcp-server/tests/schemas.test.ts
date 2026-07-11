import { describe, expect, it } from 'vitest';
import { searchHotelRatesSchema } from '../src/schemas/search-hotel-rates.js';
import { searchHotelsSchema } from '../src/schemas/tools.js';
import { todayString } from '../src/schemas/common.js';

function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

const validInput = {
  destination_id: 'DST-TYO',
  check_in: futureDate(30),
  check_out: futureDate(33),
  rooms: [{ adults: 2, children: 1, children_ages: [5] }],
  nationality: 'KR',
  residence_country: 'KR',
  currency: 'KRW',
};

describe('search_hotel_rates 입력 스키마', () => {
  it('유효한 입력을 통과시키고 기본값을 적용한다', () => {
    const parsed = searchHotelRatesSchema.parse(validInput);
    expect(parsed.result_limit).toBe(20);
    expect(parsed.sort_by).toBe('price_asc');
    expect(parsed.meal_plan).toBe('any');
    expect(parsed.refundable_only).toBe(false);
    expect(parsed.include_tax).toBe(true);
    expect(parsed.include_markup).toBe(true);
  });

  it('destination_id 와 hotel_ids 둘 다 없으면 거부한다', () => {
    const { destination_id: _omit, ...rest } = validInput;
    const result = searchHotelRatesSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('hotel_ids 만 있어도 통과한다', () => {
    const { destination_id: _omit, ...rest } = validInput;
    const result = searchHotelRatesSchema.safeParse({ ...rest, hotel_ids: ['HTL-TYO-001'] });
    expect(result.success).toBe(true);
  });

  it('과거 check_in 을 거부한다', () => {
    const result = searchHotelRatesSchema.safeParse({
      ...validInput,
      check_in: '2020-01-01',
      check_out: '2020-01-03',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('check_in'))).toBe(true);
    }
  });

  it('check_out 이 check_in 이전/동일이면 거부한다', () => {
    const sameDay = searchHotelRatesSchema.safeParse({
      ...validInput,
      check_in: futureDate(30),
      check_out: futureDate(30),
    });
    expect(sameDay.success).toBe(false);
    const before = searchHotelRatesSchema.safeParse({
      ...validInput,
      check_in: futureDate(30),
      check_out: futureDate(29),
    });
    expect(before.success).toBe(false);
  });

  it('날짜 형식(YYYY-MM-DD)이 아니면 거부한다', () => {
    const result = searchHotelRatesSchema.safeParse({ ...validInput, check_in: '2026/08/20' });
    expect(result.success).toBe(false);
  });

  it('children_ages 길이가 children 과 다르면 거부한다', () => {
    const result = searchHotelRatesSchema.safeParse({
      ...validInput,
      rooms: [{ adults: 2, children: 2, children_ages: [5] }],
    });
    expect(result.success).toBe(false);
  });

  it('성인 5명(객실당 최대 4명 초과)을 거부한다', () => {
    const result = searchHotelRatesSchema.safeParse({
      ...validInput,
      rooms: [{ adults: 5, children: 0, children_ages: [] }],
    });
    expect(result.success).toBe(false);
  });

  it('아동 나이 18세(0~17 초과)를 거부한다', () => {
    const result = searchHotelRatesSchema.safeParse({
      ...validInput,
      rooms: [{ adults: 2, children: 1, children_ages: [18] }],
    });
    expect(result.success).toBe(false);
  });

  it('result_limit 51(최대 50 초과)을 거부한다', () => {
    const result = searchHotelRatesSchema.safeParse({ ...validInput, result_limit: 51 });
    expect(result.success).toBe(false);
  });

  it('잘못된 통화/국가 코드를 거부한다', () => {
    expect(searchHotelRatesSchema.safeParse({ ...validInput, currency: 'krw' }).success).toBe(false);
    expect(searchHotelRatesSchema.safeParse({ ...validInput, nationality: 'KOR' }).success).toBe(false);
  });

  it('star_rating 에 6이 포함되면 거부한다', () => {
    const result = searchHotelRatesSchema.safeParse({ ...validInput, star_rating: [4, 6] });
    expect(result.success).toBe(false);
  });

  it('오늘 check_in 은 허용한다 (과거만 금지)', () => {
    const result = searchHotelRatesSchema.safeParse({
      ...validInput,
      check_in: todayString(),
      check_out: futureDate(2),
    });
    expect(result.success).toBe(true);
  });
});

describe('search_hotels 입력 스키마', () => {
  it('destination_id 와 query 둘 다 없으면 거부한다', () => {
    expect(searchHotelsSchema.safeParse({}).success).toBe(false);
  });

  it('query 만 있어도 통과한다', () => {
    expect(searchHotelsSchema.safeParse({ query: 'Marina' }).success).toBe(true);
  });
});
