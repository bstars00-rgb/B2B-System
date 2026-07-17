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
  /** 영문/로마자 호텔명 (자동완성 영문 검색·표시용, 실사이트 형식) */
  nameEn?: string;
  /** 실제 포털 호텔 코드 (없으면 결정론적 생성) */
  code?: string;
  star: number;
  lat: number;
  lng: number;
  /** 1박 net 요금 (도시 현지 통화 기준) */
  base: number;
  /** 좌측 필터 Property Type (기본 Hotel) */
  propertyType?: string;
  /** 좌측 필터 Hotel Chain Brand (실사이트 브랜드 목록 표기) */
  chainBrand?: string;
  /** 대표 룸타입명 (실사이트 표기 — 없으면 제네릭) */
  roomType?: string;
  /**
   * 추천 호텔 — 목록 카드에 `Recommendation` 오렌지 배지 표시 + Recommendation 정렬 시 상단 노출.
   * (닷비즈 원본 기능 — 오사카 데이터는 2026-07-15 실사이트 스크린샷 기준)
   */
  recommended?: boolean;
}

interface CityDef {
  /** 파서가 추출하는 목적지 표기 (대표명) */
  destination: string;
  /** 영문 지역명 (자동완성 영문 검색·표시용) */
  nameEn?: string;
  /** 실제 포털 지역 코드 (없으면 결정론적 생성) */
  code?: string;
  aliases: string[];
  /** 국가/지역 (대시보드 Destination 집계 단위) */
  country: string;
  currency: string;
  /** 취소 마감일시 표기용 UTC 오프셋 */
  tzOffset: string;
  hotels: HotelSeed[];
}

/** 표시/식별용 호텔명 — 영문명이 있으면 영문 우선 (실사이트와 동일) */
const displayName = (h: HotelSeed): string => h.nameEn ?? h.name;
/** 한글·영문 어느 쪽으로 검색해도 매칭 */
const hotelMatches = (h: HotelSeed, target: string): boolean =>
  h.name === target || h.nameEn === target;

