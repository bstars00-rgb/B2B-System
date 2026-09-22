import { SEED_INQUIRIES, DEFAULT_COUNTRY_RATES, type GroupInquiry, type CountryRate } from '../mocks/groupInquiry';

/**
 * 단체 문의 · 국가별 요금 설정 localStorage 영속 스토어 (bookingStore 패턴).
 * 데이터 접근을 이 계층으로 일원화 — 추후 ELLIS API 연동 시 여기만 교체.
 */

const INQ_KEY = 'omh_group_inquiries';
const RATES_KEY = 'omh_group_country_rates';
const SEQ_KEY = 'omh_group_seq';
const SEED_VERSION_KEY = 'omh_group_seed_version';
const SEED_VERSION = '3'; // v3: 폼 보강 + 국가별 요금(net/커미션) + 부대서비스·홀드·GoldenKey

export function loadInquiries(): GroupInquiry[] {
  try {
    if (localStorage.getItem(SEED_VERSION_KEY) !== SEED_VERSION) {
      localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
      saveInquiries(SEED_INQUIRIES);
      return SEED_INQUIRIES;
    }
    const raw = localStorage.getItem(INQ_KEY);
    if (!raw) return SEED_INQUIRIES;
    const parsed = JSON.parse(raw) as GroupInquiry[];
    return Array.isArray(parsed) ? parsed : SEED_INQUIRIES;
  } catch {
    return SEED_INQUIRIES;
  }
}

export function saveInquiries(list: GroupInquiry[]): void {
  try {
    localStorage.setItem(INQ_KEY, JSON.stringify(list));
  } catch {
    // 저장 실패 시 세션 메모리로만 동작
  }
}

export function loadRates(): Record<string, CountryRate> {
  try {
    const raw = localStorage.getItem(RATES_KEY);
    if (!raw) return { ...DEFAULT_COUNTRY_RATES };
    const parsed = JSON.parse(raw) as Record<string, CountryRate>;
    return parsed && typeof parsed === 'object' ? { ...DEFAULT_COUNTRY_RATES, ...parsed } : { ...DEFAULT_COUNTRY_RATES };
  } catch {
    return { ...DEFAULT_COUNTRY_RATES };
  }
}

export function saveRates(rates: Record<string, CountryRate>): void {
  try {
    localStorage.setItem(RATES_KEY, JSON.stringify(rates));
  } catch {
    // 무시
  }
}

/** 문의 접수번호 발번 — GRP-YYYYMMDD-NNN */
export function nextInquiryRef(): string {
  let seq = 2;
  try {
    seq = Number(localStorage.getItem(SEQ_KEY) ?? '2');
    if (!Number.isFinite(seq) || seq < 2) seq = 2;
  } catch {
    // 기본값
  }
  const next = seq + 1;
  try {
    localStorage.setItem(SEQ_KEY, String(next));
  } catch {
    // 무시
  }
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const ymd = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  return `GRP-${ymd}-${String(next).padStart(3, '0')}`;
}
