import { useCallback, useEffect, useRef, useState } from 'react';
import type { Booking } from '../types';
import AccountMenu from './AccountMenu';
import EnhBadge from './EnhBadge';
import SupportCenter from './SupportCenter';
import LegalModal from './LegalModal';
import BoardPage from './BoardPage';
import BookingDetailModal from './BookingDetailModal';
import BookingsPage from './BookingsPage';
import DashboardPage from './DashboardPage';
import CreateBookingPage, { type BookingPrefill } from './CreateBookingPage';
import OpPointsPage from './OpPointsPage';
import PlaybookPage from './PlaybookPage';
import PortalSidebar, { type PortalView } from './PortalSidebar';
import StaffPage from './StaffPage';
import { loadBookings, saveBookings, subscribeBookings } from '../utils/bookingStore';
import { loadPortalLang, savePortalLang, PORTAL_LANGS, type PortalLang } from '../utils/portalLang';
import { applyDark, loadDark, saveDark } from '../utils/theme';

/**
 * Ohmy Partners 포털 셸 — 실사이트 클론(사이드바·탭·헤더·푸터) 안에 Seller 화면들을 배치.
 *
 * ※ AI 요금 검색(ELLIS MCP)은 2026-07-27 닷비즈 마켓에서 **삭제**됨 — ELLIS MCP는 닷비즈에
 *   내장하지 않고 고객사 본인 Claude에 **플러그인**으로 붙이는 방식으로 방향 전환.
 *   (파일명 AiSearchPage는 이력상 유지. 관련 컴포넌트/목데이터는 미사용으로 제거됨.)
 */

/** 탭 스트립 라벨 (실제 포털: 방문한 메뉴가 탭으로 열림) */
const TAB_LABELS: Record<PortalView, string> = {
  dashboard: 'Dashboard',
  bookings: 'Bookings',
  'create-booking': 'Create Booking',
  'op-points': 'OP Points',
  faq: 'FAQ Board',
  notice: 'Notice Board',
  staff: 'Staff List',
};

