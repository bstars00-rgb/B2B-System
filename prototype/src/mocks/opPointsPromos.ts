/**
 * ELLIS 포인트 프로모 — 지정 호텔 배수 적립 설정. **내부 시스템(ELLIS)에서 관리, 고객 비노출.**
 * 3차 고도화(오피포인트) 프로토타입. 폐기 시 이 파일도 함께 삭제.
 *
 * 현업 요구(2026-07-29): 포인트 배수는 ELLIS 내부에서 변경. **지정 호텔·기간·룸타입에만** 적용.
 * 고객은 요율(계산식)을 모르고 "150% 적립" 배지만 본다. (기간 = 예약일 기준)
 */

export interface PointPromo {
  id: string;
  hotelId: string;
  hotelName: string;
  /** 지정 룸타입 (부분일치) — 'all'이면 전 룸타입 */
  roomTypes: string[] | 'all';
  /** 예약일 기준 적용 기간 */
  start: string;
  end: string;
  /** 배수 — 1.5 = 기본의 150% */
  multiplier: number;
  active: boolean;
}

export const SEED_PROMOS: PointPromo[] = [
  {
    id: 'promo-sotetsu-takada',
    hotelId: 'HTL-TYO-12',
    hotelName: 'Sotetsu Grand Fresa Takadanobaba',
    roomTypes: 'all',
    start: '2026-06-01',
    end: '2026-06-30',
    multiplier: 1.5,
    active: true,
  },
  {
    id: 'promo-sotetsu-ginza',
    hotelId: 'HTL-TYO-09',
    hotelName: 'Sotetsu Fresa Inn Ginza Nanachome',
    roomTypes: 'all',
    start: '2026-05-01',
    end: '2026-07-31',
    multiplier: 2.0,
    active: true,
  },
];
