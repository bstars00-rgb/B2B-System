/**
 * ELLIS 포인트 프로모 (리워드 배수 캠페인) — **내부 시스템(ELLIS)에서 관리, 고객 비노출.**
 * 오피포인트 프로토타입. 폐기 시 이 파일도 함께 삭제.
 *
 * 현업 요구:
 *  - 배수(예: **2X 리워드**)는 ELLIS 내부에서 설정, 고객은 요율 대신 "200% 적립" 배지만 본다.
 *  - **호텔별 · 룸타입별 · 레이트플랜별** 로 설정 가능(+ 예약일 기준 기간).
 *  - 매칭: 룸타입/레이트플랜은 예약의 room_type(부분일치)으로 판정('all'=전체). 기간은 예약일 기준.
 */

export interface PointPromo {
  id: string;
  hotelId: string;
  hotelName: string;
  /** 룸타입 (트윈/더블/싱글/스위트 등, room_type 부분일치). 'all'=전체 */
  roomType: string[] | 'all';
  /** 레이트플랜 (RP-1 등, room_type/플랜 부분일치). 'all'=전체 */
  ratePlan: string[] | 'all';
  /** 예약일 기준 적용 기간 */
  start: string;
  end: string;
  /** 배수 — 2.0 = 2X 리워드(=200% 적립) */
  multiplier: number;
  active: boolean;
  /** 캠페인 카드 호텔 사진(선택) — 없으면 플레이스홀더. 실제로는 호텔 마스터/교섭 시 등록. */
  image?: string;
}

export const SEED_PROMOS: PointPromo[] = [
  {
    id: 'promo-2x-ginza',
    hotelId: 'HTL-TYO-09',
    hotelName: 'Sotetsu Fresa Inn Ginza Nanachome',
    roomType: 'all',
    ratePlan: 'all',
    start: '2026-05-01',
    end: '2026-09-30',
    multiplier: 2.0, // 2X 리워드
    active: true,
  },
  {
    id: 'promo-takada-15',
    hotelId: 'HTL-TYO-12',
    hotelName: 'Sotetsu Grand Fresa Takadanobaba',
    roomType: 'all',
    ratePlan: 'all',
    start: '2026-06-01',
    end: '2026-06-30',
    multiplier: 1.5,
    active: true,
  },
  {
    id: 'promo-2x-twin-rp1',
    hotelId: 'HTL-TYO-12',
    hotelName: 'Sotetsu Grand Fresa Takadanobaba',
    roomType: ['Twin', '트윈'], // 룸타입 지정 예시
    ratePlan: ['RP-1'], // 레이트플랜 지정 예시
    start: '2026-08-01',
    end: '2026-09-30',
    multiplier: 2.0,
    active: false, // 시연용(비활성) — 호텔·룸타입·레이트플랜 지정 가능함을 보여주는 예
  },
];
