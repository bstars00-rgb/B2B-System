/**
 * 멤버(OP) 리스트 목데이터 — 3차 고도화 탐색용(테스트 후 적용 판단).
 *
 * 실제 포털 Member list는 "고객사 직원(직영 OP)"만 전제한다. 여기서 두 가지 계정 모델을
 * 나란히 두고 어떻게 구현·운영될지 살핀다:
 *
 *  1) DIRECT (직영 OP) — 고객사(ATTIC TOURS)에 실제 근무하는 직원. 지금의 Staff list 그대로.
 *  2) SHOP-IN-SHOP (샵인샵 OP) — 고객사에 근무하진 않지만, 고객사가 보유한 **메인 아이디** 아래
 *     OP 아이디를 발급받아 쓰는 **새끼 업체**들. 같은 사업자가 아니다. 메인 아이디 소유 업체가
 *     OP 아이디를 만들어 새끼 업체에 나눠 준다.
 *
 * 샵인샵의 핵심 요구(중국 업체 아이디어): 예약이 누구 것인지는 **OP 아이디로 식별**되고,
 * **바우처는 예약한 본인만 열 수 있어야** 한다 → OP가 예약 시 PIN을 걸면 바우처 오픈에 PIN 요구.
 */

export type AccountModel = 'direct' | 'shop';

export interface Member {
  name: string;
  /** OP 로그인 아이디 (예약 귀속 식별자) */
  id: string;
  model: AccountModel;
  /** DIRECT: 부서 / SHOP: 미사용 */
  department?: string;
  position?: string;
  /** SHOP: 이 OP를 배정받은 새끼 업체명 */
  subCompany?: string;
  /** SHOP: 이 OP가 매달려 있는 메인 아이디 */
  mainId?: string;
  /**
   * 바우처 잠금 — ON이면 이 OP가 만든 예약의 바우처를 열 때 PIN이 필요하다.
   * 같은 포털을 쓰는 다른 새끼 업체가 남의 바우처를 열지 못하게 한다.
   */
  voucherLock: boolean;
  /** 데모용 — 잠금 예약 오픈 PIN (실제로는 예약 건마다 설정) */
  voucherPin?: string;
  officePhone: string;
  mobileCc: string;
  mobile: string;
  email: string;
  language: string;
  superUser: boolean;
  /** 이 OP가 만든 예약 수 (목데이터) */
  bookings: number;
  active: boolean;
}

/** 고객사(메인 아이디 소유) */
export const MAIN_ACCOUNT = { company: 'ATTIC TOURS', mainId: 'attic-main' };

export const SEED_MEMBERS: Member[] = [
  /* ── DIRECT — ATTIC TOURS 직영 직원 ── */
  {
    name: 'Erica Tanaka', id: 'erica@attic-tours.com', model: 'direct',
    department: 'Overseas Sales', position: 'Team Lead',
    voucherLock: false, officePhone: '0362551234', mobileCc: '81', mobile: '9012345678',
    email: 'erica@attic-tours.com', language: 'Japanese', superUser: true, bookings: 41, active: true,
  },
  {
    name: 'Kenji Sato', id: 'kenji@attic-tours.com', model: 'direct',
    department: 'Overseas Sales', position: 'Operator',
    voucherLock: false, officePhone: '0362551235', mobileCc: '81', mobile: '9023456789',
    email: 'kenji@attic-tours.com', language: 'Japanese', superUser: false, bookings: 33, active: true,
  },
  {
    name: 'Grace Park', id: 'grace@attic-tours.com', model: 'direct',
    department: 'Inbound Desk', position: 'Operator',
    voucherLock: false, officePhone: '0362551236', mobileCc: '82', mobile: '1044445555',
    email: 'grace@attic-tours.com', language: 'Korean', superUser: false, bookings: 27, active: true,
  },

  /* ── SHOP-IN-SHOP — 메인 아이디(attic-main) 아래 새끼 업체 OP들 ──
     같은 포털을 쓰지만 서로 다른 사업자. 바우처 잠금으로 서로의 예약을 못 연다. */
  {
    name: 'Sakura Nippon Travel', id: 'op-sakura01', model: 'shop',
    subCompany: 'Sakura Nippon Travel', mainId: 'attic-main',
    voucherLock: true, voucherPin: '1234',
    officePhone: '0663334455', mobileCc: '81', mobile: '9088887777',
    email: 'book@sakura-nippon.jp', language: 'Japanese', superUser: false, bookings: 18, active: true,
  },
  {
    name: 'Sakura Nippon — Branch 2', id: 'op-sakura02', model: 'shop',
    subCompany: 'Sakura Nippon Travel', mainId: 'attic-main',
    voucherLock: true, voucherPin: '5678',
    officePhone: '0663334456', mobileCc: '81', mobile: '9088886666',
    email: 'branch2@sakura-nippon.jp', language: 'Japanese', superUser: false, bookings: 9, active: true,
  },
  {
    name: 'Panda Trip (Shanghai)', id: 'op-panda01', model: 'shop',
    subCompany: 'Panda Trip', mainId: 'attic-main',
    voucherLock: true, voucherPin: '2468',
    officePhone: '02161889900', mobileCc: '86', mobile: '13800138000',
    email: 'op@pandatrip.cn', language: 'Chinese', superUser: false, bookings: 22, active: true,
  },
  {
    name: 'Hana Tour Busan', id: 'op-hana01', model: 'shop',
    subCompany: 'Hana Tour Busan', mainId: 'attic-main',
    voucherLock: false,
    officePhone: '0517778899', mobileCc: '82', mobile: '1055556666',
    email: 'busan@hanatour.kr', language: 'Korean', superUser: false, bookings: 7, active: true,
  },
  {
    name: 'Viet Smile Travel', id: 'op-viet01', model: 'shop',
    subCompany: 'Viet Smile Travel', mainId: 'attic-main',
    voucherLock: true, voucherPin: '4321',
    officePhone: '02839111222', mobileCc: '84', mobile: '901234567',
    email: 'op@vietsmile.vn', language: 'Vietnamese', superUser: false, bookings: 4, active: false,
  },
];
