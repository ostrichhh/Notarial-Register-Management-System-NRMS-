import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
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
import { Progress } from './ui/shadcn/Progress';
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

function BookFilterControl({ value, onSearchChange, onSelect, options, datalistId, className = '' }) {
  return (
    <label className={cn('space-y-1 text-sm text-slate-700 dark:text-slate-200', className)}>
      <span>Book</span>
      <Input
        list={datalistId}
        value={value}
        placeholder="Search book..."
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
          <option key={option.value} value={option.label} />
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
      const [entriesResponse, booksResponse] = await Promise.all([
        AxiosInstance.get('/entries/?lite=true'),
        AxiosInstance.get('/books/'),
      ]);
      setEntries(Array.isArray(entriesResponse.data) ? entriesResponse.data : []);
      setBooks(Array.isArray(booksResponse.data) ? booksResponse.data : []);
    } catch (e) {
      const detail = e.response?.data?.detail || e.message || 'Could not load entries.';
      setErr(typeof detail === 'string' ? detail : JSON.stringify(detail));
      setEntries([]);
      setBooks([]);
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
      { value: 'all', label: 'All books' },
      ...books
        .slice()
        .sort((a, b) => String(a.book_number || '').localeCompare(String(b.book_number || ''), undefined, { numeric: true }))
        .map((book) => ({
          value: String(book.id),
          label: `Book ${book.book_number}`,
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
        option.label.toLowerCase() === normalized ||
        option.value.toLowerCase() === normalized ||
        option.label.toLowerCase().replace(/^book\s+/, '') === normalized
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
    const other = Math.max(0, 100 - activePct - archivedPct);
    return [
      { label: 'Active register', pct: activePct, tone: 'bg-red-700' },
      { label: 'Archived', pct: archivedPct, tone: 'bg-red-600/90' },
      { label: 'Unclassified', pct: other, tone: 'bg-slate-400 dark:bg-slate-600' },
    ];
  }, [active.length, archived.length, total]);

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

  const remarks = useMemo(() => remarksCounts(filteredReportEntries, true), [filteredReportEntries]);
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
      setReportMsg(`${REPORT_CATEGORY_LABELS[reportCategory] || 'Report'} downloaded. Logged under Activity logs.`);
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
                  <BarChart data={monthlySeries}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${v}`} />
                    <Tooltip formatter={(v) => formatPhp(v)} contentStyle={CHART_TOOLTIP_STYLE} />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                      {monthlySeries.map((_, i) => (
                        <Cell key={i} fill={i === monthlySeries.length - 1 ? '#991b1b' : '#fecaca'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quarterlySeries}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip formatter={(v) => formatPhp(v)} contentStyle={CHART_TOOLTIP_STYLE} />
                    <Bar dataKey="total" fill="#b91c1c" radius={[6, 6, 0, 0]} />
                  </BarChart>
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
            {volumeBars.map((row) => (
              <div key={row.label} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                  <span>{row.label}</span>
                  <span>{row.pct}%</span>
                </div>
                <Progress value={row.pct} indicatorClassName={row.tone} />
              </div>
            ))}
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
          <CardContent className="grid gap-6 md:grid-cols-2">
            {remarksBars.map((row) => (
              <div key={row.label} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                  <span>{row.label}</span>
                  <span>{row.pct}%</span>
                </div>
                <Progress value={row.pct} indicatorClassName={row.tone} />
              </div>
            ))}
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
