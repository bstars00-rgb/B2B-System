import { useEffect, useRef, useState } from 'react';

/**
 * 헤더 "?" — Customer Service Center 팝오버 (실사이트 클론, 패리티).
 * 실제 ohmyhotel.biz 헤더의 물음표를 누르면 뜨는 고객센터 안내를 그대로 재현한다.
 * 내용(전화·이메일·운영시간)은 2026-07 실사이트 기준. 신규 기능이 아니므로 UP 배지 없음.
 */

/*
 * 실사이트 CS 팝오버는 빨강 계열 액센트(아이콘·탭 밑줄·Office Hours) — 그대로 따른다.
 * 색은 CSS 변수 var(--cs-red)로: 라이트는 크림슨 #E4002B, 다크는 밝은 로즈로 전환(index.css)
 * — 다크 배경에서 크림슨이 어두워 대비가 낮아지는 문제를 피한다. SVG는 currentColor로 상속.
 */
const csRed = { color: 'var(--cs-red)' } as const;

function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={csRed} aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={csRed} aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}

function Market({ title, rows }: { title: string; rows: { icon: 'phone' | 'mail'; main: string; note?: string }[] }) {
  return (
    <div className="mt-3">
      <p className="text-[13px] font-bold text-slate-800">{title}</p>
      <div className="mt-1.5 space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-start gap-2 text-[12px]">
            <span className="mt-0.5 shrink-0">{r.icon === 'phone' ? <PhoneIcon /> : <MailIcon />}</span>
            <span className="text-slate-700">
              {r.main}
              {r.note && <span className="ml-1 text-slate-400">{r.note}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SupportCenter() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="고객센터"
        title="Customer Service Center"
        className={`flex h-6 w-6 items-center justify-center rounded-full border text-[12px] font-bold transition-colors ${
          open ? 'border-brand-400 text-brand-600' : 'border-slate-300 text-slate-500 hover:border-brand-300 hover:text-brand-600'
        }`}
      >
        ?
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Customer Service Center"
          className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
        >
          <h3 className="text-[15px] font-bold text-slate-800">
            Customer Service Center <span className="font-semibold text-slate-500">(7×24 hours)</span>
          </h3>

          {/* Hotel 탭 (실사이트: 빨강 밑줄 활성 탭) */}
          <div className="mt-3 border-b border-slate-200">
            <span className="inline-block border-b-2 pb-1.5 text-[13px] font-bold" style={{ borderColor: 'var(--cs-red)', color: 'var(--cs-red)' }}>
              Hotel
            </span>
          </div>

          <Market
            title="Korean Market"
            rows={[
              { icon: 'phone', main: '+82-2-762-0552' },
              { icon: 'mail', main: 'support@ohmyhotel.com' },
            ]}
          />
          <Market
            title="Global Market"
            rows={[
              { icon: 'phone', main: '+82-2-762-0553', note: '(International)' },
              { icon: 'mail', main: 'intlsupport@ohmyhotel.com' },
              { icon: 'mail', main: 'reconfirm@ohmyhotel.com', note: '(hotel confirmation inquiries)' },
            ]}
          />

          <div className="mt-3 border-t border-slate-200 pt-3">
            <p className="flex items-center gap-1.5 text-[13px] font-bold" style={csRed}>
              <span aria-hidden>⚠</span> Office Hours
            </p>
            <div className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-slate-500">
              <p className="text-slate-600">From 0:00 to 8:00, check-in issues will be handled first</p>
              <p>
                Pre-sale Service Time: <span className="text-sky-600">9:00–23:00 (KST)</span>
              </p>
              <p>
                Complaints Service Time: <span className="text-sky-600">9:00–24:00 (KST)</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
