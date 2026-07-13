import { useState } from 'react';

interface Props {
  onLogin: () => void;
}

/**
 * 실제 포털 로그인 화면 클론 (ohmyhotel.biz/login).
 * 오렌지 로고 + 태그라인 + 이메일/비밀번호 + Log in + Stay signed in + 하단 링크.
 * Mock — 아무 값이나 입력해도 로그인되며, 자격증명은 자리표시자로 채워져 있다.
 */
export default function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState('tyosales@attic-tours.com');
  const [password, setPassword] = useState('demo-password');
  const [stay, setStay] = useState(true);
  const [lang, setLang] = useState('English');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    onLogin();
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-100 px-4 text-slate-900">
      {/* 언어 선택 (우상단) */}
      <div className="mt-16 w-full max-w-[370px]">
        <div className="mb-4 flex justify-end">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-brand-400 focus:outline-none"
          >
            {['English', '한국어', '日本語', 'Tiếng Việt', '中文', '繁體中文'].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>

        {/* 로그인 카드 */}
        <form
          onSubmit={submit}
          className="rounded-lg border border-slate-200 bg-white px-8 py-9 shadow-sm"
        >
          {/* 로고 */}
          <div className="flex flex-col items-center">
            <div className="relative flex h-14 w-14 items-center justify-center">
              <span className="absolute h-11 w-11 rounded-full border-[5px] border-brand-500" />
              <span className="absolute -right-0.5 -top-1 h-3 w-3 -rotate-45 rounded-[0_60%_0_60%] bg-green-600" />
            </div>
            <div className="mt-2 text-[15px] font-extrabold tracking-wide text-slate-700">
              OHMYHOTEL<span className="text-brand-500">&amp;CO</span>
            </div>
            <p className="mt-3 text-center text-[11px] font-medium tracking-wide text-slate-400">
              YOUR CONTENT, YOUR WAY, AS SIMPLE AS THAT
            </p>
          </div>

          {/* 입력 */}
          <div className="mt-6 space-y-2.5">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="Email address"
              className="w-full rounded border border-slate-200 bg-sky-50/60 px-3 py-2.5 text-sm focus:border-brand-400 focus:bg-white focus:outline-none"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="Password"
              className="w-full rounded border border-slate-200 bg-sky-50/60 px-3 py-2.5 text-sm focus:border-brand-400 focus:bg-white focus:outline-none"
            />
          </div>

          {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

          <button
            type="submit"
            className="mt-3 w-full rounded bg-brand-500 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-600"
          >
            Log in
          </button>

          <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={stay}
              onChange={(e) => setStay(e.target.checked)}
              className="accent-brand-500"
            />
            Stay signed in
          </label>

          <hr className="my-4 border-slate-100" />

          <div className="space-y-2 text-xs">
            <button type="button" className="block text-slate-500 underline underline-offset-2 hover:text-brand-600">
              Forgot your password?
            </button>
            <button type="button" className="block text-slate-500 underline underline-offset-2 hover:text-brand-600">
              Don’t have an account? Create one
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-[10px] text-slate-400">
          프로토타입 로그인 — 아무 값이나 입력하고 Log in 하면 포털로 진입합니다. (실제 인증 없음)
        </p>
      </div>
    </div>
  );
}
