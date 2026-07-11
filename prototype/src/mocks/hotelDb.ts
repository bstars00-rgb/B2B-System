import type { RateResult, SearchConditions } from '../types';
import { makeRate, resetRateSeq, type RateSeed } from './factory';

/**
 * 목적지 인식형 mock 호텔 DB.
 * 검색 조건의 목적지에 맞는 도시 호텔(현지 통화 요금)을 반환한다.
 * 미등록 도시는 "{도시} 그랜드 호텔" 형태의 제네릭 세트로 대체한다.
 */

interface HotelSeed {
  id: string;
  name: string;
  star: number;
  lat: number;
  lng: number;
  /** 1박 net 요금 (도시 현지 통화 기준) */
  base: number;
}

interface CityDef {
  /** 파서가 추출하는 목적지 표기 (대표명) */
  destination: string;
  aliases: string[];
  currency: string;
  /** 취소 마감일시 표기용 UTC 오프셋 */
  tzOffset: string;
  hotels: HotelSeed[];
}

const CITIES: CityDef[] = [
  {
    destination: '도쿄',
    aliases: ['도쿄'],
    currency: 'JPY',
    tzOffset: '+09:00',
    hotels: [
      { id: 'HTL-TYO-01', name: '도쿄 스테이션 호텔', star: 5, lat: 35.6812, lng: 139.7671, base: 58000 },
      { id: 'HTL-TYO-02', name: '팔레스 호텔 도쿄', star: 5, lat: 35.6841, lng: 139.7614, base: 74000 },
      { id: 'HTL-TYO-03', name: '미츠이 가든 호텔 긴자', star: 4, lat: 35.669, lng: 139.7649, base: 28500 },
      { id: 'HTL-TYO-04', name: '호텔 그레이스리 신주쿠', star: 4, lat: 35.6952, lng: 139.7015, base: 21000 },
      { id: 'HTL-TYO-05', name: '시나가와 프린스 호텔', star: 4, lat: 35.6285, lng: 139.7387, base: 18500 },
      { id: 'HTL-TYO-06', name: '게이오 플라자 호텔 도쿄', star: 4, lat: 35.6899, lng: 139.6946, base: 26500 },
      { id: 'HTL-TYO-07', name: '더 게이트 호텔 가미나리몬', star: 4, lat: 35.7106, lng: 139.7967, base: 17000 },
      { id: 'HTL-TYO-08', name: '아사쿠사 뷰 호텔', star: 4, lat: 35.7159, lng: 139.7902, base: 16000 },
      { id: 'HTL-TYO-09', name: '소테츠 프레사 인 긴자 나나초메', star: 3, lat: 35.6688, lng: 139.7635, base: 12000 },
      { id: 'HTL-TYO-10', name: '롯폰기 캔들 호텔', star: 3, lat: 35.6641, lng: 139.7315, base: 11000 },
    ],
  },
  {
    destination: '오사카',
    aliases: ['오사카'],
    currency: 'JPY',
    tzOffset: '+09:00',
    hotels: [
      { id: 'HTL-OSA-01', name: '세인트 레지스 오사카', star: 5, lat: 34.6851, lng: 135.5006, base: 62000 },
      { id: 'HTL-OSA-02', name: '스위소텔 난카이 오사카', star: 5, lat: 34.6614, lng: 135.5022, base: 38000 },
      { id: 'HTL-OSA-03', name: '크로스 호텔 오사카', star: 4, lat: 34.6684, lng: 135.5013, base: 22000 },
      { id: 'HTL-OSA-04', name: '호텔 몬토레 그라스미어 오사카', star: 4, lat: 34.6627, lng: 135.4987, base: 17500 },
      { id: 'HTL-OSA-05', name: '리가 로얄 호텔 오사카', star: 4, lat: 34.6817, lng: 135.4884, base: 16000 },
      { id: 'HTL-OSA-06', name: '도미 인 프리미엄 난바', star: 3, lat: 34.6632, lng: 135.5015, base: 12500 },
    ],
  },
  {
    destination: '교토',
    aliases: ['교토'],
    currency: 'JPY',
    tzOffset: '+09:00',
    hotels: [
      { id: 'HTL-KYO-01', name: '하얏트 리젠시 교토', star: 5, lat: 34.9906, lng: 135.7727, base: 54000 },
      { id: 'HTL-KYO-02', name: '호텔 그란비아 교토', star: 4, lat: 34.9858, lng: 135.7585, base: 27000 },
      { id: 'HTL-KYO-03', name: '미츠이 가든 호텔 교토 신마치', star: 4, lat: 35.0056, lng: 135.7573, base: 20000 },
      { id: 'HTL-KYO-04', name: '교토 센추리 호텔', star: 4, lat: 34.9873, lng: 135.7602, base: 18500 },
      { id: 'HTL-KYO-05', name: '알몬트 호텔 교토', star: 3, lat: 34.9879, lng: 135.7645, base: 13000 },
    ],
  },
  {
    destination: '후쿠오카',
    aliases: ['후쿠오카'],
    currency: 'JPY',
    tzOffset: '+09:00',
    hotels: [
      { id: 'HTL-FUK-01', name: '그랜드 하얏트 후쿠오카', star: 5, lat: 33.5892, lng: 130.4108, base: 36000 },
      { id: 'HTL-FUK-02', name: '호텔 닛코 후쿠오카', star: 4, lat: 33.5897, lng: 130.4207, base: 22000 },
      { id: 'HTL-FUK-03', name: '니시테츠 그랜드 호텔', star: 4, lat: 33.5888, lng: 130.3987, base: 16500 },
      { id: 'HTL-FUK-04', name: '리치몬드 호텔 하카타 에키마에', star: 3, lat: 33.5901, lng: 130.4174, base: 11000 },
      { id: 'HTL-FUK-05', name: '호텔 몬토레 라수르 후쿠오카', star: 3, lat: 33.5926, lng: 130.3989, base: 10500 },
    ],
  },
  {
    destination: '삿포로',
    aliases: ['삿포로'],
    currency: 'JPY',
    tzOffset: '+09:00',
    hotels: [
      { id: 'HTL-SPK-01', name: 'JR타워 호텔 닛코 삿포로', star: 4, lat: 43.0686, lng: 141.3508, base: 24000 },
      { id: 'HTL-SPK-02', name: '삿포로 그랜드 호텔', star: 4, lat: 43.0611, lng: 141.3486, base: 17000 },
      { id: 'HTL-SPK-03', name: '크로스 호텔 삿포로', star: 4, lat: 43.0655, lng: 141.3521, base: 15500 },
      { id: 'HTL-SPK-04', name: '호텔 그레이스리 삿포로', star: 3, lat: 43.0648, lng: 141.3512, base: 10000 },
    ],
  },
  {
    destination: '서울',
    aliases: ['서울', '명동', '강남'],
    currency: 'KRW',
    tzOffset: '+09:00',
    hotels: [
      { id: 'HTL-SEL-01', name: '조선 팰리스 서울 강남', star: 5, lat: 37.5049, lng: 127.0046, base: 520000 },
      { id: 'HTL-SEL-02', name: '롯데호텔 서울', star: 5, lat: 37.5651, lng: 126.9811, base: 380000 },
      { id: 'HTL-SEL-03', name: '안다즈 서울 강남', star: 5, lat: 37.5241, lng: 127.0396, base: 410000 },
      { id: 'HTL-SEL-04', name: '코트야드 메리어트 서울 남대문', star: 4, lat: 37.5591, lng: 126.9769, base: 210000 },
      { id: 'HTL-SEL-05', name: '글래드 여의도', star: 4, lat: 37.5217, lng: 126.9243, base: 165000 },
      { id: 'HTL-SEL-06', name: '신라스테이 광화문', star: 4, lat: 37.5713, lng: 126.9794, base: 155000 },
      { id: 'HTL-SEL-07', name: '나인트리 프리미어 호텔 명동 2', star: 3, lat: 37.5636, lng: 126.9869, base: 120000 },
      { id: 'HTL-SEL-08', name: '롯데시티호텔 마포', star: 3, lat: 37.5432, lng: 126.9512, base: 105000 },
    ],
  },
  {
    destination: '부산',
    aliases: ['부산', '해운대'],
    currency: 'KRW',
    tzOffset: '+09:00',
    hotels: [
      { id: 'HTL-PUS-01', name: '파크 하얏트 부산', star: 5, lat: 35.1568, lng: 129.1454, base: 350000 },
      { id: 'HTL-PUS-02', name: '롯데호텔 부산', star: 5, lat: 35.1543, lng: 129.0592, base: 240000 },
      { id: 'HTL-PUS-03', name: '신라스테이 해운대', star: 4, lat: 35.1601, lng: 129.1616, base: 145000 },
      { id: 'HTL-PUS-04', name: '페어필드 바이 메리어트 부산', star: 4, lat: 35.1554, lng: 129.1442, base: 135000 },
      { id: 'HTL-PUS-05', name: '토요코인 부산역 1', star: 3, lat: 35.1156, lng: 129.0403, base: 78000 },
    ],
  },
  {
    destination: '제주',
    aliases: ['제주', '서귀포'],
    currency: 'KRW',
    tzOffset: '+09:00',
    hotels: [
      { id: 'HTL-CJU-01', name: '신라호텔 제주', star: 5, lat: 33.2478, lng: 126.4109, base: 480000 },
      { id: 'HTL-CJU-02', name: '그랜드 하얏트 제주', star: 5, lat: 33.4849, lng: 126.4934, base: 320000 },
      { id: 'HTL-CJU-03', name: '롯데호텔 제주', star: 5, lat: 33.2475, lng: 126.4076, base: 390000 },
      { id: 'HTL-CJU-04', name: '메종 글래드 제주', star: 4, lat: 33.4886, lng: 126.4916, base: 150000 },
      { id: 'HTL-CJU-05', name: '호텔 리젠트마린 더 블루', star: 3, lat: 33.5145, lng: 126.5241, base: 95000 },
    ],
  },
  {
    destination: '방콕',
    aliases: ['방콕', '수쿰윗', '실롬'],
    currency: 'THB',
    tzOffset: '+07:00',
    hotels: [
      { id: 'HTL-BKK-01', name: '만다린 오리엔탈 방콕', star: 5, lat: 13.7244, lng: 100.5139, base: 15500 },
      { id: 'HTL-BKK-02', name: '샹그릴라 방콕', star: 5, lat: 13.7213, lng: 100.5133, base: 7200 },
      { id: 'HTL-BKK-03', name: '반얀트리 방콕', star: 5, lat: 13.7237, lng: 100.5399, base: 6300 },
      { id: 'HTL-BKK-04', name: '아난타라 리버사이드 방콕 리조트', star: 5, lat: 13.6934, lng: 100.4867, base: 5400 },
      { id: 'HTL-BKK-05', name: '차트리움 호텔 리버사이드 방콕', star: 4, lat: 13.7069, lng: 100.5045, base: 3600 },
      { id: 'HTL-BKK-06', name: '이스틴 그랜드 호텔 사톤', star: 4, lat: 13.7194, lng: 100.5262, base: 3900 },
      { id: 'HTL-BKK-07', name: '센타라 워터게이트 파빌리온', star: 4, lat: 13.7522, lng: 100.5421, base: 2700 },
      { id: 'HTL-BKK-08', name: '노보텔 방콕 실롬 로드', star: 4, lat: 13.7241, lng: 100.5236, base: 2900 },
      { id: 'HTL-BKK-09', name: '홀리데이 인 방콕 실롬', star: 4, lat: 13.7222, lng: 100.5194, base: 3100 },
      { id: 'HTL-BKK-10', name: '아이비스 방콕 리버사이드', star: 3, lat: 13.7061, lng: 100.4894, base: 1600 },
    ],
  },
  {
    destination: '싱가포르',
    aliases: ['싱가포르', '마리나베이', '센토사'],
    currency: 'SGD',
    tzOffset: '+08:00',
    hotels: [
      { id: 'HTL-SIN-01', name: '마리나 베이 샌즈', star: 5, lat: 1.2834, lng: 103.8607, base: 720 },
      { id: 'HTL-SIN-02', name: '팬 퍼시픽 싱가포르', star: 5, lat: 1.2916, lng: 103.8592, base: 420 },
      { id: 'HTL-SIN-03', name: '콘래드 센테니얼 싱가포르', star: 5, lat: 1.2931, lng: 103.8586, base: 450 },
      { id: 'HTL-SIN-04', name: '파크로얄 컬렉션 마리나 베이', star: 5, lat: 1.2907, lng: 103.8572, base: 480 },
      { id: 'HTL-SIN-05', name: '스위소텔 더 스탬포드', star: 4, lat: 1.2931, lng: 103.8535, base: 350 },
      { id: 'HTL-SIN-06', name: '칼튼 호텔 싱가포르', star: 4, lat: 1.2966, lng: 103.8524, base: 290 },
      { id: 'HTL-SIN-07', name: '홀리데이 인 익스프레스 클락 키', star: 3, lat: 1.2891, lng: 103.8465, base: 210 },
      { id: 'HTL-SIN-08', name: '호텔 보스', star: 3, lat: 1.3021, lng: 103.8623, base: 165 },
    ],
  },
  {
    destination: '다낭',
    aliases: ['다낭', '미케비치'],
    currency: 'VND',
    tzOffset: '+07:00',
    hotels: [
      { id: 'HTL-DAD-01', name: '인터컨티넨탈 다낭 선 페닌슐라', star: 5, lat: 16.1194, lng: 108.3049, base: 12500000 },
      { id: 'HTL-DAD-02', name: '하얏트 리젠시 다낭', star: 5, lat: 16.0201, lng: 108.2637, base: 5200000 },
      { id: 'HTL-DAD-03', name: '프리미어 빌리지 다낭 리조트', star: 5, lat: 16.0325, lng: 108.2519, base: 6800000 },
      { id: 'HTL-DAD-04', name: '멜리아 빈펄 다낭 리버프론트', star: 4, lat: 16.0544, lng: 108.2277, base: 2100000 },
      { id: 'HTL-DAD-05', name: '무엉탄 럭셔리 다낭', star: 4, lat: 16.0623, lng: 108.2467, base: 1500000 },
      { id: 'HTL-DAD-06', name: '사노우바 다낭 호텔', star: 3, lat: 16.0651, lng: 108.2437, base: 950000 },
    ],
  },
  {
    destination: '하노이',
    aliases: ['하노이'],
    currency: 'VND',
    tzOffset: '+07:00',
    hotels: [
      { id: 'HTL-HAN-01', name: '소피텔 레전드 메트로폴 하노이', star: 5, lat: 21.0256, lng: 105.8562, base: 8500000 },
      { id: 'HTL-HAN-02', name: '롯데호텔 하노이', star: 5, lat: 21.0324, lng: 105.8121, base: 4200000 },
      { id: 'HTL-HAN-03', name: '멜리아 하노이', star: 4, lat: 21.0245, lng: 105.8482, base: 2600000 },
      { id: 'HTL-HAN-04', name: '라 시에스타 클래식 마 마이', star: 3, lat: 21.0341, lng: 105.8512, base: 1400000 },
    ],
  },
  {
    destination: '호치민',
    aliases: ['호치민', '사이공'],
    currency: 'VND',
    tzOffset: '+07:00',
    hotels: [
      { id: 'HTL-SGN-01', name: '파크 하얏트 사이공', star: 5, lat: 10.7797, lng: 106.7032, base: 8900000 },
      { id: 'HTL-SGN-02', name: '카라벨 사이공', star: 5, lat: 10.7766, lng: 106.7034, base: 4600000 },
      { id: 'HTL-SGN-03', name: '노보텔 사이공 센터', star: 4, lat: 10.7867, lng: 106.6911, base: 2200000 },
      { id: 'HTL-SGN-04', name: '리버티 센트럴 사이공 리버사이드', star: 3, lat: 10.7712, lng: 106.7052, base: 1600000 },
    ],
  },
  {
    destination: '타이베이',
    aliases: ['타이베이', '시먼딩'],
    currency: 'TWD',
    tzOffset: '+08:00',
    hotels: [
      { id: 'HTL-TPE-01', name: '만다린 오리엔탈 타이베이', star: 5, lat: 25.0525, lng: 121.5441, base: 11500 },
      { id: 'HTL-TPE-02', name: 'W 타이베이', star: 5, lat: 25.0403, lng: 121.5651, base: 9800 },
      { id: 'HTL-TPE-03', name: '앰배서더 호텔 타이베이', star: 4, lat: 25.0546, lng: 121.5251, base: 4300 },
      { id: 'HTL-TPE-04', name: '시저 파크 호텔 타이베이', star: 4, lat: 25.0463, lng: 121.5171, base: 3800 },
      { id: 'HTL-TPE-05', name: '코스모스 호텔 타이베이', star: 3, lat: 25.0461, lng: 121.5179, base: 2600 },
    ],
  },
  {
    destination: '홍콩',
    aliases: ['홍콩', '침사추이'],
    currency: 'HKD',
    tzOffset: '+08:00',
    hotels: [
      { id: 'HTL-HKG-01', name: '페닌슐라 홍콩', star: 5, lat: 22.295, lng: 114.1719, base: 4200 },
      { id: 'HTL-HKG-02', name: '아일랜드 샹그릴라 홍콩', star: 5, lat: 22.2777, lng: 114.1658, base: 2900 },
      { id: 'HTL-HKG-03', name: '하얏트 센트릭 빅토리아 하버', star: 4, lat: 22.2887, lng: 114.1928, base: 1500 },
      { id: 'HTL-HKG-04', name: '로얄 플라자 호텔', star: 4, lat: 22.3252, lng: 114.1697, base: 1100 },
      { id: 'HTL-HKG-05', name: '이비스 홍콩 센트럴 & 셩완', star: 3, lat: 22.2874, lng: 114.1489, base: 750 },
    ],
  },
];

