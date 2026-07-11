import type { SearchResponse } from '../types';
import { makeRate, resetRateSeq } from './factory';

/** 시나리오 ③ 환불 불가 — 전 요금제 non_refundable 특가 */
export function buildNonRefundable(searchId: string): SearchResponse {
  resetRateSeq();
  const results = [
    makeRate(searchId, {
      hotel_id: 'HTL-3001',
      hotel_name: '만다린 오리엔탈 방콕',
      destination: '방콕',
      star_rating: 5,
      latitude: 13.7237,
      longitude: 100.5148,
      room_type_name: '디럭스 리버뷰',
      rate_plan_name: '논리펀더블 얼리버드 -25%',
      net_price: 415000,
      meal_plan: '조식 포함',
      cancellation_type: 'non_refundable',
      warnings: ['환불 불가 요금 — 셀러 고객 고지 필수'],
    }),
    makeRate(searchId, {
      hotel_id: 'HTL-3002',
      hotel_name: '샹그릴라 방콕',
      destination: '방콕',
      star_rating: 5,
      latitude: 13.7207,
      longitude: 100.5133,
      room_type_name: '디럭스 킹',
      rate_plan_name: '논리펀더블 특가',
      net_price: 289000,
      meal_plan: '조식 포함',
      cancellation_type: 'non_refundable',
      warnings: ['환불 불가 요금 — 셀러 고객 고지 필수'],
    }),
    makeRate(searchId, {
      hotel_id: 'HTL-3003',
      hotel_name: '아마리 워터게이트 방콕',
      destination: '방콕',
      star_rating: 4,
      latitude: 13.7508,
      longitude: 100.5417,
      room_type_name: '디럭스 트윈',
      rate_plan_name: '논리펀더블 특가',
      net_price: 128000,
      meal_plan: '조식 불포함',
      cancellation_type: 'non_refundable',
    }),
  ];
  return {
    search_id: searchId,
    status: 'ok',
    searched_at: new Date().toISOString(),
    results,
  };
}
