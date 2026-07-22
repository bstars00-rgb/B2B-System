import { useEffect, useState } from 'react';
import { loadPortalLang, savePortalLang, PORTAL_LANGS, type PortalLang } from '../utils/portalLang';
import { applyDark, loadDark, saveDark } from '../utils/theme';
import { CAMPAIGN_INTERVAL_MS, LOGIN_CAMPAIGNS } from '../mocks/loginCampaigns';
import LegalModal from './LegalModal';

interface Props {
  /** stay = Remember me 체크 여부 (localStorage 로그인 유지) */
  onLogin: (stay: boolean) => void;
}

/**
 * 닷비즈 대문 (로그인) — 트렌드형 리뉴얼 시안 구현.
 * 좌측: "우리는 누구인가/무엇을 하는가" 광고판 (loginCampaigns 주기 교체·로테이션)
 * 우측: Welcome back 로그인 패널 (다크모드 토글 · 약관/개인정보 모달은 로그인 밖에서 열람 가능)
 * Mock — 아무 값이나 입력해도 로그인되며, 자격증명은 자리표시자로 채워져 있다.
 */
export default function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState('tyosales@attic-tours.com');
  const [password, setPassword] = useState('demo-password');
  const [showPw, setShowPw] = useState(false);
  const [stay, setStay] = useState(true);
  const [agree, setAgree] = useState(false);
  const [lang, setLang] = useState<PortalLang>(loadPortalLang);
  const [error, setError] = useState<string | null>(null);
  const [legal, setLegal] = useState<'agreement' | 'privacy' | null>(null);
  /** 다크모드 — 전역 설정(omh_dark). 로그인에서 켠 값이 로그인 후 포털로 이어진다 */
  const [dark, setDark] = useState(loadDark);

  /** 광고판 캠페인 로테이션 */
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setSlide((s) => (s + 1) % LOGIN_CAMPAIGNS.length), CAMPAIGN_INTERVAL_MS);
    return () => window.clearInterval(t);
  }, []);
  const c = LOGIN_CAMPAIGNS[slide];

  const toggleDark = () => {
    setDark((d) => {
      const next = !d;
      saveDark(next);
      applyDark(next); // 전역 <html>.dark 동기화 — 로그인 후 포털이 같은 값을 읽는다
      return next;
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    if (!agree) {
      setError('서비스 이용약관과 개인정보처리방침에 동의해 주세요.');
      return;
    }
    onLogin(stay);
  };

  const panelBg = dark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900';
  const subText = dark ? 'text-slate-400' : 'text-slate-500';
  const labelText = dark ? 'text-slate-300' : 'text-slate-700';
  const inputCls = `w-full rounded-lg border py-2.5 pl-9 pr-9 text-sm focus:border-brand-400 focus:outline-none ${
    dark
      ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500'
      : 'border-slate-200 bg-sky-50/60 focus:bg-white'
  }`;

  return (
    <div className="flex min-h-screen text-slate-900">
      {/* ── 좌측 광고판 — 주기 교체형 캠페인 (우리는 누구인가 / 무엇을 하는가) · AI 시대 무드 ── */}
      <div className="relative hidden flex-1 flex-col overflow-hidden bg-[#0B1330] px-20 py-12 lg:flex">
        {/* 배경 레이어: 그라데이션 + 도트 그리드 + 글로우 + 뉴럴 네트워크 */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A1128] via-[#111D44] to-[#1A2C5E]" aria-hidden />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: 'radial-gradient(rgba(148,163,184,0.12) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
          aria-hidden
        />
        <span className="absolute -bottom-48 -left-40 h-[560px] w-[560px] rounded-full bg-brand-500/15 blur-[130px]" aria-hidden />
        <span className="absolute -right-32 -top-40 h-[480px] w-[480px] rounded-full bg-indigo-500/15 blur-[120px]" aria-hidden />
        {/* 뉴럴 네트워크 — AI 시대에 발맞춰 간다는 무드 */}
        <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <g stroke="#64748B" strokeOpacity="0.28" strokeWidth="1">
            <line x1="150" y1="120" x2="420" y2="240" />
            <line x1="420" y1="240" x2="760" y2="150" />
            <line x1="760" y1="150" x2="1080" y2="300" />
            <line x1="420" y1="240" x2="620" y2="480" />
            <line x1="620" y1="480" x2="1000" y2="560" />
            <line x1="620" y1="480" x2="380" y2="720" />
            <line x1="380" y1="720" x2="820" y2="800" />
            <line x1="1000" y1="560" x2="820" y2="800" />
            <line x1="150" y1="120" x2="120" y2="520" />
            <line x1="120" y1="520" x2="380" y2="720" />
            <line x1="1080" y1="300" x2="1000" y2="560" />
          </g>
          <g fill="#F1964A">
            <circle cx="150" cy="120" r="4" className="animate-pulse" />
            <circle cx="420" cy="240" r="3" fill="#94A3B8" />
            <circle cx="760" cy="150" r="4" className="animate-pulse" style={{ animationDelay: '0.7s' }} />
            <circle cx="1080" cy="300" r="3" fill="#94A3B8" />
            <circle cx="620" cy="480" r="5" className="animate-pulse" style={{ animationDelay: '1.4s' }} />
            <circle cx="120" cy="520" r="3" fill="#94A3B8" />
            <circle cx="1000" cy="560" r="4" className="animate-pulse" style={{ animationDelay: '2.1s' }} />
            <circle cx="380" cy="720" r="3" fill="#94A3B8" />
            <circle cx="820" cy="800" r="4" className="animate-pulse" style={{ animationDelay: '2.8s' }} />
          </g>
        </svg>

        {/* 로고 (상단) */}
        <div className="relative flex items-center gap-3">
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-brand-500">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden />
          </span>
          <span>
            <span className="block text-2xl font-extrabold tracking-wide text-white">DOTBIZ</span>
            <span className="block text-[11px] tracking-[0.2em] text-slate-400">BY OHMYHOTEL&amp;CO</span>
          </span>
        </div>

        {/* 캠페인 카피 (중앙 — 화면을 채우는 대형 타이포) */}
        <div className="relative flex flex-1 flex-col justify-center">
          <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.3em] text-brand-300">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand-400" aria-hidden />
            AI-Powered B2B Travel Platform
          </p>
          <h1 className="mt-6 max-w-4xl whitespace-pre-line bg-gradient-to-r from-brand-400 via-orange-300 to-amber-200 bg-clip-text text-[56px] font-extrabold leading-[1.1] text-transparent xl:text-[68px]">
            {c.headline}
          </h1>
          <p className="mt-8 max-w-3xl whitespace-pre-line text-2xl leading-relaxed text-slate-200">{c.subEn}</p>
          <p className="mt-5 max-w-2xl whitespace-pre-line text-[15px] leading-relaxed text-slate-400">{c.subKo}</p>

          {/* 특장점 칩 — 폭 제한 없이 한 줄 우선 배치 */}
          <div className="mt-10 flex flex-wrap gap-2.5">
            {c.chips.map((chip) => (
              <span
                key={chip}
                className="whitespace-nowrap rounded-full border border-brand-500/60 bg-brand-500/10 px-4 py-2 text-[12.5px] font-medium text-brand-300 backdrop-blur-sm"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        {/* 하단: 캠페인 인디케이터 + AI 엔진 상태 */}
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2">
            {LOGIN_CAMPAIGNS.map((cam, i) => (
              <button
                key={cam.id}
                type="button"
                aria-label={`캠페인 ${i + 1}`}
                onClick={() => setSlide(i)}
                className={`h-2 rounded-full transition-all ${
                  i === slide ? 'w-8 bg-brand-500' : 'w-2 bg-slate-500/60 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
          <span className="flex items-center gap-2 text-[12px] text-slate-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden />
            AI Rate Engine — Online
          </span>
        </div>
      </div>

      {/* ── 우측 로그인 패널 ── */}
      <div className={`flex w-full flex-col px-8 py-6 transition-colors lg:w-[480px] ${panelBg}`}>
        {/* 상단 바: 언어 · 다크모드 */}
        <div className="flex items-center justify-between">
          <span className={`flex items-center gap-1 text-[12px] ${subText}`}>
            <span aria-hidden>🌐</span>
            <select
              value={lang}
              onChange={(e) => {
                const code = e.target.value as PortalLang;
                setLang(code);
                savePortalLang(code);
              }}
              aria-label="표시 언어"
              className={`cursor-pointer border-none bg-transparent text-[12px] font-semibold uppercase focus:outline-none ${subText}`}
            >
              {PORTAL_LANGS.map((l) => (
                <option key={l.code} value={l.code} title={l.label}>
                  {l.code.toUpperCase()}
                </option>
              ))}
            </select>
          </span>
          <button
            type="button"
            onClick={toggleDark}
            aria-label="다크 모드 전환"
            className={`text-[15px] ${subText} hover:opacity-80`}
          >
            {dark ? '☀' : '🌙'}
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={submit} className="mx-auto mt-24 w-full max-w-[360px] flex-1">
          <h2 className="text-2xl font-bold">Welcome back</h2>
          <p className={`mt-1 text-[13px] ${subText}`}>Sign in to your DOTBIZ account</p>

          <label className={`mt-8 block text-[12px] font-medium ${labelText}`}>
            Email <b className="text-rose-500">*</b>
          </label>
          <div className="relative mt-1.5">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>✉</span>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="Email address"
              className={inputCls}
            />
          </div>

          <label className={`mt-4 block text-[12px] font-medium ${labelText}`}>
            Password <b className="text-rose-500">*</b>
          </label>
          <div className="relative mt-1.5">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>🔒</span>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="Password"
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label="비밀번호 표시 전환"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPw ? '🙈' : '👁'}
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between text-[12px]">
            <label className={`flex cursor-pointer items-center gap-1.5 ${subText}`}>
              <input type="checkbox" checked={stay} onChange={(e) => setStay(e.target.checked)} className="accent-brand-500" />
              Remember me
            </label>
            <button type="button" className="font-medium text-brand-500 hover:text-brand-600">
              Forgot password?
            </button>
          </div>

          {/* 약관 동의 — 모달은 로그인 전에도 열람 가능 */}
          <label className={`mt-3 flex cursor-pointer items-start gap-1.5 text-[12px] leading-relaxed ${subText}`}>
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => {
                setAgree(e.target.checked);
                setError(null);
              }}
              className="mt-0.5 accent-brand-500"
            />
            <span>
              I have read and agree to the{' '}
              <button
                type="button"
                onClick={() => setLegal('agreement')}
                className="font-semibold text-brand-500 underline underline-offset-2 hover:text-brand-600"
              >
                DOTBIZ Platform Service Agreement
              </button>
              ,{' '}
              <button
                type="button"
                onClick={() => setLegal('privacy')}
                className="font-semibold text-brand-500 underline underline-offset-2 hover:text-brand-600"
              >
                Privacy Policy
              </button>
              .
            </span>
          </label>

          {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

          <button
            type="submit"
            className="mt-5 w-full rounded-xl bg-gradient-to-r from-brand-500 to-orange-400 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-transform hover:scale-[1.01]"
          >
            → Sign In
          </button>

          <div className="mt-6 flex items-center gap-3">
            <span className={`h-px flex-1 ${dark ? 'bg-slate-700' : 'bg-slate-200'}`} />
            <span className={`text-[11px] ${subText}`}>New to DOTBIZ?</span>
            <span className={`h-px flex-1 ${dark ? 'bg-slate-700' : 'bg-slate-200'}`} />
          </div>

          <button
            type="button"
            className="mt-4 w-full rounded-xl border border-brand-400 py-2.5 text-sm font-semibold text-brand-500 hover:bg-brand-50"
          >
            Create Account
          </button>

          <p className={`mt-6 text-center text-[10px] ${subText}`}>
            프로토타입 — 아무 값이나 입력하고 약관 동의 후 Sign In 하면 포털로 진입합니다. (실제 인증 없음)
          </p>
        </form>

        <p className={`pt-4 text-center text-[11px] ${subText}`}>© 2026 OhMyHotel&amp;Co. All rights reserved.</p>
      </div>

      {/* 약관·개인정보 모달 (로그인 밖 열람) */}
      {legal && <LegalModal doc={legal} onClose={() => setLegal(null)} />}
    </div>
  );
}
