import { useMemo, useState } from 'react';

export interface Staff {
  name: string;
  id: string;
  department: string;
  position: string;
  officePhone: string;
  mobileCc: string;
  mobile: string;
  email: string;
  language: string;
  superUser: boolean;
}

const input =
  'w-full rounded border border-slate-300 px-2.5 py-1.5 text-[13px] placeholder:italic placeholder:text-slate-400 focus:border-brand-400 focus:outline-none';

/**
 * 실제 포털 Member list > Staff list 클론.
 * 검색 바(ID·Staff·Super User) + New → User Info 모달(직원 등록) + 목록 그리드.
 */
export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [fId, setFId] = useState('');
  const [fName, setFName] = useState('');
  const [fSuper, setFSuper] = useState('All');
  const [applied, setApplied] = useState({ id: '', name: '', sup: 'All' });
  const [modalOpen, setModalOpen] = useState(false);

  const rows = useMemo(
    () =>
      staff.filter((s) => {
        if (applied.id && !s.id.toLowerCase().includes(applied.id.toLowerCase())) return false;
        if (applied.name && !s.name.toLowerCase().includes(applied.name.toLowerCase())) return false;
        if (applied.sup === 'Yes' && !s.superUser) return false;
        if (applied.sup === 'No' && s.superUser) return false;
        return true;
      }),
    [staff, applied],
  );

  const filterCls =
    'rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-brand-400 focus:outline-none';

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="rounded-lg bg-white p-4 shadow-sm">
        {/* 검색 바 */}
        <div className="flex flex-wrap items-center gap-3 rounded border border-slate-200 bg-slate-50/50 px-4 py-3">
          <label className="text-xs font-medium text-slate-700">ID</label>
          <input value={fId} onChange={(e) => setFId(e.target.value)} className={`${filterCls} w-64`} />
          <label className="ml-2 text-xs font-medium text-slate-700">Staff</label>
          <input value={fName} onChange={(e) => setFName(e.target.value)} className={`${filterCls} w-48`} />
          <label className="ml-2 text-xs font-medium text-slate-700">Super User</label>
          <select value={fSuper} onChange={(e) => setFSuper(e.target.value)} className={`${filterCls} w-28`}>
            <option>All</option>
            <option>Yes</option>
            <option>No</option>
          </select>
          <div className="ml-auto flex gap-1.5">
            <button
              type="button"
              onClick={() => setApplied({ id: fId, name: fName, sup: fSuper })}
              className="rounded bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setFId(''); setFName(''); setFSuper('All');
                setApplied({ id: '', name: '', sup: 'All' });
              }}
              className="rounded border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>

        {/* New 버튼 */}
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 hover:border-brand-400 hover:text-brand-600"
          >
            New
          </button>
        </div>

        {/* 목록 그리드 */}
        <div className="mt-2 overflow-x-auto rounded border border-slate-200">
          <table className="w-full min-w-[900px] text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-3 py-2.5 font-semibold">Name</th>
                <th className="px-3 py-2.5 font-semibold">ID</th>
                <th className="px-3 py-2.5 font-semibold">Office Phone No.</th>
                <th className="px-3 py-2.5 font-semibold">Mobile Phone No.</th>
                <th className="px-3 py-2.5 font-semibold">Email Address</th>
                <th className="px-3 py-2.5 font-semibold">Super User</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-14 text-center text-slate-400">
                    No records available.
                  </td>
                </tr>
              ) : (
                rows.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                    <td className="px-3 py-3 text-center text-slate-700">{s.name}</td>
                    <td className="px-3 py-3 text-center text-slate-600">{s.id}</td>
                    <td className="px-3 py-3 text-center text-slate-600">{s.officePhone}</td>
                    <td className="px-3 py-3 text-center text-slate-600">{s.mobileCc} {s.mobile}</td>
                    <td className="px-3 py-3 text-center text-slate-600">{s.email}</td>
                    <td className="px-3 py-3 text-center text-slate-600">{s.superUser ? 'Yes' : 'No'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 페이저 */}
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1">
            {['|<', '<', '>', '>|'].map((p) => (
              <span key={p} className="flex h-6 min-w-6 items-center justify-center rounded px-1 text-slate-400">
                {p}
              </span>
            ))}
          </div>
          <span>{rows.length === 0 ? '0 - 0 of 0 items' : `1 - ${rows.length} of ${rows.length} items`}</span>
        </div>
      </div>

      {modalOpen && <UserInfoModal onClose={() => setModalOpen(false)} onSave={(s) => { setStaff((p) => [s, ...p]); setModalOpen(false); }} />}
    </div>
  );
}

