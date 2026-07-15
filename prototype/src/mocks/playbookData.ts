/**
 * Ellis Playbook 콘텐츠 — B2B Partner Manual (OHMYHOTEL.Biz) 기반.
 * 원본: File by OMH/B2B Partner Manual_EN.pptx (22 slides) 를 플레이북 형태로 구조화.
 * 언어팩: 한국어(ko) + 영어(en, 원본 매뉴얼 언어). 섹션 id는 언어 간 동일 — 전환 시 현재 위치 유지.
 */

export type PlaybookLang = 'ko' | 'en';

export interface PlaybookBlock {
  /** 소제목 (없으면 본문만) */
  heading?: string;
  /** 문단 (일반 설명) */
  text?: string;
  /** 순서 있는 단계 */
  steps?: string[];
  /** 라벨: 설명 형태의 정의 목록 */
  defs?: { term: string; desc: string }[];
  /** 강조 노트 */
  note?: string;
}

export interface PlaybookSection {
  id: string;
  title: string;
  blocks: PlaybookBlock[];
}

export interface PlaybookChapter {
  id: string;
  title: string;
  sections: PlaybookSection[];
}

const PLAYBOOK_KO: PlaybookChapter[] = [
  {
    id: 'getting-started',
    title: '1. Getting Started',
    sections: [
      {
        id: 'login',
        title: 'Log In',
        blocks: [
          {
            text: 'OHMYHOTEL.Biz 는 여행사·OTA 파트너(Seller)가 호텔을 검색·예약·관리하는 B2B 플랫폼입니다. 아래 주소로 접속해 로그인하세요.',
          },
          {
            defs: [
              { term: 'URL', desc: 'https://ohmyhotel.biz/login' },
              { term: 'Language', desc: '우측 상단에서 표시 언어를 선택합니다.' },
              { term: 'Log in', desc: '계정(이메일)과 비밀번호를 입력한 뒤 로그인합니다.' },
            ],
          },
          {
            note: '아직 회사 계정이 없다면 로그인 화면의 "Create one" 으로 등록하세요. 운영(Staff) 계정 추가가 필요하면 오마이호텔 담당자에게 요청하면 됩니다.',
          },
        ],
      },
    ],
  },
  {
    id: 'confirm-reservation',
    title: '2. Confirm a Reservation',
    sections: [
      {
        id: 'bookings-menu',
        title: 'Bookings — 목록 & 컬럼',
        blocks: [
          {
            text: 'Seller > Bookings 메뉴에서 예약을 조회합니다. 목록 컬럼의 의미는 다음과 같습니다.',
          },
          {
            defs: [
              { term: 'Booking Date', desc: '예약 생성 일시 (예: 2023-06-30 11:16:53)' },
              { term: 'OMH Booking Code', desc: '오마이호텔 예약 코드 (예: 230630MQ33P01)' },
              { term: 'Booking Status', desc: '예약 상태 (Pending / Confirmed / Cancelled / Unavailable)' },
              { term: 'Hotel Name', desc: '호텔명 (예: Hotel WBF Fourstay Sapporo)' },
              { term: 'Client Cancel D/L', desc: '고객 무료취소 마감일시 (예: 2023-07-08 17:00)' },
              { term: 'C/In Date & Nts', desc: '체크인 날짜와 박수 (예: 2023-07-13[3])' },
              { term: 'Room Type & Count', desc: '객실 타입과 수량 (예: Standard Twin Non Smoking [1])' },
              { term: '1st Traveler Name', desc: '대표 투숙객명 (예: HONG/GILDONG)' },
              { term: 'B.Curr', desc: 'Bank Currency — 청구 통화 (예: KRW)' },
              { term: 'B.Sum Amt', desc: 'Bank Summary Amount — 청구 총액 (예: 666,780)' },
              { term: 'BKG Cancel Date', desc: '예약 취소 일시 (예: 2023-06-28 12:35)' },
              { term: 'Invoice No.', desc: '인보이스 번호 (예: 456123)' },
              { term: 'Dispute Y/N', desc: '분쟁 여부' },
              { term: 'Dispute Remark', desc: '분쟁 비고' },
            ],
          },
        ],
      },
      {
        id: 'bookings-search',
        title: '예약 검색 & Excel',
        blocks: [
          {
            steps: [
              '상단 필터(예약일 유형·기간, ELLIS/Seller 코드, BKG Status, Payment Status, Booker/Traveler/Mobile, 국가, 호텔명)를 설정합니다.',
              'Search 를 눌러 목록을 조회합니다.',
              '예약 번호(OMH Booking Code)를 클릭하면 상세가 모달로 열립니다.',
              'EXCEL 버튼으로 조회된 예약 전체를 엑셀 파일로 내려받을 수 있습니다.',
            ],
          },
        ],
      },
      {
        id: 'reservation-detail',
        title: '예약 상세 화면',
        blocks: [
          {
            text: '예약 코드를 클릭하면 아래 구성의 상세 창이 열립니다.',
          },
          {
            defs: [
              { term: 'Reservation number & status', desc: 'OMH 예약번호 · 호텔 확정번호 · 예약 상태' },
              { term: "Booker's Information", desc: '예약자 이름 · 이메일 · 연락처' },
              { term: 'Booking Detail', desc: '예약 상태 · 체크인/아웃 · 지역/호텔명 · 객실수/투숙객 · 룸타입 · 식사 · 조식 · 취소 마감(D/L)' },
              { term: 'Cancel / Voucher / Invoice', desc: 'Cancel: 예약 취소 · Voucher: 이메일 전송/인쇄 · Invoice: 이메일 전송/인쇄' },
            ],
          },
        ],
      },
      {
        id: 'reservation-detail-2',
        title: '투숙객 · 결제 · 취소정책',
        blocks: [
          {
            defs: [
              { term: 'Travelers', desc: '이름 · 영문명 · 아동 생년월일' },
              { term: 'Special Request', desc: '영문으로 작성된 특별 요청' },
              { term: 'Billing and Payment', desc: '청구 금액과 잔액 확인' },
              { term: 'Select Payment Method', desc: 'Credit Card · Virtual Bank(가상계좌)' },
              { term: 'Cancellation Policy', desc: '취소 마감일과 취소 규정(단계별 위약금) 확인' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'make-reservation',
    title: '3. Make a Reservation',
    sections: [
      {
        id: 'search-conditions',
        title: '검색 조건 입력',
        blocks: [
          {
            text: 'Seller > Create Booking 에서 호텔을 검색합니다. 필수/선택 조건은 다음과 같습니다.',
          },
          {
            defs: [
              { term: 'Destination (필수)', desc: '목적지 또는 호텔명 (코드-이름 자동완성)' },
              { term: 'Hotel Name', desc: '특정 호텔명으로 검색' },
              { term: 'Check In/Out (필수)', desc: '체크인/아웃 날짜 (Nights 자동 연동)' },
              { term: 'Rooms (필수)', desc: '기본 1실(성인 2명). 아동이 있으면 반드시 아동 나이를 입력해야 합니다.' },
            ],
          },
        ],
      },
      {
        id: 'hotel-list',
        title: '호텔 목록',
        blocks: [
          {
            text: '예약 가능한 호텔이 목록으로 표시됩니다.',
          },
          {
            defs: [
              { term: '표시 정보', desc: '호텔 영문명 · 성급 · 요금' },
              { term: 'Sorting', desc: 'Recommendation · Star Rating · Fare 정렬' },
              { term: 'Search & Filter', desc: '숙소명 검색 · 요금/성급/숙소유형/체인 브랜드 필터' },
            ],
          },
          {
            note: '"Select" 를 누르면 해당 호텔의 정보와 예약 가능한 객실을 확인할 수 있습니다.',
          },
        ],
      },
      {
        id: 'room-list',
        title: '객실 목록 · 호텔 정보',
        blocks: [
          {
            defs: [
              { term: '조건 변경', desc: '체크인/아웃 · Rooms 를 바꿔 재검색' },
              { term: '예약 가능 객실', desc: '룸타입 · 조식 유무 · 금액 확인' },
              { term: 'Hotel Information', desc: '호텔 주소·정보 확인' },
              { term: 'Hotel Photos', desc: '호텔 사진' },
            ],
          },
          {
            note: '아동을 동반한 검색에서 결과가 정상적으로 나오지 않으면 담당자에게 문의하세요. "Select" 를 누르면 예약서 작성 페이지로 이동합니다.',
          },
        ],
      },
      {
        id: 'booking-form',
        title: '예약서 작성 (Create)',
        blocks: [
          {
            defs: [
              { term: 'Booker', desc: '로그인한 OP 계정 정보가 표시됩니다.' },
              { term: 'Booking Detail', desc: '호텔명 · 체크인/아웃 · 룸타입 확인' },
              { term: 'Travelers & Special Request', desc: '투숙객 이름을 정확히 입력. 아동은 생년월일 입력. 동반자 이름이 없으면 TBA/TBA, TBB/TBB 처럼 입력하되 각 이름은 서로 다르게 작성' },
              { term: 'Claim Amount', desc: '호텔 결제 금액 확인' },
              { term: 'Create 버튼', desc: '클릭하면 예약이 생성됩니다.' },
            ],
          },
        ],
      },
      {
        id: 'booking-success',
        title: '예약 완료',
        blocks: [
          { text: '예약이 정상 생성되면 완료 창이 표시되고, 예약이 Bookings 목록에 추가됩니다 (ELLIS/Seller 예약 코드 발번).' },
        ],
      },
    ],
  },
  {
    id: 'confirm-billing',
    title: '4. Confirm Billing (Prepaid)',
    sections: [
      {
        id: 'invoice-single',
        title: '예약별 인보이스',
        blocks: [
          {
            steps: [
              '예약 검색 > OMH Booking Code 클릭 > Invoice 클릭',
              '인보이스 시뮬레이션 창에서 상세 정보와 입금 계좌를 확인합니다.',
              '이메일 전송 또는 인쇄(PDF)가 가능합니다.',
            ],
          },
        ],
      },
      {
        id: 'invoice-list',
        title: '인보이스 목록 조회',
        blocks: [
          {
            steps: [
              'Seller > Invoice 카테고리 클릭',
              '인보이스 날짜를 설정하고 검색하면 하단에 인보이스 목록이 표시됩니다.',
              '인보이스 번호 클릭 > 예약 목록에서 대상 예약 확인 > "Invoice View" 로 청구 확인',
            ],
          },
          {
            note: '인보이스는 오마이호텔 담당자가 생성한 후 발행됩니다.',
          },
        ],
      },
    ],
  },
  {
    id: 'staff-list',
    title: '5. Staff List',
    sections: [
      {
        id: 'staff',
        title: '직원 목록 · 등록',
        blocks: [
          {
            text: 'Member List > Staff list 에서 소속 직원 계정을 조회·등록합니다.',
          },
          {
            steps: [
              'ID / Staff / Super User 조건으로 검색하면 직원 목록이 표시됩니다.',
              'New 를 눌러 User Information 창을 엽니다.',
              '필수값(*)을 채우고 ID 중복확인 후 Save 하면 새 계정이 생성됩니다.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'contact',
    title: '6. Contact',
    sections: [
      {
        id: 'contact',
        title: '문의',
        blocks: [
          {
            text: '이용 중 궁금한 점이 있으면 아래로 문의해 주세요.',
          },
          {
            defs: [
              { term: 'Mail', desc: 'sales@ohmyhotel.com' },
              { term: 'Tel', desc: '+82-2-762-0552' },
            ],
          },
        ],
      },
    ],
  },
];

/** 영문판 — 원본 B2B Partner Manual(EN)의 표현을 따름. 섹션 id는 한국어판과 동일. */
const PLAYBOOK_EN: PlaybookChapter[] = [
  {
    id: 'getting-started',
    title: '1. Getting Started',
    sections: [
      {
        id: 'login',
        title: 'Log In',
        blocks: [
          {
            text: 'OHMYHOTEL.Biz is a B2B platform where travel agency and OTA partners (Sellers) search, book, and manage hotels. Access the address below and log in.',
          },
          {
            defs: [
              { term: 'URL', desc: 'https://ohmyhotel.biz/login' },
              { term: 'Language', desc: 'Select the display language at the top right.' },
              { term: 'Log in', desc: 'Enter your account (email) and password, then log in.' },
            ],
          },
          {
            note: 'If your company does not have an account yet, register via "Create one" on the login screen. To add operating (Staff) accounts, ask your OHMYHOTEL manager.',
          },
        ],
      },
    ],
  },
  {
    id: 'confirm-reservation',
    title: '2. Confirm a Reservation',
    sections: [
      {
        id: 'bookings-menu',
        title: 'Bookings — List & Columns',
        blocks: [
          {
            text: 'Open Seller > Bookings to view reservations. The list columns mean the following.',
          },
          {
            defs: [
              { term: 'Booking Date', desc: 'Date and time the booking was created (e.g. 2023-06-30 11:16:53)' },
              { term: 'OMH Booking Code', desc: 'OHMYHOTEL booking code (e.g. 230630MQ33P01)' },
              { term: 'Booking Status', desc: 'Booking status (Pending / Confirmed / Cancelled / Unavailable)' },
              { term: 'Hotel Name', desc: 'Hotel name (e.g. Hotel WBF Fourstay Sapporo)' },
              { term: 'Client Cancel D/L', desc: 'Deadline for free cancellation by the client (e.g. 2023-07-08 17:00)' },
              { term: 'C/In Date & Nts', desc: 'Check-in date and nights (e.g. 2023-07-13[3])' },
              { term: 'Room Type & Count', desc: 'Room type and count (e.g. Standard Twin Non Smoking [1])' },
              { term: '1st Traveler Name', desc: 'Lead traveler name (e.g. HONG/GILDONG)' },
              { term: 'B.Curr', desc: 'Bank Currency — billing currency (e.g. KRW)' },
              { term: 'B.Sum Amt', desc: 'Bank Summary Amount — total billed amount (e.g. 666,780)' },
              { term: 'BKG Cancel Date', desc: 'Date and time the booking was cancelled (e.g. 2023-06-28 12:35)' },
              { term: 'Invoice No.', desc: 'Invoice number (e.g. 456123)' },
              { term: 'Dispute Y/N', desc: 'Whether a dispute exists' },
              { term: 'Dispute Remark', desc: 'Dispute remark' },
            ],
          },
        ],
      },
      {
        id: 'bookings-search',
        title: 'Search & Excel',
        blocks: [
          {
            steps: [
              'Set the filters at the top (booking date type & range, ELLIS/Seller code, BKG Status, Payment Status, Booker/Traveler/Mobile, country, hotel name).',
              'Click Search to load the list.',
              'Click an OMH Booking Code to open the reservation detail in a modal.',
              'Click EXCEL to download all searched bookings as an Excel file.',
            ],
          },
        ],
      },
      {
        id: 'reservation-detail',
        title: 'Reservation Detail',
        blocks: [
          {
            text: 'Click a booking code to open the detail window with the sections below.',
          },
          {
            defs: [
              { term: 'Reservation number & status', desc: 'OMH booking number · hotel confirmation number · booking status' },
              { term: "Booker's Information", desc: 'Booker name · email · phone number' },
              { term: 'Booking Detail', desc: 'Status · check-in/out · region/hotel name · rooms/travelers · room type · meal · breakfast · cancellation deadline (D/L)' },
              { term: 'Cancel / Voucher / Invoice', desc: 'Cancel: cancel the booking · Voucher: send by email or print · Invoice: send by email or print' },
            ],
          },
        ],
      },
      {
        id: 'reservation-detail-2',
        title: 'Travelers · Payment · Cancellation',
        blocks: [
          {
            defs: [
              { term: 'Travelers', desc: 'Name · English name · child date of birth' },
              { term: 'Special Request', desc: 'Special requests written in English' },
              { term: 'Billing and Payment', desc: 'Check the billed amount and balance' },
              { term: 'Select Payment Method', desc: 'Credit Card · Virtual Bank (virtual account)' },
              { term: 'Cancellation Policy', desc: 'Check the cancellation deadline and the penalty schedule' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'make-reservation',
    title: '3. Make a Reservation',
    sections: [
      {
        id: 'search-conditions',
        title: 'Search Conditions',
        blocks: [
          {
            text: 'Search hotels in Seller > Create Booking. Required and optional conditions are:',
          },
          {
            defs: [
              { term: 'Destination (required)', desc: 'Destination or hotel name (code-name autocomplete)' },
              { term: 'Hotel Name', desc: 'Search by a specific hotel name' },
              { term: 'Check In/Out (required)', desc: 'Check-in/out dates (Nights auto-linked)' },
              { term: 'Rooms (required)', desc: 'Default 1 room (2 adults). If a child is included, you must enter the child\'s age.' },
            ],
          },
        ],
      },
      {
        id: 'hotel-list',
        title: 'Hotel List',
        blocks: [
          {
            text: 'Available hotels are shown as a list.',
          },
          {
            defs: [
              { term: 'Displayed info', desc: 'Hotel English name · star rating · rate' },
              { term: 'Sorting', desc: 'Recommendation · Star Rating · Fare' },
              { term: 'Search & Filter', desc: 'Property-name search · rate / star rating / property type / chain brand filters' },
            ],
          },
          {
            note: 'Click "Select" to view the hotel\'s information and available rooms.',
          },
        ],
      },
      {
        id: 'room-list',
        title: 'Room List · Hotel Info',
        blocks: [
          {
            defs: [
              { term: 'Change conditions', desc: 'Change check-in/out · Rooms and search again' },
              { term: 'Available rooms', desc: 'Room type · breakfast · amount' },
              { term: 'Hotel Information', desc: 'Hotel address and details' },
              { term: 'Hotel Photos', desc: 'Hotel photos' },
            ],
          },
          {
            note: 'If results look wrong when searching with children, contact your manager. Click "Select" to move to the booking form.',
          },
        ],
      },
      {
        id: 'booking-form',
        title: 'Booking Form (Create)',
        blocks: [
          {
            defs: [
              { term: 'Booker', desc: 'Shows the logged-in OP account information.' },
              { term: 'Booking Detail', desc: 'Check hotel name · check-in/out · room type' },
              { term: 'Travelers & Special Request', desc: 'Enter traveler names exactly. Enter date of birth for children. If companion names are unknown, enter them like TBA/TBA, TBB/TBB — each name must be different.' },
              { term: 'Claim Amount', desc: 'Check the amount to be charged by the hotel' },
              { term: 'Create button', desc: 'Click to create the booking.' },
            ],
          },
        ],
      },
      {
        id: 'booking-success',
        title: 'Booking Complete',
        blocks: [
          { text: 'When the booking is created successfully, a completion window appears and the booking is added to the Bookings list (ELLIS/Seller booking codes are issued).' },
        ],
      },
    ],
  },
  {
    id: 'confirm-billing',
    title: '4. Confirm Billing (Prepaid)',
    sections: [
      {
        id: 'invoice-single',
        title: 'Invoice per Booking',
        blocks: [
          {
            steps: [
              'Search bookings > click the OMH Booking Code > click Invoice.',
              'Check the details and the deposit account in the invoice window.',
              'You can send it by email or print it (PDF).',
            ],
          },
        ],
      },
      {
        id: 'invoice-list',
        title: 'Invoice List',
        blocks: [
          {
            steps: [
              'Click the Seller > Invoice category.',
              'Set the invoice date and search — the invoice list appears below.',
              'Click an invoice number > check the target bookings > use "Invoice View" to confirm the billing.',
            ],
          },
          {
            note: 'Invoices are issued after your OHMYHOTEL manager creates them.',
          },
        ],
      },
    ],
  },
  {
    id: 'staff-list',
    title: '5. Staff List',
    sections: [
      {
        id: 'staff',
        title: 'Staff List · Registration',
        blocks: [
          {
            text: 'View and register staff accounts in Member List > Staff list.',
          },
          {
            steps: [
              'Search by ID / Staff / Super User to list staff members.',
              'Click New to open the User Information window.',
              'Fill in the required fields (*), verify ID duplication, then Save to create the new account.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'contact',
    title: '6. Contact',
    sections: [
      {
        id: 'contact',
        title: 'Contact',
        blocks: [
          {
            text: 'If you have any questions while using the platform, contact us below.',
          },
          {
            defs: [
              { term: 'Mail', desc: 'sales@ohmyhotel.com' },
              { term: 'Tel', desc: '+82-2-762-0552' },
            ],
          },
        ],
      },
    ],
  },
];

/** 언어팩 — Playbook 언어 전환용 */
export const PLAYBOOKS: Record<PlaybookLang, PlaybookChapter[]> = {
  ko: PLAYBOOK_KO,
  en: PLAYBOOK_EN,
};

/** 기존 호환 (기본 한국어) */
export const PLAYBOOK = PLAYBOOK_KO;
