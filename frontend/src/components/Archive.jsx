import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import AxiosInstance from './Axios';
import Alert from './ui/Alert';
import AlertDialog from './ui/AlertDialog';
import AppButton from './ui/AppButton';
import Badge from './ui/Badge';
import { Card, CardContent } from './ui/Card';
import Input from './ui/Input';
import PageHeader from './ui/PageHeader';
import BrandIconButton from './ui/BrandIconButton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import { BRAND } from '../lib/brandClasses';

const notarialTypeLabel = {
  ACK: 'Acknowledgement',
  SUB: 'Subscription',
  CERT: 'Certification',
};

const remarksLabel = {
  CR: 'Copy Retained',
  NCR: 'No Copy Retained',
};

const formatPeople = (people = []) => {
  if (!Array.isArray(people) || people.length === 0) return 'N/A';
  return people.map((p) => `${p.name}${p.address ? ` (${p.address})` : ''}`).join(', ');
};

// ─── TABS ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'entries', label: 'Archived Entries' },
  { key: 'books', label: 'Archived Books' },
];

export default function Archive() {
  const [activeTab, setActiveTab] = useState('entries');

  // ── Entries state ──
  const [entries, setEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [entriesError, setEntriesError] = useState('');
  const [entrySearch, setEntrySearch] = useState('');
  const [entrySuccess, setEntrySuccess] = useState('');

  // ── Books state ──
  const [books, setBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [booksError, setBooksError] = useState('');
  const [bookSearch, setBookSearch] = useState('');
  const [bookSuccess, setBookSuccess] = useState('');

  // ── Confirm action dialog ──
  const [actionConfirm, setActionConfirm] = useState({
    open: false,
    action: null, // 'restore' | 'delete'
    type: null,   // 'entry' | 'book'
    id: null,
    label: '',
  });
  const [isActioning, setIsActioning] = useState(false);

  // ── Fetch data ──────────────────────────────────────────────────────────────

  const fetchArchivedEntries = useCallback(async () => {
    try {
      setEntriesLoading(true);
      setEntriesError('');
      const response = await AxiosInstance.get('/entries/?archived=true');
      setEntries(response.data || []);
    } catch {
      setEntriesError('Failed to load archived entries.');
    } finally {
      setEntriesLoading(false);
    }
  }, []);

  const fetchArchivedBooks = useCallback(async () => {
    try {
      setBooksLoading(true);
      setBooksError('');
      const response = await AxiosInstance.get('/books/?archived=true');
      setBooks(response.data || []);
    } catch {
      setBooksError('Failed to load archived books.');
    } finally {
      setBooksLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArchivedEntries();
    fetchArchivedBooks();
  }, [fetchArchivedEntries, fetchArchivedBooks]);

  // ── Action handlers ──────────────────────────────────────────────────────────

  const closeActionConfirm = useCallback(() => {
    if (isActioning) return;
    setActionConfirm({ open: false, action: null, type: null, id: null, label: '' });
  }, [isActioning]);

  const handleRequestAction = (action, type, id, label) => {
    setActionConfirm({ open: true, action, type, id, label });
  };

  const handleConfirmAction = async () => {
    const { action, type, id } = actionConfirm;
    try {
      setIsActioning(true);
      if (type === 'entry' && action === 'restore') {
        await AxiosInstance.post(`/entries/${id}/restore/`);
        setEntrySuccess('Entry restored successfully.');
      } else if (type === 'entry' && action === 'delete') {
        await AxiosInstance.delete(`/entries/${id}/?archived=true`);
        setEntrySuccess('Entry permanently deleted.');
      } else if (type === 'book' && action === 'restore') {
        await AxiosInstance.post(`/books/${id}/restore/`);
        setBookSuccess('Book and all its entries restored successfully.');
      } else {
        await AxiosInstance.delete(`/books/${id}/?archived=true`);
        setBookSuccess('Book permanently deleted.');
      }

      if (type === 'entry') {
        await fetchArchivedEntries();
      } else {
        await fetchArchivedBooks();
      }

      setActionConfirm({ open: false, action: null, type: null, id: null, label: '' });
    } catch {
      if (type === 'entry' && action === 'restore') {
        setEntriesError('Failed to restore entry.');
      } else if (type === 'entry' && action === 'delete') {
        setEntriesError('Failed to delete entry.');
      } else if (type === 'book' && action === 'restore') {
        setBooksError('Failed to restore book.');
      } else {
        setBooksError('Failed to delete book.');
      }
      setActionConfirm({ open: false, action: null, type: null, id: null, label: '' });
    } finally {
      setIsActioning(false);
    }
  };

  // ── Entry rows ───────────────────────────────────────────────────────────────

  const filteredEntries = useMemo(() => {
    const term = entrySearch.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter(
      (e) =>
        (e.title || '').toLowerCase().includes(term) ||
        String(e.entry_number).includes(term) ||
        (e.book_number || '').toLowerCase().includes(term),
    );
  }, [entries, entrySearch]);

  // ── Book rows ────────────────────────────────────────────────────────────────

  const filteredBooks = useMemo(() => {
    const term = bookSearch.trim().toLowerCase();
    if (!term) return books;
    return books.filter((b) => (b.book_number || '').toLowerCase().includes(term));
  }, [books, bookSearch]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <section className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Dashboard / Archive"
        title="Archive"
        subtitle="View and restore archived notarial entries and register books."
      />

      {/* Tab bar */}
      <div className="flex w-fit gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? BRAND.tabActive
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── ENTRIES TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'entries' && (
        <div className="flex flex-col gap-4">
          {entrySuccess && (
            <Alert variant="success" dismissible onDismiss={() => setEntrySuccess('')}>
              {entrySuccess}
            </Alert>
          )}
          {entriesError && (
            <Alert variant="error" dismissible onDismiss={() => setEntriesError('')}>
              {entriesError}
            </Alert>
          )}

          {/* Search */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <label className="flex-1 text-sm text-slate-700 dark:text-slate-200">
              <span>Quick Search</span>
              <Input
                className="mt-1"
                placeholder="Entry #, Title, or Book Number"
                value={entrySearch}
                onChange={(e) => setEntrySearch(e.target.value)}
              />
            </label>
            <div className="mt-5 text-xs text-slate-500 dark:text-slate-400">
              {filteredEntries.length} archived entr{filteredEntries.length !== 1 ? 'ies' : 'y'}
            </div>
          </div>

          {/* Desktop table */}
          <Card className="hidden md:block">
            <CardContent className="overflow-x-auto p-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>Page</TableHead>
                    <TableHead>Entry #</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Parties &amp; Addresses</TableHead>
                    <TableHead>Witnesses</TableHead>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Fees</TableHead>
                    <TableHead>OR #</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead>Archived At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entriesLoading ? (
                    <TableRow>
                      <TableCell className="py-8 text-center text-slate-500 dark:text-slate-400" colSpan={13}>
                        Loading archived entries...
                      </TableCell>
                    </TableRow>
                  ) : filteredEntries.length === 0 ? (
                    <TableRow>
                      <TableCell className="py-8 text-center text-slate-500 dark:text-slate-400" colSpan={13}>
                        No archived entries found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEntries.map((entry) => (
                      <TableRow
                        key={entry.id}
                        className="border-b border-slate-100 odd:bg-white even:bg-slate-50/40 hover:bg-amber-50/30 dark:border-slate-800 dark:odd:bg-slate-950 dark:even:bg-slate-900/50 dark:hover:bg-amber-950/20"
                      >
                        <TableCell>{entry.book_number || entry.book}</TableCell>
                        <TableCell>{entry.page?.page_number ?? '—'}</TableCell>
                        <TableCell>{entry.entry_number}</TableCell>
                        <TableCell className="min-w-48 font-medium text-slate-900 dark:text-white">
                          {entry.title || '—'}
                        </TableCell>
                        <TableCell className="min-w-56 max-w-56 whitespace-normal break-words text-sm">
                          {formatPeople(entry.parties)}
                        </TableCell>
                        <TableCell className="min-w-48 max-w-48 whitespace-normal break-words text-sm">
                          {formatPeople(entry.witnesses)}
                        </TableCell>
                        <TableCell className="min-w-40 text-sm">
                          {new Date(entry.date_time).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {notarialTypeLabel[entry.notarial_type] || entry.notarial_type}
                          </Badge>
                        </TableCell>
                        <TableCell>₱ {Number(entry.fees).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>{entry.or_number}</TableCell>
                        <TableCell>
                          <Badge variant={entry.remarks === 'CR' ? 'success' : 'default'}>
                            {remarksLabel[entry.remarks] || entry.remarks}
                          </Badge>
                        </TableCell>
                        <TableCell className="min-w-36 text-xs text-slate-500 dark:text-slate-400">
                          {entry.archived_at
                            ? new Date(entry.archived_at).toLocaleString()
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <BrandIconButton
                              title="Restore entry"
                              onClick={() =>
                                handleRequestAction(
                                  'restore',
                                  'entry',
                                  entry.id,
                                  `Entry #${entry.entry_number} — ${entry.title || 'Untitled'}`,
                                )
                              }
                            >
                              <RotateCcw className="h-4 w-4" />
                            </BrandIconButton>
                            <BrandIconButton
                              title="Delete entry permanently"
                              className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                              onClick={() =>
                                handleRequestAction(
                                  'delete',
                                  'entry',
                                  entry.id,
                                  `Entry #${entry.entry_number} — ${entry.title || 'Untitled'}`,
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </BrandIconButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {entriesLoading ? (
              <Card>
                <CardContent className="p-4 text-sm text-slate-500 dark:text-slate-400">Loading...</CardContent>
              </Card>
            ) : filteredEntries.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-sm text-slate-500 dark:text-slate-400">No archived entries found.</CardContent>
              </Card>
            ) : (
              filteredEntries.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Entry #{entry.entry_number}
                        </p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{entry.title || '—'}</p>
                      </div>
                      <Badge variant={entry.remarks === 'CR' ? 'success' : 'default'}>
                        {remarksLabel[entry.remarks] || entry.remarks}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-slate-600 dark:text-slate-400">
                      <p>
                        <span className="font-medium text-slate-700 dark:text-slate-300">Book:</span>{' '}
                        {entry.book_number || entry.book}
                      </p>
                      <p>
                        <span className="font-medium text-slate-700 dark:text-slate-300">Page:</span>{' '}
                        {entry.page?.page_number ?? '—'}
                      </p>
                      <p>
                        <span className="font-medium text-slate-700 dark:text-slate-300">Type:</span>{' '}
                        {notarialTypeLabel[entry.notarial_type] || entry.notarial_type}
                      </p>
                      <p>
                        <span className="font-medium text-slate-700 dark:text-slate-300">Fees:</span> ₱{' '}
                        {Number(entry.fees).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Parties:</span> {formatPeople(entry.parties)}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Witnesses:</span>{' '}
                      {formatPeople(entry.witnesses)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Archived: {entry.archived_at ? new Date(entry.archived_at).toLocaleString() : '—'}
                    </p>
                    <div className="flex justify-end pt-1">
                      <div className="flex gap-2">
                        <AppButton
                          variant="outline"
                          onClick={() =>
                            handleRequestAction(
                              'restore',
                              'entry',
                              entry.id,
                              `Entry #${entry.entry_number} — ${entry.title || 'Untitled'}`,
                            )
                          }
                        >
                          <RotateCcw className="mr-1 h-3.5 w-3.5" />
                          Restore
                        </AppButton>
                        <AppButton
                          variant="danger"
                          onClick={() =>
                            handleRequestAction(
                              'delete',
                              'entry',
                              entry.id,
                              `Entry #${entry.entry_number} — ${entry.title || 'Untitled'}`,
                            )
                          }
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          Delete
                        </AppButton>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── BOOKS TAB ───────────────────────────────────────────────────────── */}
      {activeTab === 'books' && (
        <div className="flex flex-col gap-4">
          {bookSuccess && (
            <Alert variant="success" dismissible onDismiss={() => setBookSuccess('')}>
              {bookSuccess}
            </Alert>
          )}
          {booksError && (
            <Alert variant="error" dismissible onDismiss={() => setBooksError('')}>
              {booksError}
            </Alert>
          )}

          {/* Search */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <label className="flex-1 text-sm text-slate-700 dark:text-slate-200">
              <span>Quick Search</span>
              <Input
                className="mt-1"
                placeholder="Book Number"
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
              />
            </label>
            <div className="mt-5 text-xs text-slate-500 dark:text-slate-400">
              {filteredBooks.length} archived book{filteredBooks.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Desktop table */}
          <Card className="hidden md:block">
            <CardContent className="overflow-x-auto p-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book Number</TableHead>
                    <TableHead>Total Pages</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Archived At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {booksLoading ? (
                    <TableRow>
                      <TableCell className="py-8 text-center text-slate-500 dark:text-slate-400" colSpan={5}>
                        Loading archived books...
                      </TableCell>
                    </TableRow>
                  ) : filteredBooks.length === 0 ? (
                    <TableRow>
                      <TableCell className="py-8 text-center text-slate-500 dark:text-slate-400" colSpan={5}>
                        No archived books found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBooks.map((book) => (
                      <TableRow
                        key={book.id}
                        className="border-b border-slate-100 odd:bg-white even:bg-slate-50/40 hover:bg-amber-50/30 dark:border-slate-800 dark:odd:bg-slate-950 dark:even:bg-slate-900/50 dark:hover:bg-amber-950/20"
                      >
                        <TableCell className="font-medium text-slate-900 dark:text-white">
                          {book.book_number}
                        </TableCell>
                        <TableCell>{book.total_pages}</TableCell>
                        <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                          {book.created_at ? new Date(book.created_at).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                          {book.archived_at ? new Date(book.archived_at).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <BrandIconButton
                              title="Restore book and all its entries"
                              onClick={() =>
                                handleRequestAction(
                                  'restore',
                                  'book',
                                  book.id,
                                  `Book ${book.book_number}`,
                                )
                              }
                            >
                              <RotateCcw className="h-4 w-4" />
                            </BrandIconButton>
                            <BrandIconButton
                              title="Delete book permanently"
                              className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                              onClick={() =>
                                handleRequestAction(
                                  'delete',
                                  'book',
                                  book.id,
                                  `Book ${book.book_number}`,
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </BrandIconButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {booksLoading ? (
              <Card>
                <CardContent className="p-4 text-sm text-slate-500 dark:text-slate-400">Loading...</CardContent>
              </Card>
            ) : filteredBooks.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-sm text-slate-500 dark:text-slate-400">No archived books found.</CardContent>
              </Card>
            ) : (
              filteredBooks.map((book) => (
                <Card key={book.id}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Register Book</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{book.book_number}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-slate-600 dark:text-slate-400">
                      <p><span className="font-medium text-slate-700 dark:text-slate-300">Total Pages:</span> {book.total_pages}</p>
                      <p><span className="font-medium text-slate-700 dark:text-slate-300">Created:</span> {book.created_at ? new Date(book.created_at).toLocaleDateString() : '—'}</p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Archived: {book.archived_at ? new Date(book.archived_at).toLocaleString() : '—'}
                    </p>
                    <p className="text-xs text-amber-600">
                      ⚠ Restoring this book will also restore all its entries.
                    </p>
                    <div className="flex justify-end pt-1">
                      <div className="flex gap-2">
                        <AppButton
                          variant="outline"
                          onClick={() =>
                            handleRequestAction('restore', 'book', book.id, `Book ${book.book_number}`)
                          }
                        >
                          <RotateCcw className="mr-1 h-3.5 w-3.5" />
                          Restore
                        </AppButton>
                        <AppButton
                          variant="danger"
                          onClick={() =>
                            handleRequestAction('delete', 'book', book.id, `Book ${book.book_number}`)
                          }
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          Delete
                        </AppButton>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Action confirmation dialog */}
      <AlertDialog
        isOpen={actionConfirm.open}
        title={`${actionConfirm.action === 'delete' ? 'Delete' : 'Restore'} ${actionConfirm.type === 'book' ? 'Register Book' : 'Entry'}?`}
        description={
          actionConfirm.action === 'delete'
            ? actionConfirm.type === 'book'
              ? `"${actionConfirm.label}" and all its entries will be permanently deleted. This action cannot be undone.`
              : `"${actionConfirm.label}" will be permanently deleted. This action cannot be undone.`
            : actionConfirm.type === 'book'
              ? `"${actionConfirm.label}" and all its entries will be moved back to active records.`
              : `"${actionConfirm.label}" will be moved back to active records.`
        }
        variant={actionConfirm.action === 'delete' ? 'danger' : 'info'}
        confirmLabel={actionConfirm.action === 'delete' ? 'Delete permanently' : 'Restore'}
        loading={isActioning}
        onConfirm={handleConfirmAction}
        onCancel={closeActionConfirm}
      />
    </section>
  );
}
