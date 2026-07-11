import type { SearchResponse } from '../types';
import { makeRate, minutesAgoIso, resetRateSeq } from './factory';

/** 시나리오 ⑩ 오래된 검색 결과 — 캐시 TTL(30분) 초과, STALE 경고 */
export function buildStale(searchId: string): SearchResponse {
  resetRateSeq();
  const STALE_MINUTES = 47;
  const results = [
    makeRate(searchId, {
      hotel_id: 'HTL-7001',
      hotel_name: '멜리아 다낭 비치 리조트',
      destination: '다낭',
      star_rating: 5,
      latitude: 16.0016,
      longitude: 108.2635,
      room_type_name: '디럭스 오션뷰',
      net_price: 264000,
      meal_plan: '조식 포함',
      cancellation_type: 'free_cancellation',
      updated_minutes_ago: STALE_MINUTES,
      has_booking_token: false,
      warnings: ['조회 후 30분 경과 — 요금/재고가 변동되었을 수 있습니다'],
    }),
    makeRate(searchId, {
      hotel_id: 'HTL-7002',
      hotel_name: '다낭 미카즈키 재팬 리조트',
      destination: '다낭',
      star_rating: 5,
      latitude: 16.0942,
      longitude: 108.1292,
      room_type_name: '스탠다드 트윈',
      net_price: 186000,
      meal_plan: '조식 포함',
      cancellation_type: 'partial_penalty',
      updated_minutes_ago: STALE_MINUTES,
      has_booking_token: false,
      warnings: ['조회 후 30분 경과 — 요금/재고가 변동되었을 수 있습니다'],
    }),
    makeRate(searchId, {
      hotel_id: 'HTL-7003',
      hotel_name: '무엉탄 럭셔리 다낭',
      destination: '다낭',
      star_rating: 4,
      latitude: 16.0605,
      longitude: 108.2455,
      room_type_name: '디럭스 킹',
      net_price: 98000,
      meal_plan: '조식 불포함',
      cancellation_type: 'non_refundable',
      updated_minutes_ago: STALE_MINUTES,
      has_booking_token: false,
      warnings: ['조회 후 30분 경과 — 요금/재고가 변동되었을 수 있습니다'],
    }),
  ];
  return {
    search_id: searchId,
    status: 'ok',
    is_stale: true,
    warning_banner:
      '이 결과는 조회 후 30분이 지난 캐시 결과입니다(STALE). 요금·재고가 변동되었을 수 있으니 재검색 후 확정하세요.',
    searched_at: minutesAgoIso(STALE_MINUTES),
    results,
  };
}
