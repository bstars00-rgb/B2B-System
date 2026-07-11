import type { RateResult, CancellationType, Availability } from '../types';

/** 시나리오 mock 데이터 생성 팩토리 */

export interface RateSeed {
  hotel_id: string;
  hotel_name: string;
  destination?: string;
  star_rating?: number;
  latitude?: number;
  longitude?: number;
  room_type_id?: string;
  room_type_name?: string;
  rate_plan_id?: string;
  rate_plan_name?: string;
  supplier_id?: string;
  meal_plan?: string;
  cancellation_type?: CancellationType;
  cancellation_deadline?: string | null;
  cancellation_policy_text?: string;
  net_price?: number;
  markup_rate?: number; // net 대비 마크업 비율 (기본 0.12)
  tax_rate?: number; // selling 대비 세금 비율 (기본 0.1)
  currency?: string;
  total_nights?: number;
  total_rooms?: number;
  availability?: Availability;
  /** 분 단위 — last_updated_at을 현재로부터 n분 전으로 설정 (기본 2분) */
  updated_minutes_ago?: number;
  has_booking_token?: boolean;
  warnings?: string[];
}

let rateSeq = 0;

export function resetRateSeq(): void {
  rateSeq = 0;
}

export function minutesAgoIso(minutes: number): string {
  return new Date(Date.now() - minutes * 60000).toISOString();
}

const DEFAULT_POLICY_FREE = [
  '■ 취소 정책 전문',
  '- 체크인 3일 전 23:59(현지시각)까지: 무료 취소',
  '- 체크인 2일 전 ~ 1일 전: 첫 1박 요금의 위약금 부과',
  '- 체크인 당일 및 노쇼: 총 숙박 요금의 100% 부과',
  '※ 위 정책은 공급사 기준이며, 취소 시각은 호텔 현지 시각 기준입니다.',
].join('\n');

const DEFAULT_POLICY_NON_REFUNDABLE = [
  '■ 취소 정책 전문',
  '- 본 요금제는 예약 확정 즉시 환불이 불가한 특가 요금입니다.',
  '- 예약 변경(날짜/투숙객명) 또한 불가합니다.',
  '- 노쇼 시 총 숙박 요금의 100%가 부과됩니다.',
].join('\n');

const DEFAULT_POLICY_PARTIAL = [
  '■ 취소 정책 전문',
  '- 체크인 7일 전까지: 총액의 10% 위약금',
  '- 체크인 6일 전 ~ 3일 전: 총액의 50% 위약금',
  '- 체크인 2일 전 이후: 총액의 100% 위약금',
  '※ 부분 위약금 요금제 — 취소 시점에 따라 환불액이 달라집니다.',
].join('\n');

function policyFor(type: CancellationType): string {
  if (type === 'free_cancellation') return DEFAULT_POLICY_FREE;
  if (type === 'non_refundable') return DEFAULT_POLICY_NON_REFUNDABLE;
  return DEFAULT_POLICY_PARTIAL;
}

export function makeRate(searchId: string, seed: RateSeed): RateResult {
  rateSeq += 1;
  const cancellationType = seed.cancellation_type ?? 'free_cancellation';
  const net = seed.net_price ?? 200000;
  const markup = Math.round(net * (seed.markup_rate ?? 0.12));
  const selling = net + markup;
  const tax = Math.round(selling * (seed.tax_rate ?? 0.1));
  const hasToken = seed.has_booking_token ?? true;

  return {
    search_id: searchId,
    hotel_id: seed.hotel_id,
    hotel_name: seed.hotel_name,
    destination: seed.destination ?? '도쿄',
    star_rating: seed.star_rating ?? 4,
    latitude: seed.latitude ?? 35.6812,
    longitude: seed.longitude ?? 139.7671,
    room_type_id: seed.room_type_id ?? `RT-${rateSeq}`,
    room_type_name: seed.room_type_name ?? '스탠다드 더블',
    rate_plan_id: seed.rate_plan_id ?? `RP-${rateSeq}`,
    rate_plan_name:
      seed.rate_plan_name ??
      (cancellationType === 'non_refundable' ? '논리펀더블 특가' : '베스트 플렉시블'),
    supplier_id: seed.supplier_id ?? 'SUP-ELLIS-01',
    meal_plan: seed.meal_plan ?? '조식 불포함',
    cancellation_type: cancellationType,
    cancellation_deadline:
      cancellationType === 'non_refundable'
        ? null
        : seed.cancellation_deadline !== undefined
          ? seed.cancellation_deadline
          : '2026-08-17T23:59:00+09:00',
    cancellation_policy_text: seed.cancellation_policy_text ?? policyFor(cancellationType),
    net_price: net,
    markup,
    selling_price: selling,
    tax,
    currency: seed.currency ?? 'KRW',
    total_nights: seed.total_nights ?? 3,
    total_rooms: seed.total_rooms ?? 1,
    availability: seed.availability ?? 'available',
    last_updated_at: minutesAgoIso(seed.updated_minutes_ago ?? 2),
    booking_token: hasToken ? `bk_${searchId}_${rateSeq}` : null,
    warnings: seed.warnings ?? [],
  };
}
