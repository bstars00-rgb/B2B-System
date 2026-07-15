/** FAQ·Notice 게시판 mock 데이터 — 실제 포털(ohmyhotel.biz)에서 확인한 게시글 기반 */

export type BoardLang = 'ko' | 'en';

export interface BoardPost {
  seq: number;
  /** FAQ: 분류 / Notice: 상단 고정 여부 */
  badge: string;
  title: string;
  time: string;
  views: number;
  attached: boolean;
  body: string;
  /** 언어팩 — 영문 제목/본문 (FAQ, 없으면 원문 표시) */
  titleEn?: string;
  bodyEn?: string;
}

/** 언어에 맞는 제목/본문 (영문 미보유 게시글은 원문 유지) */
export const postTitle = (p: BoardPost, lang: BoardLang): string =>
  lang === 'en' ? (p.titleEn ?? p.title) : p.title;
export const postBody = (p: BoardPost, lang: BoardLang): string =>
  lang === 'en' ? (p.bodyEn ?? p.body) : p.body;

export const FAQ_POSTS: BoardPost[] = [
  {
    seq: 200228, badge: 'Booking', title: '호텔(또는 요금)이 조회되지 않습니다.', time: '2026-07-09 13:40:27', views: 112, attached: false,
    body: '호텔 또는 요금이 조회되지 않는 경우 아래를 확인해 주세요.\n\n1. 체크인 날짜가 과거 날짜가 아닌지 확인해 주세요.\n2. 해당 날짜에 판매 가능한 재고가 없는 경우 결과가 표시되지 않습니다.\n3. 고객 국적에 따라 판매가 제한되는 상품이 있을 수 있습니다.\n\n위 사항을 확인하신 후에도 조회되지 않으면 고객센터(cscenter@ohmyhotel.com)로 문의해 주세요.',
    titleEn: 'Hotels (or rates) are not showing in search results.',
    bodyEn: 'If a hotel or rate is not displayed, please check the following.\n\n1. Make sure the check-in date is not in the past.\n2. If there is no sellable inventory for the dates, no results are shown.\n3. Some products may be restricted depending on the guest\'s nationality.\n\nIf the problem persists after checking the above, contact our customer center (cscenter@ohmyhotel.com).',
  },
  {
    seq: 200227, badge: 'Others', title: '요청사항은 미리 확정이 가능한가요?', time: '2026-06-22 15:05:56', views: 27, attached: false,
    body: '스페셜 리퀘스트(고층, 금연, 레이트 체크인 등)는 호텔에 전달은 되지만 확정을 보장하지 않습니다.\n체크인 시점의 호텔 사정에 따라 반영 여부가 결정됩니다.',
    titleEn: 'Can special requests be confirmed in advance?',
    bodyEn: 'Special requests (high floor, non-smoking, late check-in, etc.) are forwarded to the hotel but are not guaranteed.\nWhether they are honored depends on the hotel\'s situation at check-in.',
  },
  {
    seq: 200226, badge: 'Room/Price', title: '외국인이 예약할 경우 호텔 요금이 변경될 수 있나요?', time: '2026-07-03 12:11:01', views: 30, attached: false,
    body: '일부 국가/호텔의 경우 투숙객 국적에 따라 요금 및 판매 가능 여부가 달라질 수 있습니다.\n예약 생성 전 반드시 투숙객 국적 기준으로 요금을 조회해 주세요.',
    titleEn: 'Can hotel rates change when the guest is a foreign national?',
    bodyEn: 'For some countries/hotels, rates and availability may vary depending on the traveler\'s nationality.\nAlways search rates based on the traveler\'s nationality before creating a booking.',
  },
  {
    seq: 200225, badge: 'Payment', title: '신용카드는 종류와 관계없이, 모두 다 결제 가능한가요?', time: '2026-05-07 14:18:43', views: 11, attached: false,
    body: '주요 해외 브랜드(VISA, MasterCard, AMEX, JCB) 카드를 지원합니다.\n일부 국내 전용 카드는 결제가 제한될 수 있습니다.',
    titleEn: 'Can I pay with any type of credit card?',
    bodyEn: 'Major international brands (VISA, MasterCard, AMEX, JCB) are supported.\nSome domestic-only cards may be restricted.',
  },
  {
    seq: 200224, badge: 'Payment', title: '호텔 요금 결제는 신용카드, 현금 입금 등 모두 가능한가요?', time: '2026-04-26 22:08:07', views: 9, attached: false,
    body: '신용카드 결제와 계좌이체(현금 입금) 모두 가능합니다.\n계좌이체의 경우 취소 마감일 이전까지 입금이 확인되어야 예약이 유지됩니다.',
    titleEn: 'Can hotel charges be paid by credit card, bank deposit, etc.?',
    bodyEn: 'Both credit card payment and bank transfer (cash deposit) are available.\nFor bank transfers, the deposit must be confirmed before the cancellation deadline to keep the booking.',
  },
  {
    seq: 200223, badge: 'Cancel/Refund', title: '자세한 취소 규정은 어디서 확인할 수 있나요?', time: '2026-02-10 11:56:41', views: 10, attached: false,
    body: '각 요금제의 취소 규정은 예약 생성 화면과 예약 상세 화면의 Cancellation Policy 섹션에서 확인할 수 있습니다.\n기간별 위약금이 단계로 표시됩니다.',
    titleEn: 'Where can I find the detailed cancellation policy?',
    bodyEn: 'The cancellation policy of each rate plan is shown on the booking creation screen and in the Cancellation Policy section of the reservation detail.\nPenalties are displayed by period.',
  },
  {
    seq: 200222, badge: 'Booking', title: '전화 혹은 이메일로 예약을 진행할 수 있나요?', time: '2026-04-20 19:02:35', views: 7, attached: false,
    body: '예약은 원칙적으로 B2B 시스템을 통해 진행해 주셔야 합니다.\n시스템 장애 시에만 고객센터를 통한 수기 접수가 가능합니다.',
    titleEn: 'Can I make a reservation by phone or email?',
    bodyEn: 'Reservations must in principle be made through the B2B system.\nManual handling via the customer center is available only during system failures.',
  },
  {
    seq: 200221, badge: 'Others', title: '호텔, 객실 및 플랜 관련하여 문의 사항이 있을 시 어디에 문의하나요?', time: '2026-04-30 15:19:40', views: 4, attached: false,
    body: '고객센터 이메일(cscenter@ohmyhotel.com) 또는 대표번호(02-733-0550, 평일 09:00~18:00)로 문의해 주세요.\n문의 시 ELLIS Booking Code를 함께 알려주시면 빠른 처리가 가능합니다.',
    titleEn: 'Where do I ask questions about hotels, rooms, and plans?',
    bodyEn: 'Contact our customer center by email (cscenter@ohmyhotel.com) or phone (02-733-0550, weekdays 09:00–18:00).\nPlease include the ELLIS Booking Code with your inquiry for faster handling.',
  },
  {
    seq: 200220, badge: 'Others', title: '아기 침대 요청이 가능한가요?', time: '2026-02-10 11:56:41', views: 3, attached: false,
    body: '예약 생성 시 Special Request의 Baby Cot 항목을 체크해 주세요.\n호텔에 따라 추가 요금이 발생할 수 있으며, 확정을 보장하지 않습니다.',
    titleEn: 'Can I request a baby cot?',
    bodyEn: 'Check the Baby Cot option under Special Request when creating a booking.\nAdditional charges may apply depending on the hotel, and the request is not guaranteed.',
  },
  {
    seq: 200219, badge: 'Others', title: '아동 숙박 규정은 어떻게 되나요?', time: '2026-03-17 17:00:19', views: 9, attached: false,
    body: '호텔마다 아동 무료 숙박 기준(나이·기존 침구 사용 여부)이 다릅니다.\n호텔 상세의 You need to know 항목을 확인해 주세요. 일반적으로 만 5세 이하는 기존 침구 사용 시 무료입니다.',
    titleEn: 'What are the child stay policies?',
    bodyEn: 'Each hotel has different rules for free child stays (age and use of existing bedding).\nCheck the "You need to know" section in the hotel details. Generally, children aged 5 or under stay free when using existing bedding.',
  },
  {
    seq: 200218, badge: 'Booking', title: '예약 확정까지 얼마나 걸리나요?', time: '2026-01-22 10:12:00', views: 15, attached: false,
    body: '즉시 확정(available) 상품은 예약 생성 즉시 확정됩니다.\n온리퀘스트(on request) 상품은 호텔 확인 후 최대 24시간 내 확정 여부가 안내됩니다.',
    titleEn: 'How long does it take to confirm a booking?',
    bodyEn: 'Instantly confirmable (available) products are confirmed as soon as the booking is created.\nOn-request products are confirmed within up to 24 hours after the hotel checks availability.',
  },
  {
    seq: 200217, badge: 'Cancel/Refund', title: '취소 위약금은 어떻게 계산되나요?', time: '2026-01-15 09:30:00', views: 21, attached: false,
    body: '취소 시점이 속한 구간의 위약금 규정이 적용됩니다.\n예: 체크인 3일 전까지 무료, 이후 첫 1박 요금, 당일/노쇼 100% 등 — 상품별로 상이하니 예약 상세에서 확인하세요.',
    titleEn: 'How is the cancellation penalty calculated?',
    bodyEn: 'The penalty rule of the period in which the cancellation occurs applies.\nExample: free until 3 days before check-in, then the first night\'s rate, and 100% for same-day/no-show — rules vary by product, so check the reservation detail.',
  },
];

