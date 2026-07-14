import { useState } from 'react';
import type { Booking } from '../types';

interface Props {
  booking: Booking;
  onClose: () => void;
}

const nf = new Intl.NumberFormat('en-US');
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function withWeekday(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${iso}(${WEEKDAYS[d.getDay()]})`;
}

function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * 실제 포털 Invoice 모달 클론.
 * Email 입력 + Send Email / Print, 인보이스 본문(발행정보·예약정보·총액+도장·계좌·유의사항·회사정보).
 */
export default function InvoiceModal({ booking, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [issued] = useState(nowStamp());

  const adults = booking.travelers - (booking.travelers_detail?.filter((t) => t.childAge).length ?? 0);
  const children = booking.travelers_detail?.filter((t) => t.childAge).length ?? 0;

  const doPrint = () => {
    const w = window.open('', '_blank', 'width=800,height=1000');
    if (!w) {
      window.print();
      return;
    }
    const node = document.getElementById('invoice-print-area');
    w.document.write(
      `<html><head><title>Invoice ${booking.ellis_code}</title>` +
        `<style>body{font-family:sans-serif;padding:32px;color:#334155} h2{color:#0f172a} .row{display:flex;padding:6px 0;border-bottom:1px dashed #e2e8f0} .lbl{width:180px;font-weight:600;color:#334155} .total{color:#e11d48;font-weight:700} .sec{margin-top:24px;font-weight:700;color:#0f172a}</style>` +
        `</head><body>${node?.innerHTML ?? ''}</body></html>`,
    );
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-slate-900/40 p-6">
      <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl">
        {/* 다크 헤더 */}
        <div className="flex items-center justify-between bg-[#333333] px-5 py-3">
          <h3 className="text-sm font-bold text-white">Invoice</h3>
          <button type="button" onClick={onClose} className="text-slate-300 hover:text-white" aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-5">
          {/* Email + 버튼 */}
          <div className="flex gap-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              className="flex-1 rounded border border-slate-300 px-3 py-2 text-[13px] placeholder:italic placeholder:text-slate-400 focus:border-brand-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => email.trim() && setSent(true)}
              className="rounded bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600"
            >
              Send Email
            </button>
            <button
              type="button"
              onClick={doPrint}
              className="rounded bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700"
            >
              Print
            </button>
          </div>

          {/* 인보이스 본문 */}
          <div id="invoice-print-area" className="mt-5">
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2">
              <h2 className="text-xl font-bold text-slate-900">Invoice</h2>
              <span className="flex items-center gap-1 text-[13px] font-extrabold tracking-wide text-slate-700">
                <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-brand-500 text-[8px] text-brand-500">
                  O
                </span>
                OHMYHOTEL<span className="font-normal">&amp;CO</span>
              </span>
            </div>

            {/* 발행 정보 */}
            <div className="mt-4 space-y-1.5 text-[13px]">
              <div className="row flex">
                <span className="lbl w-40 font-semibold text-slate-800">Issued date</span>
                <span className="text-slate-600">{issued}</span>
              </div>
              <div className="row flex">
                <span className="lbl w-40 font-semibold text-slate-800">Receiver</span>
                <span className="text-slate-600">ATTIC TOURS</span>
              </div>
              <div className="row flex">
                <span className="lbl w-40 font-semibold text-slate-800">Sender</span>
                <span className="text-slate-600">株式会社オーマイホテルアンドコー</span>
              </div>
            </div>

            {/* 예약 정보 */}
            <p className="sec mt-6 text-sm font-bold text-slate-900">Reservation information</p>
            <div className="mt-2 space-y-2 text-[13px]">
              {[
                ['Booking Code', booking.ellis_code],
                ['Date of use', `${withWeekday(booking.check_in)} ~ ${withWeekday(booking.check_out)}`],
                ['1st Traveler', booking.traveler_name],
                ['Number of people', `Adult : ${adults} / Child : ${children}`],
                ['Product details', `${booking.hotel_name} - ${booking.room_type}\nNO Breakfast Service`],
              ].map(([lbl, val]) => (
                <div key={lbl} className="flex border-b border-dashed border-slate-200 pb-2">
                  <span className="w-40 shrink-0 font-semibold text-slate-800">{lbl}</span>
                  <span className="whitespace-pre-line text-slate-600">{val}</span>
                </div>
              ))}
            </div>

            {/* 총액 + 도장 */}
            <p className="sec mt-6 text-sm font-bold text-slate-900">Total amount</p>
            <div className="relative mt-2 space-y-2 text-[13px]">
              <div className="flex">
                <span className="w-40 shrink-0 font-semibold text-slate-800">Total amount</span>
                <span className="total font-bold text-rose-600">
                  {booking.currency} {nf.format(booking.sum_amt)}
                </span>
              </div>
              <div className="flex">
                <span className="w-40 shrink-0 font-semibold text-slate-800">Bank Account</span>
                <span className="text-slate-600">Mitsubishi UFJ Bank / 株式会社アティックツアーズ / 5378135</span>
              </div>
              {/* 회사 인감 (장식) */}
              <span className="pointer-events-none absolute -top-2 right-4 flex h-16 w-16 rotate-6 items-center justify-center rounded-full border-2 border-rose-300/70 text-[8px] leading-tight text-rose-400/80">
                오마이호텔
                <br />
                대표이사
              </span>
            </div>

            {/* 유의사항 */}
            <div className="mt-6 rounded bg-slate-50 px-4 py-3 text-[11px] leading-relaxed text-slate-600">
              <p className="font-bold text-rose-600">[Guidelines]</p>
              <label className="mt-1.5 flex gap-2">
                <input type="checkbox" checked readOnly className="mt-0.5 accent-brand-500" />
                <span>
                  Please be noted that the Hotel rate does not include the City Tax, Tourist Tax, Resort
                  Fee, etc. that is required when check-in &amp; paid directly to the hotel according to
                  the Policy of each country or each hotel.
                </span>
              </label>
              <label className="mt-1.5 flex gap-2">
                <input type="checkbox" checked readOnly className="mt-0.5 accent-brand-500" />
                <span>
                  If you cancel after the cancellation deadline, a cancellation fee will be charged
                  according to the Policy, and you can check the cancellation fee in My Page -
                  Reservation Details - Cancellation Policy.
                </span>
              </label>
            </div>

            {/* 회사 정보 */}
            <div className="mt-4 text-[10.5px] leading-relaxed text-slate-500">
              <p>
                <b>Ohmyhotel &amp; Co., Ltd.</b> &nbsp; Representative name: Lee Mi Soon
              </p>
              <p>Business number: 105-87-71311 &nbsp; Mail-order business report number: 2020-Seoul Jongno-0399</p>
              <p>Personal information management manager: Choi Younggeun</p>
              <p>Address: 6th floor, GT Dongdaemun Building, 328 Jong-ro (330-1 Changsin-dong), Jongno-gu, Seoul</p>
              <p>Tel: 02-733-0550 (Korean weekdays 09:00 ~ 18:00, excluding weekends and holidays)</p>
              <p className="mt-1">Copyright © Ohmyhotel&amp;Co. Ltd. All rights reserved</p>
            </div>
          </div>
        </div>
      </div>

      {/* Send Email → Alert */}
      {sent && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/40">
          <div className="w-[360px] overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-center text-sm font-bold text-slate-800">
              Alert
            </div>
            <p className="px-5 py-6 text-center text-[13px] text-slate-700">Your email has been sent.</p>
            <div className="flex justify-center pb-5">
              <button
                type="button"
                onClick={() => setSent(false)}
                className="rounded bg-brand-500 px-6 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
