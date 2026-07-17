import { useEffect, useState } from 'react';
import { loadPortalLang, savePortalLang, PORTAL_LANGS, type PortalLang } from '../utils/portalLang';
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
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('omh_login_dark') === '1';
    } catch {
      return false;
    }
  });

  /** 광고판 캠페인 로테이션 */
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setSlide((s) => (s + 1) % LOGIN_CAMPAIGNS.length), CAMPAIGN_INTERVAL_MS);
    return () => window.clearInterval(t);
  }, []);
  const c = LOGIN_CAMPAIGNS[slide];

  const toggleDark = () => {
    setDark((d) => {
      try {
        localStorage.setItem('omh_login_dark', d ? '0' : '1');
      } catch {
        // 무시
      }
      return !d;
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
      {/* ── 좌측 광고판 — 주기 교체형 캠페인 (우리는 누구인가 / 무엇을 하는가) ── */}
      <div className="relative hidden flex-1 flex-col justify-center overflow-hidden bg-[#101A3A] bg-gradient-to-br from-[#0C1430] via-[#14204A] to-[#1A2C5E] px-16 lg:flex">
        {/* 장식 점 */}
        <span className="absolute left-[14%] top-[20%] h-1.5 w-1.5 rounded-full bg-brand-500/80" aria-hidden />
        <span className="absolute right-[28%] top-[40%] h-1.5 w-1.5 rounded-full bg-slate-400/50" aria-hidden />
        <span className="absolute bottom-[22%] left-[58%] h-1.5 w-1.5 rounded-full bg-slate-400/40" aria-hidden />

        {/* 로고 */}
        <div className="mb-10 flex items-center gap-3">
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-brand-500">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden />
          </span>
          <span>
            <span className="block text-2xl font-extrabold tracking-wide text-white">DOTBIZ</span>
            <span className="block text-[11px] tracking-[0.2em] text-slate-400">BY OHMYHOTEL&amp;CO</span>
          </span>
        </div>

        {/* 캠페인 카피 */}
        <h1 className="whitespace-pre-line bg-gradient-to-r from-brand-400 to-orange-300 bg-clip-text text-[44px] font-extrabold leading-[1.15] text-transparent">
          {c.headline}
        </h1>
        <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-slate-200">{c.subEn}</p>
        <p className="mt-4 whitespace-pre-line text-[13px] leading-relaxed text-slate-400">{c.subKo}</p>

        {/* 특장점 칩 */}
        <div className="mt-8 flex max-w-xl flex-wrap gap-2.5">
          {c.chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-brand-500/60 px-4 py-1.5 text-[12px] font-medium text-brand-300"
            >
              {chip}
            </span>
          ))}
        </div>

        {/* 캠페인 인디케이터 — 운영: loginCampaigns.ts에 추가하면 자동 로테이션 */}
        <div className="mt-10 flex items-center gap-2">
          {LOGIN_CAMPAIGNS.map((cam, i) => (
            <button
              key={cam.id}
              type="button"
              aria-label={`캠페인 ${i + 1}`}
              onClick={() => setSlide(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === slide ? 'w-6 bg-brand-500' : 'w-1.5 bg-slate-500/60 hover:bg-slate-400'
              }`}
            />
          ))}
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
