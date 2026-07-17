import { useMemo, useState } from 'react';
import EnhBadge from './EnhBadge';

/**
 * 실제 Ohmy Partners 포털(ohmyhotel.biz)의 좌측 사이드바를 재현한 셸.
 * Seller 메뉴 전체(Bookings/Create Booking/AI 요금 검색/FAQ Board/Notice)가 화면 전환 동작하고,
 * 상단 "Enter Menu name" 검색으로 메뉴를 필터링(한/영 키워드·일치 부분 하이라이트)한다.
 */

export type PortalView = 'ai' | 'bookings' | 'create-booking' | 'faq' | 'notice' | 'staff';

interface Props {
  view: PortalView;
  onNavigate: (view: PortalView) => void;
}

interface MenuItem {
  view: PortalView;
  label: string;
  badge?: string;
  /** 검색 보조 키워드 (한/영) — 라벨 외 검색어 매칭용 */
  keywords: string[];
}

interface MenuSection {
  id: string;
  icon: string;
  title: string;
  items: MenuItem[];
}

const MENU: MenuSection[] = [
  {
    id: 'seller',
    icon: '▦',
    title: 'Seller',
    items: [
      { view: 'bookings', label: 'Bookings', keywords: ['예약', '예약목록', 'reservation'] },
      { view: 'create-booking', label: 'Create Booking', keywords: ['예약생성', '호텔검색', 'hotel search'] },
      { view: 'ai', label: 'AI 요금 검색', badge: 'New', keywords: ['ai search', '자연어', 'rate', '요금검색'] },
      { view: 'faq', label: 'FAQ Board', keywords: ['자주 묻는 질문', '게시판'] },
      { view: 'notice', label: 'Notice', keywords: ['공지', '공지사항'] },
    ],
  },
  {
    id: 'member',
    icon: '✎',
    title: 'Member list',
    items: [{ view: 'staff', label: 'Staff list', keywords: ['직원', '멤버', 'member'] }],
  },
];

/** 라벨에서 검색어 일치 부분을 하이라이트 */
function Highlight({ label, query }: { label: string; query: string }) {
  const q = query.trim().toLowerCase();
  const idx = q ? label.toLowerCase().indexOf(q) : -1;
  if (idx < 0) return <>{label}</>;
  return (
    <>
      {label.slice(0, idx)}
      <span className="rounded-sm bg-brand-100 font-bold text-brand-600">{label.slice(idx, idx + q.length)}</span>
      {label.slice(idx + q.length)}
    </>
  );
}

function NavItem({
  label,
  query,
  active,
  badge,
  onClick,
}: {
  label: string;
  query: string;
  active: boolean;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-1.5 py-1.5 pr-3 text-left text-[13px] ${
          active
            ? 'border-l-2 border-brand-500 bg-brand-50 pl-[34px] font-bold text-brand-600'
            : 'pl-9 text-slate-600 hover:bg-slate-50 hover:text-slate-800'
        }`}
      >
        <span>
          <Highlight label={label} query={query} />
        </span>
        {badge && (
          <span className="rounded bg-brand-500 px-1 py-px text-[8px] font-black uppercase text-white">
            {badge}
          </span>
        )}
      </button>
    </li>
  );
}

export default function PortalSidebar({ view, onNavigate }: Props) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  /** 메뉴 필터 — 라벨 또는 키워드에 검색어 포함 (검색어 없으면 전체) */
  const sections = useMemo(
    () =>
      MENU.map((sec) => ({
        ...sec,
        items: sec.items.filter(
          (it) =>
            !q ||
            it.label.toLowerCase().includes(q) ||
            it.keywords.some((k) => k.toLowerCase().includes(q)),
        ),
      })).filter((sec) => sec.items.length > 0),
    [q],
  );

  return (
    <aside className="hidden w-[212px] shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      {/* 로고 블록 (실제 포털: 다크 배경 + OHMYHOTEL&CO) */}
      <div className="flex h-[52px] items-center gap-1.5 bg-[#333333] px-4">
        <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-brand-500 text-[10px] font-black text-brand-500">
          O
        </span>
        <span className="text-[13px] font-extrabold tracking-wide text-white">
          OHMYHOTEL<span className="font-normal">&amp;CO</span>
        </span>
      </div>

      {/* 메뉴 검색 (실사이트 Enter Menu name — 한/영 키워드 필터) */}
      <div className="px-3 py-3">
        <div className="mb-1 flex justify-end">
          <EnhBadge note="메뉴 검색 실작동 — 한/영 키워드 매칭·일치 하이라이트 (원본은 비활성)" />
        </div>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter Menu name"
            aria-label="메뉴 검색"
            className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 pr-7 text-xs text-slate-700 placeholder:italic placeholder:text-slate-400 focus:border-brand-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              aria-label="검색어 지우기"
              onClick={() => setQuery('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded px-1 text-[11px] text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 메뉴 섹션 */}
      <nav className="min-h-0 flex-1 overflow-y-auto">
        {sections.length === 0 && (
          <p className="px-4 py-6 text-center text-[11px] text-slate-400">
            '{query}' 와 일치하는 메뉴가 없습니다
          </p>
        )}
        {sections.map((sec) =>
          sec.id === 'seller' ? (
            <div key={sec.id}>
              <div className="flex items-center justify-between bg-brand-500 px-3 py-2 text-white">
                <span className="flex items-center gap-1.5 text-[13px] font-bold">
                  <span aria-hidden>{sec.icon}</span> {sec.title}
                </span>
                <span className="text-[10px]" aria-hidden>
                  ⌃
                </span>
              </div>
              <ul className="py-1">
                {sec.items.map((it) => (
                  <NavItem
                    key={it.view}
                    label={it.label}
                    query={query}
                    badge={it.badge}
                    active={view === it.view}
                    onClick={() => onNavigate(it.view)}
                  />
                ))}
              </ul>
            </div>
          ) : (
            <div key={sec.id}>
              <div
                className={`mt-1 flex items-center justify-between border-t border-slate-100 px-3 py-2 ${
                  view === 'staff' ? 'bg-brand-500 text-white' : 'text-slate-600'
                }`}
              >
                <span className="flex items-center gap-1.5 text-[13px] font-bold">
                  <span aria-hidden>{sec.icon}</span> {sec.title}
                </span>
                <span className="text-[10px]" aria-hidden>
                  ⌃
                </span>
              </div>
              <ul className="py-1">
                {sec.items.map((it) => (
                  <NavItem
                    key={it.view}
                    label={it.label}
                    query={query}
                    badge={it.badge}
                    active={view === it.view}
                    onClick={() => onNavigate(it.view)}
                  />
                ))}
              </ul>
            </div>
          ),
        )}
      </nav>

      <p className="border-t border-slate-100 px-3 py-2 text-[9px] leading-snug text-slate-400">
        실제 Ohmy Partners 메뉴 구조 클론 — Seller 메뉴 전체가 동작합니다.
      </p>
    </aside>
  );
}
