/**
 * OP 계정 목데이터 — 3차 고도화(오피포인트) 프로토타입. **폐기 가능.**
 *
 * 현업(2026-07-29): 유저인포에서 신규 OP를 생성하면 **아이디/비번으로 개별 로그인**한다.
 * → 오피포인트는 **계정(OP)별로 분리**된다. **같은 회사라도 OP가 다르면 포인트·잔액·바우처가 분리**.
 * (개인형 확정 — 법인 통제는 고객사 자율.)
 *
 * 프로토타입엔 실제 로그인이 없어, 아래 OP 계정으로 "로그인 전환"을 시연한다.
 * 실제 시스템에선 예약 생성 시 **생성자 OP 계정**이 저장되고, 그 계정에만 적립된다.
 *
 * ※ 폐기: 이 파일 + OpPointsPage.tsx의 계정 관련 코드만 제거하면 됨.
 */

export interface OpAccount {
  /** 로그인 ID (이메일) — 유저인포에서 생성 */
  id: string;
  /** 담당자명 */
  name: string;
  /** 부서 */
  dept: string;
  /** 소속 고객사(법인) — 같은 회사라도 계정별 분리 */
  company: string;
}

/** 데모용 OP 계정 — 모두 같은 고객사(ATTIC TOURS) 소속. 포인트는 계정별로 분리된다. */
export const OP_ACCOUNTS: OpAccount[] = [
  { id: 'tyosales@attic-tours.com', name: 'TYO SALES', dept: 'Japan Sales', company: 'ATTIC TOURS' },
  { id: 'osaka.desk@attic-tours.com', name: 'OSAKA DESK', dept: 'Kansai Desk', company: 'ATTIC TOURS' },
  { id: 'fit.team@attic-tours.com', name: 'FIT TEAM', dept: 'FIT Booking', company: 'ATTIC TOURS' },
];

/**
 * 예약 → OP 계정 배정 (결정론적). 프로토타입: 예약코드 해시로 계정을 고르게 분배.
 * 실제로는 예약을 **생성한 OP 계정**이 예약에 저장되어 그 계정에만 적립된다.
 */
export function opAccountIdFor(ellisCode: string): string {
  let h = 0;
  for (let i = 0; i < ellisCode.length; i += 1) h = (Math.imul(31, h) + ellisCode.charCodeAt(i)) | 0;
  return OP_ACCOUNTS[Math.abs(h) % OP_ACCOUNTS.length].id;
}