export const NOTICE_POSTS: BoardPost[] = [
  {
    seq: 200348, badge: 'Yes', title: 'Notice Regarding Transfer of Personal Information Due to Asset Transfer', time: '2026-02-13', views: 8, attached: false,
    body: 'Ohmyhotel & Co., Ltd. (hereinafter referred to as the "Company") entered into an asset transfer agreement on February 12, 2026, with Ohmyhotel Global Pte. Ltd. (hereinafter referred to as the "Transferee") to transfer the Company\'s platform operation-related systems (hereinafter referred to as the "Target Assets") to the Transferee (hereinafter referred to as the "Asset Transfer").\n\nAccordingly, the Company plans to transfer the personal information related to the Target Assets held by the Company, including the personal information of partner companies and your personal information related to the business, to the Transferee. The transaction is expected to close on March 16, 2026, although this date is subject to change.\n\nThe information of the Transferee who will receive the personal information related to the Target Assets through the Asset Transfer is as follows:\n- Company Name: Ohmyhotel Global Pte. Ltd.\n- Address: 111 Somerset Road, #06-01H, 111 Somerset, Singapore\n- Phone Number: [02-762-0552]\n- Email Address: [cscenter@ohmyhotel.com]\n\nThe Transferee will safely manage the transferred personal information and process it only for the original purposes at the time of transfer in accordance with applicable laws and regulations. Customers who object to the transfer of personal information may withdraw their consent to the provision of personal information by terminating their membership or deleting their account; however, in such cases, the use of services may be restricted. In addition, the Terms of Use and Privacy Policy are also expected to be partially amended.\n\nIf you have any objections or other inquiries regarding this transfer of personal information, please contact Customer Support below.\n- Customer Support / Phone Number: [02-762-0552]\n- Email Address: [cscenter@ohmyhotel.com]\n\nFebruary 13, 2026\nOhmyhotel & Co., Ltd.\nCEO Lee Mi-soon',
  },
  {
    seq: 200338, badge: 'Yes', title: 'MATSUYAMA TOKYU REI HOTEL Notice of Closure', time: '2025-10-10', views: 6, attached: false,
    body: 'MATSUYAMA TOKYU REI HOTEL will permanently close as of March 31, 2026.\n\nBookings with check-in dates on or after April 1, 2026 will be cancelled free of charge. Please rebook alternative properties for affected travelers.\n\nWe apologize for the inconvenience and appreciate your understanding.',
  },
  {
    seq: 200337, badge: 'Yes', title: 'TAKAMATSU TOKYU REI HOTEL Notice of Closure', time: '2025-10-10', views: 4, attached: false,
    body: 'TAKAMATSU TOKYU REI HOTEL will permanently close as of March 31, 2026.\n\nBookings with check-in dates on or after April 1, 2026 will be cancelled free of charge. Please rebook alternative properties for affected travelers.\n\nWe apologize for the inconvenience and appreciate your understanding.',
  },
  {
    seq: 200327, badge: 'Yes', title: 'New Year Holiday Operation Notice', time: '2025-01-23', views: 11, attached: false,
    body: 'Please note our customer support operation schedule during the New Year holiday period.\n\n- Customer support: reduced staffing (urgent inquiries only)\n- Emergency contact: cscenter@ohmyhotel.com\n\nBooking creation and cancellation through the system remain available 24/7.',
  },
  {
    seq: 200325, badge: 'Yes', title: 'Request for Cooperation Regarding Name Change of Japanese Hotel', time: '2025-01-20', views: 17, attached: false,
    body: 'Several Japanese hotel properties have changed their official names.\n\nExisting bookings remain valid under the previous hotel names. Vouchers reissued after the change date will show the new names. Please guide travelers accordingly at check-in.',
  },
  {
    seq: 200299, badge: 'Yes', title: 'Notice for B2B site brand name changing and Invitation of presentation by Ohmyhotel&co', time: '2024-02-14', views: 40, attached: false,
    body: 'Our B2B site brand has been renewed.\n\nWe cordially invite our partners to the brand presentation session hosted by Ohmyhotel&co. Details on schedule and venue will be shared with registered partners via email.\n\nThank you for your continued partnership.',
  },
];
