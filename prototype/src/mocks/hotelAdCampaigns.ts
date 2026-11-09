import { cityOfHotel, hotelCodeOf } from './hotelDb';
// 소테츠 그랜드 프레사 오사카 난바 — 호텔 공식 사이트(sotetsu-hotels.com/grand-fresa/namba) 사진 + 사용자 제공 사진 (2026-11-09)
import gfnDouble from '../assets/ads/grand-fresa-namba/double.webp';
import gfnTwin from '../assets/ads/grand-fresa-namba/twin.webp';
import gfnDeluxeTwin from '../assets/ads/grand-fresa-namba/deluxe-twin-triple.webp';
import gfnBreakfast from '../assets/ads/grand-fresa-namba/breakfast.webp';
import gfnLobby from '../assets/ads/grand-fresa-namba/lobby.webp';
import gfnEntrance from '../assets/ads/grand-fresa-namba/entrance.webp';
import gfnNight from '../assets/ads/grand-fresa-namba/night.webp';
import { MARKET_ONLY_RULES } from './marketOnlyRates';

/**
 * 랜딩(로그인) 페이지 호텔 광고 캠페인 — 기획: docs/plan/feature-landing-hotel-ads.md (영문 명세 v1.0, 2026-11-09).
 * 호텔 광고 = 스크롤 기반 인터랙티브 애니메이션: 객실 장면 → 마지막 외관 장면 + CTA.
 * 실서비스: ELLIS 캠페인 관리(승인·일정·가중치)에서 내려받는다. 프로토타입은 이 파일 + 일러스트(SVG) 소재.
 * **샘플 소재** — 문구는 예시이며 실제 호텔 정보가 아니다. image에 사진 URL을 넣으면 일러스트 대신 사진을 쓴다.
 * **프로토타입 · 폐기 가능.**
 */

export type SceneKind = 'double' | 'twin' | 'view' | 'facility' | 'exterior';
type Text = { h: string; s: string };

export interface AdScene {
  kind: SceneKind;
  /** 배경 톤 (스크롤에 따라 전환) */
  tone: string;
  /** 어두운 장면(외관 저녁) — 글자를 밝게 */
  dark?: boolean;
  en: Text;
  ko: Text;
  /** 실사진 URL (있으면 일러스트 대신) — 사진은 가로 띠로 나뉘어 한 겹씩 맞춰진다 */
  image?: string;
  /** 사진 초점 (object-position) */
  focus?: string;
  /** 외관 장면의 작은 보조 사진 (예: 야경) */
  inset?: { image: string; en: string; ko: string };
}

export interface AdPalette {
  wall: string;
  floor: string;
  wood: string;
  linen: string;
  accent: string;
  sky: string;
  skyline: string;
}

export interface HotelAdCampaign {
  id: string;
  type: 'hotel';
  hotelId: string;
  hotelName: string;
  /** 외관 간판 문구 (일러스트용) */
  sign: string;
  cityEn: string;
  cityKo: string;
  stars: number;
  weight: number;
  palette: AdPalette;
  /** 소재 종류 — 화면 라벨용 */
  source: 'illustration' | 'photos';
  scenes: AdScene[];
}

export interface BrandCampaignSlot {
  id: 'brand';
  type: 'brand';
  weight: number;
}

export type AdCampaign = HotelAdCampaign | BrandCampaignSlot;

