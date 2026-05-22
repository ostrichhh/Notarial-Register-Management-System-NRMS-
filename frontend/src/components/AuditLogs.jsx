import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import AxiosInstance from './Axios';
import Alert from './ui/Alert';
import Input from './ui/Input';
import PageHeader from './ui/PageHeader';
import { Badge } from './ui/shadcn/Badge';
import { Button } from './ui/shadcn/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';

function formatTs(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return String(iso);
  }
}

export default function AuditLogs() {
  const [rows, setRows] = useState([]);
  const [searchDraft, setSearchDraft] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchLogs() {
    setLoading(true);
    setError('');
    try {
      const { data } = await AxiosInstance.get('/audit-logs/');
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      const status = e.response?.status;
      if (status === 403) {
        setError('You do not have permission to view audit trails.');
      } else {
        setError(
          'Audit trail could not be loaded. Confirm the backend is reachable and your session is Admin or Attorney.'
        );
      }
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => fetchLogs());
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => {
      const haystack = [
        formatTs(row.timestamp),
        row.username,
        row.user,
        row.action,
        row.model_name,
        row.object_id,
        row.description,
      ]
        .filter((value) => value !== undefined && value !== null)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, rows]);

  function submitSearch(event) {
    event.preventDefault();
    setQuery(searchDraft);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compliance"
        title="Audit logs"
        subtitle="Immutable activity ledger for statutory registry operations."
      />

      {error ? (
        <Alert variant="error" dismissible title="Unavailable" onDismiss={() => setError('')}>
          {error}
        </Alert>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <form className="flex flex-col gap-2 border-b border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between" onSubmit={submitSearch}>
          <label className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search all activity log fields..."
            />
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="sm">Search</Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchDraft('');
                setQuery('');
              }}
            >
              Clear
            </Button>
          </div>
        </form>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-left">
                <TableHead scope="col">When</TableHead>
                <TableHead scope="col">User</TableHead>
                <TableHead scope="col">Action</TableHead>
                <TableHead scope="col">Model</TableHead>
                <TableHead scope="col">Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">Loading ledger…</p>
                  </TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                      {query ? 'No audit events match your search.' : 'No audit events recorded yet. Actions across NRMS will appear here as they occur.'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => (
                  <TableRow key={row.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/80">
                    <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">{formatTs(row.timestamp)}</TableCell>
                    <TableCell>
                      {row.username ? (
                        <Badge variant="default">{row.username}</Badge>
                      ) : row.user != null ? (
                        <Badge variant="outline">id:{row.user}</Badge>
                      ) : (
                        <span className="text-xs text-slate-500 dark:text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.action}</TableCell>
                    <TableCell className="text-sm text-slate-700 dark:text-slate-300">{row.model_name ?? '—'}</TableCell>
                    <TableCell className="max-w-md text-sm leading-snug text-slate-700 dark:text-slate-300">
                      {row.description?.trim?.()
                        ? row.description
                        : row.object_id != null
                          ? `Record ${row.object_id}`
                          : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
