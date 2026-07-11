import { useEffect, useRef } from 'react';
import type { ChatMsg } from '../types';
import ChatMessage from './ChatMessage';
import SearchInput from './SearchInput';

interface Props {
  messages: ChatMsg[];
  loading: boolean;
  onSubmit: (query: string) => void;
}

const EXAMPLE_QUERIES = [
  '8월 20일~23일 도쿄 4성급 성인 2명 조식 포함 호텔 찾아줘',
  '싱가포르 마리나베이 5성급 무료취소 2박, 예산 60만원 이하',
  '방콕 8/15~8/17 성인 2명 아동 1명 환불불가 특가 있어?',
];

/** 좌측 채팅 패널 — 대화 이력 + 자연어 입력 */
export default function ChatPanel({ messages, loading, onSubmit }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  return (
    <section className="flex h-full min-h-0 flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">AI 요금 검색</h2>
          <p className="text-[11px] text-slate-400">ellis-mcp · 조회 전용 (예약/결제 불가)</p>
        </div>
        <span className="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-600">
          MOCK MODE
        </span>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-[13px] font-medium text-slate-700">
              안녕하세요, 오마이호텔 AI 요금 검색입니다.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              날짜·목적지·인원·성급·조식·무료취소·예산 조건을 자연어로 입력하면 ELLIS 요금을
              조회합니다. 아래 예시를 눌러 시작해 보세요.
            </p>
            <div className="mt-3 space-y-1.5">
              {EXAMPLE_QUERIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={loading}
                  onClick={() => onSubmit(q)}
                  className="block w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-xs text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg rounded-tl-none border border-slate-200 bg-white px-3 py-2">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400 [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400 [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
      </div>

      <SearchInput disabled={loading} onSubmit={onSubmit} />
    </section>
  );
}
