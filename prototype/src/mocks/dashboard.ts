import { allHotels, hotelCodeOf, toJpy } from './hotelDb';

/**
 * OhMyHotel 베스트셀러 호텔 랭킹 — 대시보드 Overview 하단 표.
 *
 * **성격 확정 (2026-07-17, PD팀): 마케팅 용도이며 순위는 우리가 결정한다.**
 * 즉 판매량에서 계산되는 지표가 아니라 **편집(큐레이션)된 프로모션 목록**이다.
 * 대시보드의 다른 수치는 전부 예약에서 파생되지만(utils/dashboardStats.ts)
 * 이것만 예외인 이유가 여기에 있다 — 애초에 파생시킬 대상이 아니다.
 *
 * 그래서 **운영 요구사항은 집계가 아니라 편집 수단**이다:
 *   · 마케팅이 배포 없이 순위를 바꿀 수 있어야 한다 (관리자 화면 또는 CMS 테이블).
 *     대문 캠페인(mocks/loginCampaigns.ts)과 같은 부류 — 프로토타입만 코드 파일.
 *   · 노출 순서·전월 순위를 그 편집 원천이 함께 보관해야 MoM 컬럼이 성립한다.
 *
 * **불변조건: 랭킹의 모든 호텔은 예약 가능해야 한다.** 프로모션인 만큼 더 그렇다 —
 * 못 파는 호텔을 띄우는 건 마케팅이 아니라 사고다. 그래서 hotelDb에서만 뽑는다.
 * (이전 목데이터는 두바이·파리·뉴욕 등 102개 도시 320개였는데 우리 인벤토리 실재는 1개뿐이었다.)
 *
 * 아래 정렬은 **마케팅이 정할 순서의 자리표시자**다 — 시드 고정이라 재현되며,
 * 실데이터 연동 시 이 파일 전체가 랭킹 편집 원천으로 교체된다.
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
   * 랭킹이 편집물이므로 이 값도 계산이 아니라 **전월 편집본과의 차이**다 —
   * 편집 원천이 지난달 순위를 보관해야 성립한다.
   */
  delta: number | null;
}

/**
 * 자리표시자 순서 — **마케팅이 정할 순위를 대신하는 그럴듯한 초기값**이다(판매량 계산이 아니다).
 * 비즈니스호텔이 더 많이 팔리는 경향을 반영하되 시드 난수로 흔들어 성급 순으로 줄 서지 않게 한다.
 *
 * 가중 격차가 크면(1.35 vs 0.7) 5성의 최고 점수가 3성 평균에도 못 미쳐
 * 상위 20위가 3성으로만 채워진다 — 목록으로 읽히지 않는다. 격차를 좁게 둔다.
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
