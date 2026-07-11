import type { SearchResponse } from '../types';
import { makeRate, resetRateSeq } from './factory';

/** 시나리오 ④ 조식 포함/불포함 혼합 — 같은 호텔에 두 요금제 병존 */
export function buildMixedBreakfast(searchId: string): SearchResponse {
  resetRateSeq();
  const results = [
    makeRate(searchId, {
      hotel_id: 'HTL-4001',
      hotel_name: '스위소텔 더 스탬포드 싱가포르',
      destination: '싱가포르',
      star_rating: 5,
      latitude: 1.2931,
      longitude: 103.8534,
      room_type_name: '클래식 킹',
      rate_plan_name: 'Room Only',
      net_price: 388000,
      meal_plan: '조식 불포함',
      cancellation_type: 'free_cancellation',
    }),
    makeRate(searchId, {
      hotel_id: 'HTL-4001',
      hotel_name: '스위소텔 더 스탬포드 싱가포르',
      destination: '싱가포르',
      star_rating: 5,
      latitude: 1.2931,
      longitude: 103.8534,
      room_type_name: '클래식 킹',
      rate_plan_name: 'Breakfast Included',
      net_price: 441000,
      meal_plan: '조식 포함 (2인)',
      cancellation_type: 'free_cancellation',
    }),
    makeRate(searchId, {
      hotel_id: 'HTL-4002',
      hotel_name: '팬 퍼시픽 싱가포르',
      destination: '싱가포르',
      star_rating: 5,
      latitude: 1.2916,
      longitude: 103.8607,
      room_type_name: '디럭스 하버뷰',
      rate_plan_name: 'Room Only 논리펀더블',
      net_price: 352000,
      meal_plan: '조식 불포함',
      cancellation_type: 'non_refundable',
    }),
    makeRate(searchId, {
      hotel_id: 'HTL-4002',
      hotel_name: '팬 퍼시픽 싱가포르',
      destination: '싱가포르',
      star_rating: 5,
      latitude: 1.2916,
      longitude: 103.8607,
      room_type_name: '디럭스 하버뷰',
      rate_plan_name: 'Breakfast Flexible',
      net_price: 431000,
      meal_plan: '조식 포함 (2인)',
      cancellation_type: 'free_cancellation',
    }),
    makeRate(searchId, {
      hotel_id: 'HTL-4003',
      hotel_name: '호텔 보스',
      destination: '싱가포르',
      star_rating: 4,
      latitude: 1.3009,
      longitude: 103.8623,
      room_type_name: '슈페리어 더블',
      rate_plan_name: 'Room Only',
      net_price: 182000,
      meal_plan: '조식 불포함',
      cancellation_type: 'partial_penalty',
    }),
  ];
  return {
    search_id: searchId,
    status: 'ok',
    searched_at: new Date().toISOString(),
    results,
  };
}
