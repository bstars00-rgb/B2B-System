/**
 * M Village (Modern Village Lifestyle) 브랜드관 — **엠빌리지TF** 작업.
 *
 * ※ 고도화(3차 등)와 별개의 TF 트랙. 배지/표기는 고도화 "UP"이 아니라 "M Village"로 구분.
 *
 * 배경: OhMyHotel Global(SCM)이 베트남 라이프스타일 호텔 **Modern Village Lifestyle**의
 *   **한국 GSA(총판)**. 마켓플레이스에 브랜드관을 두어 로그인/예약 화면에서 홍보하고,
 *   브랜드관 → 물건 클릭 → 바로 호텔 예약(Create Booking)으로 연결한다.
 *
 * 티어(제안서 기준): Grand Signature(플래그십) · Signature(FIT) · M Village Hotel(스탠다드)
 *   · Premier(프리미어) · Express(밸류·2030 Savvy).
 *
 * ※ 프로토타입 · 폐기 가능: mocks/mvillage.ts + components/MVillagePavilion.tsx +
 *   로그인/사이드바/Bookings 배너 삽입부 + 사이드바 한 줄 삭제.
 *   ⚠ 물건 목록은 실제 GSA 물건 확정 전 **프로토타입 예시**(M Village Kim Ma 제외).
 *   사진·CI는 클라이언트 덱(OMH_MVillage_Korea_GSA_GTM_Client_Deck_v0.3.pdf)에서 추출한 실제 브랜드 컨텐츠.
 */

import imgPool from '../assets/mvillage/pool.jpg';
import imgSkyline from '../assets/mvillage/skyline.jpg';
import imgRoom from '../assets/mvillage/room.jpg';
import imgWork from '../assets/mvillage/work.jpg';
import imgBalcony from '../assets/mvillage/balcony.jpg';
import imgHcmc from '../assets/mvillage/hcmc.jpg';
import imgBedroom from '../assets/mvillage/bedroom.jpg';
import imgCafe from '../assets/mvillage/cafe.jpg';
import imgBanner from '../assets/mvillage/banner.jpg';

export const MV_BRAND = {
  name: 'Modern Village Lifestyle',
  short: 'M Village',
  /** 실제 브랜드 슬로건(덱 기준) */
  taglineEn: 'A More Meaningful Stay',
  taglineKo: '호텔이 아니라 Vietnam Lifestyle Collection — 마켓플레이스 단독 브랜드관',
  gsa: 'OhMyHotel Global · Korea GSA',
  /** 브랜드 CI(덱): 딥 포레스트 그린 + 테라코타 — 고도화 오렌지와 구분 */
  accent: '#2f4f43',
  accentSoft: '#d7e3dc',
  terracotta: '#b5674a',
  banner: imgBanner,
};

export type MvTier = 'Grand Signature' | 'Signature' | 'M Village Hotel' | 'Premier' | 'Express';

export interface MvTierDef {
  tier: MvTier;
  label: string;
  desc: string;
  color: string;
}
export const MV_TIERS: MvTierDef[] = [
  { tier: 'Grand Signature', label: 'Grand Signature', desc: '플래그십 프리미엄 (Premium Escape)', color: '#2f4f43' },
  { tier: 'Signature', label: 'Signature', desc: 'FIT 시그니처 (Urban Discovery)', color: '#4b7a63' },
  { tier: 'Premier', label: 'Premier', desc: '프리미어 (Work & Live)', color: '#b5674a' },
  { tier: 'M Village Hotel', label: 'M Village Hotel', desc: '스탠다드 스테이', color: '#6b7280' },
  { tier: 'Express', label: 'Express', desc: '밸류 · 2030 Savvy (Smart City Stay)', color: '#c08a3e' },
];

export interface MvProperty {
  id: string;
  /** Create Booking 프리필용 코드 */
  code: string;
  name: string;
  tier: MvTier;
  /** 예약 프리필 목적지(hotelDb 한글 도시명과 일치) */
  cityKr: string;
  cityEn: string;
  blurb: string;
  /** 대표 시설/특징 태그 */
  tags: string[];
  /** 사진(선택) — 없으면 티어 그라디언트 플레이스홀더 */
  image?: string;
}

