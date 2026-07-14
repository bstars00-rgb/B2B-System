interface Props {
  amountLabel: string; // 예: "JPY 39,540"
  productName?: string;
  onClose: () => void;
}

/**
 * Eximbay 결제 게이트웨이 랜딩 화면 클론 (프로토타입 — 실제 결제 없음).
 * Credit card 클릭 시 뜨는 카드 브랜드 선택 팝업을 재현한다.
 * ※ 카드번호 입력·실제 결제는 구현하지 않는다 (데모).
 */
export default function PaymentGatewayModal({ amountLabel, productName, onClose }: Props) {
  const brand = (label: string, cls: string) => (
    <span key={label} className={`text-[13px] font-bold ${cls}`}>
      {label}
    </span>
  );

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-slate-900/40 p-6">
      <div className="w-full max-w-lg overflow-hidden rounded bg-white shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <span className="text-lg font-black italic tracking-tight text-slate-800">
            e<span className="text-slate-900">X</span>imbay
          </span>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-right text-sm font-bold text-slate-800">Ohmyhotel&amp;Co. Ltd.</p>

          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-[13px] text-slate-600">
              <span>Product name</span>
              <span className="text-slate-800">{productName ?? ''}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-slate-800">Amount</span>
              <span className="text-base font-bold text-slate-900">{amountLabel}</span>
            </div>
          </div>

          <hr className="my-4 border-slate-200" />

          {/* Credit / Debit Card */}
          <div className="rounded border border-slate-200 px-4 py-5">
            <div className="flex flex-wrap items-center justify-center gap-4">
              {brand('VISA', 'text-blue-800')}
              {brand('MasterCard', 'text-orange-600')}
              {brand('AMERICAN EXPRESS', 'text-sky-600')}
              {brand('JCB', 'text-indigo-700')}
              {brand('Diners Club', 'text-slate-600')}
              {brand('DISCOVER', 'text-orange-500')}
            </div>
          </div>
          <p className="mt-2 text-center text-[12px] text-slate-500">Credit / Debit Card</p>

          {/* UnionPay */}
          <div className="mt-4 flex w-40 flex-col items-center gap-1 rounded border border-slate-200 px-4 py-5">
            <span className="text-[13px] font-bold text-red-600">UnionPay 银联</span>
          </div>
          <p className="mt-1 w-40 text-center text-[12px] text-slate-500">UnionPay</p>

          <div className="mt-6 rounded bg-amber-50 px-3 py-2 text-center text-[11px] text-amber-700">
            프로토타입 결제 게이트웨이 — 실제 카드 결제는 진행되지 않습니다. 결제 수단 선택 화면만
            재현했습니다.
          </div>

          <hr className="my-4 border-slate-200" />
          <p className="text-center text-[11px] text-slate-400">
            © Eximbay Co., Ltd. &nbsp;|&nbsp; <span className="underline">Eximbay Service Center</span>
          </p>
        </div>
      </div>
    </div>
  );
}
