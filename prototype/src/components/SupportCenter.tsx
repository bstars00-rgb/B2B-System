import { useEffect, useRef, useState } from 'react';

/**
 * 헤더 "?" — Customer Service Center 팝오버 (실사이트 클론, 패리티).
 * 실제 ohmyhotel.biz 헤더의 물음표를 누르면 뜨는 고객센터 안내를 그대로 재현한다.
 * 내용(전화·이메일·운영시간)은 2026-07 실사이트 기준. 신규 기능이 아니므로 UP 배지 없음.
 *
 * 구성: ① Hotel(한국/글로벌 마켓 + Office Hours) ② Vietnam Operation Team(운영시간대별 연락처).
 * 세로로 길어 팝오버는 스크롤한다.
 *
 * 색: CSS 변수로 테마 전환(index.css) — 크림슨(--cs-red)은 Office/Hotel 액센트,
 * 핑크(--cs-pink)는 Vietnam Hotline. 다크에선 배경 대비를 위해 밝은 톤으로 바뀐다.
 */
const csRed = { color: 'var(--cs-red)' } as const;
const csPink = { color: 'var(--cs-pink)' } as const;

function PhoneIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style ?? csRed} aria-hidden>
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
/** 데스크폰(Office) — 실사이트 CS 팝오버의 사무실 전화 아이콘 */
function DeskPhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={csRed} aria-hidden>
      <rect x="4" y="2" width="16" height="7" rx="1.5" />
      <path d="M4 15c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M8 5h8M9 18h6" />
    </svg>
  );
}
/** 모바일(Hotline) — 핑크 */
function MobileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={csPink} aria-hidden>
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M11 18h2" />
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

/* Vietnam Operation Team — 운영 시간대별 연락처 (Office=크림슨 데스크폰, Hotline=핑크 모바일) */
type VnLine = { kind: 'office' | 'hotline'; number: string };
const VN_BLOCKS: { days: string; time: string; lines: VnLine[] }[] = [
  {
    days: 'Monday to Friday', time: '08:00 ~ 17:15',
    lines: [
      { kind: 'office', number: '+02-762-0552' },
      { kind: 'office', number: '+070-7733-8350' },
      { kind: 'hotline', number: '+84-911-180-438' },
    ],
  },
  {
    days: 'Monday to Friday', time: '17:15 ~ 22:30',
    lines: [
      { kind: 'hotline', number: '+84-90-673-2566' },
      { kind: 'hotline', number: '+84-90-376-6375' },
    ],
  },
  {
    days: 'Saturday to Sunday', time: '08:00 ~ 20:00',
    lines: [
      { kind: 'hotline', number: '+84-90-673-2566' },
      { kind: 'hotline', number: '+84-90-376-6375' },
    ],
  },
];

function VietnamTeam() {
  return (
    <div className="mt-3 border-t border-slate-200 pt-3">
      <p className="flex items-center gap-1.5 text-[13px] font-bold text-slate-800">
        <span className="rounded-sm bg-slate-100 px-1 py-px text-[9px] font-black text-slate-500">VN</span>
        Vietnam Operation Team
      </p>
      <p className="mt-1 flex items-center gap-2 text-[12px]">
        <span className="shrink-0"><MailIcon /></span>
        <span className="text-slate-700">
          Email: <span style={csRed}>vnoperation@ohmyhotel.com</span>
        </span>
      </p>

      <p className="mt-2.5 text-[12px] font-bold text-slate-700">Operation Hours:</p>
      <div className="mt-1.5 space-y-2.5">
        {VN_BLOCKS.map((b, i) => (
          <div key={i}>
            <p className="text-[12px] text-slate-700">
              <span className="font-bold">{b.days}:</span> {b.time} <span className="text-slate-400">(VN Time)</span>
            </p>
            <div className="mt-1 space-y-1 pl-3">
              {b.lines.map((l, j) => (
                <div key={j} className="flex items-center gap-2 text-[12px]">
                  <span className="shrink-0">{l.kind === 'office' ? <DeskPhoneIcon /> : <MobileIcon />}</span>
                  <span className="text-slate-700">
                    {l.number}{' '}
                    <span className="text-slate-400">({l.kind === 'office' ? 'Office' : 'Hotline'})</span>
                  </span>
                </div>
              ))}
            </div>
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
          className="absolute right-0 top-full z-50 mt-2 max-h-[calc(100vh-72px)] w-80 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
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

          <VietnamTeam />
        </div>
      )}
    </div>
  );
}
