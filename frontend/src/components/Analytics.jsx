import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Pie,
  PieChart,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FileDown } from 'lucide-react';

import AxiosInstance from './Axios';
import Alert from './ui/Alert';
import Input from './ui/Input';
import PageHeader from './ui/PageHeader';
import Select from './ui/Select';
import { Button } from './ui/shadcn/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/Card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/shadcn/Dialog';
import { downloadOfficeReport } from '../lib/officeReport';
import {
  monthlyFeeTotals,
  notarialTypeCounts,
  quarterlyFeeTotals,
  remarksCounts,
  sumFees,
} from '../lib/dashboardStats';
import { cn } from '../lib/utils';

const PIE_COLORS = ['#b91c1c', '#dc2626', '#78716c'];
const MAX_BOOK_ENTRIES = 525;

const REPORT_CATEGORY_LABELS = {
  notarial_acts: 'Notarial acts breakdown',
  remarks: 'Remarks',
};

const NOTARIAL_TYPE_OPTIONS = [
  { value: 'SUB', label: 'Subscription' },
  { value: 'ACK', label: 'Acknowledgement' },
  { value: 'CERT', label: 'Certification' },
];

const REMARK_OPTIONS = [
  { value: 'CR', label: 'Copy Retained' },
  { value: 'NCR', label: 'No Copy Retained' },
];

const CHART_TOOLTIP_STYLE = {
  borderRadius: 8,
  border: '1px solid rgb(51 65 85)',
  backgroundColor: 'rgb(15 23 42)',
  color: 'rgb(248 250 252)',
  fontSize: 12,
};

function formatPhp(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);
}

function formatPct(value) {
  if (!Number.isFinite(value)) return '—';
  return `${Math.round(value)}%`;
}

function toMonthKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthBuckets(monthsBack = 6) {
  const now = new Date();
  return Array.from({ length: monthsBack }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1 - index), 1);
    return {
      key: toMonthKey(date),
      label: date.toLocaleDateString('en-US', { month: 'short' }),
      entries: 0,
      revenue: 0,
      intakes: 0,
      completed: 0,
      ready: 0,
      finalized: 0,
    };
  });
}

function buildActivitySeries(entries, intakes, drafts) {
  const buckets = monthBuckets(6);
  const lookup = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const entry of entries) {
    if (entry.is_archived) continue;
    const bucket = lookup.get(toMonthKey(entry.date_time));
    if (!bucket) continue;
    bucket.entries += 1;
    bucket.revenue += Number(entry.fees) || 0;
    bucket.completed += 1;
    bucket.finalized += 1;
  }

  for (const intake of intakes) {
    const bucket = lookup.get(toMonthKey(intake.created_at || intake.scheduled_date));
    if (!bucket) continue;
    bucket.intakes += 1;
    if (intake.status === 'COMPLETED') bucket.completed += 1;
  }

  for (const draft of drafts) {
    const bucket = lookup.get(toMonthKey(draft.finalized_at || draft.updated_at || draft.created_at));
    if (!bucket) continue;
    if (draft.status === 'READY') bucket.ready += 1;
    if (draft.status === 'FINALIZED') bucket.finalized += 1;
  }

  return buckets;
}

function buildRemarksSeries(entries) {
  const buckets = monthBuckets(6).map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    cr: 0,
    ncr: 0,
  }));
  const lookup = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const entry of entries) {
    if (entry.is_archived) continue;
    const bucket = lookup.get(toMonthKey(entry.date_time));
    if (!bucket) continue;
    if (entry.remarks === 'CR') bucket.cr += 1;
    if (entry.remarks === 'NCR') bucket.ncr += 1;
  }

  return buckets;
}

function AnalyticsMetric({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}

function InsightCard({ title, description, metrics, children, className = '' }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {metrics.map((metric) => (
            <AnalyticsMetric key={metric.label} {...metric} />
          ))}
        </div>
        <div className="h-[240px] w-full">{children}</div>
      </CardContent>
    </Card>
  );
}

