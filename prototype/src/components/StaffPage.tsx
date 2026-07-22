import { useMemo, useState } from 'react';
import EnhBadge from './EnhBadge';
import {
  MAIN_ACCOUNT,
  SEED_MEMBERS,
  type AccountModel,
  type Member,
} from '../mocks/members';

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

const filterCls =
  'rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-brand-400 focus:outline-none';

/** 계정 모델 배지 — 직영 vs 샵인샵을 한눈에 */
function ModelBadge({ model }: { model: AccountModel }) {
  return model === 'direct' ? (
    <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">Direct</span>
  ) : (
    <span className="rounded-sm bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600">Shop-in-Shop</span>
  );
}

/**
 * Member list (Staff list) — 3차 고도화 탐색 프로토타입.
 *
 * 실사이트는 "고객사 직원(직영 OP)"만 전제하지만, 여기서 두 계정 모델을 나란히 시험한다:
 *  · Direct — 고객사에 실제 근무하는 OP
 *  · Shop-in-Shop — 메인 아이디 아래 OP 아이디를 발급받는 새끼 업체들(같은 사업자 아님)
 * 샵인샵은 예약 귀속을 OP 아이디로 식별하고, 바우처 잠금(예약자 PIN)으로 서로의 예약을 격리한다.
 *
 * ⚠ 테스트/판단용 — 실제 적용 여부는 이 프로토타입을 보고 결정한다.
 */
