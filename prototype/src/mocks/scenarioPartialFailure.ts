import type { SearchResponse } from '../types';
import { makeRate, resetRateSeq } from './factory';

/** 시나리오 ⑥ 공급사 일부 실패 — 경고 배너 + 부분 결과 */
export function buildPartialFailure(searchId: string): SearchResponse {
  resetRateSeq();
  const results = [
    makeRate(searchId, {
      hotel_id: 'HTL-6001',
      hotel_name: '하얏트 리젠시 오사카',
      destination: '오사카',
      star_rating: 4,
      latitude: 34.6371,
      longitude: 135.4128,
      room_type_name: '스탠다드 트윈',
      supplier_id: 'SUP-ELLIS-01',
      net_price: 187000,
      meal_plan: '조식 불포함',
      cancellation_type: 'free_cancellation',
    }),
    makeRate(searchId, {
      hotel_id: 'HTL-6002',
      hotel_name: '스위소텔 난카이 오사카',
      destination: '오사카',
      star_rating: 4,
      latitude: 34.6612,
      longitude: 135.5022,
      room_type_name: '클래식 더블',
      supplier_id: 'SUP-ELLIS-01',
      net_price: 214000,
      meal_plan: '조식 포함',
      cancellation_type: 'free_cancellation',
    }),
    makeRate(searchId, {
      hotel_id: 'HTL-6003',
      hotel_name: '난바 오리엔탈 호텔',
      destination: '오사카',
      star_rating: 3,
      latitude: 34.667,
      longitude: 135.5012,
      room_type_name: '스탠다드 더블',
      supplier_id: 'SUP-JP-JTB',
      net_price: 118000,
      meal_plan: '조식 불포함',
      cancellation_type: 'non_refundable',
    }),
  ];
  return {
    search_id: searchId,
    status: 'partial',
    warning_banner:
      '일부 공급사(SUP-JP-RAKUTEN, SUP-GLOBAL-EXP) 응답이 실패하여 부분 결과만 표시합니다. 잠시 후 재검색하면 더 많은 요금이 조회될 수 있습니다.',
    failed_suppliers: ['SUP-JP-RAKUTEN', 'SUP-GLOBAL-EXP'],
    searched_at: new Date().toISOString(),
    results,
  };
}
