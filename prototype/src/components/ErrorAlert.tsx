interface Props {
  code?: string;
  title: string;
  message: string;
  onRetry?: () => void;
}

/** 검색 실패(TIMEOUT/UNAUTHORIZED 등) 안내 — 실패를 그럴듯한 답변으로 대체하지 않고 그대로 노출 */
export default function ErrorAlert({ code, title, message, onRetry }: Props) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white">
          !
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-rose-800">{title}</h3>
            {code && (
              <code className="rounded bg-rose-100 px-1.5 py-0.5 font-mono text-[11px] text-rose-700">
                {code}
              </code>
            )}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-rose-700">{message}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="rounded border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
              >
                다시 시도
              </button>
            )}
            <a
              href="#legacy-search"
              onClick={(e) => e.preventDefault()}
              className="rounded bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
              title="더미 링크 — 기존 포털 검색 화면으로 이동 (프로토타입)"
            >
              기존 검색 화면에서 확인
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