export default function StaffPage() {
  const [members, setMembers] = useState<Member[]>(SEED_MEMBERS);
  const [fId, setFId] = useState('');
  const [fName, setFName] = useState('');
  const [fModel, setFModel] = useState<'All' | AccountModel>('All');
  const [applied, setApplied] = useState<{ id: string; name: string; model: 'All' | AccountModel }>({
    id: '', name: '', model: 'All',
  });
  const [view, setView] = useState<'list' | 'tree'>('list');
  const [modalOpen, setModalOpen] = useState(false);
  /** 바우처 잠금 데모 대상 OP (잠긴 예약 오픈 시연) */
  const [voucherDemo, setVoucherDemo] = useState<Member | null>(null);

  const rows = useMemo(
    () =>
      members.filter((m) => {
        if (applied.id && !m.id.toLowerCase().includes(applied.id.toLowerCase())) return false;
        if (applied.name && !m.name.toLowerCase().includes(applied.name.toLowerCase())) return false;
        if (applied.model !== 'All' && m.model !== applied.model) return false;
        return true;
      }),
    [members, applied],
  );

  /** 샵인샵 구조 — 메인 아이디 아래 새끼 업체별로 OP를 묶는다 */
  const tree = useMemo(() => {
    const direct = members.filter((m) => m.model === 'direct');
    const bySub = new Map<string, Member[]>();
    for (const m of members.filter((x) => x.model === 'shop')) {
      const k = m.subCompany ?? '(미지정)';
      (bySub.get(k) ?? bySub.set(k, []).get(k)!).push(m);
    }
    return { direct, bySub };
  }, [members]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4">
      <div className="mx-auto max-w-[1100px] space-y-3">
        {/* 헤더 + 설명 */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-1.5 text-[15px] font-bold text-slate-800">
            Member list — OP 계정 관리
            <EnhBadge note="두 계정 모델(직영 / 샵인샵) + 바우처 잠금 — 3차 테스트용 프로토타입" />
          </h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="rounded border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-xs font-bold text-slate-700">
                <span className="rounded-sm bg-slate-200 px-1.5 py-0.5 text-[10px]">Direct</span> 직영 OP
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                고객사({MAIN_ACCOUNT.company})에 실제 근무하는 직원. 지금의 Staff list와 동일 — 회사가 직접 아이디를 만든다.
              </p>
            </div>
            <div className="rounded border border-brand-200 bg-brand-50/40 p-3">
              <p className="text-xs font-bold text-brand-700">
                <span className="rounded-sm bg-brand-100 px-1.5 py-0.5 text-[10px] text-brand-700">Shop-in-Shop</span> 샵인샵 OP
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                고객사에 근무하진 않지만 <b>메인 아이디({MAIN_ACCOUNT.mainId})</b> 아래 OP 아이디를 발급받는 <b>새끼 업체</b>들.
                같은 사업자가 아니다. 예약은 OP 아이디로 식별되고, <b>바우처 잠금</b>으로 서로의 예약을 격리한다.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          {/* 검색 바 + 뷰 토글 */}
          <div className="flex flex-wrap items-center gap-3 rounded border border-slate-200 bg-slate-50/50 px-4 py-3">
            <label className="text-xs font-medium text-slate-700">OP ID</label>
            <input value={fId} onChange={(e) => setFId(e.target.value)} className={`${filterCls} w-56`} />
            <label className="ml-2 text-xs font-medium text-slate-700">Name</label>
            <input value={fName} onChange={(e) => setFName(e.target.value)} className={`${filterCls} w-44`} />
            <label className="ml-2 text-xs font-medium text-slate-700">Model</label>
            <select
              value={fModel}
              onChange={(e) => setFModel(e.target.value as 'All' | AccountModel)}
              className={`${filterCls} w-36`}
            >
              <option value="All">All</option>
              <option value="direct">Direct</option>
              <option value="shop">Shop-in-Shop</option>
            </select>
            <div className="ml-auto flex gap-1.5">
              <button
                type="button"
                onClick={() => setApplied({ id: fId, name: fName, model: fModel })}
                className="rounded bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => {
                  setFId(''); setFName(''); setFModel('All');
                  setApplied({ id: '', name: '', model: 'All' });
                }}
                className="rounded border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </div>

          {/* 뷰 토글 + New */}
          <div className="mt-3 flex items-center justify-between">
            <div className="inline-flex overflow-hidden rounded border border-slate-300 text-xs">
              {(['list', 'tree'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 font-medium ${
                    view === v ? 'bg-brand-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {v === 'list' ? '목록' : '샵인샵 구조'}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 hover:border-brand-400 hover:text-brand-600"
            >
              + New OP ID
            </button>
          </div>

          {view === 'list' ? (
            <>
              <div className="mt-2 max-h-[460px] overflow-auto rounded border border-slate-200">
                <table className="w-full min-w-[960px] text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 [&>th]:sticky [&>th]:top-0 [&>th]:bg-slate-50">
                      <th className="px-3 py-2.5 text-left font-semibold">Name</th>
                      <th className="px-3 py-2.5 text-left font-semibold">OP ID</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Model</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Sub-company / Dept</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Bookings</th>
                      <th className="px-3 py-2.5 text-center font-semibold">
                        Voucher Lock <EnhBadge note="예약자만 바우처 오픈 — PIN 필요(중국 업체 아이디어)" />
                      </th>
                      <th className="px-3 py-2.5 text-center font-semibold">Super</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-14 text-center text-slate-400">
                          No records available.
                        </td>
                      </tr>
                    ) : (
                      rows.map((m) => (
                        <tr key={m.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                          <td className="px-3 py-2.5 text-slate-700">
                            {m.name}
                            {!m.active && <span className="ml-1.5 text-[10px] text-slate-400">(비활성)</span>}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600">{m.id}</td>
                          <td className="px-3 py-2.5"><ModelBadge model={m.model} /></td>
                          <td className="px-3 py-2.5 text-slate-600">
                            {m.model === 'shop' ? (
                              <span className="flex flex-col">
                                <span>{m.subCompany}</span>
                                <span className="text-[10px] text-slate-400">under {m.mainId}</span>
                              </span>
                            ) : (
                              m.department
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-700">{m.bookings}</td>
                          <td className="px-3 py-2.5 text-center">
                            {m.voucherLock ? (
                              <button
                                type="button"
                                onClick={() => setVoucherDemo(m)}
                                className="inline-flex items-center gap-1 rounded-sm bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-100"
                                title="잠긴 예약의 바우처 오픈 시연 — PIN 필요"
                              >
                                🔒 ON
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center text-slate-600">{m.superUser ? 'Yes' : 'No'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span className="text-[11px] text-slate-400">
                  🔒 표시를 누르면 잠긴 예약의 바우처 오픈(PIN)을 시연합니다.
                </span>
                <span>1 - {rows.length} of {rows.length} items</span>
              </div>
            </>
          ) : (
            <TreeView direct={tree.direct} bySub={tree.bySub} onDemo={setVoucherDemo} />
          )}
        </div>

        <p className="text-[10px] leading-relaxed text-slate-400">
          프로토타입(3차 테스트) — 실제 적용 여부는 이 화면을 보고 판단합니다. 목데이터 {members.length}명(직영{' '}
          {members.filter((m) => m.model === 'direct').length} · 샵인샵 {members.filter((m) => m.model === 'shop').length}).
          바우처 잠금·샵인샵 계층은 실사이트 원본에 없는 신규 개념입니다.
        </p>
      </div>

      {modalOpen && (
        <MemberModal
          onClose={() => setModalOpen(false)}
          onSave={(m) => { setMembers((p) => [m, ...p]); setModalOpen(false); }}
        />
      )}
      {voucherDemo && <VoucherLockDemo member={voucherDemo} onClose={() => setVoucherDemo(null)} />}
    </div>
  );
}

/** 샵인샵 구조 뷰 — 메인 아이디 → (직영 그룹 + 새끼 업체별 그룹) → OP */
function TreeView({
  direct,
  bySub,
  onDemo,
}: {
  direct: Member[];
  bySub: Map<string, Member[]>;
  onDemo: (m: Member) => void;
}) {
  const Op = ({ m }: { m: Member }) => (
    <div className="flex items-center gap-2 border-b border-slate-100 py-1.5 pl-6 text-xs last:border-b-0">
      <span className="font-mono text-[11px] text-slate-500">{m.id}</span>
      <span className="text-slate-700">{m.name}</span>
      {m.voucherLock && (
        <button
          type="button"
          onClick={() => onDemo(m)}
          className="rounded-sm bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-100"
        >
          🔒 잠금
        </button>
      )}
      <span className="ml-auto text-[10px] text-slate-400">{m.bookings} bookings</span>
    </div>
  );

  return (
    <div className="mt-2 rounded border border-slate-200 p-4">
      {/* 메인 아이디 */}
      <div className="flex items-center gap-2">
        <span className="rounded bg-[#333333] px-2 py-1 text-[11px] font-bold text-white">MAIN</span>
        <span className="text-sm font-bold text-slate-800">{MAIN_ACCOUNT.company}</span>
        <span className="font-mono text-[11px] text-slate-400">{MAIN_ACCOUNT.mainId}</span>
      </div>

      <div className="mt-3 space-y-3 border-l-2 border-slate-200 pl-4">
        {/* 직영 그룹 */}
        <div className="rounded border border-slate-200">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5">
            <span className="rounded-sm bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">Direct</span>
            <span className="text-xs font-semibold text-slate-700">직영 OP ({direct.length})</span>
          </div>
          <div className="px-3">{direct.map((m) => <Op key={m.id} m={m} />)}</div>
        </div>

        {/* 새끼 업체 그룹 */}
        {[...bySub.entries()].map(([sub, ops]) => (
          <div key={sub} className="rounded border border-brand-200">
            <div className="flex items-center gap-2 bg-brand-50/50 px-3 py-1.5">
              <span className="rounded-sm bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">Shop</span>
              <span className="text-xs font-semibold text-slate-700">{sub}</span>
              <span className="text-[10px] text-slate-400">새끼 업체 · OP {ops.length}</span>
              {ops.some((o) => o.voucherLock) && (
                <span className="ml-auto text-[10px] text-amber-600">🔒 바우처 잠금</span>
              )}
            </div>
            <div className="px-3">{ops.map((m) => <Op key={m.id} m={m} />)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 바우처 잠금 데모 — 잠긴 예약의 바우처를 열 때 PIN을 요구하는 흐름 시연 */
function VoucherLockDemo({ member, onClose }: { member: Member; onClose: () => void }) {
  const [pin, setPin] = useState('');
  const [state, setState] = useState<'locked' | 'open' | 'error'>('locked');

  const tryOpen = () => {
    if (pin === (member.voucherPin ?? '')) setState('open');
    else setState('error');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" role="dialog" aria-modal="true">
      <button type="button" aria-label="닫기" onClick={onClose} className="fixed inset-0 h-full w-full cursor-default bg-slate-900/50" />
      <div className="relative w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#333333] px-5 py-3">
          <h3 className="text-sm font-bold text-white">🔒 Voucher — 예약자 잠금</h3>
          <button type="button" onClick={onClose} className="text-slate-300 hover:text-white" aria-label="닫기">✕</button>
        </div>
        <div className="p-5">
          <p className="text-xs leading-relaxed text-slate-500">
            <b className="text-slate-700">{member.subCompany ?? member.name}</b>의 OP 아이디(
            <span className="font-mono">{member.id}</span>)로 만든 예약입니다. 이 바우처는 <b>예약자만</b> 열 수 있어
            PIN이 필요합니다 — 같은 포털의 다른 새끼 업체는 열지 못합니다.
          </p>

          {state === 'open' ? (
            <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-4 text-center">
              <p className="text-sm font-bold text-emerald-700">✓ 바우처 열림</p>
              <p className="mt-1 text-[11px] text-emerald-600">PIN 확인 완료 — 예약 상세·바우처가 공개됩니다.</p>
              <div className="mt-3 rounded bg-white p-3 text-left text-[11px] text-slate-500">
                <p>Booking Ref · J-DEMO-{member.id.slice(-4).toUpperCase()}</p>
                <p>OP · {member.id}</p>
                <p>Sub-company · {member.subCompany ?? '—'}</p>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <label className="block text-[11px] font-medium text-slate-600">Voucher PIN</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => { setPin(e.target.value); setState('locked'); }}
                  onKeyDown={(e) => e.key === 'Enter' && tryOpen()}
                  placeholder="예약 시 설정한 PIN"
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-[13px] placeholder:italic placeholder:text-slate-400 focus:border-brand-400 focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={tryOpen}
                  className="shrink-0 rounded bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
                >
                  열기
                </button>
              </div>
              {state === 'error' && <p className="mt-2 text-xs text-rose-600">PIN이 일치하지 않습니다. (데모 PIN: {member.voucherPin})</p>}
              <p className="mt-2 text-[10px] text-slate-400">
                데모용으로 PIN을 화면에 노출했습니다({member.voucherPin}). 실제로는 예약자만 알고 있습니다.
              </p>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button type="button" onClick={onClose} className="rounded border border-slate-300 px-5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** New OP ID 모달 — 계정 모델 선택(직영 / 샵인샵) + 샵인샵은 새끼 업체·바우처 잠금 설정 */
function MemberModal({ onClose, onSave }: { onClose: () => void; onSave: (m: Member) => void }) {
  const [model, setModel] = useState<AccountModel>('direct');
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [dept, setDept] = useState('');
  const [subCompany, setSubCompany] = useState('');
  const [voucherLock, setVoucherLock] = useState(true);
  const [voucherPin, setVoucherPin] = useState('');
  const [superUser, setSuperUser] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (!name.trim() || !id.trim()) return setError('이름과 OP ID는 필수입니다.');
    if (model === 'shop' && !subCompany.trim()) return setError('샵인샵은 새끼 업체명이 필요합니다.');
    if (model === 'shop' && voucherLock && !voucherPin.trim()) return setError('바우처 잠금을 켜면 PIN이 필요합니다.');
    onSave({
      name, id, model,
      department: model === 'direct' ? dept : undefined,
      subCompany: model === 'shop' ? subCompany : undefined,
      mainId: model === 'shop' ? MAIN_ACCOUNT.mainId : undefined,
      voucherLock: model === 'shop' ? voucherLock : false,
      voucherPin: model === 'shop' && voucherLock ? voucherPin : undefined,
      officePhone: '', mobileCc: '', mobile: '', email: id, language: 'English',
      superUser, bookings: 0, active: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6" role="dialog" aria-modal="true">
      <button type="button" aria-label="닫기" onClick={onClose} className="fixed inset-0 h-full w-full cursor-default bg-slate-900/50" />
      <div className="relative w-full max-w-xl overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#333333] px-5 py-3">
          <h3 className="text-sm font-bold text-white">New OP ID</h3>
          <button type="button" onClick={onClose} className="text-slate-300 hover:text-white" aria-label="닫기">✕</button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto p-5">
          {/* 계정 모델 선택 */}
          <p className="text-[11px] font-semibold text-slate-600">계정 모델</p>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {(['direct', 'shop'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setModel(v)}
                className={`rounded border px-3 py-2 text-left text-xs ${
                  model === v ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="block font-bold">{v === 'direct' ? 'Direct 직영' : 'Shop-in-Shop 샵인샵'}</span>
                <span className="mt-0.5 block text-[10px] text-slate-400">
                  {v === 'direct' ? '고객사 근무 직원' : '메인 아이디 아래 새끼 업체'}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 rounded border border-slate-200">
            <ModalRow label="Name" required>
              <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
            </ModalRow>
            <ModalRow label="OP ID" required>
              <input value={id} onChange={(e) => setId(e.target.value)} placeholder={model === 'shop' ? 'op-xxxx' : 'name@company.com'} className={input} />
            </ModalRow>
            {model === 'direct' ? (
              <ModalRow label="Department">
                <input value={dept} onChange={(e) => setDept(e.target.value)} className={input} />
              </ModalRow>
            ) : (
              <>
                <ModalRow label="Main ID">
                  <span className="font-mono text-[13px] text-slate-500">{MAIN_ACCOUNT.mainId}</span>
                  <span className="ml-2 text-[10px] text-slate-400">({MAIN_ACCOUNT.company} 보유)</span>
                </ModalRow>
                <ModalRow label="새끼 업체명" required>
                  <input value={subCompany} onChange={(e) => setSubCompany(e.target.value)} placeholder="Sub-company name" className={input} />
                </ModalRow>
                <ModalRow label="바우처 잠금">
                  <label className="inline-flex items-center gap-1.5 text-[13px]">
                    <input type="checkbox" checked={voucherLock} onChange={(e) => setVoucherLock(e.target.checked)} className="accent-brand-500" />
                    예약자만 바우처 오픈 (PIN 필요)
                  </label>
                </ModalRow>
                {voucherLock && (
                  <ModalRow label="Voucher PIN" required>
                    <input value={voucherPin} onChange={(e) => setVoucherPin(e.target.value.replace(/\D/g, ''))} placeholder="숫자 PIN" className={input} />
                  </ModalRow>
                )}
              </>
            )}
            <ModalRow label="Super User">
              <label className="mr-4 inline-flex items-center gap-1.5 text-[13px]">
                <input type="radio" name="msuper" checked={superUser} onChange={() => setSuperUser(true)} className="accent-brand-500" /> Yes
              </label>
              <label className="inline-flex items-center gap-1.5 text-[13px]">
                <input type="radio" name="msuper" checked={!superUser} onChange={() => setSuperUser(false)} className="accent-brand-500" /> No
              </label>
            </ModalRow>
          </div>

          {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={save} className="rounded bg-brand-500 px-5 py-1.5 text-xs font-semibold text-white hover:bg-brand-600">Save</button>
            <button type="button" onClick={onClose} className="rounded border border-slate-300 px-5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 모달 행 레이아웃 (좌 라벨 / 우 값) — 컴포넌트 외부 정의로 리마운트 방지 */
export function ModalRow({
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

/** User Info 모달 (실제 포털과 동일 필드) — Staff 신규 등록(create) / 헤더 계정 메뉴의 내 정보 수정(edit) 겸용 */
export function UserInfoModal({
  mode = 'create',
  initial,
  onClose,
  onSave,
}: {
  mode?: 'create' | 'edit';
  initial?: Staff;
  onClose: () => void;
  onSave: (s: Staff) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [id, setId] = useState(initial?.id ?? '');
  const [dept, setDept] = useState(initial?.department ?? '');
  const [position, setPosition] = useState(initial?.position ?? '');
  const [officePhone, setOfficePhone] = useState(initial?.officePhone ?? '');
  const [mobileCc, setMobileCc] = useState(initial?.mobileCc ?? '');
  const [mobile, setMobile] = useState(initial?.mobile ?? '');
  const [email, setEmail] = useState(initial?.email ?? 'tyosales@attic-tours.com');
  const [language, setLanguage] = useState(initial?.language ?? 'English');
  const [superUser, setSuperUser] = useState(initial?.superUser ?? false);
  const [password, setPassword] = useState('');
  const [dupChecked, setDupChecked] = useState(mode === 'edit');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (!name.trim() || !id.trim() || !officePhone.trim() || !mobile.trim() || !email.trim() || (mode === 'create' && !password.trim())) {
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
            {mode === 'create' && (
              <ModalRow label="Password" required>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded border border-slate-200 bg-sky-50/60 px-2.5 py-1.5 text-[13px]" />
              </ModalRow>
            )}
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
