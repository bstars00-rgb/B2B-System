import { useCallback, useEffect, useState } from 'react';
import type { Booking } from '../types';
import { OP_ACCOUNTS, opAccountIdFor } from '../mocks/opAccounts';
import { seedRedemptions, type GiftRedemption } from '../mocks/giftCatalog';
import type { PointPromo } from '../mocks/opPointsPromos';
import { OP_POINT_POLICY, computeAccruals, computePending, toKRW, DEFAULT_TIERS, type Accrual, type Tier } from './opPoints';

/**
 * 오피포인트 공용 데이터 계층 — 교환 기록 영속(localStorage) + 계정 원장 요약 + 리포트 집계.
 * OP Points 화면 · Staff list(Phase 2 Q&A No.6) · 리포트(No.7)가 같은 숫자를 보도록 한 곳에서 계산.
 * 실서비스: 포인트 원장(적립·보류·차감·복원·소멸) 테이블과 ELLIS API로 대체. **프로토타입 · 폐기 가능.**
 */

const KEY = 'omh_op_redemptions_v1';
const EVENT = 'omh-op-redemptions';

export function loadRedemptions(today: string): GiftRedemption[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GiftRedemption[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // 시드로 시작
  }
  return seedRedemptions(today);
}

export function saveRedemptions(list: GiftRedemption[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // 세션 메모리로만 동작
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeRedemptions(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(EVENT, onChange);
  };
}

/**
 * 교환 기록 훅 — OP Points 화면·Staff list·리포트가 같은 기록을 본다(탭 간 동기화 포함).
 * update는 항상 저장소의 최신값에 적용(비동기 상태 변경 시뮬레이션에서도 안전).
 */
export function useRedemptions(today: string): [GiftRedemption[], (fn: (prev: GiftRedemption[]) => GiftRedemption[]) => void] {
  const [list, setList] = useState<GiftRedemption[]>(() => loadRedemptions(today));
  useEffect(() => subscribeRedemptions(() => setList(loadRedemptions(today))), [today]);
  const update = useCallback((fn: (prev: GiftRedemption[]) => GiftRedemption[]) => saveRedemptions(fn(loadRedemptions(today))), [today]);
  return [list, update];
}

const r1 = (n: number) => Math.round(n * 10) / 10;
/** 적립일 = 지불 완료일(없으면 체크아웃) */
export const accruedOn = (a: Accrual) => a.paidAt ?? a.stayCompleted;
export const addMonths = (iso: string, n: number) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
};

export interface AccountLedger {
  accountId: string;
  accruals: Accrual[];
  pending: Accrual[];
  earned: number;
  redeemed: number;
  expired: number;
  balance: number;
  /** 다음 1개월 안에 소멸될 포인트 */
  expiringSoon: number;
}

/** 계정 원장 요약 — 등급은 회사 합산(companyBookings), 포인트는 계정 본인 예약 */
export function accountLedger(
  accountId: string,
  companyBookings: Booking[],
  redemptions: GiftRedemption[],
  today: string,
  promos: PointPromo[],
  unitKRW: number,
  tiers: Tier[] = DEFAULT_TIERS,
): AccountLedger {
  const mine = companyBookings.filter((b) => opAccountIdFor(b.ellis_code) === accountId);
  const accruals = computeAccruals(mine, today, promos, unitKRW, tiers, companyBookings);
  const pending = computePending(mine, today, promos, unitKRW, tiers, companyBookings);
  const cut12 = addMonths(today, -OP_POINT_POLICY.expiryMonths);
  const cut11 = addMonths(today, -(OP_POINT_POLICY.expiryMonths - 1));
  const earned = r1(accruals.reduce((s, a) => s + a.points, 0));
  const redeemed = r1(redemptions.filter((x) => x.accountId === accountId && x.status !== 'failed').reduce((s, x) => s + x.points, 0));
  const expired = r1(accruals.filter((a) => accruedOn(a) < cut12).reduce((s, a) => s + a.points, 0));
  const expiringSoon = r1(accruals.filter((a) => accruedOn(a) >= cut12 && accruedOn(a) < cut11).reduce((s, a) => s + a.points, 0));
  return { accountId, accruals, pending, earned, redeemed, expired, balance: r1(Math.max(0, earned - redeemed - expired)), expiringSoon };
}

/** 회사 전체 OP 계정 원장 */
export function companyLedgers(companyBookings: Booking[], redemptions: GiftRedemption[], today: string, promos: PointPromo[], unitKRW: number, tiers: Tier[] = DEFAULT_TIERS) {
  return OP_ACCOUNTS.map((a) => ({ account: a, ledger: accountLedger(a.id, companyBookings, redemptions, today, promos, unitKRW, tiers) }));
}

