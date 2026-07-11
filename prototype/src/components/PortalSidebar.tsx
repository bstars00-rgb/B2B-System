/**
 * 실제 Ohmy Partners 포털(ohmyhotel.biz)의 좌측 사이드바를 재현한 셸.
 * AI 요금 검색이 기존 Seller 메뉴 안에 신규 메뉴로 추가되는 위치를 보여준다.
 * AI 요금 검색 외 메뉴는 프로토타입에서 동작하지 않는 더미이다.
 */

const SELLER_MENUS = ['Bookings', 'Create Booking'] as const;
const SELLER_MENUS_AFTER = ['FAQ Board', 'Notice'] as const;

function DummyItem({ label }: { label: string }) {
  return (
    <li>
      <span
        className="block cursor-not-allowed py-1.5 pl-9 pr-3 text-[13px] text-slate-500"
        title="프로토타입 — 실제 포털의 기존 메뉴 (여기서는 동작하지 않음)"
      >
        {label}
      </span>
    </li>
  );
}

export default function PortalSidebar() {
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

      {/* 메뉴 검색 */}
      <div className="px-3 py-3">
        <input
          type="text"
          placeholder="Enter Menu name"
          disabled
          className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs italic text-slate-400 placeholder:text-slate-400"
        />
      </div>

      {/* Seller 섹션 */}
      <nav className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between bg-brand-500 px-3 py-2 text-white">
          <span className="flex items-center gap-1.5 text-[13px] font-bold">
            <span aria-hidden>▦</span> Seller
          </span>
          <span className="text-[10px]" aria-hidden>
            ⌃
          </span>
        </div>
        <ul className="py-1">
          {SELLER_MENUS.map((m) => (
            <DummyItem key={m} label={m} />
          ))}
          {/* 신규 메뉴 — AI 요금 검색 (현재 화면) */}
          <li>
            <span className="flex items-center gap-1.5 border-l-2 border-brand-500 bg-brand-50 py-1.5 pl-[34px] pr-3 text-[13px] font-bold text-brand-600">
              AI 요금 검색
              <span className="rounded bg-brand-500 px-1 py-px text-[8px] font-black uppercase text-white">
                New
              </span>
            </span>
          </li>
          {SELLER_MENUS_AFTER.map((m) => (
            <DummyItem key={m} label={m} />
          ))}
        </ul>

        {/* Member list 섹션 (접힘) */}
        <div
          className="mt-1 flex cursor-not-allowed items-center justify-between border-t border-slate-100 px-3 py-2 text-slate-500"
          title="프로토타입 — 실제 포털의 기존 메뉴"
        >
          <span className="flex items-center gap-1.5 text-[13px]">
            <span aria-hidden>✎</span> Member list
          </span>
          <span className="text-[10px]" aria-hidden>
            ⌄
          </span>
        </div>
      </nav>

      <p className="border-t border-slate-100 px-3 py-2 text-[9px] leading-snug text-slate-400">
        실제 Ohmy Partners 메뉴 구조에 AI 요금 검색이 신규 메뉴로 추가되는 위치를 표현한
        프로토타입입니다.
      </p>
    </aside>
  );
}
