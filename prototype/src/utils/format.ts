/** 금액/날짜 표시 유틸 — 모든 숫자는 구조화 데이터(RateResult)에서만 렌더링 */

const ZERO_DECIMAL_CURRENCIES = new Set(['KRW', 'JPY', 'VND']);

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency,
      minimumFractionDigits: ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2,
      maximumFractionDigits: ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString('ko-KR')}`;
  }
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
}

export function minutesAgo(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

export function timeAgoLabel(iso: string): string {
  const m = minutesAgo(iso);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 ${m % 60}분 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export function starLabel(star: number): string {
  return `${'★'.repeat(Math.max(0, Math.min(5, Math.round(star))))} ${star}성`;
}
