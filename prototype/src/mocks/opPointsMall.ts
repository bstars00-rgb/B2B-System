/**
 * 포인트몰 목데이터 — OP 포인트로 교환하는 상품/혜택 (오마이호텔 운영).
 * 3차 고도화(오피포인트) 프로토타입. 폐기 시 이 파일도 함께 삭제.
 *
 * 리딤 기준 = **USD**(현업 2026-07-29, 내부 앵커). 화면엔 화폐값 비노출 — 포인트로만 안내.
 * USD 오름차순 진열.
 *
 * **국가별 상품 구성(현업 2026-07-29):** 고객(OP)의 국가에 따라 사용·수령 가능한
 * 로컬 상품이 다르다(예: 중국 고객 = 중국 내에서 쓰는 상품). 여기에 더해 어디서나
 * 통용되는 **국제 공통** 상품(여행·프리미엄 실물)을 함께 진열한다.
 * ※ 닷비즈 수수료 할인 쿠폰류는 리워드 상품에서 제외(현업).
 *
 * **상세 설명(현업 2026-07-29):** 상품 클릭 → 상세 팝업(detail + highlights) → 교환.
 */

export type MallRegion = 'global' | 'KR' | 'CN' | 'JP';
export type MallCountry = Exclude<MallRegion, 'global'>;

export interface MallItem {
  id: string;
  name: string;
  category: '기프트카드' | '여행 혜택' | '프리미엄';
  /** 사용/수령 가능 지역. 'global' = 국제 공통(어디서나). */
  region: MallRegion;
  /** 상품 가치 (USD) — 내부 앵커. 화면에선 포인트로만 표시. */
  costUSD: number;
  icon: string;
  /** 카드용 한 줄 설명 */
  desc: string;
  /** 상세 팝업용 설명(문단) */
  detail: string;
  /** 상세 팝업 하이라이트(수령 방법·유효기간·사용처 등) */
  highlights: string[];
}

/** 고객 국가 옵션(로컬 상품 노출용). 실제로는 고객 계정 국가로 자동 결정. */
export const MALL_COUNTRIES: { code: MallCountry; label: string; flag: string }[] = [
  { code: 'KR', label: '대한민국', flag: '🇰🇷' },
  { code: 'CN', label: '중국', flag: '🇨🇳' },
  { code: 'JP', label: '일본', flag: '🇯🇵' },
];

/** 국제 공통 — 어디서나 통용(여행·프리미엄 실물). 정렬은 화면에서. */
export const GLOBAL_ITEMS: MallItem[] = [
  {
    id: 'g-upg', name: '호텔 객실 업그레이드 바우처', category: '여행 혜택', region: 'global', costUSD: 30, icon: '🛏️',
    desc: '제휴 호텔 예약 시 1회 업그레이드',
    detail: '오마이호텔 제휴 호텔에서 예약하신 객실을 상위 등급으로 1회 무료 업그레이드해 드리는 바우처입니다. 체크인 시 프런트에 바우처 코드를 제시하면 당일 잔여 객실 상황에 따라 한 단계 상위 카테고리로 업그레이드됩니다.',
    highlights: ['오마이호텔 제휴 호텔 대상', '체크인 시 프런트에 코드 제시', '당일 잔여 객실 한도 내 적용', '발급일로부터 1년 이내 사용'],
  },
  {
    id: 'g-lounge', name: '공항 라운지 이용권 1매', category: '여행 혜택', region: 'global', costUSD: 50, icon: '🛫',
    desc: '전 세계 주요 국제공항 라운지',
    detail: '전 세계 주요 국제공항의 제휴 라운지를 1회 이용할 수 있는 디지털 이용권입니다. 출국·환승 시 라운지 입구에서 바우처 코드(또는 모바일 패스)를 제시하면 입장할 수 있습니다.',
    highlights: ['전 세계 1,300+ 제휴 라운지', '본인 1인 1회 입장', '동반 1인은 현장 요금 별도', '발급일로부터 1년 이내 사용'],
  },
  {
    id: 'g-airpods', name: 'Apple AirPods Pro', category: '프리미엄', region: 'global', costUSD: 250, icon: '🎧',
    desc: '전 세계 배송 · 대형 리워드',
    detail: 'Apple AirPods Pro(최신형) 정품을 전 세계로 배송해 드리는 프리미엄 리워드입니다. 액티브 노이즈 캔슬링과 공간 음향을 지원하며, 교환 후 배송지를 입력하시면 발송됩니다.',
    highlights: ['정품 · 제조사 보증 포함', '교환 후 배송지 입력', '전 세계 배송(영업일 기준 2~3주)', '재고 소진 시 순차 발송'],
  },
  {
    id: 'g-dyson', name: 'Dyson Supersonic 드라이어', category: '프리미엄', region: 'global', costUSD: 350, icon: '💨',
    desc: '전 세계 배송 · 연간 우수 OP',
    detail: 'Dyson Supersonic 헤어드라이어 정품을 전 세계로 배송해 드리는 대형 리워드입니다. 연간 우수 OP를 위한 최상위 상품으로, 배송 지역 전압 규격에 맞춰 발송됩니다.',
    highlights: ['정품 · 제조사 보증 포함', '배송 지역 전압 규격 발송', '전 세계 배송(영업일 기준 2~3주)', '교환 후 배송지 입력'],
  },
];

