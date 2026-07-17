/**
 * 대문(로그인) 좌측 광고판 캠페인 — "우리는 누구인가 / 무엇을 하는가".
 * 주기적으로 교체·추가하는 운영 영역: 이 배열에 캠페인을 추가하면 대문에서 자동 로테이션된다.
 */

export interface LoginCampaign {
  id: string;
  /** 오렌지 그라데이션 헤드라인 (줄바꿈 \n 지원) */
  headline: string;
  /** 영문 서브 카피 */
  subEn: string;
  /** 한글 서브 카피 */
  subKo: string;
  /** 특장점 칩 */
  chips: string[];
}

export const LOGIN_CAMPAIGNS: LoginCampaign[] = [
  {
    id: 'supplier-architecture',
    headline: 'Supplier Architecture\nfor Global B2B Hotels',
    subEn: 'Inventory, rates, and policies —\norchestrated as one live supply system.',
    subKo: '호텔 재고·가격·정책을 하나의 시스템으로 오케스트레이션하는 라이브 공급 레이어.\nDOTBIZ는 파트너에게 늘 최상의 공급을 만들어냅니다.',
    chips: ['Direct Hotel Supply', 'Inventory Optimization', 'Dynamic Rate Engine', 'Real-time Settlement', 'Multi-Currency'],
  },
  {
    id: 'ai-rate-search',
    headline: 'Ask in One Sentence,\nBook in One Flow',
    subEn: 'AI rate search turns natural language\ninto live, bookable quotes.',
    subKo: '"오사카 8월 15일 2박, 더블+트윈 각각 1개" —\n한 문장이면 요금 조회부터 예약까지 이어집니다.',
    chips: ['AI Rate Search', 'Natural Language', 'Zero Hallucination', 'MCP Secured'],
  },
  {
    id: 'op-first',
    headline: 'Built for OPs,\nby People Who Listen',
    subEn: 'Every week we ship one improvement\nthat operating partners asked for.',
    subKo: '현장 OP의 불편을 하나씩, 바로바로 개선합니다.\n쓰기 편한 닷비즈 — 오피포인트 혜택도 준비 중입니다.',
    chips: ['OP-First UX', 'Weekly Updates', 'Oppy Point (Coming)'],
  },
];

/** 캠페인 자동 로테이션 간격 (ms) */
export const CAMPAIGN_INTERVAL_MS = 8000;