/** ⚠ 프로토타입 예시 물건 (M Village Kim Ma 외 명칭은 확정 전 예시). */
export const MV_PROPERTIES: MvProperty[] = [
  { id: 'mv-gs-westlake', code: 'MV-HAN-GS01', name: 'M Village Grand Signature West Lake', tier: 'Grand Signature', cityKr: '하노이', cityEn: 'Hanoi', blurb: '서호(West Lake) 전망의 플래그십 — 라운지·루프탑 풀', tags: ['West Lake View', 'Rooftop Pool', 'Executive Lounge'], image: imgBalcony },
  { id: 'mv-gs-saigon', code: 'MV-SGN-GS01', name: 'M Village Grand Signature Saigon', tier: 'Grand Signature', cityKr: '호치민', cityEn: 'Ho Chi Minh', blurb: '사이공 중심 플래그십 — 스카이바·시티뷰 스위트', tags: ['District 1', 'Sky Bar', 'City View'], image: imgHcmc },
  { id: 'mv-sig-danang', code: 'MV-DAD-SG01', name: 'M Village Signature Da Nang Beach', tier: 'Signature', cityKr: '다낭', cityEn: 'Da Nang', blurb: '미케 해변 도보권 시그니처 — 오션뷰·비치 액세스', tags: ['My Khe Beach', 'Ocean View'], image: imgPool },
  { id: 'mv-sig-benthanh', code: 'MV-SGN-SG02', name: 'M Village Signature Ben Thanh', tier: 'Signature', cityKr: '호치민', cityEn: 'Ho Chi Minh', blurb: '벤탄시장 인접 — FIT·비즈니스 최적 입지', tags: ['Ben Thanh', 'Business'], image: imgSkyline },
  { id: 'mv-premier-danang', code: 'MV-DAD-PR01', name: 'M Village Premier Da Nang', tier: 'Premier', cityKr: '다낭', cityEn: 'Da Nang', blurb: '한강변 프리미어 — 스파·인피니티 풀', tags: ['Riverside', 'Spa', 'Infinity Pool'], image: imgCafe },
  { id: 'mv-kimma', code: 'MV-HAN-MV01', name: 'M Village Kim Ma', tier: 'M Village Hotel', cityKr: '하노이', cityEn: 'Hanoi', blurb: '김마(Kim Ma) 스테이 — 대사관 구역·교통 요지', tags: ['Kim Ma', 'Embassy Area'], image: imgBedroom },
  { id: 'mv-exp-caugiay', code: 'MV-HAN-EX01', name: 'M Village Express Cau Giay', tier: 'Express', cityKr: '하노이', cityEn: 'Hanoi', blurb: '꺼우저이 밸류 스테이 — 2030 세대·장기 투숙', tags: ['Cau Giay', 'Value', 'Long-stay'], image: imgRoom },
  { id: 'mv-exp-district1', code: 'MV-SGN-EX01', name: 'M Village Express District 1', tier: 'Express', cityKr: '호치민', cityEn: 'Ho Chi Minh', blurb: '1군 밸류 스테이 — 도심 접근·합리 가격', tags: ['District 1', 'Value'], image: imgWork },
  { id: 'mv-exp-mykhe', code: 'MV-DAD-EX01', name: 'M Village Express My Khe', tier: 'Express', cityKr: '다낭', cityEn: 'Da Nang', blurb: '미케 밸류 스테이 — 해변·저가 실속형', tags: ['My Khe', 'Value'], image: imgPool },
];

export interface MvBookTarget {
  code: string;
  destination: string;
  hotelName: string;
}
export const mvBookTarget = (p: MvProperty): MvBookTarget => ({ code: p.code, destination: p.cityKr, hotelName: p.name });

export const tierDef = (tier: MvTier): MvTierDef => MV_TIERS.find((t) => t.tier === tier) ?? MV_TIERS[3];
