import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import EnhBadge from './EnhBadge';
import { formatMoney } from '../utils/format';
import {
  bestsellingByCountry,
  bestsellingHotels,
  dailyBookingStats,
  destinationStats,
  kpi,
  points,
  ttvTrend,
} from '../mocks/dashboard';
import {
  cancelReasons,
  monthlyBookingStats,
  monthlyCancelRate,
  yearEndStats,
  yearTotals,
  YEARS,
} from '../mocks/dataCenter';

/**
 * 대시보드(통계) — 닷비즈 원본에 없는 고도화 신규 화면.
 *
 * 미니멀 원칙(명세 §11): 예약 관련 지표만 싣는다.
 * AR Aging / Dispute / SLA / Loyalty Tier 같은 운영 지표는 각 전용 화면에서 추적하고
 * 여기에 넣지 않는다 — 지표 추가 요청이 오면 이 원칙으로 막는다. drill-down도 같은 이유로 보류.
 */

const DATE_BASES = ['Booking Date', 'Check-in Date', 'Check-out Date'];
const PERIODS = ['This Month', 'Last Month', 'Last 30 Days', 'This Quarter', 'Last Quarter', 'This Year', 'Custom'];
const DEST_VIEWS = ['Country/Region', 'City'];

const DAILY_METRICS = [
  { label: 'Booking Count', key: 'bookingCount' },
  { label: 'Booking Amount', key: 'bookingAmount' },
  { label: 'Number of Nights', key: 'nights' },
] as const;
type DailyMetricKey = (typeof DAILY_METRICS)[number]['key'];

type DashTab = 'overview' | 'dc-booking' | 'dc-cancel' | 'dc-daily' | 'dc-yearend';
const TABS: { id: DashTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'dc-booking', label: 'Booking Statistics' },
  { id: 'dc-cancel', label: 'Cancellation' },
  { id: 'dc-daily', label: 'Daily' },
  { id: 'dc-yearend', label: 'Year-End' },
];

const BRAND = '#EF7F29';
const GRID = '#E2E8F0';
const AXIS = '#94A3B8';

const filterCls =
  'rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-brand-400 focus:outline-none';

const money = (v: number) => formatMoney(v, 'JPY');

/** 축·요약용 축약 표기 — 축에 전체 자릿수를 쓰면 라벨이 서로 겹친다 */
function compactYen(v: number): string {
  if (v >= 1_000_000) return `¥${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `¥${Math.round(v / 1_000)}k`;
  return `¥${v}`;
}

const tooltipStyle = {
  borderRadius: 5,
  border: '1px solid #E0E0E0',
  background: '#fff',
  fontSize: 12,
  color: '#333',
} as const;

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 text-[13px] font-bold text-slate-800">{children}</h3>;
}

function Kpi({ label, value, change, note }: { label: string; value: string; change?: string; note?: string }) {
  const up = change?.startsWith('+');
  return (
    <Card>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-800">{value}</p>
      {change && (
        <p className="mt-1.5 flex items-center gap-1.5">
          <span
            className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${
              up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
            }`}
          >
            {change}
          </span>
          {note && <span className="text-[10px] text-slate-400">{note}</span>}
        </p>
      )}
      {!change && note && <p className="mt-1.5 text-[10px] text-slate-400">{note}</p>}
    </Card>
  );
}

