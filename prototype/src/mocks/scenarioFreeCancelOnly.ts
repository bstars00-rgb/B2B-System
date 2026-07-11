import type { SearchResponse } from '../types';
import { makeRate, resetRateSeq } from './factory';

/** 시나리오 ② 무료 취소만 — 전 요금제 free_cancellation */
export function buildFreeCancelOnly(searchId: string): SearchResponse {
  resetRateSeq();
  const results = [
    makeRate(searchId, {
      hotel_id: 'HTL-2001',
      hotel_name: '콘래드 서울',
      destination: '서울',
      star_rating: 5,
      latitude: 37.5251,
      longitude: 126.9255,
      room_type_name: '디럭스 시티뷰 킹',
      rate_plan_name: '플렉시블 무료취소',
      net_price: 342000,
      meal_plan: '조식 포함',
      cancellation_type: 'free_cancellation',
      cancellation_deadline: '2026-08-18T18:00:00+09:00',
    }),
    makeRate(searchId, {
      hotel_id: 'HTL-2002',
      hotel_name: '롯데호텔 서울',
      destination: '서울',
      star_rating: 5,
      latitude: 37.5657,
      longitude: 126.981,
      room_type_name: '슈페리어 트윈',
      rate_plan_name: '플렉시블 무료취소',
      net_price: 298000,
      meal_plan: '조식 포함',
      cancellation_type: 'free_cancellation',
      cancellation_deadline: '2026-08-19T23:59:00+09:00',
    }),
    makeRate(searchId, {
      hotel_id: 'HTL-2003',
      hotel_name: '나인트리 프리미어 명동 2',
      destination: '서울',
      star_rating: 4,
      latitude: 37.5636,
      longitude: 126.9869,
      room_type_name: '스탠다드 더블',
      rate_plan_name: '무료취소 스탠다드',
      net_price: 152000,
      meal_plan: '조식 불포함',
      cancellation_type: 'free_cancellation',
      cancellation_deadline: '2026-08-17T23:59:00+09:00',
    }),
    makeRate(searchId, {
      hotel_id: 'HTL-2004',
      hotel_name: '신라스테이 광화문',
      destination: '서울',
      star_rating: 4,
      latitude: 37.5721,
      longitude: 126.9793,
      room_type_name: '스탠다드 트윈',
      rate_plan_name: '무료취소 스탠다드',
      net_price: 141000,
      meal_plan: '조식 불포함',
      cancellation_type: 'free_cancellation',
      cancellation_deadline: '2026-08-16T23:59:00+09:00',
    }),
  ];
  return {
    search_id: searchId,
    status: 'ok',
    searched_at: new Date().toISOString(),
    results,
  };
}
