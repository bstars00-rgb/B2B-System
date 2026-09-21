import { SEED_INQUIRIES, DEFAULT_MARKUP, type GroupInquiry, type MarkupConfig } from '../mocks/groupInquiry';

/**
 * 단체 문의·마크업 설정 localStorage 영속 스토어 (bookingStore 패턴).
 * 데이터 접근을 이 계층으로 일원화 — 추후 ELLIS API 연동 시 여기만 교체.
 */

const INQ_KEY = 'omh_group_inquiries';
const MARKUP_KEY = 'omh_group_markup';
const SEQ_KEY = 'omh_group_seq';
const SEED_VERSION_KEY = 'omh_group_seed_version';
const SEED_VERSION = '1';

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

export function loadMarkup(): MarkupConfig {
  try {
    const raw = localStorage.getItem(MARKUP_KEY);
    if (!raw) return DEFAULT_MARKUP;
    const parsed = JSON.parse(raw) as MarkupConfig;
    if (parsed && (parsed.type === 'pct' || parsed.type === 'fixed') && Number.isFinite(parsed.value)) return parsed;
    return DEFAULT_MARKUP;
  } catch {
    return DEFAULT_MARKUP;
  }
}

export function saveMarkup(cfg: MarkupConfig): void {
  try {
    localStorage.setItem(MARKUP_KEY, JSON.stringify(cfg));
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
