/**
 * Ellis Playbook 콘텐츠 — B2B Partner Manual (OHMYHOTEL.Biz) 기반.
 * 원본: File by OMH/B2B Partner Manual_EN.pptx (22 slides) 를 플레이북 형태로 구조화.
 */

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

export const PLAYBOOK: PlaybookChapter[] = [
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