const ROOM_TYPES = [
  '스탠다드 트윈',
  '수페리어 더블',
  '디럭스 킹',
  '프리미어 시티뷰',
  '이그제큐티브 트윈',
];

const SUPPLIERS = ['SUP-ELLIS-01', 'SUP-EPS-02', 'SUP-HB-03'];

function cityFor(destination: string | null): CityDef | null {
  if (!destination) return null;
  return CITIES.find((c) => c.aliases.some((a) => destination.includes(a))) ?? null;
}

function norm(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase();
}

/** 자연어 질문에서 특정 호텔명 매칭 (공백 무시) — 매칭 시 대표 호텔명 반환 */
export function matchHotelName(query: string): string | null {
  const q = norm(query);
  for (const city of CITIES) {
    for (const h of city.hotels) {
      if (q.includes(norm(h.name))) return h.name;
    }
  }
  // 부분 표기 매칭 (예: "마리나베이샌즈" ⊂ "마리나 베이 샌즈" 전체 일치 외 관용 표기)
  const KNOWN_PARTIALS: Array<[string, string]> = [
    ['마리나베이샌즈', '마리나 베이 샌즈'],
    ['만다린오리엔탈방콕', '만다린 오리엔탈 방콕'],
    ['롯데호텔서울', '롯데호텔 서울'],
    ['파크하얏트부산', '파크 하얏트 부산'],
    ['인터컨티넨탈다낭', '인터컨티넨탈 다낭 선 페닌슐라'],
  ];
  for (const [alias, name] of KNOWN_PARTIALS) {
    if (q.includes(alias)) return name;
  }
  return null;
}

