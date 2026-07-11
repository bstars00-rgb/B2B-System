import { z } from 'zod';

/** 오늘 날짜(서버 로컬 기준)를 YYYY-MM-DD 로 반환 */
export function todayString(now: Date = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function isRealDate(value: string): boolean {
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식이어야 합니다')
  .refine(isRealDate, '존재하지 않는 날짜입니다');

export const iso2Country = z
  .string()
  .regex(/^[A-Z]{2}$/, 'ISO 3166-1 alpha-2 국가코드(대문자 2자)여야 합니다. 예: KR, VN');

export const currencyCode = z
  .string()
  .regex(/^[A-Z]{3}$/, 'ISO 4217 통화코드(대문자 3자)여야 합니다. 예: KRW, USD');

export const mealPlanFilterSchema = z.enum([
  'any',
  'room_only',
  'breakfast_included',
  'half_board',
  'full_board',
]);

export const sortBySchema = z.enum([
  'price_asc',
  'price_desc',
  'star_desc',
  'cancellation_then_price',
]);

export const starRatingArraySchema = z
  .array(z.number().int().min(1, '성급은 1~5 입니다').max(5, '성급은 1~5 입니다'))
  .min(1)
  .max(5);

export const roomSchema = z
  .object({
    adults: z.number().int().min(1, '성인은 1명 이상').max(4, '성인은 객실당 최대 4명'),
    children: z.number().int().min(0).max(3, '아동은 객실당 최대 3명').default(0),
    children_ages: z
      .array(z.number().int().min(0, '아동 나이는 0~17세').max(17, '아동 나이는 0~17세'))
      .max(3)
      .default([]),
  })
  .superRefine((room, ctx) => {
    if (room.children_ages.length !== room.children) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['children_ages'],
        message: `children_ages 길이(${room.children_ages.length})가 children(${room.children})과 일치해야 합니다`,
      });
    }
  });

export const resultLimitSchema = z.number().int().min(1).max(50).default(20);

/** Zod 오류를 사람이 읽을 수 있는 한 줄 요약으로 변환 */
export function summarizeZodError(error: z.ZodError): string {
  return error.issues
    .map((i) => `${i.path.length > 0 ? i.path.join('.') : '(root)'}: ${i.message}`)
    .join('; ');
}
