import type { SearchResponse } from '../types';
import { makeRate, resetRateSeq } from './factory';

/** 시나리오 ⑤ 여러 통화(KRW/JPY/SGD) — 공급사별 정산 통화가 섞여 내려오는 케이스 */
export function buildMultiCurrency(searchId: string): SearchResponse {
  resetRateSeq();
  const results = [
    makeRate(searchId, {
      hotel_id: 'HTL-5001',
      hotel_name: '호텔 뉴오타니 도쿄',
      destination: '도쿄',
      star_rating: 5,
      latitude: 35.6802,
      longitude: 139.7345,
      room_type_name: '가든타워 트윈',
      supplier_id: 'SUP-JP-RAKUTEN',
      net_price: 52000,
      currency: 'JPY',
      meal_plan: '조식 포함',
      cancellation_type: 'free_cancellation',
      warnings: ['공급사 정산 통화 JPY — 원화 환산 금액은 결제 시점 환율 적용'],
    }),
    makeRate(searchId, {
      hotel_id: 'HTL-5002',
      hotel_name: '시부야 엑셀 호텔 도큐',
      destination: '도쿄',
      star_rating: 4,
      latitude: 35.658,
      longitude: 139.7016,
      room_type_name: '스탠다드 더블',
      supplier_id: 'SUP-JP-JTB',
      net_price: 31000,
      currency: 'JPY',
      meal_plan: '조식 불포함',
      cancellation_type: 'free_cancellation',
      warnings: ['공급사 정산 통화 JPY — 원화 환산 금액은 결제 시점 환율 적용'],
    }),
    makeRate(searchId, {
      hotel_id: 'HTL-5003',
      hotel_name: '마리나 베이 샌즈',
      destination: '싱가포르',
      star_rating: 5,
      latitude: 1.2834,
      longitude: 103.8607,
      room_type_name: '디럭스 킹',
      supplier_id: 'SUP-SG-DIRECT',
      net_price: 620,
      currency: 'SGD',
      meal_plan: '조식 불포함',
      cancellation_type: 'partial_penalty',
      warnings: ['공급사 정산 통화 SGD'],
    }),
    makeRate(searchId, {
      hotel_id: 'HTL-5004',
      hotel_name: '조선 팰리스 서울 강남',
      destination: '서울',
      star_rating: 5,
      latitude: 37.5049,
      longitude: 127.0033,
      room_type_name: '그랜드 디럭스 킹',
      supplier_id: 'SUP-ELLIS-01',
      net_price: 486000,
      currency: 'KRW',
      meal_plan: '조식 포함',
      cancellation_type: 'free_cancellation',
    }),
  ];
  return {
    search_id: searchId,
    status: 'ok',
    warning_banner:
      '검색 결과에 여러 통화(KRW·JPY·SGD)가 포함되어 있습니다. 통화 간 금액 직접 비교에 주의하세요.',
    searched_at: new Date().toISOString(),
    results,
  };
}
