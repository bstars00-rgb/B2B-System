/**
 * 포털 전역 표시 언어 설정 — localStorage 유지.
 * 헤더/로그인 화면의 언어 셀렉트가 이 값을 읽고 쓰며,
 * Playbook 등 콘텐츠는 이 설정을 따라간다 (콘텐츠 미번역 언어는 영어 폴백).
 */

export type PortalLang = 'en' | 'ko' | 'ja' | 'vi' | 'zh' | 'tw';

export const PORTAL_LANGS: Array<{ code: PortalLang; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'ko', label: '한국어' },
  { code: 'ja', label: '日本語' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'zh', label: '中文' },
  { code: 'tw', label: '繁體中文' },
];

const KEY = 'omh_lang';

export function loadPortalLang(): PortalLang {
  try {
    const v = localStorage.getItem(KEY);
    if (v && PORTAL_LANGS.some((l) => l.code === v)) return v as PortalLang;
  } catch {
    // localStorage 접근 불가 시 기본값
  }
  return 'en';
}

export function savePortalLang(lang: PortalLang): void {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // 무시
  }
}