/** 국가별 로컬 — 해당 국가 내에서 사용·수령. */
export const LOCAL_ITEMS: Record<MallCountry, MallItem[]> = {
  KR: [
    {
      id: 'kr-sbux', name: '스타벅스 코리아 e-기프트', category: '기프트카드', region: 'KR', costUSD: 10, icon: '☕',
      desc: '모바일 바코드 즉시 발송',
      detail: '스타벅스 코리아 전국 매장에서 사용하는 모바일 e-기프트(아메리카노 Tall 기준)입니다. 교환 즉시 모바일 바코드가 발송되며, 매장에서 바코드를 제시해 사용합니다.',
      highlights: ['전국 스타벅스 코리아 매장', '교환 즉시 모바일 바코드 발송', '잔액 차감식 사용 가능', '유효기간 발급일로부터 1년'],
    },
    {
      id: 'kr-gs25', name: 'GS25 모바일 상품권', category: '기프트카드', region: 'KR', costUSD: 15, icon: '🏪',
      desc: '전국 GS25 편의점',
      detail: '전국 GS25 편의점에서 사용하는 모바일 상품권입니다. 결제 시 모바일 바코드를 제시하면 상품 금액만큼 차감됩니다.',
      highlights: ['전국 GS25 편의점', '모바일 바코드 제시', '1회 또는 분할 사용', '유효기간 발급일로부터 1년'],
    },
    {
      id: 'kr-baemin', name: '배달의민족 e-쿠폰', category: '기프트카드', region: 'KR', costUSD: 20, icon: '🍗',
      desc: '배달앱 즉시 사용',
      detail: '배달의민족 앱에서 사용하는 e-쿠폰입니다. 앱 내 쿠폰함에 코드를 등록하면 주문 결제 시 자동 적용됩니다.',
      highlights: ['배달의민족 앱 전용', '쿠폰함에 코드 등록', '주문 결제 시 적용', '유효기간 발급일로부터 1년'],
    },
    {
      id: 'kr-ssg', name: '신세계 상품권', category: '기프트카드', region: 'KR', costUSD: 40, icon: '🛍️',
      desc: '전국 신세계·이마트',
      detail: '신세계백화점·이마트 등 신세계 계열 매장에서 사용하는 모바일 상품권입니다. 오프라인·온라인 매장에서 사용할 수 있습니다.',
      highlights: ['신세계백화점·이마트 등', '오프라인·온라인 사용', '잔액 차감식 사용 가능', '유효기간 발급일로부터 1년'],
    },
  ],
  CN: [
    {
      id: 'cn-sbux', name: '스타벅스 차이나 e-기프트', category: '기프트카드', region: 'CN', costUSD: 10, icon: '☕',
      desc: '중국 내 스타벅스 모바일',
      detail: '중국 본토 스타벅스 매장에서 사용하는 모바일 e-기프트입니다. 스타벅스 차이나 앱/미니프로그램에 코드를 등록해 사용합니다.',
      highlights: ['중국 본토 스타벅스 매장', '스타벅스 차이나 앱 등록', '교환 즉시 코드 발송', '유효기간 발급일로부터 1년'],
    },
    {
      id: 'cn-meituan', name: '메이퇀(美团) 바우처', category: '기프트카드', region: 'CN', costUSD: 15, icon: '🍜',
      desc: '중국 로컬 배달·생활 서비스',
      detail: '중국 최대 로컬 생활 플랫폼 메이퇀(美团)에서 사용하는 바우처입니다. 배달·음식점·생활 서비스 결제에 사용할 수 있습니다.',
      highlights: ['중국 내 메이퇀 서비스', '배달·음식점·생활 결제', '앱에 코드 등록', '유효기간 발급일로부터 1년'],
    },
    {
      id: 'cn-jd', name: 'JD.com(京东) 기프트카드', category: '기프트카드', region: 'CN', costUSD: 25, icon: '🛒',
      desc: '중국 온라인 쇼핑',
      detail: '중국 대형 온라인 쇼핑몰 징둥(JD.com)에서 사용하는 기프트카드입니다. 계정에 코드를 등록해 결제 시 사용합니다.',
      highlights: ['JD.com(징둥) 전용', '계정에 코드 등록', '결제 시 잔액 차감', '유효기간 발급일로부터 1년'],
    },
    {
      id: 'cn-ctrip', name: 'Trip.com 차이나 여행 쿠폰', category: '여행 혜택', region: 'CN', costUSD: 40, icon: '✈️',
      desc: '중국 내 항공·호텔 예약',
      detail: '중국 최대 여행 플랫폼 Trip.com(씨트립)에서 사용하는 여행 쿠폰입니다. 중국 내 항공·호텔 예약 결제에 적용됩니다.',
      highlights: ['Trip.com 차이나', '항공·호텔 예약 결제', '예약 시 쿠폰 적용', '유효기간 발급일로부터 1년'],
    },
  ],
  JP: [
    {
      id: 'jp-sbux', name: '스타벅스 재팬 e-기프트', category: '기프트카드', region: 'JP', costUSD: 10, icon: '☕',
      desc: '일본 내 스타벅스 모바일',
      detail: '일본 스타벅스 매장에서 사용하는 모바일 e-기프트입니다. 스타벅스 재팬 앱에 등록해 매장에서 사용합니다.',
      highlights: ['일본 전역 스타벅스 매장', '스타벅스 재팬 앱 등록', '교환 즉시 코드 발송', '유효기간 발급일로부터 1년'],
    },
    {
      id: 'jp-seven', name: '세븐일레븐 재팬 상품권', category: '기프트카드', region: 'JP', costUSD: 15, icon: '🏪',
      desc: '일본 전국 세븐일레븐',
      detail: '일본 전국 세븐일레븐 편의점에서 사용하는 상품권입니다. 결제 시 바코드를 제시해 사용합니다.',
      highlights: ['일본 전국 세븐일레븐', '결제 시 바코드 제시', '1회 또는 분할 사용', '유효기간 발급일로부터 1년'],
    },
    {
      id: 'jp-amazon', name: 'Amazon.co.jp 기프트', category: '기프트카드', region: 'JP', costUSD: 20, icon: '🛒',
      desc: '일본 아마존 이메일 코드',
      detail: '일본 아마존(Amazon.co.jp)에서 사용하는 기프트 코드입니다. 계정에 코드를 등록하면 잔액으로 적립되어 결제에 사용됩니다.',
      highlights: ['Amazon.co.jp 전용', '계정에 코드 등록', '이메일로 코드 발송', '유효기간 발급일로부터 1년'],
    },
    {
      id: 'jp-rakuten', name: '라쿠텐(楽天) 포인트', category: '기프트카드', region: 'JP', costUSD: 25, icon: '🎁',
      desc: '일본 라쿠텐 생태계',
      detail: '일본 라쿠텐(楽天) 생태계에서 사용하는 포인트입니다. 라쿠텐 쇼핑·트래블·페이 등 다양한 서비스에서 사용할 수 있습니다.',
      highlights: ['라쿠텐 쇼핑·트래블·페이', '라쿠텐 계정에 적립', '1포인트 단위 사용', '유효기간 발급일로부터 1년'],
    },
  ],
};

const byCostAsc = (a: MallItem, b: MallItem) => a.costUSD - b.costUSD;

/** 국제 공통(USD 오름차순). */
export function globalItemsSorted(): MallItem[] {
  return [...GLOBAL_ITEMS].sort(byCostAsc);
}

/** 선택 국가의 로컬 상품(USD 오름차순). */
export function localItemsSorted(country: MallCountry): MallItem[] {
  return [...LOCAL_ITEMS[country]].sort(byCostAsc);
}