const monthOf = (iso: string) => iso.slice(0, 7);
const lastMonths = (today: string, n: number) => Array.from({ length: n }, (_, i) => monthOf(addMonths(`${today.slice(0, 7)}-01`, -(n - 1 - i))));
const nextMonths = (today: string, n: number) => Array.from({ length: n }, (_, i) => monthOf(addMonths(`${today.slice(0, 7)}-01`, i)));

/** 셀러 리포트 ① 포인트 명세 — 월별 적립·교환·소멸·월말 잔액 */
export function monthlyStatement(accruals: Accrual[], redemptions: GiftRedemption[], accountId: string, today: string, months = 12) {
  const mine = redemptions.filter((x) => x.accountId === accountId && x.status !== 'failed');
  const ms = lastMonths(today, months);
  // 기간 이전 잔액(이월)
  const first = `${ms[0]}-01`;
  const expiryOf = (a: Accrual) => addMonths(accruedOn(a), OP_POINT_POLICY.expiryMonths);
  let balance = r1(
    accruals.filter((a) => accruedOn(a) < first).reduce((s, a) => s + a.points, 0) -
      mine.filter((x) => x.at < first).reduce((s, x) => s + x.points, 0) -
      accruals.filter((a) => expiryOf(a) < first).reduce((s, a) => s + a.points, 0),
  );
  return ms.map((m) => {
    const earned = r1(accruals.filter((a) => monthOf(accruedOn(a)) === m).reduce((s, a) => s + a.points, 0));
    const redeemed = r1(mine.filter((x) => monthOf(x.at) === m).reduce((s, x) => s + x.points, 0));
    const expired = r1(accruals.filter((a) => monthOf(expiryOf(a)) === m && expiryOf(a) <= today).reduce((s, a) => s + a.points, 0));
    balance = r1(Math.max(0, balance + earned - redeemed - expired));
    return { month: m, earned, redeemed, expired, balance };
  });
}

/** 셀러 리포트 ③ 소멸 예정 — 앞으로 N개월 동안 월별 소멸 예정 포인트 */
export function expiryForecast(accruals: Accrual[], today: string, months = 12) {
  return nextMonths(today, months).map((m) => ({
    month: m,
    points: r1(accruals.filter((a) => monthOf(addMonths(accruedOn(a), OP_POINT_POLICY.expiryMonths)) === m && addMonths(accruedOn(a), OP_POINT_POLICY.expiryMonths) > today).reduce((s, a) => s + a.points, 0)),
  }));
}

/** 포인트 1건의 구성 — 기본(Bronze 요율) · 등급 추가분 · 프로모 추가분 */
export function splitPoints(a: Accrual, tiers: Tier[] = DEFAULT_TIERS) {
  const atTier = a.points / (a.multiplier || 1); // 프로모 전(등급 요율 적용분)
  const base = atTier * (tiers[0].ratePct / (a.tierRatePct || tiers[0].ratePct));
  return { base, tierBonus: atTier - base, promoBonus: a.points - atTier };
}

/** ELLIS 리포트 ① 프로모 비용 · ⑤ 호텔·캠페인 성과 */
export function promoReport(allAccruals: Accrual[], promos: PointPromo[], unitKRW: number, tiers: Tier[] = DEFAULT_TIERS) {
  const byPromo = promos.map((p) => {
    const rows = allAccruals.filter((a) => a.promoId === p.id);
    const bonus = rows.reduce((s, a) => s + splitPoints(a, tiers).promoBonus, 0);
    const pts = rows.reduce((s, a) => s + a.points, 0);
    const ttv = rows.reduce((s, a) => s + toKRW(a.amount, a.currency), 0);
    return { promo: p, bookings: rows.length, ttvKRW: Math.round(ttv), points: r1(pts), bonusPts: r1(bonus), bonusKRW: Math.round(bonus * unitKRW) };
  });
  const tierBonus = allAccruals.reduce((s, a) => s + splitPoints(a, tiers).tierBonus, 0);
  return { byPromo, tierBonusPts: r1(tierBonus), tierBonusKRW: Math.round(tierBonus * unitKRW) };
}

/** ELLIS 리포트 ④ 기간별 발행 — 월별 발행 포인트·원화 가치 */
export function issuanceByMonth(allAccruals: Accrual[], today: string, unitKRW: number, months = 6) {
  return lastMonths(today, months).map((m) => {
    const pts = allAccruals.filter((a) => monthOf(accruedOn(a)) === m).reduce((s, a) => s + a.points, 0);
    return { month: m, points: r1(pts), krw: Math.round(pts * unitKRW) };
  });
}
