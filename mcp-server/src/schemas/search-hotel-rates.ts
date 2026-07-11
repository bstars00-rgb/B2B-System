import { z } from 'zod';
import {
  currencyCode,
  dateString,
  iso2Country,
  mealPlanFilterSchema,
  resultLimitSchema,
  roomSchema,
  sortBySchema,
  starRatingArraySchema,
  todayString,
} from './common.js';

/** 최대 검색 가능 박수 (sanity limit) */
const MAX_NIGHTS = 30;

/**
 * search_hotel_rates 입력 스키마 (raw shape).
 * MCP tool 정의(inputSchema)와 런타임 검증에 함께 사용된다.
 */
export const searchHotelRatesShape = {
  agent_id: z
    .string()
    .optional()
    .describe('무시됨 — 서버가 세션 컨텍스트(env)의 agent_id 로 항상 덮어쓴다'),
  destination_id: z
    .string()
    .min(1)
    .optional()
    .describe('목적지 ID (search_destinations 결과). destination_id 또는 hotel_ids 중 하나 필수'),
  hotel_ids: z
    .array(z.string().min(1))
    .min(1)
    .max(50)
    .optional()
    .describe('호텔 ID 목록. destination_id 또는 hotel_ids 중 하나 필수'),
  check_in: dateString.describe('체크인 날짜 (YYYY-MM-DD, 과거 불가)'),
  check_out: dateString.describe('체크아웃 날짜 (YYYY-MM-DD, check_in 이후)'),
  rooms: z
    .array(roomSchema)
    .min(1)
    .max(5)
    .default([{ adults: 2, children: 0, children_ages: [] }])
    .describe('객실별 투숙 인원'),
  nationality: iso2Country.optional().describe('투숙객 국적 (ISO2)'),
  residence_country: iso2Country.optional().describe('투숙객 거주 국가 (ISO2)'),
  currency: currencyCode.default('USD').describe('표시 통화 (ISO 4217)'),
  meal_plan: mealPlanFilterSchema.default('any').describe('식사 조건 필터'),
  refundable_only: z.boolean().default(false).describe('무료취소 가능 요금만'),
  max_total_price: z.number().positive().optional().describe('총액 상한'),
  max_nightly_price: z.number().positive().optional().describe('1박 요금 상한'),
  star_rating: starRatingArraySchema.optional().describe('성급 필터 (1~5 배열)'),
  sort_by: sortBySchema.default('price_asc').describe('정렬 기준'),
  result_limit: resultLimitSchema.describe('결과 개수 (기본 20, 최대 50)'),
  include_tax: z.boolean().default(true).describe('세금 포함 표시 여부'),
  include_markup: z.boolean().default(true).describe('마크업 포함 표시 여부'),
} as const;

export const searchHotelRatesSchema = z
  .object(searchHotelRatesShape)
  .superRefine((v, ctx) => {
    if (!v.destination_id && (!v.hotel_ids || v.hotel_ids.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['destination_id'],
        message: 'destination_id 또는 hotel_ids 중 하나는 반드시 지정해야 합니다',
      });
    }
    const today = todayString();
    if (v.check_in < today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['check_in'],
        message: `check_in(${v.check_in})은 과거 날짜일 수 없습니다 (오늘: ${today})`,
      });
    }
    if (v.check_out <= v.check_in) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['check_out'],
        message: 'check_out 은 check_in 보다 이후 날짜여야 합니다',
      });
    } else {
      const nights =
        (Date.parse(`${v.check_out}T00:00:00Z`) - Date.parse(`${v.check_in}T00:00:00Z`)) /
        86_400_000;
      if (nights > MAX_NIGHTS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['check_out'],
          message: `최대 ${MAX_NIGHTS}박까지 검색할 수 있습니다`,
        });
      }
    }
  });

export type SearchHotelRatesInput = z.infer<typeof searchHotelRatesSchema>;