/** 상단 우측 계정 메뉴 (실제 포털과 동일 구성 + Playbook) — 계정 드롭다운/모달은 AccountMenu */
function PortalAccountMenu({
  onLogout,
  onPlaybook,
  lang,
  onLangChange,
  dark,
  onToggleDark,
}: {
  onLogout: () => void;
  onPlaybook: () => void;
  lang: PortalLang;
  onLangChange: (lang: PortalLang) => void;
  dark: boolean;
  onToggleDark: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {/* 다크모드 토글 (3차 확정) — 전역 설정, 로그인 화면과 공유 */}
      <button
        type="button"
        onClick={onToggleDark}
        className="text-[15px] leading-none opacity-80 hover:opacity-100"
        title={dark ? '라이트 모드로 전환' : '다크 모드로 전환'}
        aria-label="다크 모드 전환"
      >
        {dark ? '☀' : '🌙'}
        <EnhBadge note="다크모드 — 포털 전역 전환(3차 확정), 로그인 화면과 설정 공유" />
      </button>
      {/* 고도화 표기 토글 — 기획자 설명용 배지(UP) 표시/숨김 */}
      <button
        type="button"
        onClick={() => {
          const off = document.body.classList.toggle('enh-off');
          try {
            localStorage.setItem('omh_enh', off ? 'off' : 'on');
          } catch {
            // 무시
          }
        }}
        className="text-[13px] opacity-70 hover:opacity-100"
        title="고도화 표기(UP 배지) 표시/숨김 — 닷비즈 원본과 다른 지점을 확인"
      >
        ✨
      </button>
      <button
        type="button"
        onClick={onPlaybook}
        className="flex items-center gap-1 rounded border border-brand-300 bg-brand-50 px-2 py-1 text-[12px] font-semibold text-brand-600 hover:bg-brand-100"
        title="시스템 사용 가이드 (Playbook)"
      >
        📖 Playbook
        <EnhBadge note="Ellis Playbook 내장 매뉴얼 + 언어팩(포털 언어 설정 연동)" />
      </button>
      <span className="text-slate-300">|</span>
      {/* 고객센터 "?" — 실사이트 헤더 클론(패리티) */}
      <SupportCenter />
      <span className="text-slate-300">|</span>
      {/* 포털 표시 언어 — 전역 설정 (Playbook 등 콘텐츠가 이 설정을 따라감) */}
      <span className="flex items-center gap-1 text-[12px] text-slate-600">
        <span aria-hidden>🌐</span>
        <select
          value={lang}
          onChange={(e) => onLangChange(e.target.value as PortalLang)}
          aria-label="표시 언어"
          className="cursor-pointer border-none bg-transparent text-[12px] text-slate-600 focus:outline-none"
        >
          {PORTAL_LANGS.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </span>
      <span className="text-slate-300">|</span>
      <AccountMenu />
      <span className="text-slate-300">|</span>
      <button type="button" onClick={onLogout} className="text-[12px] text-slate-600 hover:text-brand-600">
        Log out
      </button>
    </div>
  );
}

interface AiSearchPageProps {
  onLogout: () => void;
}

/** Ohmy Partners Seller 포털 (실사이트 클론 셸) */
export default function AiSearchPage({ onLogout }: AiSearchPageProps) {
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [playbookOpen, setPlaybookOpen] = useState(false);
  /** 포털 전역 표시 언어 — Playbook 등 콘텐츠가 이 설정을 따라감 */
  const [portalLang, setPortalLang] = useState<PortalLang>(loadPortalLang);
  /** 약관·개인정보 모달 (푸터 링크 — 실사이트 동일) */
  const [legalDoc, setLegalDoc] = useState<'agreement' | 'privacy' | null>(null);
  const changePortalLang = useCallback((l: PortalLang) => {
    setPortalLang(l);
    savePortalLang(l);
  }, []);
  /** 전역 다크모드 (3차 확정) — 로그인 화면과 설정 공유(omh_dark) */
  const [dark, setDark] = useState(loadDark);
  const toggleDark = useCallback(() => {
    setDark((d) => {
      const next = !d;
      saveDark(next);
      applyDark(next);
      return next;
    });
  }, []);

  /** 현재 화면 */
  const [view, setView] = useState<PortalView>('bookings');
  /** 열려 있는 탭들 (실제 포털처럼 방문한 메뉴가 탭으로 추가·✕로 닫힘) */
  const [openTabs, setOpenTabs] = useState<PortalView[]>(['bookings']);

  /** 대시보드 베스트셀러 랭킹 → Create Booking 인계 (목적지·호텔 프리필) */
  const [bookingPrefill, setBookingPrefill] = useState<BookingPrefill | null>(null);
  const prefillNonce = useRef(0);

  const navigate = useCallback((v: PortalView) => {
    setOpenTabs((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setView(v);
  }, []);

  const bookHotelFromRanking = useCallback(
    (t: { code: string; destination: string; hotelName: string }) => {
      prefillNonce.current += 1;
      setBookingPrefill({ ...t, nonce: prefillNonce.current });
      navigate('create-booking');
    },
    [navigate],
  );
  const closeTab = useCallback(
    (v: PortalView) => {
      setOpenTabs((prev) => {
        const next = prev.filter((x) => x !== v);
        if (next.length === 0) next.push('bookings');
        if (view === v) setView(next[next.length - 1]);
        return next;
      });
    },
    [view],
  );

  /** 예약 목록 — localStorage 영속 + 다른 탭(룸리스트)에서 생성한 예약 실시간 반영 */
  const [bookings, setBookings] = useState<Booking[]>(loadBookings);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  useEffect(() => saveBookings(bookings), [bookings]);
  useEffect(() => subscribeBookings(setBookings), []);

  /** 예약 취소 — 상태 변경 + 취소 일시 기록 */
  const cancelBooking = useCallback((ellisCode: string) => {
    const cancelledAt = new Date().toISOString();
    setBookings((prev) =>
      prev.map((b) =>
        b.ellis_code === ellisCode ? { ...b, status: 'Cancelled', cancel_date: cancelledAt } : b,
      ),
    );
    setDetailBooking((prev) =>
      prev && prev.ellis_code === ellisCode
        ? { ...prev, status: 'Cancelled', cancel_date: cancelledAt }
        : prev,
    );
  }, []);

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900">
      {/* ── 실제 포털 좌측 사이드바 (Seller 메뉴) ── */}
      <PortalSidebar view={view} onNavigate={navigate} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* ── 포털 상단 헤더 ── */}
        <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded border border-slate-200 text-slate-500"
              title="프로토타입 — 메뉴 접기 (더미)"
              aria-hidden
            >
              ☰
            </span>
            <span className="text-[11px] text-slate-400">
              Ohmy Partners · <b className="text-brand-500">Seller Portal</b> Prototype
            </span>
          </div>
          <PortalAccountMenu
            onLogout={() => setLogoutConfirm(true)}
            onPlaybook={() => setPlaybookOpen(true)}
            lang={portalLang}
            onLangChange={changePortalLang}
            dark={dark}
            onToggleDark={toggleDark}
          />
        </header>

        {/* ── 포털 탭 스트립 ── */}
        <div className="flex shrink-0 items-end justify-between border-b border-slate-200 bg-slate-50 px-3 pt-2">
          <div className="flex items-end gap-1">
            {openTabs.map((t) => (
              <span
                key={t}
                className={`flex items-center gap-1.5 rounded-t border border-b-0 border-slate-200 px-3 py-1.5 text-xs ${
                  view === t
                    ? 'border-t-2 border-t-brand-500 bg-white font-bold text-slate-800'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                <button type="button" onClick={() => setView(t)} className="hover:text-slate-800">
                  {TAB_LABELS[t]}
                  {t === 'bookings' && bookings.length > 0 && (
                    <span className="ml-1 rounded-full bg-brand-500 px-1.5 text-[9px] font-bold text-white">
                      {bookings.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  aria-label={`${TAB_LABELS[t]} 탭 닫기`}
                  onClick={() => closeTab(t)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* ── 본문: Seller 화면 ── */}
        {view === 'dashboard' ? (
          <DashboardPage bookings={bookings} onBookHotel={bookHotelFromRanking} dark={dark} />
        ) : view === 'staff' ? (
          <StaffPage />
        ) : view === 'faq' ? (
          <BoardPage kind="faq" portalLang={portalLang} />
        ) : view === 'notice' ? (
          <BoardPage kind="notice" portalLang={portalLang} />
        ) : view === 'create-booking' ? (
          <CreateBookingPage prefill={bookingPrefill} />
        ) : view === 'op-points' ? (
          <OpPointsPage bookings={bookings} />
        ) : (
          <BookingsPage bookings={bookings} onOpenDetail={setDetailBooking} />
        )}

        {/* ── 실제 포털 푸터 ── */}
        <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-1.5 text-[10px] text-slate-400">
          <div className="flex items-center justify-between text-[9px] text-slate-300">
            <span>
              © 2025 OHMYHOTEL GLOBAL PTE. LTD. All rights reserved. · Business number 105-87-71311
              · Ceo : Lee Mi Soon
            </span>
            <span className="flex items-center gap-2">
              <span>
                6th floor, GT Dongdaemun Building, 328 Jong-ro, Jongno-gu, Seoul ·
                cscenter@ohmyhotel.com · 02-733-0550
              </span>
              <span className="text-slate-200">|</span>
              <button type="button" onClick={() => setLegalDoc('privacy')} className="hover:text-slate-500">
                Privacy Policy
              </button>
              <span className="text-slate-200">|</span>
              <button type="button" onClick={() => setLegalDoc('agreement')} className="hover:text-slate-500">
                Terms &amp; Condition
              </button>
            </span>
          </div>
        </footer>
      </div>

      {/* 예약 상세 모달 (Bookings 목록에서 ELLIS 코드 클릭) */}
      <BookingDetailModal
        booking={detailBooking}
        onClose={() => setDetailBooking(null)}
        onCancelBooking={cancelBooking}
      />

      {/* Ellis Playbook (시스템 매뉴얼) 전체화면 — 포털 언어 설정을 따라감 */}
      {playbookOpen && <PlaybookPage lang={portalLang} onClose={() => setPlaybookOpen(false)} />}

      {/* 약관·개인정보 모달 (푸터 링크) */}
      {legalDoc && <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />}

      {/* 로그아웃 확인 (실제 포털과 동일) */}
      {logoutConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50">
          <div className="w-[380px] overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-center text-sm font-bold text-slate-800">
              Confirm
            </div>
            <p className="px-5 py-6 text-center text-[13px] text-slate-700">
              Are you sure you want to log out?
            </p>
            <div className="flex justify-center gap-2 pb-5">
              <button
                type="button"
                onClick={onLogout}
                className="rounded bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
              >
                Log out
              </button>
              <button
                type="button"
                onClick={() => setLogoutConfirm(false)}
                className="rounded border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