/** 미등록 도시용 제네릭 호텔 세트 (KRW) */
function genericCity(destination: string): CityDef {
  const seeds: Array<[string, number, number]> = [
    [`${destination} 그랜드 호텔`, 5, 420000],
    [`${destination} 마리어트 호텔`, 5, 360000],
    [`${destination} 시티 센터 호텔`, 4, 210000],
    [`${destination} 파크 호텔`, 4, 175000],
    [`${destination} 스테이션 호텔`, 3, 120000],
    [`${destination} 부티크 인`, 3, 98000],
  ];
  return {
    destination,
    aliases: [destination],
    currency: 'KRW',
    tzOffset: '+09:00',
    hotels: seeds.map(([name, star, base], i) => ({
      id: `HTL-GEN-${String(i + 1).padStart(2, '0')}`,
      name,
      star,
      lat: 0,
      lng: 0,
      base,
    })),
  };
}

function deadlineFor(checkIn: string | null, tzOffset: string): string {
  if (!checkIn) return `2026-08-17T23:59:00${tzOffset}`;
  const d = new Date(`${checkIn}T00:00:00`);
  d.setDate(d.getDate() - 3);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}T23:59:00${tzOffset}`;
}

const MAX_HOTELS = 9;
const MAX_RATES = 14;
const MAX_RECOMMENDED_HOTELS = 4;

export interface CityResults {
  results: RateResult[];
  /** 특정 호텔 검색 시 함께 제안하는 동일 도시 추천 호텔 */
  recommended: RateResult[];
}

/**
 * 목적지·조건 기반 요금 결과 생성.
 * - 특정 호텔 지목 시: 해당 호텔의 요금제만 results로, 동일 도시 유사 성급 호텔을 recommended로 반환
 * - 성급(이상)·조식·무료취소 필터를 적용하고, 필터로 전부 걸러지면 필터 없이 반환한다.
 * - 예산 필터는 통화 혼동 방지를 위해 KRW 도시에만 적용 (임의 환율 환산 금지 원칙)
 */
export function buildCityResults(
  searchId: string,
  conditions?: SearchConditions | null,
): CityResults {
  resetRateSeq();
  const targetHotelName = conditions?.hotel_name ?? null;
  const cityOfHotel = targetHotelName
    ? (CITIES.find((c) => c.hotels.some((h) => h.name === targetHotelName)) ?? null)
    : null;
  const city =
    cityOfHotel ??
    cityFor(conditions?.destination ?? null) ??
    (conditions?.destination ? genericCity(conditions.destination) : CITIES[0]);

  const nights = conditions?.nights ?? 2;
  const deadline = deadlineFor(conditions?.check_in ?? null, city.tzOffset);

  const buildForHotel = (h: HotelSeed, i: number): RateSeed[] => {
    const breakfastBase = i % 2 === 0;
    const roomType = ROOM_TYPES[i % ROOM_TYPES.length];
    const supplier = SUPPLIERS[i % SUPPLIERS.length];
    const common = {
      hotel_id: h.id,
      hotel_name: h.name,
      destination: city.destination,
      star_rating: h.star,
      latitude: h.lat,
      longitude: h.lng,
      currency: city.currency,
      total_nights: nights,
      supplier_id: supplier,
      cancellation_deadline: deadline,
    };
    const plans: RateSeed[] = [
      {
        ...common,
        room_type_name: roomType,
        rate_plan_name: '베스트 플렉시블',
        meal_plan: breakfastBase ? '조식 포함' : '조식 불포함',
        cancellation_type: 'free_cancellation',
        net_price: h.base * nights,
      },
    ];
    if (i % 3 === 0) {
      plans.push({
        ...common,
        room_type_name: roomType,
        rate_plan_name: '논리펀더블 특가',
        meal_plan: breakfastBase ? '조식 포함' : '조식 불포함',
        cancellation_type: 'non_refundable',
        net_price: Math.round(h.base * nights * 0.85),
      });
    }
    if (i % 4 === 1 && !breakfastBase) {
      plans.push({
        ...common,
        room_type_name: roomType,
        rate_plan_name: '조식 포함 플렉시블',
        meal_plan: '조식 포함',
        cancellation_type: 'free_cancellation',
        net_price: Math.round(h.base * nights * 1.12),
      });
    }
    // 재고 상태 변화 (참고용 요금·온리퀘스트 케이스 재현)
    if (i % 8 === 6) {
      plans[0].availability = 'on_request';
      plans[0].warnings = ['온리퀘스트 객실 — 확정까지 최대 24시간 소요'];
    }
    if (i % 10 === 9) {
      plans[0].availability = 'unavailable';
      plans[0].has_booking_token = false;
      plans[0].warnings = ['조회 시점 기준 재고 소진 — 참고용 요금'];
    }
    return plans;
  };

  const passes = (s: RateSeed): boolean => {
    if (conditions?.star_rating && (s.star_rating ?? 0) < conditions.star_rating) return false;
    if (conditions?.breakfast_included === true && s.meal_plan !== '조식 포함') return false;
    if (conditions?.breakfast_included === false && s.meal_plan === '조식 포함') return false;
    if (conditions?.free_cancellation_only === true && s.cancellation_type !== 'free_cancellation')
      return false;
    if (
      conditions?.budget_max &&
      city.currency === 'KRW' &&
      (s.net_price ?? 0) / (s.total_nights ?? 1) > conditions.budget_max
    )
      return false;
    return true;
  };
  /** 필터 적용 — 전부 걸러지면 필터 없이 반환 (정상 시나리오에서 빈 결과 방지) */
  const applyFilters = (list: RateSeed[]): RateSeed[] => {
    const filtered = list.filter(passes);
    return filtered.length > 0 ? filtered : list;
  };

  // ── 특정 호텔 지목 검색: 해당 호텔 요금제 + 동일 도시 추천 ──
  const target = targetHotelName
    ? (city.hotels.find((h) => h.name === targetHotelName) ?? null)
    : null;
  if (target) {
    const common = {
      hotel_id: target.id,
      hotel_name: target.name,
      destination: city.destination,
      star_rating: target.star,
      latitude: target.lat,
      longitude: target.lng,
      currency: city.currency,
      total_nights: nights,
      cancellation_deadline: deadline,
    };
    const base = target.base * nights;
    const targetSeeds: RateSeed[] = [
      {
        ...common,
        room_type_name: '스탠다드 트윈',
        rate_plan_name: '베스트 플렉시블',
        meal_plan: '조식 불포함',
        cancellation_type: 'free_cancellation',
        net_price: base,
        supplier_id: 'SUP-ELLIS-01',
      },
      {
        ...common,
        room_type_name: '스탠다드 트윈',
        rate_plan_name: '논리펀더블 특가',
        meal_plan: '조식 불포함',
        cancellation_type: 'non_refundable',
        net_price: Math.round(base * 0.85),
        supplier_id: 'SUP-EPS-02',
      },
      {
        ...common,
        room_type_name: '디럭스 킹',
        rate_plan_name: '조식 포함 플렉시블',
        meal_plan: '조식 포함',
        cancellation_type: 'free_cancellation',
        net_price: Math.round(base * 1.28),
        supplier_id: 'SUP-ELLIS-01',
      },
      {
        ...common,
        room_type_name: '이그제큐티브 스위트',
        rate_plan_name: '스위트 조식 포함',
        meal_plan: '조식 포함',
        cancellation_type: 'free_cancellation',
        net_price: Math.round(base * 1.9),
        supplier_id: 'SUP-HB-03',
      },
    ];
    const results = applyFilters(targetSeeds).map((s) => makeRate(searchId, s));

    // 추천: 동일 도시, 성급 근접 순 — 호텔당 최저가 1건
    const others = city.hotels
      .filter((h) => h.id !== target.id)
      .sort((a, b) => Math.abs(a.star - target.star) - Math.abs(b.star - target.star));
    const recSeeds = applyFilters(
      others.flatMap((h) => buildForHotel(h, city.hotels.indexOf(h))),
    );
    const cheapestByHotel = new Map<string, RateSeed>();
    for (const s of recSeeds) {
      const prev = cheapestByHotel.get(s.hotel_id);
      if (!prev || (s.net_price ?? 0) < (prev.net_price ?? 0)) cheapestByHotel.set(s.hotel_id, s);
    }
    const recommended = others
      .map((h) => cheapestByHotel.get(h.id))
      .filter((s): s is RateSeed => Boolean(s))
      .slice(0, MAX_RECOMMENDED_HOTELS)
      .map((s) => makeRate(searchId, s));

    return { results, recommended };
  }

  // ── 일반 목적지 검색 ──
  let seeds = applyFilters(city.hotels.flatMap(buildForHotel));

  // 호텔 수·요금제 수 상한
  const hotelIds = [...new Set(seeds.map((s) => s.hotel_id))].slice(0, MAX_HOTELS);
  seeds = seeds.filter((s) => hotelIds.includes(s.hotel_id)).slice(0, MAX_RATES);

  return { results: seeds.map((s) => makeRate(searchId, s)), recommended: [] };
}

/** 등록된 도시 대표명 목록 (파서 사전과 동기화용) */
export const CITY_DESTINATIONS = CITIES.map((c) => c.destination);