const CITIES: CityDef[] = [
  {
    destination: '도쿄',
    nameEn: 'Tokyo',
    code: '102911',
    aliases: ['도쿄'],
    country: 'Japan',
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
      { id: 'HTL-TYO-09', name: '소테츠 프레사 인 긴자 나나초메', nameEn: 'Sotetsu Fresa Inn Ginza Nanachome', code: '155719', star: 3, lat: 35.6688, lng: 139.7635, base: 12000 },
      { id: 'HTL-TYO-10', name: '롯폰기 캔들 호텔', nameEn: 'Roppongi Candle Hotel', star: 3, lat: 35.6641, lng: 139.7315, base: 11000 },
      { id: 'HTL-TYO-11', name: '소테츠 프레사 인 도쿄-아카사카', nameEn: 'Sotetsu Fresa Inn Tokyo-Akasaka', code: '168085', star: 3, lat: 35.6726, lng: 139.7376, base: 15500 },
      { id: 'HTL-TYO-12', name: '소테츠 그랜드 프레사 타카다노바바', nameEn: 'Sotetsu Grand Fresa Takadanobaba', code: '752333', star: 3, lat: 35.7126, lng: 139.7038, base: 14000 },
      { id: 'HTL-TYO-13', name: '소테츠 프레사 인 도쿄 킨시초', nameEn: 'Sotetsu Fresa Inn Tokyo Kinshicho', code: '249494', star: 3, lat: 35.6969, lng: 139.8146, base: 13000 },
      { id: 'HTL-TYO-14', name: '소테츠 프레사 인 도쿄 타마치', nameEn: 'Sotetsu Fresa Inn Tokyo-Tamachi', code: '304417', star: 3, lat: 35.6457, lng: 139.7476, base: 12500 },
    ],
  },
  {
    destination: '오사카',
    nameEn: 'Osaka',
    code: '102156',
    aliases: ['오사카'],
    country: 'Japan',
    currency: 'JPY',
    tzOffset: '+09:00',
    hotels: [
      { id: 'HTL-OSA-01', name: '세인트 레지스 오사카', nameEn: 'The St. Regis Osaka', star: 5, lat: 34.6851, lng: 135.5006, base: 62000, chainBrand: 'Marriott' },
      { id: 'HTL-OSA-02', name: '스위소텔 난카이 오사카', nameEn: 'Swissotel Nankai Osaka', star: 5, lat: 34.6614, lng: 135.5022, base: 38000 },
      { id: 'HTL-OSA-03', name: '크로스 호텔 오사카', nameEn: 'Cross Hotel Osaka', star: 4, lat: 34.6684, lng: 135.5013, base: 22000, chainBrand: 'ORIX Hotel Management' },
      { id: 'HTL-OSA-04', name: '호텔 몬토레 그라스미어 오사카', nameEn: 'Hotel Monterey Grasmere Osaka', star: 4, lat: 34.6627, lng: 135.4987, base: 17500, chainBrand: 'Hotel Monterey Group' },
      { id: 'HTL-OSA-05', name: '리가 로얄 호텔 오사카', nameEn: 'Rihga Royal Hotel Osaka', star: 4, lat: 34.6817, lng: 135.4884, base: 16000, chainBrand: 'RIHGA Royal Hotels' },
      { id: 'HTL-OSA-06', name: '도미 인 프리미엄 난바', nameEn: 'Dormy Inn Premium Namba', star: 3, lat: 34.6632, lng: 135.5015, base: 12500 },
      { id: 'HTL-OSA-07', name: '소테츠 프레사 인 요도야바시', nameEn: 'Sotetsu Fresa Inn Yodoyabashi', code: '810310', star: 3, lat: 34.6929, lng: 135.5052, base: 29700, chainBrand: 'Sotetsu' },
      { id: 'HTL-OSA-08', name: '소테츠 그랜드 프레사 오사카-난바', nameEn: 'Sotetsu Grand Fresa Osaka-Namba', code: '746262', star: 3, lat: 34.6626, lng: 135.5017, base: 19700, chainBrand: 'Sotetsu' },
      { id: 'HTL-OSA-09', name: '소테츠 프레사 인 오사카 신사이바시', nameEn: 'Sotetsu Fresa Inn Osaka-Shinsaibashi', code: '262604', star: 3, lat: 34.672, lng: 135.5011, base: 17500, chainBrand: 'Sotetsu' },
      // ── 실사이트 지역검색(102156 - Osaka) 결과 재현 — 실코드·실브랜드 (2026-07-15 스크린샷 명세) ──
      { id: 'HTL-OSA-10', name: '호텔 아마넥 오사카 난바', nameEn: 'Hotel AMANEK Osaka Namba', code: '1001586', star: 4, lat: 34.6659, lng: 135.5035, base: 7812, chainBrand: 'amaneku Co., Ltd.', roomType: 'Standard Double (Non Smoking)', recommended: true },
      { id: 'HTL-OSA-11', name: '다이와 로이넷 호텔 오사카 우에혼마치', nameEn: 'Daiwa Roynet Hotel Osaka Uehonmachi', code: '453378', star: 3, lat: 34.6656, lng: 135.5192, base: 7726, chainBrand: 'Daiwa Roynet Hotels', roomType: 'Standard Double Non Smoking', recommended: true },
      { id: 'HTL-OSA-12', name: '스마일 호텔 프리미엄 오사카 히가시 신사이바시', nameEn: 'Smile Hotel Premium Osaka Higashi Shinsaibashi', code: '285030', star: 3.5, lat: 34.6733, lng: 135.5064, base: 6421, chainBrand: 'K.K. Hospitality Operations', roomType: 'Standard Double (Non Smoking)', recommended: true },
      { id: 'HTL-OSA-13', name: '신오사카 워싱턴 호텔 플라자', nameEn: 'Shin Osaka Washington Hotel Plaza', code: '551313', star: 3, lat: 34.7331, lng: 135.4997, base: 5151, chainBrand: 'Washington Hotel Corporation', roomType: '(A)Semi Double Room Non Smoking', recommended: true },
      { id: 'HTL-OSA-14', name: '젠티스 오사카', nameEn: 'Zentis Osaka', code: '655329', star: 4, lat: 34.6953, lng: 135.4933, base: 15219, propertyType: 'Boutique', chainBrand: 'Independent Hotels', roomType: 'Studio King No Smoking', recommended: true },
      { id: 'HTL-OSA-15', name: '다이와 로이넷 호텔 오사카 사카이스지 혼마치 프리미어', nameEn: 'Daiwa Roynet Hotel Osaka Sakaisuji Honmachi PREMIER', code: '725693', star: 3.5, lat: 34.6829, lng: 135.5066, base: 10036, chainBrand: 'Daiwa Roynet Hotels', roomType: 'MODERATE, TWIN BEDS, SMOKING', recommended: true },
      { id: 'HTL-OSA-16', name: '코코 호텔 오사카 난바 에비스초', nameEn: 'KOKO HOTEL Osaka Namba Ebisucho', code: '731117', star: 3, lat: 34.6567, lng: 135.5017, base: 4102, chainBrand: 'Independent Hotels', roomType: 'Moderate Twin Non Smoking', recommended: true },
      { id: 'HTL-OSA-17', name: '다이와 로이넷 호텔 요츠바시', nameEn: 'Daiwa Roynet Hotel Yotsubashi', code: '214867', star: 3, lat: 34.6742, lng: 135.4941, base: 8493, chainBrand: 'Daiwa Roynet Hotels', roomType: 'ROOM, DOUBLE BED, SMOKING', recommended: true },
      { id: 'HTL-OSA-18', name: '호텔 비스타 오사카 난바', nameEn: 'Hotel Vista Osaka Namba', code: '497098', star: 3, lat: 34.6648, lng: 135.4996, base: 10794, chainBrand: 'VISTA HOTEL MANAGEMENT CO., Ltd.', roomType: 'Standard Double Non Smoking' },
      { id: 'HTL-OSA-19', name: '스마일 호텔 오사카 텐노지', nameEn: 'Smile Hotel Osaka Tennoji', code: '985233', star: 3, lat: 34.6499, lng: 135.5134, base: 4834, chainBrand: 'K.K. Hospitality Operations', roomType: 'Standard Double Non Smoking', recommended: true },
      { id: 'HTL-OSA-20', name: '스마일 호텔 프리미엄 오사카 혼마치', nameEn: 'Smile Hotel Premium Osaka Hommachi', code: '229742', star: 4, lat: 34.6822, lng: 135.4979, base: 5282, chainBrand: 'K.K. Hospitality Operations', roomType: 'Standard Double Smoking' },
      { id: 'HTL-OSA-21', name: '델 스타일 오사카 신사이바시 바이 다이와 로이넷 호텔', nameEn: 'DEL style Osaka - Shinsaibashi by Daiwa Roynet Hotel', code: '398300', star: 3.5, lat: 34.6714, lng: 135.5042, base: 13777, chainBrand: 'Daiwa Roynet Hotels', roomType: 'MODERATE, QUEEN BED' },
      { id: 'HTL-OSA-22', name: '코코 호텔 오사카 신사이바시', nameEn: 'KOKO HOTEL Osaka Shinsaibashi', code: '768491', star: 4, lat: 34.6759, lng: 135.5008, base: 4808, chainBrand: 'Independent Hotels', roomType: 'Standard Double Room - Non-Smoking' },
      { id: 'HTL-OSA-23', name: '칸데오 호텔스 오사카 난바', nameEn: 'Candeo Hotels Osaka Namba', code: '189357', star: 3.5, lat: 34.6621, lng: 135.5049, base: 11176, chainBrand: 'Candeo Hotels', roomType: 'Double Room Non Smoking' },
      { id: 'HTL-OSA-24', name: '베스트 웨스턴 호텔 피노 오사카 신사이바시', nameEn: 'Best Western Hotel Fino Osaka Shinsaibashi', code: '471157', star: 3.5, lat: 34.6749, lng: 135.5053, base: 7506, chainBrand: 'Best Western', roomType: 'COMFORT, DOUBLE BED' },
      { id: 'HTL-OSA-25', name: '호텔 그란비아 오사카', nameEn: 'Hotel Granvia Osaka', code: '584277', star: 3.5, lat: 34.7025, lng: 135.4959, base: 16123, chainBrand: 'Independent Hotels', roomType: 'Standard Double' },
      { id: 'HTL-OSA-26', name: '미마루 오사카 신사이바시 이스트', nameEn: 'APARTMENT HOTEL MIMARU Osaka Shinsaibashi East', code: '923184', star: 4, lat: 34.6738, lng: 135.5089, base: 17000, propertyType: 'Aparthotel', chainBrand: 'APARTMENT HOTEL MIMARU', roomType: 'Apartment Twin Room' },
    ],
  },
  {
    destination: '교토',
    nameEn: 'Kyoto',
    aliases: ['교토'],
    country: 'Japan',
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
    nameEn: 'Fukuoka',
    aliases: ['후쿠오카'],
    country: 'Japan',
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
    nameEn: 'Sapporo',
    aliases: ['삿포로'],
    country: 'Japan',
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
    nameEn: 'Seoul',
    aliases: ['서울', '명동', '강남'],
    country: 'South Korea',
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
    nameEn: 'Busan',
    aliases: ['부산', '해운대'],
    country: 'South Korea',
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
    nameEn: 'Jeju',
    aliases: ['제주', '서귀포'],
    country: 'South Korea',
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
    nameEn: 'Bangkok',
    aliases: ['방콕', '수쿰윗', '실롬'],
    country: 'Thailand',
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
    nameEn: 'Singapore',
    aliases: ['싱가포르', '마리나베이', '센토사'],
    country: 'Singapore',
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
    nameEn: 'Da Nang',
    aliases: ['다낭', '미케비치'],
    country: 'Vietnam',
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
    nameEn: 'Hanoi',
    aliases: ['하노이'],
    country: 'Vietnam',
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
    nameEn: 'Ho Chi Minh City',
    aliases: ['호치민', '사이공'],
    country: 'Vietnam',
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
    nameEn: 'Taipei',
    aliases: ['타이베이', '시먼딩'],
    country: 'Taiwan',
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
    nameEn: 'Hong Kong',
    aliases: ['홍콩', '침사추이'],
    country: 'Hong Kong',
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

/** 룸타입 키워드 사전 — 자연어 파서(요청 인식)와 요금 필터(room_type_name 매칭) 공용 */
export const ROOM_TYPE_MATCHERS: Record<string, RegExp> = {
  더블: /더블|double/i,
  트윈: /트윈|twin/i,
  싱글: /싱글|single/i,
  스위트: /스위트|suite/i,
};

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
    /* 알 수 없는 목적지라 국가를 특정할 수 없다 — 대시보드에서 Others로 묶인다 */
    country: 'Others',
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
const MAX_RATES = 18;
const MAX_RECOMMENDED_HOTELS = 4;

/** 역/지하철 인접 호텔 (mock — 실제 시스템에서는 좌표·POI 기반 판정) */
const STATION_HOTELS = new Set([
  'HTL-TYO-01', // 도쿄 스테이션 호텔 (도쿄역 직결)
  'HTL-TYO-04', // 그레이스리 신주쿠
  'HTL-TYO-05', // 시나가와 프린스 (시나가와역)
  'HTL-TYO-06', // 게이오 플라자 (신주쿠역)
  'HTL-TYO-09', // 소테츠 프레사 긴자
  'HTL-OSA-02', // 스위소텔 난카이 (난바역 직결)
  'HTL-OSA-06', // 도미 인 프리미엄 난바
  'HTL-KYO-02', // 그란비아 (교토역 직결)
  'HTL-KYO-04', // 교토 센추리 (교토역)
  'HTL-FUK-02', // 닛코 후쿠오카 (하카타역)
  'HTL-FUK-04', // 리치몬드 하카타 에키마에
  'HTL-SPK-01', // JR타워 닛코 삿포로 (삿포로역 직결)
  'HTL-SPK-04', // 그레이스리 삿포로
  'HTL-SEL-04', // 코트야드 남대문 (서울역 인근)
  'HTL-SEL-07', // 나인트리 명동 (명동역)
  'HTL-SEL-08', // 롯데시티 마포 (공덕역)
  'HTL-PUS-02', // 롯데 부산 (서면역)
  'HTL-PUS-05', // 토요코인 부산역
  'HTL-BKK-06', // 이스틴 그랜드 사톤 (BTS 수라삭 직결)
  'HTL-BKK-08', // 노보텔 실롬 (BTS 총논시)
  'HTL-BKK-09', // 홀리데이 인 실롬
  'HTL-SIN-02', // 팬 퍼시픽 (프로머나드역)
  'HTL-SIN-05', // 스위소텔 스탬포드 (시티홀역 직결)
  'HTL-SIN-06', // 칼튼 (브라스 바사역)
  'HTL-TPE-04', // 시저 파크 (타이베이역)
  'HTL-TPE-05', // 코스모스 (타이베이역)
  'HTL-HKG-04', // 로얄 플라자 (몽콕이스트역)
  'HTL-HKG-05', // 이비스 센트럴 (셩완역)
]);

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
export interface CityResultOptions {
  /** 결과 호텔 수 상한 (기본 9 — AI 검색용. Create Booking은 전체 반환) */
  maxHotels?: number;
  /** 결과 요금제 수 상한 (기본 18) */
  maxRates?: number;
}

export function buildCityResults(
  searchId: string,
  conditions?: SearchConditions | null,
  options?: CityResultOptions,
): CityResults {
  resetRateSeq();
  const targetHotelName = conditions?.hotel_name ?? null;
  const cityOfHotel = targetHotelName
    ? (CITIES.find((c) => c.hotels.some((h) => hotelMatches(h, targetHotelName))) ?? null)
    : null;
  const city =
    cityOfHotel ??
    cityFor(conditions?.destination ?? null) ??
    (conditions?.destination ? genericCity(conditions.destination) : CITIES[0]);

  const nights = conditions?.nights ?? 2;
  /** 객실 수 — 요금은 전체 객실 합계(Billing Sum 의미)로 산출 */
  const roomsCount = conditions?.rooms && conditions.rooms > 0 ? conditions.rooms : 1;
  const deadline = deadlineFor(conditions?.check_in ?? null, city.tzOffset);

  const buildForHotel = (h: HotelSeed, i: number): RateSeed[] => {
    const breakfastBase = i % 2 === 0;
    const roomType = h.roomType ?? ROOM_TYPES[i % ROOM_TYPES.length];
    const supplier = SUPPLIERS[i % SUPPLIERS.length];
    const stay = h.base * nights * roomsCount;
    const common = {
      hotel_id: h.id,
      hotel_name: displayName(h),
      destination: city.destination,
      star_rating: h.star,
      latitude: h.lat,
      longitude: h.lng,
      currency: city.currency,
      total_nights: nights,
      total_rooms: roomsCount,
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
        net_price: stay,
      },
    ];
    if (i % 3 === 0) {
      plans.push({
        ...common,
        room_type_name: roomType,
        rate_plan_name: '논리펀더블 특가',
        meal_plan: breakfastBase ? '조식 포함' : '조식 불포함',
        cancellation_type: 'non_refundable',
        net_price: Math.round(stay * 0.85),
      });
    }
    if (i % 4 === 1 && !breakfastBase) {
      plans.push({
        ...common,
        room_type_name: ROOM_TYPES[(i + 1) % ROOM_TYPES.length],
        rate_plan_name: '조식 포함 플렉시블',
        meal_plan: '조식 포함',
        cancellation_type: 'free_cancellation',
        net_price: Math.round(stay * 1.12),
      });
    }
    // 상위 룸타입 — 호텔당 룸타입이 2개 이상 존재하도록 (룸타입 선택 UX)
    if (i % 2 === 0) {
      plans.push({
        ...common,
        room_type_name: h.roomType ? `${h.roomType} - High Floor` : ROOM_TYPES[(i + 2) % ROOM_TYPES.length],
        rate_plan_name: '프리미엄 플렉시블',
        meal_plan: '조식 포함',
        cancellation_type: 'free_cancellation',
        net_price: Math.round(stay * 1.35),
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
    // 룸타입 요청 ("더블+트윈 각각 1개씩") — 요청 타입 중 하나와 매칭되는 요금제만
    if (conditions?.room_types && conditions.room_types.length > 0) {
      const name = s.room_type_name ?? '';
      if (!conditions.room_types.some((t) => ROOM_TYPE_MATCHERS[t]?.test(name))) return false;
    }
    if (conditions?.breakfast_included === true && s.meal_plan !== '조식 포함') return false;
    if (conditions?.breakfast_included === false && s.meal_plan === '조식 포함') return false;
    if (conditions?.free_cancellation_only === true && s.cancellation_type !== 'free_cancellation')
      return false;
    // 환불불가 특가만 ("환불불가 특가 있어?")
    if (conditions?.free_cancellation_only === false && s.cancellation_type !== 'non_refundable')
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
    ? (city.hotels.find((h) => hotelMatches(h, targetHotelName)) ?? null)
    : null;
  if (target) {
    const common = {
      hotel_id: target.id,
      hotel_name: displayName(target),
      destination: city.destination,
      star_rating: target.star,
      latitude: target.lat,
      longitude: target.lng,
      currency: city.currency,
      total_nights: nights,
      total_rooms: roomsCount,
      cancellation_deadline: deadline,
    };
    const base = target.base * nights * roomsCount;
    const targetRoom = target.roomType ?? '스탠다드 트윈';
    const targetSeeds: RateSeed[] = [
      {
        ...common,
        room_type_name: targetRoom,
        rate_plan_name: '베스트 플렉시블',
        meal_plan: '조식 불포함',
        cancellation_type: 'free_cancellation',
        net_price: base,
        supplier_id: 'SUP-ELLIS-01',
      },
      {
        ...common,
        room_type_name: targetRoom,
        rate_plan_name: '논리펀더블 특가',
        meal_plan: '조식 불포함',
        cancellation_type: 'non_refundable',
        net_price: Math.round(base * 0.85),
        supplier_id: 'SUP-EPS-02',
      },
      {
        ...common,
        room_type_name: target.roomType ? `${target.roomType} - High Floor` : '디럭스 킹',
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
  // 역 인접 필터: 해당 도시에 인접 호텔이 있을 때만 적용 (없으면 전체 유지)
  const stationPool = city.hotels.filter((h) => STATION_HOTELS.has(h.id));
  const hotelPool =
    conditions?.near_station && stationPool.length > 0 ? stationPool : city.hotels;
  let seeds = applyFilters(hotelPool.flatMap((h) => buildForHotel(h, city.hotels.indexOf(h))));

  // 호텔 수·요금제 수 상한
  const maxHotels = options?.maxHotels ?? MAX_HOTELS;
  const maxRates = options?.maxRates ?? MAX_RATES;
  const hotelIds = [...new Set(seeds.map((s) => s.hotel_id))].slice(0, maxHotels);
  seeds = seeds.filter((s) => hotelIds.includes(s.hotel_id)).slice(0, maxRates);

  return { results: seeds.map((s) => makeRate(searchId, s)), recommended: [] };
}

/** 등록된 도시 대표명 목록 (파서 사전과 동기화용) */
export const CITY_DESTINATIONS = CITIES.map((c) => c.destination);

// ═══════════ Create Booking 폼 검색용 (실제 포털 클론) ═══════════

const CITY_COUNTRY: Record<string, string> = {
  도쿄: 'Japan', 오사카: 'Japan', 교토: 'Japan', 후쿠오카: 'Japan', 삿포로: 'Japan',
  서울: 'South Korea', 부산: 'South Korea', 제주: 'South Korea',
  방콕: 'Thailand', 싱가포르: 'Singapore',
  다낭: 'Vietnam', 하노이: 'Vietnam', 호치민: 'Vietnam',
  타이베이: 'Taiwan', 홍콩: 'Hong Kong',
};

/** 호텔/도시 숫자 코드 (실제 포털의 6자리 코드 형식 재현 — 실코드 우선, 없으면 결정론적) */
const codeIndex = new Map<string, string>();
{
  let n = 0;
  for (const c of CITIES) {
    codeIndex.set(`city:${c.destination}`, c.code ?? String(100387 + n * 991));
    for (const h of c.hotels) {
      // 실제 코드가 지정된 호텔은 그대로, 없으면 결정론적 생성
      codeIndex.set(h.id, h.code ?? String(410000 + n * 137 + (h.id.charCodeAt(h.id.length - 1) % 9) * 7130));
      n += 1;
    }
  }
}
export function hotelCodeOf(hotelId: string): string {
  return codeIndex.get(hotelId) ?? '478795';
}

/** 도시 영문 표기 (없으면 한글 대표명) — Create Booking 카드의 "◎ Osaka" 재현 */
export function cityEnOf(destination: string): string {
  return CITIES.find((c) => c.destination === destination)?.nameEn ?? destination;
}

/**
 * 셀러 청구통화(JPY) 환산율 — hotelDb의 `base`는 도시 현지통화라 그대로 합산할 수 없다.
 * 예약 금액·대시보드 매출을 호텔 목록 요금과 같은 근거로 맞추기 위한 표.
 * [가정] 2026년 중반 근사치. 실데이터 연동 시 예약 시점 환율로 대체.
 */
const FX_TO_JPY: Record<string, number> = {
  JPY: 1,
  KRW: 0.11,
  THB: 4.3,
  SGD: 115,
  VND: 0.0058,
  TWD: 4.7,
  HKD: 19.2,
};

export function toJpy(amount: number, currency: string): number {
  return Math.round(amount * (FX_TO_JPY[currency] ?? 1));
}

export interface CityMeta {
  /** 파서 표기(한글 대표명) */
  destination: string;
  nameEn: string;
  country: string;
  currency: string;
}

/**
 * 호텔 → 소속 도시. 대시보드 목적지 집계는 예약의 `region` 문자열이 아니라 이 조회를 쓴다
 * (`region`은 생성 경로에 따라 한/영이 섞여 집계 단위로 신뢰할 수 없다).
 */
export function cityOfHotel(hotelId: string): CityMeta | null {
  for (const c of CITIES) {
    if (c.hotels.some((h) => h.id === hotelId))
      return { destination: c.destination, nameEn: c.nameEn ?? c.destination, country: c.country, currency: c.currency };
  }
  return null;
}

/** 목데이터 생성용 전체 호텔 목록 (도시 메타 동봉) */
export function allHotels(): { id: string; name: string; star: number; base: number; roomType?: string; city: CityMeta }[] {
  return CITIES.flatMap((c) =>
    c.hotels.map((h) => ({
      id: h.id,
      name: displayName(h),
      star: h.star,
      base: h.base,
      roomType: h.roomType,
      city: { destination: c.destination, nameEn: c.nameEn ?? c.destination, country: c.country, currency: c.currency },
    })),
  );
}

export interface HotelMeta {
  code: string;
  propertyType: string;
  chainBrand: string;
  /** 추천 호텔 — 목록 카드 Recommendation 배지 · Recommendation 정렬 상단 노출 */
  recommended: boolean;
}

/** 좌측 필터·카드용 호텔 메타 (Property Type · Hotel Chain Brand · Recommendation) */
export function hotelMetaOf(hotelId: string): HotelMeta {
  for (const c of CITIES) {
    const h = c.hotels.find((x) => x.id === hotelId);
    if (h)
      return {
        code: hotelCodeOf(h.id),
        propertyType: h.propertyType ?? 'Hotel',
        chainBrand: h.chainBrand ?? 'Independent Hotels',
        recommended: h.recommended ?? false,
      };
  }
  return {
    code: hotelCodeOf(hotelId),
    propertyType: 'Hotel',
    chainBrand: 'Independent Hotels',
    recommended: false,
  };
}

/** 호텔 코드 → 호텔 식별 (새 탭 룸리스트 페이지 라우팅용) */
export function hotelByCode(code: string): { hotelName: string; destination: string } | null {
  for (const c of CITIES) {
    const h = c.hotels.find((x) => hotelCodeOf(x.id) === code);
    if (h) return { hotelName: displayName(h), destination: c.destination };
  }
  return null;
}

export interface AutocompleteEntry {
  code: string;
  /** 표시 라벨: "478795 - Sotetsu Fresa Inn Hiroshima, Japan" 형식 */
  label: string;
  type: 'city' | 'hotel';
  destination: string;
  hotel_name: string | null;
}

/** Destination 자동완성 — 도시 + 호텔명 검색 (실제 포털과 동일하게 코드-이름 형식, 한/영 겸용) */
export function searchAutocomplete(query: string): AutocompleteEntry[] {
  const q = query.trim();
  if (q.length < 1) return [];
  const out: AutocompleteEntry[] = [];
  const nq = q.toLowerCase();
  for (const c of CITIES) {
    const cityDisplay = c.nameEn ?? c.destination;
    if (
      c.destination.includes(q) ||
      c.aliases.some((a) => a.includes(q)) ||
      (c.nameEn?.toLowerCase().includes(nq) ?? false)
    ) {
      const code = codeIndex.get(`city:${c.destination}`) ?? '100387';
      out.push({
        code,
        label: `${code} - ${cityDisplay}, ${cityDisplay}, ${CITY_COUNTRY[c.destination] ?? ''}`,
        type: 'city',
        destination: c.destination,
        hotel_name: null,
      });
    }
  }
  for (const c of CITIES) {
    for (const h of c.hotels) {
      const dn = displayName(h);
      // 한글명·영문명 어느 쪽으로 입력해도 매칭
      if (h.name.toLowerCase().includes(nq) || (h.nameEn?.toLowerCase().includes(nq) ?? false)) {
        const code = hotelCodeOf(h.id);
        out.push({
          code,
          label: `${code} - ${dn}, ${dn}, ${CITY_COUNTRY[c.destination] ?? ''}`,
          type: 'hotel',
          destination: c.destination,
          hotel_name: dn,
        });
      }
      if (out.length >= 10) return out;
    }
  }
  return out.slice(0, 10);
}

/** 도시별 주변 명소 (호텔 상세 Neighborhood 재현용) */
const CITY_LANDMARKS: Record<string, string[]> = {
  도쿄: ['도쿄역 - 東京駅, Tokyo Station', '긴자 - 銀座, Ginza', '황거 - 皇居, Imperial Palace', '도쿄 - 東京, Tokyo'],
  오사카: ['난바역 - 難波駅, Namba Station', '도톤보리 - 道頓堀, Dotonbori', '오사카성 - 大阪城, Osaka Castle'],
  교토: ['교토역 - 京都駅, Kyoto Station', '기요미즈데라 - 清水寺, Kiyomizu-dera', '기온 - 祇園, Gion'],
  후쿠오카: ['하카타역 - 博多駅, Hakata Station', '캐널시티 하카타 - Canal City Hakata', '텐진 - 天神, Tenjin'],
  삿포로: ['삿포로역 - 札幌駅, Sapporo Station', '오도리 공원 - 大通公園, Odori Park', '스스키노 - Susukino'],
  서울: ['명동 - Myeongdong', '경복궁 - Gyeongbokgung Palace', 'N서울타워 - N Seoul Tower', '서울역 - Seoul Station'],
  부산: ['해운대 해수욕장 - Haeundae Beach', '광안리 - Gwangalli', '부산역 - Busan Station'],
  제주: ['제주국제공항 - Jeju Int’l Airport', '중문관광단지 - Jungmun Resort', '한라산 - Hallasan'],
  방콕: ['왓 아룬 - Wat Arun', '아이콘시암 - ICONSIAM', 'BTS 사판탁신 - BTS Saphan Taksin', '차오프라야강 - Chao Phraya River'],
  싱가포르: ['마리나 베이 - Marina Bay', '가든스 바이 더 베이 - Gardens by the Bay', '머라이언 파크 - Merlion Park'],
  다낭: ['미케 비치 - My Khe Beach', '한시장 - Han Market', '드래곤 브리지 - Dragon Bridge'],
  하노이: ['호안끼엠 호수 - Hoan Kiem Lake', '하노이 구시가지 - Old Quarter', '오페라 하우스 - Opera House'],
  호치민: ['벤탄 시장 - Ben Thanh Market', '노트르담 대성당 - Notre-Dame Cathedral', '동커이 거리 - Dong Khoi'],
  타이베이: ['타이베이역 - Taipei Main Station', '시먼딩 - Ximending', '타이베이 101 - Taipei 101'],
  홍콩: ['침사추이 - Tsim Sha Tsui', '빅토리아 하버 - Victoria Harbour', '템플 스트리트 - Temple Street'],
};

export interface HotelContent {
  code: string;
  checkInOut: string;
  address: string;
  phone: string;
  neighborhood: string[];
  introduction: string[];
  roomFacility: string;
  hotelFacility: string;
  caution: string[];
  photoCount: number;
}

/** 호텔 상세 콘텐츠 (실제 포털 상세 화면 구성 재현 — mock 생성) */
export function hotelContentOf(hotelId: string, destination: string): HotelContent {
  const landmarks = CITY_LANDMARKS[destination] ?? [`${destination} 중심가 - City Center`];
  return {
    code: hotelCodeOf(hotelId),
    checkInOut: '15:00 / 11:00',
    address: `5-2 Central District, ${destination}`,
    phone: '822622031',
    neighborhood: landmarks,
    introduction: [
      '* Location',
      `- ${destination} 주요 지점에서 도보 5분 이내의 위치`,
      '- 주요 역/공항 접근 용이',
      '* Hotel Services / Facilities',
      '- Free Internet Access',
      '- Restaurant, self-check in/ check out machine, water purification system',
      '* Room Amenities',
      '- Free Wi-Fi in all rooms',
      '- LCD TV, refrigerator, electric kettle, hair dryer, bath amenities',
    ],
    roomFacility: `Make yourself at home in one of the guestrooms featuring refrigerators and flat-screen televisions. Complimentary wired and wireless Internet access keeps you connected. Private bathrooms with shower/tub combinations feature complimentary toiletries.`,
    hotelFacility: `Make use of convenient amenities, which include complimentary wireless Internet access and a vending machine. Buffet breakfasts are available daily for a fee.`,
    caution: [
      'Mandatory Fees',
      'Optional extras',
      'The following fees and deposits are charged by the property at time of service, check-in, or check-out.',
      'Fee for buffet breakfast: approximately per person (check hotel notice)',
      'The above list may not be comprehensive. Fees and deposits may not include tax and are subject to change.',
    ],
    photoCount: 11,
  };
}