/** 모달 행 레이아웃 (좌 라벨 / 우 값) — 컴포넌트 외부 정의로 리마운트 방지 */
function ModalRow({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex border-b border-slate-100 text-[13px] last:border-b-0">
      <div className="flex w-[190px] shrink-0 items-center bg-white px-4 py-2.5 font-medium text-slate-700">
        {label} {required && <b className="ml-0.5 text-rose-500">*</b>}
      </div>
      <div className="flex-1 px-4 py-2.5">{children}</div>
    </div>
  );
}

/** User Info 등록 모달 (실제 포털과 동일 필드) */
function UserInfoModal({ onClose, onSave }: { onClose: () => void; onSave: (s: Staff) => void }) {
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [dept, setDept] = useState('');
  const [position, setPosition] = useState('');
  const [officePhone, setOfficePhone] = useState('');
  const [mobileCc, setMobileCc] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('tyosales@attic-tours.com');
  const [language, setLanguage] = useState('English');
  const [superUser, setSuperUser] = useState(false);
  const [password, setPassword] = useState('');
  const [dupChecked, setDupChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (!name.trim() || !id.trim() || !officePhone.trim() || !mobile.trim() || !email.trim() || !password.trim()) {
      setError('필수 항목(*)을 모두 입력해 주세요.');
      return;
    }
    if (!dupChecked) {
      setError('ID 중복 확인(DUPLICATE VERIFICATION)을 먼저 진행해 주세요.');
      return;
    }
    onSave({ name, id, department: dept, position, officePhone, mobileCc, mobile, email, language, superUser });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6" role="dialog" aria-modal="true">
      <button type="button" aria-label="닫기" onClick={onClose} className="fixed inset-0 h-full w-full cursor-default bg-slate-900/50" />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#333333] px-5 py-3">
          <h3 className="text-sm font-bold text-white">User Info</h3>
          <button type="button" onClick={onClose} className="text-slate-300 hover:text-white" aria-label="모달 닫기">✕</button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto p-5">
          <div className="rounded border border-slate-200">
            <ModalRow label="Name" required>
              <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
            </ModalRow>
            <ModalRow label="ID" required>
              <div className="flex gap-2">
                <input
                  value={id}
                  onChange={(e) => { setId(e.target.value); setDupChecked(false); }}
                  placeholder="erica@mail.com"
                  className={input}
                />
                <button
                  type="button"
                  onClick={() => { if (id.trim()) setDupChecked(true); }}
                  className="shrink-0 rounded border border-slate-300 px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:border-brand-400 hover:text-brand-600"
                >
                  {dupChecked ? '✓ VERIFIED' : 'DUPLICATE VERIFICATION'}
                </button>
              </div>
            </ModalRow>
            <ModalRow label="Department Name">
              <input value={dept} onChange={(e) => setDept(e.target.value)} placeholder="Department Name" className={input} />
            </ModalRow>
            <ModalRow label="Position Name">
              <input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Position Name" className={input} />
            </ModalRow>
            <ModalRow label="Office Phone Number" required>
              <input value={officePhone} onChange={(e) => setOfficePhone(e.target.value.replace(/\D/g, ''))} placeholder="Number Only" className={input} />
            </ModalRow>
            <ModalRow label="Mobile Phone Number" required>
              <div className="flex gap-2">
                <input value={mobileCc} onChange={(e) => setMobileCc(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 82" className="w-24 rounded border border-slate-300 px-2.5 py-1.5 text-[13px] placeholder:italic placeholder:text-slate-400" />
                <input value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))} placeholder="Number Only" className={input} />
              </div>
            </ModalRow>
            <ModalRow label="Email Address" required>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded border border-slate-200 bg-sky-50/60 px-2.5 py-1.5 text-[13px]" />
            </ModalRow>
            <ModalRow label="Language">
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-[13px]">
                {['English', 'Korean', 'Japanese', 'Vietnamese', 'Chinese', 'Taiwan'].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </ModalRow>
            <ModalRow label="Super User" required>
              <label className="mr-4 inline-flex items-center gap-1.5">
                <input type="radio" name="super" checked={superUser} onChange={() => setSuperUser(true)} className="accent-brand-500" /> Yes
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input type="radio" name="super" checked={!superUser} onChange={() => setSuperUser(false)} className="accent-brand-500" /> No
              </label>
            </ModalRow>
            <ModalRow label="Password" required>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded border border-slate-200 bg-sky-50/60 px-2.5 py-1.5 text-[13px]" />
            </ModalRow>
          </div>

          {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={save} className="rounded bg-brand-500 px-5 py-1.5 text-xs font-semibold text-white hover:bg-brand-600">
              Save
            </button>
            <button type="button" onClick={onClose} className="rounded border border-slate-300 px-5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
