import { allHotels, hotelCodeOf, toJpy } from './hotelDb';

/**
 * OhMyHotel 베스트셀러 호텔 랭킹 — 대시보드 Overview 하단 표.
 *
 * 대시보드의 다른 수치는 전부 Bookings 예약에서 파생되지만(utils/dashboardStats.ts),
 * 이 랭킹만 별도다 — 셀러 자신의 실적이 아니라 **플랫폼 전체 판매 랭킹**이라
 * 셀러 예약 200건에서 나올 수 없는 값이기 때문.
 *
 * 다만 **판매 가능한 호텔(hotelDb)에서만 뽑는다.** 이전 목데이터는 두바이·파리·뉴욕 등
 * 102개 도시의 글로벌 목록이었는데 320개 중 우리 인벤토리에 실재하는 건 1개뿐이라,
 * "OhMyHotel 베스트셀러"인데 정작 OhMyHotel에서 예약할 수 없는 호텔이 나열되는 모순이었다.
 * 랭킹에서 호텔을 클릭해 바로 예약하려면(2026-07-17 현업 지시) 실재 호텔이어야 한다.
 *
 * [확인 필요] 실사이트 랭킹이 플랫폼 전체 기준인지 셀러 실적 기준인지 PD팀 확인 대기.
 * 실데이터 연동 시 이 파일 전체가 랭킹 API로 교체된다.
 */

/** 결정론적 PRNG — 새로고침마다 랭킹이 뒤바뀌면 데모·QA가 재현되지 않는다 */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface BestsellerRow {
  rank: number;
  /** Create Booking 연결용 — 이 랭킹의 호텔은 전부 실제 예약 가능한 호텔이다 */
  hotelId: string;
  hotelName: string;
  /** 실사이트 6자리 호텔 코드 — 셀러가 코드로 바로 검색하는 실무 동선 */
  code: string;
  starRating: number;
  chainBrand: string;
  /**
   * 1박 기준 참고 요금 (셀러 청구통화 JPY 환산).
   * 실제 요금은 날짜·인원에 따라 달라지므로 **지표성 값**이며 화면에 그렇게 표기한다.
   * [확인 필요] 실데이터에서는 랭킹 API가 최저가(from) 요금을 함께 내려줘야 한다.
   */
  nightlyFrom: number;
  /** 영문 도시명 (표시용) */
  city: string;
  /** 한글 목적지 (Create Booking 검색 연결용) */
  destination: string;
  country: string;
  /**
   * 전월 대비 순위 변동. 양수=상승, 음수=하락, 0=유지, null=신규 진입.
   * [확인 필요] 실데이터에서는 랭킹 API가 전월 순위를 함께 제공해야 한다.
   */
  delta: number | null;
}

/**
 * 판매 점수 — 성급이 낮을수록(비즈니스호텔) 많이 팔리는 실제 경향을 반영하되,
 * 시드 난수로 흔들어 순위가 성급 순으로 줄 서지 않게 한다.
 *
 * 가중 격차가 크면(1.35 vs 0.7) 5성의 최고 점수가 3성 평균에도 못 미쳐
 * 상위 20위가 3성으로만 채워진다 — 베스트셀러 목록으로 읽히지 않는다. 격차를 좁게 둔다.
 */
function build(): BestsellerRow[] {
  const rnd = seeded(20260717);
  return allHotels()
    .map((h) => {
      const starBias = h.star <= 3 ? 1.25 : h.star <= 3.5 ? 1.15 : h.star <= 4 ? 1.0 : 0.8;
      return {
        hotel: h,
        score: starBias * (0.45 + rnd()),
        delta: (() => {
          const r = rnd();
          if (r < 0.12) return null; // 신규 진입
          if (r < 0.2) return 0; // 유지
          return Math.round((rnd() - 0.45) * 16);
        })(),
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((x, i) => ({
      rank: i + 1,
      hotelId: x.hotel.id,
      hotelName: x.hotel.name,
      code: hotelCodeOf(x.hotel.id),
      starRating: x.hotel.star,
      chainBrand: x.hotel.chainBrand,
      nightlyFrom: toJpy(x.hotel.base, x.hotel.city.currency),
      city: x.hotel.city.nameEn,
      destination: x.hotel.city.destination,
      country: x.hotel.city.country,
      delta: x.delta,
    }));
}

/** 전체 랭킹 (플랫폼 전 도시) */
export const bestsellingHotels: BestsellerRow[] = build();

/** 국가별 랭킹 — 국가 안에서 순위를 다시 매긴다 */
export const bestsellingByCountry: Record<string, BestsellerRow[]> = (() => {
  const acc: Record<string, BestsellerRow[]> = {};
  for (const h of bestsellingHotels) (acc[h.country] ??= []).push(h);
  for (const k of Object.keys(acc)) acc[k] = acc[k].map((h, i) => ({ ...h, rank: i + 1 }));
  return acc;
})();
