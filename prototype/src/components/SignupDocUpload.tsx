import { useState } from 'react';
import { findByToken, LINK_VALID_DAYS, linkValid, uploadDocs, useSignups } from '../mocks/signupStore';

/**
 * 메일 ①의 [사업자등록증 올리기] 링크로 열리는 화면 — 로그인 없이 열림, 거래처 1곳 전용, 14일 유효.
 * PDF·JPG·PNG · 10MB 이하 · 최대 3개. 시연에서는 파일 이름·크기만 기록하고 파일은 어디에도 올리지 않는다.
 * 기획: docs/plan/feature-agency-signup-onboarding.md §5. **프로토타입 · 폐기 가능.**
 */

const OK_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_BYTES = 10 * 1024 * 1024;

function Shell({ children }: { children: React.ReactNode }) {
  return (
  <div className="min-h-screen bg-slate-50 py-16">
    <div className="mx-auto w-full max-w-lg px-4">
      <p className="mb-4 text-center text-xl font-extrabold text-slate-900">
        OHMYHOTEL <span className="text-brand-500">Marketplace</span>
      </p>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">{children}</div>
      <p className="mt-4 text-center text-[11px] text-slate-400">프로토타입 — 파일은 업로드되지 않고 이름·크기만 이 브라우저에 기록됩니다.</p>
    </div>
  </div>
);
}

export default function SignupDocUpload({ token }: { token: string }) {
  useSignups(); // 다른 탭(ELLIS)의 변경을 반영
  const a = findByToken(token);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const ko = a?.lang === 'ko';

  const pick = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list);
    const bad = arr.find((f) => !OK_TYPES.includes(f.type) || f.size > MAX_BYTES);
    if (bad) return setError(ko ? `${bad.name}: PDF·JPG·PNG, 10MB 이하만 올릴 수 있습니다.` : `${bad.name}: only PDF, JPG or PNG up to 10 MB.`);
    setError(null);
    setFiles((prev) => [...prev, ...arr].slice(0, 3));
  };
  const submit = () => {
    if (!files.length) return setError(ko ? '파일을 선택해 주세요.' : 'Please choose a file.');
    uploadDocs(token, files.map((f) => ({ name: f.name, size: f.size, type: f.type })));
    setSent(true);
  };


  if (!a) return <Shell><p className="text-center text-[14px] text-slate-600">링크가 잘못되었습니다. / This link is not valid.</p></Shell>;
  if (a.status === 'active')
    return <Shell><p className="text-center text-[14px] text-slate-700">{ko ? '계정이 이미 열렸습니다. 로그인해 이용해 주세요.' : 'Your account is already open. Please sign in.'}</p></Shell>;
  if (!linkValid(a))
    return (
      <Shell>
        <p className="text-center text-[14px] text-slate-700">
          {ko ? `링크 유효기간(${LINK_VALID_DAYS}일)이 지났거나 신청이 만료되었습니다. 담당자에게 문의해 주세요: ${a.gsm}` : `This link has expired. Please contact ${a.gsm}.`}
        </p>
      </Shell>
    );
  if (sent)
    return (
      <Shell>
        <p className="text-center text-3xl">✓</p>
        <p className="mt-2 text-center text-[15px] font-bold text-slate-900">{ko ? '서류를 받았습니다' : 'We have received your document'}</p>
        <p className="mt-2 text-center text-[13px] text-slate-600">
          {ko ? '확인 후 계정을 열고 이용 안내 메일을 보내 드립니다.' : 'We will check it, open your account and send you a welcome email.'}
        </p>
      </Shell>
    );

  return (
    <Shell>
      <h1 className="text-[16px] font-bold text-slate-900">{ko ? '사업자등록증 올리기' : 'Upload your business registration certificate'}</h1>
      <p className="mt-1 text-[13px] text-slate-500">
        {a.company.name} · {ko ? '사업자등록번호' : 'Registration No.'} {a.company.regNo}
      </p>
      {a.status === 'rejected' && a.rejectReason && (
        <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{ko ? '다시 보내 주세요 · ' : 'Please send it again · '}{a.rejectReason}</p>
      )}
      <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 px-4 py-8 text-center hover:border-brand-400">
        <span className="text-[13px] font-semibold text-slate-700">{ko ? '파일 선택' : 'Choose files'}</span>
        <span className="mt-1 text-[11px] text-slate-400">PDF · JPG · PNG · 10MB · {ko ? '최대 3개' : 'up to 3 files'}</span>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple className="hidden" onChange={(e) => pick(e.target.files)} />
      </label>
      {files.length > 0 && (
        <ul className="mt-3 space-y-1 text-[12px] text-slate-700">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between rounded bg-slate-50 px-3 py-1.5">
              <span>{f.name} · {(f.size / 1024).toFixed(0)} KB</span>
              <button type="button" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-500">✕</button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-2 text-[12px] text-rose-600">{error}</p>}
      <button type="button" onClick={submit} className="mt-5 w-full rounded-lg bg-brand-500 py-2.5 text-[14px] font-bold text-white hover:bg-brand-600">
        {ko ? '보내기' : 'Submit'}
      </button>
    </Shell>
  );
}
