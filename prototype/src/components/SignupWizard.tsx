import { useState } from 'react';
import LegalModal from './LegalModal';
import { MailModal } from './SignupMail';
import {
  CORP_TYPES,
  COUNTRIES,
  createApplication,
  ellisLink,
  isRegNoTaken,
  uploadLinkOf,
  type AdminInfo,
  type CompanyInfo,
  type SignupApplication,
} from '../mocks/signupStore';

/**
 * 마켓플레이스 가입 (Create Account) — 실사이트 ohmyhotel.biz/join 4단계를 따라 만든 시연 화면.
 * Step1 약관 동의 → Step2 회사 정보(사업자등록번호 중복 확인) → Step3 관리자 등록 → Step4 완료.
 * 완료와 함께 메일 ①(가입 접수 · 사업자등록증 요청)이 자동 발송된다 (docs/plan/feature-agency-signup-onboarding.md).
 * 입력값은 이 브라우저에만 저장. **프로토타입 · 폐기 가능.**
 */

const STEPS = ['Agree to terms', 'Corporation Info', 'Administrator registration', 'Completed'];
const input = 'w-full rounded border border-slate-300 px-2.5 py-1.5 text-[13px] focus:border-brand-400 focus:outline-none';

function Row({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-2.5 text-[13px] sm:flex-row sm:items-center">
      <div className="w-56 shrink-0 font-medium text-slate-700">
        {label} {req && <b className="text-rose-500">*</b>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export default function SignupWizard({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(0);
  const [agree, setAgree] = useState([false, false, false]);
  const [legal, setLegal] = useState<'agreement' | 'privacy' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyInfo>({ name: '', type: CORP_TYPES[0], country: 'KR', zip: '', address: '', phone: '', repName: '', repEmail: '', repPhone: '', repFax: '', regNo: '' });
  const [regChecked, setRegChecked] = useState<'none' | 'ok' | 'taken'>('none');
  const [admin, setAdmin] = useState<AdminInfo>({ name: '', userId: '', dept: '', position: '', email: '', mobile: '' });
  const [pw, setPw] = useState({ a: '', b: '' });
  const [done, setDone] = useState<SignupApplication | null>(null);
  const [showMail, setShowMail] = useState(false);

  const setC = (k: keyof CompanyInfo, v: string) => {
    setCompany((c) => ({ ...c, [k]: v }));
    if (k === 'regNo') setRegChecked('none');
    setError(null);
  };
  const setA = (k: keyof AdminInfo, v: string) => {
    setAdmin((a) => ({ ...a, [k]: v, ...(k === 'userId' && (!a.email || a.email === a.userId) ? { email: v } : {}) }));
    setError(null);
  };

  const next2 = () => {
    const req: (keyof CompanyInfo)[] = ['name', 'type', 'country', 'address', 'phone', 'repName', 'repEmail', 'regNo'];
    if (req.some((k) => !company[k].trim())) return setError('필수 항목(*)을 모두 입력해 주세요.');
    if (regChecked !== 'ok') return setError('사업자등록번호 중복 확인을 먼저 해 주세요.');
    setStep(2);
  };
  const create = () => {
    const req: (keyof AdminInfo)[] = ['name', 'userId', 'email', 'mobile'];
    if (req.some((k) => !admin[k].trim()) || !pw.a) return setError('필수 항목(*)을 모두 입력해 주세요.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.userId)) return setError('아이디는 이메일 형식으로 입력해 주세요.');
    if (pw.a !== pw.b) return setError('비밀번호가 서로 다릅니다.');
    // 비밀번호는 저장하지 않는다 (시연)
    const a = createApplication({ ...company }, { ...admin });
    setDone(a);
    setStep(3);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto w-full max-w-3xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <button type="button" onClick={onBack} className="text-[13px] text-slate-500 hover:text-brand-600">← Log in</button>
          <span className="rounded-full border border-slate-300 px-2.5 py-1 text-[10px] text-slate-500">
            프로토타입 · 실사이트 ohmyhotel.biz/join 4단계 기준 · 입력값은 이 브라우저에만 저장
          </span>
        </div>

        <ol className="mb-6 grid grid-cols-4 gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className={`rounded-lg border px-3 py-2 text-center text-[12px] ${i === step ? 'border-brand-400 bg-brand-50 font-bold text-brand-700' : i < step ? 'border-slate-200 bg-white text-slate-500' : 'border-slate-200 bg-white text-slate-400'}`}>
              <span className="block text-[10px] uppercase tracking-wider">Step{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {step === 0 && (
            <>
              <h2 className="text-lg font-bold text-slate-900">Agree to terms</h2>
              {[
                ['Collection of Personal Information', 'privacy'],
                ['Terms of use', 'agreement'],
                ['Third-Party Provision of Personal Information', 'privacy'],
              ].map(([label, doc], i) => (
                <div key={label} className="mt-3 flex items-center justify-between rounded border border-slate-200 px-4 py-3 text-[13px]">
                  <span className="font-medium text-slate-800">{label}</span>
                  <span className="flex items-center gap-4">
                    <button type="button" onClick={() => setLegal(doc as 'agreement' | 'privacy')} className="text-[12px] text-brand-500 underline underline-offset-2">View</button>
                    <label className="flex cursor-pointer items-center gap-1.5 text-slate-600">
                      <input type="checkbox" checked={agree[i]} onChange={(e) => setAgree((a) => a.map((v, j) => (j === i ? e.target.checked : v)))} className="accent-brand-500" />
                      Yes, I agreed
                    </label>
                  </span>
                </div>
              ))}
              <div className="mt-6 flex justify-center gap-2">
                <button type="button" disabled={!agree.every(Boolean)} onClick={() => setStep(1)} className="rounded bg-brand-500 px-8 py-2 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">Agree</button>
                <button type="button" onClick={onBack} className="rounded border border-slate-300 px-8 py-2 text-[13px] text-slate-600">Cancel</button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="mb-2 text-lg font-bold text-slate-900">Corporation Info</h2>
              <Row label="Corporation Name" req><input value={company.name} onChange={(e) => setC('name', e.target.value)} className={input} /></Row>
              <Row label="Corporation Type" req>
                <select value={company.type} onChange={(e) => setC('type', e.target.value)} className={input}>
                  {CORP_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Row>
              <Row label="Country" req>
                <select value={company.country} onChange={(e) => setC('country', e.target.value)} className={input}>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </Row>
              <Row label="Zip Code"><input value={company.zip} onChange={(e) => setC('zip', e.target.value)} className={input} /></Row>
              <Row label="Address" req><input value={company.address} onChange={(e) => setC('address', e.target.value)} className={input} /></Row>
              <Row label="Phone" req><input value={company.phone} onChange={(e) => setC('phone', e.target.value.replace(/[^\d+]/g, ''))} placeholder="Number Only" className={input} /></Row>
              <Row label="Representative Name" req><input value={company.repName} onChange={(e) => setC('repName', e.target.value)} className={input} /></Row>
              <Row label="Representative Email" req><input value={company.repEmail} onChange={(e) => setC('repEmail', e.target.value)} className={input} /></Row>
              <Row label="Representative Phone / Fax">
                <div className="flex gap-2">
                  <input value={company.repPhone} onChange={(e) => setC('repPhone', e.target.value)} placeholder="Phone" className={input} />
                  <input value={company.repFax} onChange={(e) => setC('repFax', e.target.value)} placeholder="Fax" className={input} />
                </div>
              </Row>
              <Row label="Corporation Registration No." req>
                <div className="flex gap-2">
                  <input value={company.regNo} onChange={(e) => setC('regNo', e.target.value)} placeholder="e.g. 123-45-67890" className={input} />
                  <button
                    type="button"
                    onClick={() => company.regNo.trim() && setRegChecked(isRegNoTaken(company.regNo) ? 'taken' : 'ok')}
                    className="shrink-0 rounded border border-slate-300 px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:border-brand-400 hover:text-brand-600"
                  >
                    {regChecked === 'ok' ? '✓ VERIFIED' : 'Check for duplicate'}
                  </button>
                </div>
                {regChecked === 'taken' && <p className="mt-1 text-[12px] text-rose-600">이미 가입된 사업자등록번호입니다. 담당 영업팀에 문의해 주세요.</p>}
              </Row>
              <p className="mt-3 text-[11px] text-slate-400">사업자등록증 사본은 가입 후 메일로 받습니다(이 단계에는 첨부 칸이 없음 — 실사이트와 같음).</p>
              {error && <p className="mt-2 text-[12px] text-rose-600">{error}</p>}
              <div className="mt-6 flex justify-center gap-2">
                <button type="button" onClick={() => setStep(0)} className="rounded border border-slate-300 px-8 py-2 text-[13px] text-slate-600">Previous</button>
                <button type="button" onClick={next2} className="rounded bg-brand-500 px-8 py-2 text-[13px] font-semibold text-white">Next</button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="mb-2 text-lg font-bold text-slate-900">Administrator registration</h2>
              <Row label="Name" req><input value={admin.name} onChange={(e) => setA('name', e.target.value)} className={input} /></Row>
              <Row label="ID (email)" req><input value={admin.userId} onChange={(e) => setA('userId', e.target.value)} placeholder="name@company.com" className={input} /></Row>
              <Row label="Password" req>
                <div className="flex gap-2">
                  <input type="password" value={pw.a} onChange={(e) => setPw((p) => ({ ...p, a: e.target.value }))} placeholder="Password" className={input} />
                  <input type="password" value={pw.b} onChange={(e) => setPw((p) => ({ ...p, b: e.target.value }))} placeholder="Confirm" className={input} />
                </div>
              </Row>
              <Row label="Department / Position">
                <div className="flex gap-2">
                  <input value={admin.dept} onChange={(e) => setA('dept', e.target.value)} placeholder="Department" className={input} />
                  <input value={admin.position} onChange={(e) => setA('position', e.target.value)} placeholder="Position" className={input} />
                </div>
              </Row>
              <Row label="Email" req><input value={admin.email} onChange={(e) => setA('email', e.target.value)} className={input} /></Row>
              <Row label="Mobile Phone" req><input value={admin.mobile} onChange={(e) => setA('mobile', e.target.value.replace(/[^\d+]/g, ''))} placeholder="Number Only" className={input} /></Row>
              <p className="mt-3 text-[11px] text-slate-400">시연 화면입니다. 실제 비밀번호를 넣지 마세요(저장하지 않음).</p>
              {error && <p className="mt-2 text-[12px] text-rose-600">{error}</p>}
              <div className="mt-6 flex justify-center gap-2">
                <button type="button" onClick={() => setStep(1)} className="rounded border border-slate-300 px-8 py-2 text-[13px] text-slate-600">Previous</button>
                <button type="button" onClick={create} className="rounded bg-brand-500 px-8 py-2 text-[13px] font-semibold text-white">Create</button>
              </div>
            </>
          )}

          {step === 3 && done && (
            <div className="text-center">
              <p className="text-3xl">✓</p>
              <h2 className="mt-2 text-lg font-bold text-slate-900">가입 신청이 접수되었습니다</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                {done.admin.email}로 사업자등록증 요청 메일을 보냈습니다.
                <br />
                서류를 확인하면 계정을 열고 이용 안내 메일을 다시 보내 드립니다.
              </p>
              <div className="mx-auto mt-6 max-w-md space-y-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-left text-[12px] text-slate-600">
                <p className="font-semibold text-slate-700">시연 — 다음 단계 따라가기</p>
                <button type="button" onClick={() => setShowMail(true)} className="block w-full rounded border border-slate-300 bg-white px-3 py-2 text-left hover:border-brand-400">
                  ① 발송된 메일 보기 (가입 접수 · 사업자등록증 요청)
                </button>
                <a href={uploadLinkOf(done.token)} target="_blank" rel="noreferrer" className="block rounded border border-slate-300 bg-white px-3 py-2 hover:border-brand-400">
                  ② 메일의 [사업자등록증 올리기] 링크 열기 (새 탭)
                </a>
                <a href={ellisLink()} target="_blank" rel="noreferrer" className="block rounded border border-slate-300 bg-white px-3 py-2 hover:border-brand-400">
                  ③ GSM 화면(ELLIS 신규 가입 관리)에서 승인하기 (새 탭)
                </a>
              </div>
              <button type="button" onClick={onBack} className="mt-6 rounded bg-brand-500 px-8 py-2 text-[13px] font-semibold text-white">Log in 화면으로</button>
            </div>
          )}
        </div>
      </div>
      {legal && <LegalModal doc={legal} onClose={() => setLegal(null)} />}
      {showMail && done && <MailModal m={done.mails[0]} onClose={() => setShowMail(false)} />}
    </div>
  );
}
