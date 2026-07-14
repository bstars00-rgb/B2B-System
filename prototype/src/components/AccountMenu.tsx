import { useEffect, useRef, useState } from 'react';
import { ModalRow, UserInfoModal, type Staff } from './StaffPage';

/** 로그인 계정(ATTIC TOURS 담당자) 기본 정보 — 프로토타입 목데이터 */
const ACCOUNT_USER: Staff = {
  name: 'TYO SALES',
  id: 'tyosales@attic-tours.com',
  department: 'Sales Team',
  position: 'Manager',
  officePhone: '0354051234',
  mobileCc: '81',
  mobile: '9012345678',
  email: 'tyosales@attic-tours.com',
  language: 'English',
  superUser: true,
};

/** Corporation Profile 항목 (실제 포털: 읽기 전용) — 프로토타입 목데이터 */
const CORPORATION_PROFILE: [string, string][] = [
  ['Corporation Registration Number', '8011101034567'],
  ['Corporation Name', 'ATTIC TOURS CO., LTD. (株式会社アティックツアーズ)'],
  ['Representative Name', 'YAMADA TARO'],
  ['Address', '2F Hayakawa Bldg, 2-20-15 Shinbashi, Minato-ku, Tokyo, 105-0004'],
  ['Country', 'Japan'],
  ['Language', 'English'],
  ['Office Phone Number', '03-5405-1234'],
  ['Email Address', 'tyosales@attic-tours.com'],
  ['Fax Number', '03-5405-1235'],
];

const pwInput =
  'w-full rounded border border-slate-300 px-2.5 py-1.5 text-[13px] placeholder:italic placeholder:text-slate-400 focus:border-brand-400 focus:outline-none';

type AccountModal = 'user' | 'corp' | 'password' | null;

/**
 * 헤더 우측 계정 영역 — "ATTIC TOURS ▾" 드롭다운(User Info / Corporation Profile) + Change password.
 * 실제 포털의 계정명 클릭 드롭다운과 동일 구성.
 */
export default function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<AccountModal>(null);
  const [user, setUser] = useState<Staff>(ACCOUNT_USER);
  const wrapRef = useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const openModal = (m: AccountModal) => {
    setOpen(false);
    setModal(m);
  };

  return (
    <>
      <div ref={wrapRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-1 text-[12px] font-semibold text-slate-700 hover:text-brand-600"
        >
          ATTIC TOURS
          <span className={`text-[9px] text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-full z-40 mt-1.5 w-48 overflow-hidden rounded border border-slate-200 bg-white py-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => openModal('user')}
              className="block w-full px-3.5 py-2 text-left text-[12px] text-slate-700 hover:bg-slate-50 hover:text-brand-600"
            >
              User Info
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => openModal('corp')}
              className="block w-full px-3.5 py-2 text-left text-[12px] text-slate-700 hover:bg-slate-50 hover:text-brand-600"
            >
              Corporation Profile
            </button>
          </div>
        )}
      </div>

      <span className="text-slate-300">|</span>
      <button
        type="button"
        onClick={() => setModal('password')}
        className="text-[12px] text-slate-600 hover:text-brand-600"
      >
        Change password
      </button>

      {modal === 'user' && (
        <UserInfoModal
          mode="edit"
          initial={user}
          onClose={() => setModal(null)}
          onSave={(s) => {
            setUser(s);
            setModal(null);
          }}
        />
      )}
      {modal === 'corp' && <CorporationProfileModal onClose={() => setModal(null)} />}
      {modal === 'password' && <ChangePasswordModal onClose={() => setModal(null)} />}
    </>
  );
}

/** Corporation Profile 모달 — 실제 포털과 동일하게 전 항목 읽기 전용 */
function CorporationProfileModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6" role="dialog" aria-modal="true">
      <button type="button" aria-label="닫기" onClick={onClose} className="fixed inset-0 h-full w-full cursor-default bg-slate-900/50" />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#333333] px-5 py-3">
          <h3 className="text-sm font-bold text-white">Corporation Profile</h3>
          <button type="button" onClick={onClose} className="text-slate-300 hover:text-white" aria-label="모달 닫기">✕</button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto p-5">
          <div className="rounded border border-slate-200">
            {CORPORATION_PROFILE.map(([label, value]) => (
              <ModalRow key={label} label={label}>
                <span className="text-slate-600">{value}</span>
              </ModalRow>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            법인 정보 변경은 Ohmy Partners 담당자(cscenter@ohmyhotel.com)를 통해서만 가능합니다. (읽기 전용)
          </p>
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={onClose} className="rounded border border-slate-300 px-5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Change Password 모달 — 현재/신규/신규확인 + 8~20자 규칙 (프로토타입: 실제 저장 없음) */
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const save = () => {
    if (!current || !next || !confirm) {
      setError('모든 항목을 입력해 주세요.');
      return;
    }
    if (next.length < 8 || next.length > 20) {
      setError('새 비밀번호는 8~20자여야 합니다.');
      return;
    }
    if (next !== confirm) {
      setError('새 비밀번호가 서로 일치하지 않습니다.');
      return;
    }
    if (next === current) {
      setError('현재 비밀번호와 다른 비밀번호를 사용해 주세요.');
      return;
    }
    setError(null);
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6" role="dialog" aria-modal="true">
      <button type="button" aria-label="닫기" onClick={onClose} className="fixed inset-0 h-full w-full cursor-default bg-slate-900/50" />
      <div className="relative w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#333333] px-5 py-3">
          <h3 className="text-sm font-bold text-white">Change Password</h3>
          <button type="button" onClick={onClose} className="text-slate-300 hover:text-white" aria-label="모달 닫기">✕</button>
        </div>
        <div className="p-5">
          {done ? (
            <>
              <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-6 text-center">
                <p className="text-sm font-semibold text-emerald-700">✓ Your password has been changed.</p>
                <p className="mt-1 text-[11px] text-emerald-600">프로토타입 — 비밀번호는 실제로 저장되지 않습니다.</p>
              </div>
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={onClose} className="rounded bg-brand-500 px-5 py-1.5 text-xs font-semibold text-white hover:bg-brand-600">
                  Close
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded border border-slate-200">
                <ModalRow label="Current Password" required>
                  <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className={pwInput} />
                </ModalRow>
                <ModalRow label="New Password" required>
                  <div>
                    <input type="password" value={next} onChange={(e) => setNext(e.target.value)} className={pwInput} />
                    <p className="mt-1 text-[11px] text-slate-400">8–20 characters</p>
                  </div>
                </ModalRow>
                <ModalRow label="Confirm New Password" required>
                  <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={pwInput} />
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