export default function DashboardPage() {
  const [tab, setTab] = useState<DashTab>('overview');
  const [dateBasis, setDateBasis] = useState(DATE_BASES[0]);
  const [period, setPeriod] = useState(PERIODS[0]);
  const [customFrom, setCustomFrom] = useState(dailyBookingStats[0].date);
  const [customTo, setCustomTo] = useState(dailyBookingStats[dailyBookingStats.length - 1].date);

  const [destView, setDestView] = useState(DEST_VIEWS[0]);
  const [bestCountry, setBestCountry] = useState('All');
  const [accountLevel, setAccountLevel] = useState('All');
  const [dailyMetric, setDailyMetric] = useState<DailyMetricKey>('bookingCount');
  const [dailyFrom, setDailyFrom] = useState(dailyBookingStats[0].date);
  const [dailyTo, setDailyTo] = useState(dailyBookingStats[dailyBookingStats.length - 1].date);

  /** KPI 델타의 비교 대상 — 기간 셀렉트에 따라 문구가 달라진다 */
  const comparisonLabel =
    period === 'This Month'
      ? 'vs 지난달'
      : period === 'Last Month'
        ? 'vs 2개월 전'
        : period === 'Last 30 Days'
          ? 'vs 이전 30일'
          : period === 'This Quarter'
            ? 'vs 지난 분기'
            : period === 'Last Quarter'
              ? 'vs 2개 분기 전'
              : period === 'This Year'
                ? 'vs 작년'
                : `${customFrom} ~ ${customTo}`;

  const dest = destView === 'City' ? destinationStats.city : destinationStats.country;
  const destTotal = dest.reduce((s, d) => s + d.bookings, 0);

  const bestCountries = useMemo(() => ['All', ...Object.keys(bestsellingByCountry).sort()], []);
  const bestRows = useMemo(
    () =>
      bestCountry === 'All'
        ? bestsellingHotels.slice(0, 20)
        : (bestsellingByCountry[bestCountry] ?? []).map((h, i) => ({ ...h, rank: i + 1, country: bestCountry })),
    [bestCountry],
  );

  const dailyRows = useMemo(
    () => dailyBookingStats.filter((d) => d.date >= dailyFrom && d.date <= dailyTo),
    [dailyFrom, dailyTo],
  );
  const dailyLabel = DAILY_METRICS.find((m) => m.key === dailyMetric)!.label;
  const isAmount = dailyMetric === 'bookingAmount';
  const fmtDaily = (v: number) => (isAmount ? money(v) : v.toLocaleString('ko-KR'));
  const dailyTotal = dailyRows.reduce((s, d) => s + d[dailyMetric], 0);
  const dailyAvg = dailyRows.length ? Math.round(dailyTotal / dailyRows.length) : 0;
  const dailyPeak = dailyRows.length ? Math.max(...dailyRows.map((d) => d[dailyMetric])) : 0;

  const latest = monthlyBookingStats[monthlyBookingStats.length - 1];
  const latestCancel = monthlyCancelRate[monthlyCancelRate.length - 1];
  const prevCancel = monthlyCancelRate[monthlyCancelRate.length - 2];
  const avgCancel = (monthlyCancelRate.reduce((s, m) => s + m.rate, 0) / monthlyCancelRate.length).toFixed(1);
  const cancelTotal = cancelReasons.reduce((s, r) => s + r.count, 0);

  const areaChart = (rows: typeof dailyBookingStats, gradId: string) => (
    <ResponsiveContainer width="100%" height={230}>
      <AreaChart data={rows} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={BRAND} stopOpacity={0.3} />
            <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke={AXIS} tickFormatter={(v: string) => v.slice(5)} />
        <YAxis
          tick={{ fontSize: 10 }}
          stroke={AXIS}
          tickFormatter={(v: number) => (isAmount ? compactYen(v) : String(v))}
        />
        <Tooltip
          formatter={(value) => [fmtDaily(Number(value)), dailyLabel]}
          labelFormatter={(l) => `${l}`}
          contentStyle={tooltipStyle}
        />
        <Area type="monotone" dataKey={dailyMetric} stroke={BRAND} strokeWidth={2} fill={`url(#${gradId})`} />
      </AreaChart>
    </ResponsiveContainer>
  );

  const metricSelect = (
    <select
      value={dailyMetric}
      onChange={(e) => setDailyMetric(e.target.value as DailyMetricKey)}
      className={filterCls}
      aria-label="일별 지표"
    >
      {DAILY_METRICS.map((m) => (
        <option key={m.key} value={m.key}>
          {m.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4">
      {/* ── 페이지 헤더 + 전역 필터 ── */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[15px] font-bold text-slate-800">
          Dashboard
          <EnhBadge note="닷비즈에 없던 통계 화면 — 예약·매출·목적지·베스트셀러를 한 화면에서 확인" />
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={dateBasis}
            onChange={(e) => setDateBasis(e.target.value)}
            className={filterCls}
            aria-label="집계 기준일"
          >
            {DATE_BASES.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className={filterCls} aria-label="기간">
            {PERIODS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          {period === 'Custom' && (
            <span className="flex items-center gap-1.5">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className={filterCls}
                aria-label="시작일"
              />
              <span className="text-xs text-slate-400">~</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className={filterCls}
                aria-label="종료일"
              />
            </span>
          )}
        </div>
      </div>

      {/* ── 대시보드 탭 ── */}
      <div className="mb-3 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-1.5 text-xs ${
              tab === t.id
                ? 'border-brand-500 font-bold text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════ Overview ══════ */}
      {tab === 'overview' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Total Bookings" value={kpi.totalBookings.toLocaleString('ko-KR')} change={kpi.bookingsChange} note={comparisonLabel} />
            <Kpi label="Total Revenue" value={money(kpi.revenue)} change={kpi.revenueChange} note={comparisonLabel} />
            <Kpi label="Room Nights" value={kpi.roomNights.toLocaleString('ko-KR')} change={kpi.nightsChange} note={comparisonLabel} />
            <Kpi label="Avg Booking Value" value={money(kpi.avgBookingValue)} change={kpi.avgChange} note={comparisonLabel} />
          </div>

          <Card>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="text-[13px] font-bold text-slate-800">OP Points</span>
              <span className="text-xs text-slate-600">
                Balance <b className="text-slate-800">{points.balance.toLocaleString('ko-KR')}P</b>
              </span>
              <span className="text-xs text-slate-600">
                Earned <b className="text-emerald-600">+{points.earned.toLocaleString('ko-KR')}P</b>
              </span>
              <span className="text-xs text-slate-600">
                Used <b className="text-red-500">-{points.used.toLocaleString('ko-KR')}P</b>
              </span>
            </div>
          </Card>

          {/* Daily Booking Statistics */}
          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Daily Booking Statistics</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {metricSelect}
                <input
                  type="date"
                  value={dailyFrom}
                  onChange={(e) => setDailyFrom(e.target.value)}
                  className={filterCls}
                  aria-label="일별 시작일"
                />
                <span className="text-xs text-slate-400">~</span>
                <input
                  type="date"
                  value={dailyTo}
                  onChange={(e) => setDailyTo(e.target.value)}
                  className={filterCls}
                  aria-label="일별 종료일"
                />
                <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                  {dailyRows.length}일
                </span>
              </div>
            </div>
            <div className="mb-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600">
              <span>
                Total <b className="text-slate-800">{fmtDaily(dailyTotal)}</b>
              </span>
              <span>
                Daily Avg <b className="text-slate-800">{fmtDaily(dailyAvg)}</b>
              </span>
              <span>
                Peak <b className="text-slate-800">{fmtDaily(dailyPeak)}</b>
              </span>
            </div>
            {dailyRows.length === 0 ? (
              <p className="py-12 text-center text-xs text-slate-400">선택한 기간에 데이터가 없습니다</p>
            ) : (
              areaChart(dailyRows, 'ovDaily')
            )}
          </Card>

          {/* 12-Month TTV Trend */}
          <Card>
            <CardTitle>12-Month TTV Trend</CardTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ttvTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke={AXIS} />
                <YAxis tick={{ fontSize: 10 }} stroke={AXIS} tickFormatter={compactYen} />
                <Tooltip formatter={(v) => [money(Number(v)), 'TTV']} contentStyle={tooltipStyle} />
                <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
                  {ttvTrend.map((_, i) => (
                    <Cell key={i} fill={BRAND} fillOpacity={i === ttvTrend.length - 1 ? 1 : 0.4} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-1 text-[10px] text-slate-400">진한 막대가 이번 달입니다.</p>
          </Card>

          {/* Destination Booking Percentage */}
          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Destination Booking Percentage</CardTitle>
              <select
                value={destView}
                onChange={(e) => setDestView(e.target.value)}
                className={filterCls}
                aria-label="목적지 기준"
              >
                {DEST_VIEWS.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-start">
              <ResponsiveContainer width={220} height={220}>
                <PieChart>
                  <Pie data={dest} dataKey="bookings" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={90} paddingAngle={2} strokeWidth={0}>
                    {dest.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, n) => [`${v}건 (${((Number(v) / destTotal) * 100).toFixed(1)}%)`, String(n)]}
                    contentStyle={tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full flex-1 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="px-2 py-1.5 text-left font-medium">{destView === 'City' ? 'City' : 'Country/Region'}</th>
                      <th className="px-2 py-1.5 text-right font-medium">Bookings</th>
                      <th className="px-2 py-1.5 text-right font-medium">%</th>
                      <th className="px-2 py-1.5 text-right font-medium">Amount</th>
                      <th className="px-2 py-1.5 text-right font-medium">Nights</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dest.map((d) => (
                      <tr key={d.name} className="border-b border-slate-100 last:border-0">
                        <td className="px-2 py-1.5">
                          <span className="flex items-center gap-1.5 text-slate-700">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                            {d.name}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-right text-slate-700">{d.bookings}</td>
                        <td className="px-2 py-1.5 text-right font-medium text-slate-800">
                          {((d.bookings / destTotal) * 100).toFixed(1)}%
                        </td>
                        <td className="px-2 py-1.5 text-right text-slate-700">{money(d.amount)}</td>
                        <td className="px-2 py-1.5 text-right text-slate-700">{d.nights}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          {/* Bestselling Hotels */}
          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <CardTitle>
                OhMyHotel <span className="rounded-sm bg-brand-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">Bestselling Hotel Rankings</span>
              </CardTitle>
              <select
                value={bestCountry}
                onChange={(e) => setBestCountry(e.target.value)}
                className={filterCls}
                aria-label="국가 필터"
              >
                {bestCountries.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="w-12 px-2 py-1.5 text-left font-medium">Rank</th>
                    <th className="px-2 py-1.5 text-left font-medium">Hotel Name</th>
                    <th className="w-24 px-2 py-1.5 text-left font-medium">Star</th>
                    <th className="w-28 px-2 py-1.5 text-left font-medium">City</th>
                    <th className="w-36 px-2 py-1.5 text-left font-medium">Country/Region</th>
                  </tr>
                </thead>
                <tbody>
                  {bestRows.map((h, i) => (
                    <tr key={`${h.hotelName}-${i}`} className="border-b border-slate-100 last:border-0">
                      <td className="px-2 py-1.5">
                        {i < 3 ? (
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-[10px] font-bold text-white"
                            style={{ background: ['#2196F3', '#FF9800', '#F44336'][i] }}
                          >
                            {i + 1}
                          </span>
                        ) : (
                          <span className="text-slate-500">{i + 1}</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 font-medium text-brand-600">{h.hotelName}</td>
                      <td className="px-2 py-1.5 text-amber-500">{h.starRating} ★</td>
                      <td className="px-2 py-1.5 text-slate-700">{h.city}</td>
                      <td className="px-2 py-1.5 text-slate-700">{h.country}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ══════ Data Center — Booking ══════ */}
      {tab === 'dc-booking' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] font-bold text-slate-800">Booking Statistics (6개월)</p>
            <select
              value={accountLevel}
              onChange={(e) => setAccountLevel(e.target.value)}
              className={filterCls}
              aria-label="계정 구분"
            >
              {['All', 'Master', 'Sub-accounts'].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Kpi label={`Confirmed (${latest.month})`} value={latest.confirmed.toLocaleString('ko-KR')} />
            <Kpi label="Cancelled" value={latest.cancelled.toLocaleString('ko-KR')} />
            <Kpi label="Deferred Credit" value={latest.deferredCredit.toLocaleString('ko-KR')} />
          </div>
          <Card>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyBookingStats} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke={AXIS} />
                <YAxis tick={{ fontSize: 10 }} stroke={AXIS} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="confirmed" name="Confirmed" fill="#009505" radius={[3, 3, 0, 0]} />
                <Bar dataKey="cancelled" name="Cancelled" fill="#DC2626" radius={[3, 3, 0, 0]} />
                <Bar dataKey="deferredCredit" name="Deferred" fill="#FF8C00" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* ══════ Data Center — Cancellation ══════ */}
      {tab === 'dc-cancel' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Kpi label={`This Month (${latestCancel.month})`} value={`${latestCancel.rate}%`} note={`${latestCancel.count}건 취소`} />
            <Kpi label={`Previous Month (${prevCancel.month})`} value={`${prevCancel.rate}%`} note={`${prevCancel.count}건 취소`} />
            <Kpi label="6-Month Average" value={`${avgCancel}%`} note={`누적 ${cancelTotal}건`} />
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card>
              <CardTitle>Cancel Rate Trend</CardTitle>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyCancelRate} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke={AXIS} />
                  <YAxis tick={{ fontSize: 10 }} stroke={AXIS} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip formatter={(v) => [`${v}%`, '취소율']} contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="rate" stroke="#DC2626" strokeWidth={2} dot={{ fill: '#DC2626', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <CardTitle>Cancel Reasons (6개월 누적)</CardTitle>
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <ResponsiveContainer width={170} height={170}>
                  <PieChart>
                    <Pie data={cancelReasons} dataKey="count" nameKey="reason" cx="50%" cy="50%" innerRadius={42} outerRadius={72} paddingAngle={2} strokeWidth={0}>
                      {cancelReasons.map((r) => (
                        <Cell key={r.reason} fill={r.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full flex-1 space-y-1.5">
                  {cancelReasons.map((r) => (
                    <div key={r.reason} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
                        {r.reason}
                      </span>
                      <span className="font-medium text-slate-800">
                        {r.count}
                        <span className="ml-1 text-[10px] text-slate-400">
                          ({((r.count / cancelTotal) * 100).toFixed(0)}%)
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ══════ Data Center — Daily ══════ */}
      {tab === 'dc-daily' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {metricSelect}
            <span className="text-xs text-slate-500">최근 {dailyBookingStats.length}일</span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Kpi label="Total" value={fmtDaily(dailyBookingStats.reduce((s, d) => s + d[dailyMetric], 0))} />
            <Kpi
              label="Daily Avg"
              value={fmtDaily(
                Math.round(dailyBookingStats.reduce((s, d) => s + d[dailyMetric], 0) / dailyBookingStats.length),
              )}
            />
            <Kpi label="Peak" value={fmtDaily(Math.max(...dailyBookingStats.map((d) => d[dailyMetric])))} />
          </div>
          <Card>{areaChart(dailyBookingStats, 'dcDaily')}</Card>
        </div>
      )}

      {/* ══════ Data Center — Year-End ══════ */}
      {tab === 'dc-yearend' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {yearTotals.map((y, i) => (
              <Card key={y.year}>
                <p className="text-[11px] font-bold" style={{ color: ['#94A3B8', '#FF8C00', BRAND][i] }}>
                  {y.year}
                  {y.ytd && ' (YTD)'}
                </p>
                <p className="mt-1 text-xl font-bold text-slate-800">{y.bookings.toLocaleString('ko-KR')}</p>
                <p className="mt-1 text-[10px] text-slate-400">
                  {money(y.revenue)} · {y.roomNights.toLocaleString('ko-KR')}박
                </p>
              </Card>
            ))}
          </div>
          <Card>
            <CardTitle>Monthly Comparison</CardTitle>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={yearEndStats} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke={AXIS} />
                <YAxis tick={{ fontSize: 10 }} stroke={AXIS} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="prev2" name={String(YEARS[0])} fill="#94A3B8" radius={[2, 2, 0, 0]} />
                <Bar dataKey="prev1" name={String(YEARS[1])} fill="#FF8C00" radius={[2, 2, 0, 0]} />
                <Bar dataKey="curr" name={String(YEARS[2])} fill={BRAND} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <CardTitle>YoY Growth</CardTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-2 py-1.5 text-left font-medium">Month</th>
                    <th className="px-2 py-1.5 text-right font-medium">{YEARS[0]}</th>
                    <th className="px-2 py-1.5 text-right font-medium">{YEARS[1]}</th>
                    <th className="px-2 py-1.5 text-right font-medium">{YEARS[2]}</th>
                    <th className="px-2 py-1.5 text-right font-medium">
                      YoY {String(YEARS[1]).slice(2)}/{String(YEARS[0]).slice(2)}
                    </th>
                    <th className="px-2 py-1.5 text-right font-medium">
                      YoY {String(YEARS[2]).slice(2)}/{String(YEARS[1]).slice(2)}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {yearEndStats.map((y) => {
                    const g1 = ((y.prev1 / y.prev2 - 1) * 100).toFixed(1);
                    const g2 = y.curr > 0 ? ((y.curr / y.prev1 - 1) * 100).toFixed(1) : null;
                    const chip = (v: string) => (
                      <span
                        className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${
                          parseFloat(v) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                        }`}
                      >
                        {parseFloat(v) >= 0 ? '+' : ''}
                        {v}%
                      </span>
                    );
                    return (
                      <tr key={y.month} className="border-b border-slate-100 last:border-0">
                        <td className="px-2 py-1.5 font-medium text-slate-700">{y.month}</td>
                        <td className="px-2 py-1.5 text-right text-slate-700">{y.prev2}</td>
                        <td className="px-2 py-1.5 text-right text-slate-700">{y.prev1}</td>
                        <td className="px-2 py-1.5 text-right text-slate-700">{y.curr || '—'}</td>
                        <td className="px-2 py-1.5 text-right">{chip(g1)}</td>
                        <td className="px-2 py-1.5 text-right">{g2 ? chip(g2) : <span className="text-slate-300">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
        프로토타입 — 목데이터 기준 읽기 전용 스냅샷입니다. 집계 기준일·기간 셀렉트는 화면만 동작하며(실데이터 연동 시
        서버 집계로 대체), 목적지 기준·지표·국가 필터는 실제로 동작합니다.
      </p>
    </div>
  );
}
