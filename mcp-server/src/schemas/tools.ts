import { z } from 'zod';
import { resultLimitSchema, starRatingArraySchema } from './common.js';

/* ---------- search_destinations ---------- */
export const searchDestinationsShape = {
  query: z.string().min(1).max(100).describe('목적지/도시/랜드마크 검색어 (자연어 가능)'),
  language: z
    .enum(['ko', 'en', 'ja', 'vi'])
    .default('ko')
    .describe('결과 표기 언어'),
  limit: z.number().int().min(1).max(20).default(10),
} as const;
export const searchDestinationsSchema = z.object(searchDestinationsShape);
export type SearchDestinationsInput = z.infer<typeof searchDestinationsSchema>;

/* ---------- search_hotels ---------- */
export const searchHotelsShape = {
  destination_id: z.string().min(1).optional().describe('목적지 ID'),
  query: z.string().min(1).max(100).optional().describe('호텔명 검색어'),
  star_rating: starRatingArraySchema.optional().describe('성급 필터 (1~5 배열)'),
  limit: resultLimitSchema,
} as const;
export const searchHotelsSchema = z.object(searchHotelsShape).superRefine((v, ctx) => {
  if (!v.destination_id && !v.query) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['destination_id'],
      message: 'destination_id 또는 query 중 하나는 반드시 지정해야 합니다',
    });
  }
});
export type SearchHotelsInput = z.infer<typeof searchHotelsSchema>;

/* ---------- get_hotel_details ---------- */
export const getHotelDetailsShape = {
  hotel_id: z.string().min(1).describe('호텔 ID'),
} as const;
export const getHotelDetailsSchema = z.object(getHotelDetailsShape);
export type GetHotelDetailsInput = z.infer<typeof getHotelDetailsSchema>;

/* ---------- compare_hotel_rates ---------- */
export const compareHotelRatesShape = {
  search_id: z.string().min(1).describe('search_hotel_rates 가 반환한 search_id'),
  hotel_ids: z
    .array(z.string().min(1))
    .min(1)
    .max(20)
    .optional()
    .describe('비교 대상 호텔 제한 (미지정 시 결과 전체)'),
  criteria: z
    .enum(['price', 'cancellation'])
    .default('price')
    .describe('비교 기준: price=최저가, cancellation=취소조건 우선'),
  limit: z.number().int().min(1).max(20).default(10),
} as const;
export const compareHotelRatesSchema = z.object(compareHotelRatesShape);
export type CompareHotelRatesInput = z.infer<typeof compareHotelRatesSchema>;

/* ---------- get_rate_details ---------- */
export const getRateDetailsShape = {
  search_id: z.string().min(1).describe('search_hotel_rates 가 반환한 search_id'),
  rate_plan_id: z.string().min(1).describe('요금제 ID'),
  hotel_id: z.string().min(1).optional().describe('호텔 ID (동일 rate_plan_id 충돌 방지용)'),
} as const;
export const getRateDetailsSchema = z.object(getRateDetailsShape);
export type GetRateDetailsInput = z.infer<typeof getRateDetailsSchema>;

/* ---------- get_cancellation_policy ---------- */
export const getCancellationPolicyShape = {
  search_id: z.string().min(1).describe('search_hotel_rates 가 반환한 search_id'),
  rate_plan_id: z.string().min(1).describe('요금제 ID'),
  hotel_id: z.string().min(1).optional().describe('호텔 ID (선택)'),
} as const;
export const getCancellationPolicySchema = z.object(getCancellationPolicyShape);
export type GetCancellationPolicyInput = z.infer<typeof getCancellationPolicySchema>;

/* ---------- get_recent_searches ---------- */
export const getRecentSearchesShape = {
  limit: z.number().int().min(1).max(50).default(10),
} as const;
export const getRecentSearchesSchema = z.object(getRecentSearchesShape);
export type GetRecentSearchesInput = z.infer<typeof getRecentSearchesSchema>;

/* ---------- health_check ---------- */
export const healthCheckShape = {} as const;
export const healthCheckSchema = z.object(healthCheckShape);
export type HealthCheckInput = z.infer<typeof healthCheckSchema>;
