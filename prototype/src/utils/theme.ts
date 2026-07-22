/**
 * 포털 전역 다크모드 설정 — localStorage 유지 (3차 고도화 확정 기능).
 *
 * 로그인 화면·포털 헤더의 🌙/☀ 토글이 이 값을 읽고 쓴다. 언어 설정(portalLang)과 같은 원칙:
 * **한 곳에서만 바뀌고**, 선택이 로그인 → 포털로 이어진다.
 *
 * 적용 방식: `<html>`에 `dark` 클래스를 붙였다 뗀다. 실제 색 전환은 index.css의
 * `.dark` 오버레이가 공통 유틸리티(bg-white·text-slate·border 등)를 일괄 재매핑해 처리한다.
 * (컴포넌트 35종에 dark: 변형을 다는 대신 오버레이 한 곳으로 — 프로토타입 retrofit 방식.
 *  운영 적용 시에는 의미 기반 토큰(surface/body/border)으로 승격 권장.)
 */

const KEY = 'omh_dark';

export function loadDark(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function saveDark(dark: boolean): void {
  try {
    localStorage.setItem(KEY, dark ? '1' : '0');
  } catch {
    // 무시
  }
}

/** `<html>`의 dark 클래스 동기화 — 앱 마운트 시 1회, 토글 시마다 호출 */
export function applyDark(dark: boolean): void {
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
}
