import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BookMarked,
  Files,
  Landmark,
  Plus,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import AxiosInstance from './Axios';
import Alert from './ui/Alert';
import PageHeader from './ui/PageHeader';
import StatCard from './ui/StatCard';
import { Button } from './ui/shadcn/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Progress } from './ui/shadcn/Progress';
import {
  entryCountMomDelta,
  monthlyFeeTotals,
  notarialTypeCounts,
  revenueMomDelta,
  sumFees,
} from '../lib/dashboardStats';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

function formatPhp(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

function formatInt(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return new Intl.NumberFormat('en-US').format(Math.round(v));
}

function pctTrend(delta) {
  if (delta == null || Number.isNaN(delta)) return null;
  const up = delta >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const text = `${up ? '+' : ''}${delta.toFixed(1)}%`;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium',
        up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {text}
    </span>
  );
}

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [forbiddenNote, setForbiddenNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [books, setBooks] = useState([]);
  const [entries, setEntries] = useState([]);
  const [activeUsers, setActiveUsers] = useState(null);

  useEffect(() => {
    const msg = location.state?.forbiddenMessage;
    if (!msg) return undefined;
    setForbiddenNote(msg);
    const raf = window.requestAnimationFrame(() => {
      navigate({ pathname: location.pathname, search: location.search ?? '' }, { replace: true, state: {} });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [location.state?.forbiddenMessage, navigate, location.pathname, location.search]);

  const loadDashboard = useCallback(async () => {
    setLoadErr('');
    setLoading(true);
    try {
      const requests = [AxiosInstance.get('/books/'), AxiosInstance.get('/entries/?lite=true')];
      const canSeeUsers = user?.role === 'ADMIN';
      if (canSeeUsers) requests.push(AxiosInstance.get('/users/'));
      const results = await Promise.all(requests);
      setBooks(Array.isArray(results[0].data) ? results[0].data : []);
      setEntries(Array.isArray(results[1].data) ? results[1].data : []);
      if (canSeeUsers && results[2]) {
        const rows = Array.isArray(results[2].data) ? results[2].data : [];
        setActiveUsers(rows.filter((u) => u.is_active).length);
      } else {
        setActiveUsers(null);
      }
    } catch (e) {
      const detail = e.response?.data?.detail || e.message || 'Could not load dashboard data.';
      setLoadErr(typeof detail === 'string' ? detail : JSON.stringify(detail));
      setBooks([]);
      setEntries([]);
      setActiveUsers(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadDashboard();
  }, [user, loadDashboard]);

  const activeEntries = useMemo(() => entries.filter((e) => !e.is_archived), [entries]);
  const activeBooks = useMemo(() => books.filter((b) => !b.is_archived), [books]);

  const chartData = useMemo(() => monthlyFeeTotals(entries, 6), [entries]);

  const revenueTotal = useMemo(() => sumFees(entries, true), [entries]);
  const revDelta = useMemo(() => revenueMomDelta(entries), [entries]);
  const entDelta = useMemo(() => entryCountMomDelta(entries), [entries]);

  const actParts = useMemo(() => {
    const c = notarialTypeCounts(entries, { archivedOnly: false });
    const t = c.ACK + c.SUB + c.CERT || 1;
    return [
      { label: 'Acknowledgement', pct: Math.round((c.ACK / t) * 100), tone: 'bg-red-700' },
      { label: 'Subscription', pct: Math.round((c.SUB / t) * 100), tone: 'bg-red-600' },
      { label: 'Certification', pct: Math.round((c.CERT / t) * 100), tone: 'bg-red-500' },
    ];
  }, [entries]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Operational overview"
        subtitle="Live metrics from your register books and entries. Volume reflects recorded fees for the last six months."
        actions={
          <Button type="button" variant="default" size="sm" className="nrms-no-print gap-1.5" onClick={() => navigate('/notarial-entries')}>
            <Plus className="h-4 w-4" aria-hidden />
            New entry
          </Button>
        }
      />

      {forbiddenNote ? (
        <Alert variant="warning" dismissible title="Restricted area" onDismiss={() => setForbiddenNote('')}>
          {forbiddenNote}
        </Alert>
      ) : null}

      {loadErr ? (
        <Alert variant="error" title="Could not load metrics" className="nrms-no-print">
          {loadErr}
        </Alert>
      ) : null}

      <div id="nrms-dashboard-print" className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total entries"
            value={loading ? '…' : formatInt(activeEntries.length)}
            subLabel={
                <span className="flex flex-wrap items-center gap-2 text-emerald-600 dark:text-emerald-400">
                {pctTrend(entDelta)}
                <span className="text-slate-500 dark:text-slate-400">vs prior month</span>
              </span>
            }
            icon={Files}
            iconColor="text-red-700"
          />
          <StatCard
            label="Revenue (PHP)"
            value={loading ? '…' : formatPhp(revenueTotal)}
            subLabel={
              <span className="flex flex-wrap items-center gap-2">
                {pctTrend(revDelta)}
                <span className="text-slate-500 dark:text-slate-400">vs prior month</span>
              </span>
            }
            icon={Landmark}
            iconColor="text-red-700"
          />
          <StatCard
            label="Active books"
            value={loading ? '…' : formatInt(activeBooks.length)}
            subLabel={<span className="text-slate-500 dark:text-slate-400">Books not in archive</span>}
            icon={BookMarked}
            iconColor="text-red-700"
          />
          <StatCard
            label={activeUsers != null ? 'Active users' : 'Your workspace'}
            value={
              loading ? '…' : activeUsers != null ? formatInt(activeUsers) : user?.role ?? '—'
            }
            subLabel={
              activeUsers != null ? (
                <span className="text-slate-200/90">Directory sync</span>
              ) : (
                <span className="text-slate-500 dark:text-slate-400">Role visibility</span>
              )
            }
            icon={activeUsers != null ? Users : Activity}
            iconColor={activeUsers != null ? 'text-white' : 'text-red-700'}
            className={cn(
              activeUsers != null &&
                'border-red-800 bg-red-700 text-white [&_.text-slate-500]:text-white/85 [&_.text-slate-900]:text-white [&_.text-slate-600]:text-white/90'
            )}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 pb-2">
              <div>
                <CardTitle>Volume overview</CardTitle>
                <CardDescription>Fees recorded per month (non-archived entries).</CardDescription>
              </div>
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-800 dark:bg-red-950 dark:text-red-200">
                Last 6 months
              </span>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[280px] w-full">
                {loading ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">Loading chart…</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => formatInt(v)} />
                      <Tooltip
                        formatter={(value) => [formatPhp(value), 'Fees']}
                        contentStyle={{
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="total" fill="#b91c1c" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-red-700 dark:text-red-400" aria-hidden />
                  Act distribution
                </CardTitle>
                <CardDescription>Share of active entries by notarial type.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {actParts.map((row) => (
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

            <Card className="border-red-100 bg-gradient-to-br from-white to-red-50/80 dark:border-red-900 dark:from-slate-950 dark:to-red-950/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Weekly insight</CardTitle>
                <CardDescription>Office reminder</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 text-sm italic leading-relaxed text-slate-700 dark:text-slate-200">
                “Integrity is the bedrock of the law.” — keep acknowledgements, subscriptions, and certifications aligned with the
                Rules on Notarial Practice.
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
