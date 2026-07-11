import { useState } from 'react';

interface Props {
  disabled: boolean;
  onSubmit: (query: string) => void;
}

/** 자연어 질문 입력창 — Enter 전송, Shift+Enter 줄바꿈 */
export default function SearchInput({ disabled, onSubmit }: Props) {
  const [value, setValue] = useState('');

  const submit = () => {
    const q = value.trim();
    if (!q || disabled) return;
    onSubmit(q);
    setValue('');
  };

  return (
    <div className="border-t border-slate-200 bg-white p-3">
      <div className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          disabled={disabled}
          placeholder='예: "8월 20일부터 23일까지 도쿄 4성급, 성인 2명, 조식 포함 무료취소로 30만원 이하 찾아줘"'
          className="min-h-[52px] flex-1 resize-none rounded-md border border-slate-300 px-3 py-2 text-[13px] leading-relaxed placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-400"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="h-[52px] shrink-0 rounded-md bg-brand-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {disabled ? '검색 중…' : '전송'}
        </button>
      </div>
      <p className="mt-1.5 px-1 text-[10px] text-slate-400">
        Enter 전송 · Shift+Enter 줄바꿈 — 요금·취소조건 숫자는 항상 우측 결과 카드 기준입니다.
      </p>
    </div>
  );
}