export const AD_CAMPAIGNS: AdCampaign[] = [
  {
    // 실사진 광고 — 객실 3 → 조식 → 로비 → 외관(입구 + 야경). 문구는 공식 사이트·사진에서 확인되는 사실만
    id: 'grand-fresa-namba',
    type: 'hotel',
    hotelId: 'HTL-OSA-08',
    hotelName: 'Sotetsu Grand Fresa Osaka-Namba',
    sign: 'GRAND FRESA',
    cityEn: 'Namba, Osaka',
    cityKo: '오사카 난바',
    stars: 3,
    weight: 60,
    source: 'photos',
    palette: { wall: '#F4EBDD', floor: '#C9A27E', wood: '#8A5A3C', linen: '#FFFFFF', accent: '#F2B705', sky: '#BFE3F2', skyline: '#7FA6B8' },
    scenes: [
      { kind: 'double', tone: '#FBF3D9', image: gfnDouble, en: { h: 'Double, in color', s: 'Double room · yellow accent wall' }, ko: { h: '컬러로 꾸민 더블', s: '더블룸 · 노란 포인트 벽' } },
      { kind: 'twin', tone: '#F3EFE2', image: gfnTwin, focus: '38% 50%', en: { h: 'Twin, side by side', s: 'Twin room · two beds' }, ko: { h: '나란히, 트윈', s: '트윈룸 · 침대 두 개' } },
      { kind: 'twin', tone: '#EEF0E8', image: gfnDeluxeTwin, en: { h: 'Room for three', s: 'Deluxe Twin (Triple)' }, ko: { h: '셋이서 한 방', s: '디럭스 트윈(트리플)' } },
      { kind: 'facility', tone: '#F6EBDD', image: gfnBreakfast, en: { h: 'Start with breakfast', s: 'Breakfast restaurant in the hotel' }, ko: { h: '아침은 호텔에서', s: '호텔 안 조식 레스토랑' } },
      { kind: 'facility', tone: '#ECEEF1', image: gfnLobby, en: { h: 'Check in, quickly', s: 'Self check-in kiosks in the lobby' }, ko: { h: '빠른 체크인', s: '로비의 셀프 체크인 기기' } },
      {
        kind: 'exterior', tone: '#141A2E', dark: true, image: gfnEntrance, focus: '72% 50%',
        inset: { image: gfnNight, en: 'At night', ko: '야경' },
        en: { h: 'Grand Fresa, Namba', s: '2 minutes on foot from Nippombashi Station' }, ko: { h: '난바의 그랜드 프레사', s: '닛폰바시역에서 걸어서 2분' },
      },
    ],
  },
  {
    id: 'ginza',
    type: 'hotel',
    hotelId: 'HTL-TYO-09',
    hotelName: 'Sotetsu Fresa Inn Ginza Nanachome',
    sign: 'FRESA INN',
    cityEn: 'Ginza, Tokyo',
    cityKo: '도쿄 긴자',
    stars: 3,
    weight: 15,
    source: 'illustration',
    palette: { wall: '#F4EBDD', floor: '#C9A27E', wood: '#8A5A3C', linen: '#FFFFFF', accent: '#059FAE', sky: '#BFE3F2', skyline: '#7FA6B8' },
    scenes: [
      { kind: 'double', tone: '#F6EEE3', en: { h: 'Start with a double', s: 'A calm room for one or two' }, ko: { h: '더블룸에서 시작', s: '한두 명이 편히 쉬는 객실' } },
      { kind: 'twin', tone: '#E4F1F2', en: { h: 'Twin, side by side', s: 'Two beds for colleagues or friends' }, ko: { h: '나란히 쓰는 트윈', s: '동료·친구와 함께 쓰는 두 침대' } },
      { kind: 'view', tone: '#ECE7F3', en: { h: 'A room with a view', s: 'Upper floors facing the city' }, ko: { h: '도시가 보이는 객실', s: '도시를 내려다보는 위층 객실' } },
      { kind: 'exterior', tone: '#1D2742', dark: true, en: { h: 'Your stay in Ginza', s: 'Walk to the shopping streets of Ginza' }, ko: { h: '긴자에서 머무는 곳', s: '긴자 쇼핑 거리까지 걸어서' } },
    ],
  },
  {
    id: 'uehonmachi',
    type: 'hotel',
    hotelId: 'HTL-OSA-11',
    hotelName: 'Daiwa Roynet Hotel Osaka Uehonmachi',
    sign: 'ROYNET',
    cityEn: 'Uehonmachi, Osaka',
    cityKo: '오사카 우에혼마치',
    stars: 3,
    weight: 10,
    source: 'illustration',
    palette: { wall: '#EEF0F5', floor: '#A9B4C6', wood: '#5B4636', linen: '#FFFFFF', accent: '#1E3A8A', sky: '#F8D9B8', skyline: '#9C8FA8' },
    scenes: [
      { kind: 'double', tone: '#EEF1F7', en: { h: 'Rest well in Osaka', s: 'A double room for a quiet night' }, ko: { h: '오사카에서 푹 쉬기', s: '조용한 밤을 위한 더블룸' } },
      { kind: 'twin', tone: '#F5EDE4', en: { h: 'Twin for two', s: 'Two beds, one easy trip' }, ko: { h: '둘이라면 트윈', s: '침대 두 개, 편한 여행' } },
      { kind: 'exterior', tone: '#22213A', dark: true, en: { h: 'Near Uehonmachi', s: 'A base for exploring Osaka' }, ko: { h: '우에혼마치 가까이', s: '오사카 여행의 출발점' } },
    ],
  },
  { id: 'brand', type: 'brand', weight: 15 },
];

