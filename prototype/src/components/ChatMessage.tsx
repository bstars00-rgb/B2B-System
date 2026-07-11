import type { ChatMsg } from '../types';
import { formatDateTime } from '../utils/format';

interface Props {
  message: ChatMsg;
}

/** 채팅 말풍선 1건 — user / assistant / system */
export default function ChatMessage({ message }: Props) {
  if (message.role === 'system') {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-500">
          {message.content}
        </span>
      </div>
    );
  }

  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className="mb-0.5 flex items-baseline gap-1.5 px-1 text-[10px] text-slate-400">
          {!isUser && <span className="font-semibold text-brand-600">ELLIS AI</span>}
          <span>{formatDateTime(message.timestamp)}</span>
        </div>
        <div
          className={`whitespace-pre-wrap rounded-lg px-3 py-2 text-[13px] leading-relaxed ${
            isUser
              ? 'rounded-tr-none bg-brand-500 text-white'
              : 'rounded-tl-none border border-slate-200 bg-white text-slate-800'
          }`}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}