function BookFilterControl({ value, onSearchChange, onSelect, options, datalistId, className = '' }) {
  return (
    <label className={cn('space-y-1 text-sm text-slate-700 dark:text-slate-200', className)}>
      <span>Book</span>
      <Input
        list={datalistId}
        value={value}
        placeholder="Search book number..."
        onChange={(event) => onSearchChange(event.target.value)}
        onBlur={(event) => onSelect(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
            onSelect(event.currentTarget.value);
          }
        }}
      />
      <datalist id={datalistId}>
        {options.map((option) => (
          <option key={option.value} value={option.searchLabel || option.label} />
        ))}
      </datalist>
    </label>
  );
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [entries, setEntries] = useState([]);
  const [books, setBooks] = useState([]);
  const [intakes, setIntakes] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState('all');
  const [bookSearch, setBookSearch] = useState('All books');
  const [revenuePeriod, setRevenuePeriod] = useState('monthly');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportMsg, setReportMsg] = useState('');
  const [reportErr, setReportErr] = useState('');
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState('notarial_acts');
  const [reportSelection, setReportSelection] = useState('SUB');

  const load = useCallback(async () => {
    setErr('');
    setLoading(true);
    try {
      const [entriesResponse, archivedEntriesResponse, booksResponse, intakeResponse, draftResponse] = await Promise.all([
        AxiosInstance.get('/entries/?lite=true'),
        AxiosInstance.get('/entries/?lite=true&archived=true'),
        AxiosInstance.get('/books/'),
        AxiosInstance.get('/client-intakes/'),
        AxiosInstance.get('/workflow-drafts/'),
      ]);
      setEntries([
        ...(Array.isArray(entriesResponse.data) ? entriesResponse.data : []),
        ...(Array.isArray(archivedEntriesResponse.data) ? archivedEntriesResponse.data : []),
      ]);
      setBooks(Array.isArray(booksResponse.data) ? booksResponse.data : []);
      setIntakes(Array.isArray(intakeResponse.data) ? intakeResponse.data : []);
      setDrafts(Array.isArray(draftResponse.data) ? draftResponse.data : []);
    } catch (e) {
      const detail = e.response?.data?.detail || e.message || 'Could not load entries.';
      setErr(typeof detail === 'string' ? detail : JSON.stringify(detail));
      setEntries([]);
      setBooks([]);
      setIntakes([]);
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const active = useMemo(() => entries.filter((e) => !e.is_archived), [entries]);
  const archived = useMemo(() => entries.filter((e) => e.is_archived), [entries]);
  const total = entries.length || 1;
  const bookOptions = useMemo(
    () => [
      { value: 'all', label: 'All books', searchLabel: 'All books' },
      ...books
        .slice()
        .sort((a, b) => String(a.book_number || '').localeCompare(String(b.book_number || ''), undefined, { numeric: true }))
        .map((book) => ({
          value: String(book.id),
          label: `Book ${book.book_number}`,
          searchLabel: String(book.book_number || ''),
        })),
    ],
    [books]
  );

  const selectedBookLabel = useMemo(() => {
    return bookOptions.find((option) => option.value === selectedBookId)?.label || 'All books';
  }, [bookOptions, selectedBookId]);

  const selectBookBySearch = useCallback((rawValue) => {
    const normalized = String(rawValue || '').trim().toLowerCase();
    const match = bookOptions.find(
      (option) =>
        (option.value === 'all' && option.label.toLowerCase() === normalized) ||
        option.searchLabel?.toLowerCase() === normalized
    );
    const next = match || bookOptions[0];
    setSelectedBookId(next.value);
    setBookSearch(next.label);
  }, [bookOptions]);

  const filteredReportEntries = useMemo(() => {
    if (selectedBookId === 'all') return entries;
    return entries.filter((entry) => String(entry.book) === String(selectedBookId));
  }, [entries, selectedBookId]);

  const volumeBars = useMemo(() => {
    const activePct = Math.round((active.length / total) * 100);
    const archivedPct = Math.round((archived.length / total) * 100);
    return [
      { label: 'Active register', pct: activePct, tone: 'bg-red-700' },
      { label: 'Archived', pct: archivedPct, tone: 'bg-red-600/90' },
    ];
  }, [active.length, archived.length, total]);
  const volumeRadialData = useMemo(
    () => [
      {
        name: 'Active register',
        value: active.length,
        fill: '#b91c1c',
      },
      {
        name: 'Archived',
        value: archived.length,
        fill: '#dc2626',
      },
    ],
    [active.length, archived.length]
  );

  const monthlySeries = useMemo(() => monthlyFeeTotals(entries, 6), [entries]);
  const quarterlySeries = useMemo(() => quarterlyFeeTotals(entries), [entries]);

  const revenueTotal = useMemo(() => sumFees(entries, true), [entries]);
  const actCounts = useMemo(() => notarialTypeCounts(filteredReportEntries, { archivedOnly: false }), [filteredReportEntries]);
  const actsTotalRaw = actCounts.ACK + actCounts.SUB + actCounts.CERT;
  const actsDenom = actsTotalRaw || 1;
  const pieData = useMemo(
    () => [
      { name: 'Subscription', value: actCounts.SUB },
      { name: 'Acknowledgement', value: actCounts.ACK },
      { name: 'Certification', value: actCounts.CERT },
    ],
    [actCounts]
  );

  const avgPerAct = revenueTotal / actsDenom;
  const activitySeries = useMemo(() => buildActivitySeries(entries, intakes, drafts), [drafts, entries, intakes]);
  const bookUtilization = useMemo(
    () =>
      books
        .slice()
        .sort((a, b) => String(a.book_number || '').localeCompare(String(b.book_number || ''), undefined, { numeric: true }))
        .map((book) => {
          const used = active.filter((entry) => String(entry.book) === String(book.id)).length;
          return {
            book: `B${book.book_number}`,
            used,
            remaining: Math.max(0, MAX_BOOK_ENTRIES - used),
            utilization: Math.round((used / MAX_BOOK_ENTRIES) * 100),
          };
        })
        .slice(-8),
    [active, books]
  );
  const avgBookUtilization = bookUtilization.length
    ? bookUtilization.reduce((sum, book) => sum + book.utilization, 0) / bookUtilization.length
    : 0;
  const busiestBook = bookUtilization.reduce((best, book) => (book.used > (best?.used || 0) ? book : best), null);
  const completedIntakes = intakes.filter((intake) => intake.status === 'COMPLETED').length;
  const cancelledIntakes = intakes.filter((intake) => intake.status === 'CANCELLED').length;
  const activeIntakes = intakes.filter((intake) => ['PENDING', 'PROCESSING'].includes(intake.status)).length;
  const readyDrafts = drafts.filter((draft) => draft.status === 'READY').length;
  const officialWorkflowDone = active.length;
  const completedWorkflowRecords = Math.max(completedIntakes, officialWorkflowDone);
  const finalizedWorkflowRecords = Math.max(drafts.filter((draft) => draft.status === 'FINALIZED').length, officialWorkflowDone);
  const workflowDenom = Math.max(intakes.length, officialWorkflowDone, 1);
  const workflowRadar = [
    { stage: 'Queued', value: Math.max(intakes.length, officialWorkflowDone) },
    { stage: 'Active', value: activeIntakes },
    { stage: 'Completed', value: completedWorkflowRecords },
    { stage: 'Ready', value: readyDrafts },
    { stage: 'Finalized', value: finalizedWorkflowRecords },
    { stage: 'Cancelled', value: cancelledIntakes },
  ];

  const remarks = useMemo(() => remarksCounts(filteredReportEntries, true), [filteredReportEntries]);
  const remarksSeries = useMemo(() => buildRemarksSeries(filteredReportEntries), [filteredReportEntries]);
  const remarksBars = useMemo(() => {
    const t = remarks.total || 1;
    return [
      {
        label: 'Copy retained',
        pct: Math.round((remarks.cr / t) * 100),
        tone: 'bg-red-700',
      },
      {
        label: 'No copy retained',
        pct: Math.round((remarks.ncr / t) * 100),
        tone: 'bg-slate-400 dark:bg-slate-600',
      },
    ];
  }, [remarks]);

  const reportSelectionOptions = reportCategory === 'remarks' ? REMARK_OPTIONS : NOTARIAL_TYPE_OPTIONS;

  function openReportDialog(category) {
    setReportCategory(category);
    setReportSelection(category === 'remarks' ? 'CR' : 'SUB');
    setReportDialogOpen(true);
  }

  async function generateReport() {
    setReportErr('');
    setReportMsg('');
    setReportBusy(true);
    try {
      await downloadOfficeReport({
        report_type: reportCategory,
        book: selectedBookId === 'all' ? null : selectedBookId,
        notarial_type: reportCategory === 'notarial_acts' ? reportSelection : null,
        remark: reportCategory === 'remarks' ? reportSelection : null,
      });
      setReportDialogOpen(false);
      setReportMsg(`${REPORT_CATEGORY_LABELS[reportCategory] || 'Report'} generated. Logged under Activity logs.`);
    } catch (e) {
      const detail = e.response?.data?.detail || e.message || 'Could not generate report.';
      setReportErr(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setReportBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Statistical overview"
        title="Analytics & reports"
        subtitle="Revenue and volume derived from entry fees and archive status. Generate the structured office report anytime."
      />

      {err ? (
        <Alert variant="error" title="Could not load analytics">
          {err}
        </Alert>
      ) : null}

      {reportMsg ? (
        <Alert variant="success" dismissible title="Report ready" onDismiss={() => setReportMsg('')}>
          {reportMsg}
        </Alert>
      ) : null}

      {reportErr ? (
        <Alert variant="error" dismissible title="Report failed" onDismiss={() => setReportErr('')}>
          {reportErr}
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Revenue insights</CardTitle>
              <CardDescription>Fees from non-archived entries.</CardDescription>
            </div>
            <div className="flex w-full gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800 sm:w-auto">
              <Button
                type="button"
                size="sm"
                variant={revenuePeriod === 'monthly' ? 'default' : 'ghost'}
                className={cn(
                  'flex-1 sm:flex-none',
                  revenuePeriod !== 'monthly' && 'text-slate-600 dark:text-slate-300'
                )}
                onClick={() => setRevenuePeriod('monthly')}
              >
                Monthly
              </Button>
              <Button
                type="button"
                size="sm"
                variant={revenuePeriod === 'quarterly' ? 'default' : 'ghost'}
                className={cn(
                  'flex-1 sm:flex-none',
                  revenuePeriod !== 'quarterly' && 'text-slate-600 dark:text-slate-300'
                )}
                onClick={() => setRevenuePeriod('quarterly')}
              >
                Quarterly
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[260px] w-full">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading…</div>
              ) : revenuePeriod === 'monthly' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlySeries}>
                    <defs>
                      <linearGradient id="monthlyRevenueArea" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#991b1b" stopOpacity={0.42} />
                        <stop offset="95%" stopColor="#991b1b" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${v}`} />
                    <Tooltip formatter={(v) => formatPhp(v)} contentStyle={CHART_TOOLTIP_STYLE} />
                    <Area type="monotone" dataKey="total" stroke="#991b1b" fill="url(#monthlyRevenueArea)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={quarterlySeries}>
                    <defs>
                      <linearGradient id="quarterlyRevenueArea" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#b91c1c" stopOpacity={0.42} />
                        <stop offset="95%" stopColor="#b91c1c" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip formatter={(v) => formatPhp(v)} contentStyle={CHART_TOOLTIP_STYLE} />
                    <Area type="monotone" dataKey="total" stroke="#b91c1c" fill="url(#quarterlyRevenueArea)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-6 border-t border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/40">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total revenue</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{loading ? '…' : formatPhp(revenueTotal)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Avg per act</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{loading ? '…' : formatPhp(avgPerAct)}</p>
            </div>
          </CardFooter>
        </Card>

        <InsightCard
          title="Notarial activity trend"
          description="Entry volume and fee movement over the last six months."
          metrics={[
            { label: 'Active entries', value: active.length.toLocaleString(), hint: 'Current register records' },
            { label: 'Archive rate', value: formatPct((archived.length / total) * 100), hint: `${archived.length.toLocaleString()} archived entries` },
          ]}
        >
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activitySeries}>
                <defs>
                  <linearGradient id="entryArea" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#b91c1c" stopOpacity={0.38} />
                    <stop offset="95%" stopColor="#b91c1c" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip formatter={(v, name) => [name === 'revenue' ? formatPhp(v) : `${v} entries`, name === 'revenue' ? 'Revenue' : 'Entries']} contentStyle={CHART_TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="entries" stroke="#b91c1c" fill="url(#entryArea)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </InsightCard>

        <InsightCard
          title="Register capacity"
          description="Book utilization based on active entries per register book."
          metrics={[
            { label: 'Avg utilization', value: formatPct(avgBookUtilization), hint: `${books.length.toLocaleString()} active books` },
            { label: 'Busiest book', value: busiestBook?.book || '—', hint: busiestBook ? `${busiestBook.used}/525 entries` : 'No book data yet' },
          ]}
        >
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bookUtilization}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" vertical={false} />
                <XAxis dataKey="book" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v, name) => [name === 'utilization' ? `${v}%` : v, name === 'utilization' ? 'Utilization' : name]} contentStyle={CHART_TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="utilization" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </InsightCard>

        <InsightCard
          title="Workflow conversion"
          description="Queue health from intake through finalization."
          metrics={[
            { label: 'Completion rate', value: formatPct((completedWorkflowRecords / workflowDenom) * 100), hint: `${officialWorkflowDone.toLocaleString()} official entries counted as done` },
            { label: 'Finalized records', value: finalizedWorkflowRecords.toLocaleString(), hint: `${readyDrafts.toLocaleString()} ready drafts still pending` },
          ]}
        >
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={workflowRadar}>
                <PolarGrid className="stroke-slate-200 dark:stroke-slate-700" />
                <PolarAngleAxis dataKey="stage" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <PolarRadiusAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Radar dataKey="value" stroke="#b91c1c" fill="#b91c1c" fillOpacity={0.24} />
                <Tooltip formatter={(v) => [`${v} records`, 'Count']} contentStyle={CHART_TOOLTIP_STYLE} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </InsightCard>

        <InsightCard
          title="Workflow throughput"
          description="Monthly intake, completed queue, ready draft, and finalized movement."
          metrics={[
            { label: 'Active queue', value: activeIntakes.toLocaleString(), hint: 'Pending or processing' },
            { label: 'Cancellation rate', value: formatPct((cancelledIntakes / workflowDenom) * 100), hint: `${cancelledIntakes.toLocaleString()} cancelled intakes` },
          ]}
        >
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activitySeries}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip formatter={(v) => [`${v} records`, 'Count']} contentStyle={CHART_TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="intakes" name="Intakes" stroke="#b91c1c" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="completed" name="Completed" stroke="#0f766e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ready" name="Ready drafts" stroke="#ca8a04" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="finalized" name="Finalized" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </InsightCard>

        <Card className="xl:col-span-2">
          <CardHeader className="grid gap-4 md:grid-cols-[1fr_minmax(240px,320px)] md:items-end">
            <div>
              <CardTitle>Report scope</CardTitle>
              <CardDescription>Use one book filter for Notarial acts breakdown and Remarks.</CardDescription>
            </div>
            <BookFilterControl
              value={bookSearch}
              onSearchChange={setBookSearch}
              onSelect={selectBookBySearch}
              options={bookOptions}
              datalistId="analytics-report-book-options"
            />
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Volume status</CardTitle>
            <CardDescription>Mix of active versus archived entries.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-[220px] w-full">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading…</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    data={volumeRadialData}
                    innerRadius="36%"
                    outerRadius="92%"
                    startAngle={90}
                    endAngle={-270}
                  >
                    <PolarAngleAxis type="number" domain={[0, total]} tick={false} />
                    <RadialBar dataKey="value" background cornerRadius={10} minAngle={8} />
                    <Tooltip formatter={(v) => [`${v} entries`, 'Count']} contentStyle={CHART_TOOLTIP_STYLE} />
                  </RadialBarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {volumeBars.map((row) => (
                <div key={row.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                      <span className={cn('h-2.5 w-2.5 rounded-full', row.tone)} />
                      {row.label}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">{row.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Notarial acts breakdown</CardTitle>
              <CardDescription>Active entries only · {selectedBookLabel}</CardDescription>
            </div>
            <Button type="button" size="sm" isLoading={reportBusy} loadingLabel="Working…" onClick={() => openReportDialog('notarial_acts')} className="gap-1.5">
              <FileDown className="h-4 w-4" aria-hidden />
              Generate report
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="h-[200px] w-full max-w-[220px]">
                {loading ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading…</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {pieData.map((_, index) => (
                          <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v} entries`, 'Count']} contentStyle={CHART_TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="space-y-2 text-sm">
                {pieData.map((row, i) => (
                  <div key={row.name} className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full')} style={{ backgroundColor: PIE_COLORS[i] }} />
                    <span className="text-slate-600 dark:text-slate-300">
                      {row.name}:{' '}
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {Math.round((row.value / actsDenom) * 100)}%
                      </span>
                    </span>
                  </div>
                ))}
                <p className="pt-2 text-center text-xs font-semibold text-slate-500 sm:text-left">
                  {loading ? '…' : `${actsTotalRaw.toLocaleString()} total acts · ${selectedBookLabel}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Remarks</CardTitle>
              <CardDescription>Copy retention pattern on active entries · {selectedBookLabel}</CardDescription>
            </div>
            <Button type="button" size="sm" isLoading={reportBusy} loadingLabel="Working…" onClick={() => openReportDialog('remarks')} className="gap-1.5">
              <FileDown className="h-4 w-4" aria-hidden />
              Generate report
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-[260px] w-full">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading…</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={remarksSeries}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                    <Tooltip formatter={(v, name) => [`${v} entries`, name === 'cr' ? 'Copy retained' : 'No copy retained']} contentStyle={CHART_TOOLTIP_STYLE} />
                    <Line type="monotone" dataKey="cr" name="Copy retained" stroke="#b91c1c" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="ncr" name="No copy retained" stroke="#64748b" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {remarksBars.map((row) => (
                <div key={row.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                      <span className={cn('h-2.5 w-2.5 rounded-full', row.tone)} />
                      {row.label}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">{row.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate {REPORT_CATEGORY_LABELS[reportCategory]}</DialogTitle>
            <DialogDescription>
              Choose the {reportCategory === 'remarks' ? 'remark' : 'notarial type'} before downloading.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              Book: <span className="font-semibold text-slate-900 dark:text-white">{selectedBookLabel}</span>
            </div>
            <label className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
              <span>{reportCategory === 'remarks' ? 'Remark' : 'Notarial type'}</span>
              <Select
                value={reportSelection}
                onChange={(event) => setReportSelection(event.target.value)}
                options={reportSelectionOptions}
              />
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReportDialogOpen(false)} disabled={reportBusy}>
              Cancel
            </Button>
            <Button type="button" isLoading={reportBusy} loadingLabel="Generating…" onClick={generateReport}>
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