const LAST_KEY = 'omh_ad_last';

/**
 * 방문당 광고 1개 — 가중치 추첨, 같은 브라우저에서 직전 광고는 건너뜀.
 * 프로토타입: ?ad=grand-fresa-namba|ginza|uehonmachi|brand 로 고정 가능.
 */
export function pickCampaign(): AdCampaign {
  try {
    const forced = new URLSearchParams(window.location.search).get('ad');
    const hit = AD_CAMPAIGNS.find((c) => c.id === forced);
    if (hit) return hit;
  } catch {
    // 무시
  }
  let last: string | null = null;
  try {
    last = localStorage.getItem(LAST_KEY);
  } catch {
    // 무시
  }
  const pool = AD_CAMPAIGNS.filter((c) => c.id !== last);
  const total = pool.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  let chosen = pool[0];
  for (const c of pool) {
    r -= c.weight;
    if (r <= 0) {
      chosen = c;
      break;
    }
  }
  try {
    localStorage.setItem(LAST_KEY, chosen.id);
  } catch {
    // 무시
  }
  return chosen;
}

/** 프로토타입 검토용 — 다음 광고로 전환 */
export function nextCampaign(cur: AdCampaign): AdCampaign {
  const i = AD_CAMPAIGNS.findIndex((c) => c.id === cur.id);
  const next = AD_CAMPAIGNS[(i + 1) % AD_CAMPAIGNS.length];
  try {
    localStorage.setItem(LAST_KEY, next.id);
  } catch {
    // 무시
  }
  return next;
}

/** CTA → 로그인 후 Create Booking 호텔 프리필 대상 */
export function bookingTargetOf(c: HotelAdCampaign) {
  return { code: hotelCodeOf(c.hotelId), destination: cityOfHotel(c.hotelId)?.destination ?? '', hotelName: c.hotelName };
}

/** 마켓 전용요금이 있는 호텔이면 광고에 Market Only 태그 (가격 문구는 쓰지 않음) */
export const hasMarketOnlyRate = (c: HotelAdCampaign) => MARKET_ONLY_RULES.some((r) => r.hotelId === c.hotelId);

/** 로그인 후 포털이 읽어 Create Booking을 연다 (AiSearchPage) */
export const AD_TARGET_KEY = 'omh_ad_target';

/** 추적 이벤트 (프로토타입: 콘솔 + window.__omhAdEvents) — 명세 §9 */
export function trackAd(event: string, data: Record<string, unknown>) {
  const w = window as unknown as { __omhAdEvents?: unknown[] };
  (w.__omhAdEvents ??= []).push({ event, ...data, at: new Date().toISOString() });
  console.debug('[ad]', event, data);
}
