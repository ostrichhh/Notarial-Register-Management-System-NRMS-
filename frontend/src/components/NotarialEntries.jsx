import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Archive, Edit } from 'lucide-react';
import AxiosInstance from './Axios';
import AppButton from './ui/AppButton';
import Badge from './ui/Badge';
import { Card, CardContent } from './ui/Card';
import FilterSelect from './ui/FilterSelect';
import Input from './ui/Input';
import PageHeader from './ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import AddEntryModal from './modal/AddEntryModal';

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
  if (!Array.isArray(people) || people.length === 0) {
    return 'N/A';
  }

  return people
    .map((person) => `${person.name}${person.address ? ` (${person.address})` : ''}`)
    .join(', ');
};

export default function NotarialEntries() {
  const [searchParams] = useSearchParams();
  const selectedBookId = searchParams.get('bookId');
  const selectedBookNumber = searchParams.get('bookNumber');

  const [activeEntries, setActiveEntries] = useState([]);
  const [archivedEntries, setArchivedEntries] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active_book');
  const [pageSize, setPageSize] = useState(5);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);
  const [entrySubmitError, setEntrySubmitError] = useState('');
  const [page, setPage] = useState(1);

  const pageSizeOptions = statusFilter === 'active_book' ? [5, 525] : [5, 105, 525];

  const fetchEntriesData = async () => {
    try {
      setLoading(true);
      setError('');
      const [activeEntriesResponse, archivedEntriesResponse, booksResponse] = await Promise.all([
        AxiosInstance.get('/entries/'),
        AxiosInstance.get('/entries/?archived=true'),
        AxiosInstance.get('/books/'),
      ]);
      setActiveEntries(activeEntriesResponse.data || []);
      setArchivedEntries(archivedEntriesResponse.data || []);
      setBooks(booksResponse.data || []);
    } catch {
      setError('Unable to load entries. Please check your backend service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const [activeEntriesResponse, archivedEntriesResponse, booksResponse] = await Promise.all([
          AxiosInstance.get('/entries/'),
          AxiosInstance.get('/entries/?archived=true'),
          AxiosInstance.get('/books/'),
        ]);

        if (!isMounted) {
          return;
        }

        setActiveEntries(activeEntriesResponse.data || []);
        setArchivedEntries(archivedEntriesResponse.data || []);
        setBooks(booksResponse.data || []);
      } catch {
        if (isMounted) {
          setError('Unable to load entries. Please check your backend service.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleArchiveEntry = async (entryId) => {
    try {
      await AxiosInstance.post(`/entries/${entryId}/archive/`);
      await fetchEntriesData();
    } catch (requestError) {
      const apiMessage =
        requestError?.response?.data?.detail ||
        requestError?.response?.data?.message ||
        'Failed to archive entry.';
      setError(apiMessage);
    }
  };

  const handleCreateEntry = async (payload) => {
    try {
      setIsSubmittingEntry(true);
      setEntrySubmitError('');
      await AxiosInstance.post('/entries/', payload);
      setIsAddModalOpen(false);
      await fetchEntriesData();
      return true;
    } catch (requestError) {
      const responseData = requestError?.response?.data;
      const apiMessage =
        typeof responseData === 'string'
          ? responseData
          : responseData?.non_field_errors?.[0] ||
            responseData?.detail ||
            Object.values(responseData || {})?.[0]?.[0] ||
            'Unable to create entry.';
      setEntrySubmitError(apiMessage);
      return false;
    } finally {
      setIsSubmittingEntry(false);
    }
  };

  const bookNumberById = useMemo(() => {
    return books.reduce((accumulator, book) => {
      accumulator[book.id] = book.book_number;
      return accumulator;
    }, {});
  }, [books]);

  const scopedEntries = useMemo(() => {
    const records = statusFilter === 'all_records' ? [...activeEntries, ...archivedEntries] : activeEntries;
    if (selectedBookId) {
      return records.filter((entry) => String(entry.book) === String(selectedBookId));
    }
    return records;
  }, [statusFilter, activeEntries, archivedEntries, selectedBookId]);

  const filteredEntries = useMemo(() => {
    return scopedEntries.filter((entry) => {
      const matchesType = typeFilter === 'all' ? true : entry.notarial_type === typeFilter;
      const normalizedTitle = (entry.title || '').toLowerCase();
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const matchesSearch =
        normalizedSearch.length === 0 ||
        normalizedTitle.includes(normalizedSearch) ||
        String(entry.entry_number).includes(normalizedSearch);

      return matchesType && matchesSearch;
    });
  }, [scopedEntries, typeFilter, searchTerm]);

  const rows = useMemo(() => {
    return filteredEntries.map((entry) => ({
      id: entry.id,
      entry_number: entry.entry_number,
      title: entry.title || '-',
      date_time: new Date(entry.date_time).toLocaleString(),
      book_number: bookNumberById[entry.book] || entry.book,
      page_number: entry.page?.page_number || '-',
      notarial_type: notarialTypeLabel[entry.notarial_type] || entry.notarial_type,
      fees: Number(entry.fees).toLocaleString(undefined, { minimumFractionDigits: 2 }),
      or_number: entry.or_number,
      remarks: remarksLabel[entry.remarks] || entry.remarks,
      parties: formatPeople(entry.parties),
      witnesses: formatPeople(entry.witnesses),
      sourceId: entry.id,
    }));
  }, [filteredEntries, bookNumberById]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  const viewingLabel = useMemo(() => {
    if (statusFilter === 'active_book') {
      if (selectedBookId) {
        return `Showing Book ${selectedBookNumber || selectedBookId}`;
      }
      return 'Showing Active Book';
    }
    if (selectedBookId) {
      return `Viewing All Records for Book ${selectedBookNumber || selectedBookId}`;
    }
    return 'Viewing All Books';
  }, [statusFilter, selectedBookId, selectedBookNumber]);

  const handleStatusChange = (event) => {
    const nextStatus = event.target.value;
    const nextOptions = nextStatus === 'active_book' ? [5, 525] : [5, 105, 525];
    setStatusFilter(nextStatus);
    setPage(1);
    setPageSize((previous) => (nextOptions.includes(previous) ? previous : nextOptions[0]));
  };

  return (
    <section className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Dashboard / Notarial Entries"
        title="Manage Notarial Entries"
        subtitle="Review, manage, and audit all official notarized records within the system."
        actions={
          <>
            <AppButton variant="outline">Export Register</AppButton>
            <AppButton variant="danger" onClick={() => setIsAddModalOpen(true)}>
              + New Entry
            </AppButton>
          </>
        }
      />

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-1 gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-4">
        <FilterSelect
          label="Act Type"
          value={typeFilter}
          onChange={(event) => {
            setTypeFilter(event.target.value);
            setPage(1);
          }}
          options={[
            { value: 'all', label: 'All Types' },
            { value: 'ACK', label: 'Acknowledgement' },
            { value: 'SUB', label: 'Subscription' },
            { value: 'CERT', label: 'Certification' },
          ]}
        />
        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={handleStatusChange}
          options={[
            { value: 'active_book', label: 'Active Book' },
            { value: 'all_records', label: 'All Records' },
          ]}
        />
        <FilterSelect
          label="Rows Per Page"
          value={String(pageSize)}
          onChange={(event) => {
            setPageSize(Number(event.target.value));
            setPage(1);
          }}
          options={pageSizeOptions.map((value) => ({
            value: String(value),
            label: String(value),
          }))}
        />
        <label className="space-y-1 text-sm text-slate-700">
          <span>Quick Search</span>
          <Input
            placeholder="Entry # or Title"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>

      <div className="flex items-center">
        <Badge variant="outline">{viewingLabel}</Badge>
      </div>

      <Card className="hidden md:block">
        <CardContent className="overflow-x-auto p-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entry #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Book</TableHead>
                <TableHead>Page</TableHead>
                <TableHead>Notarial Type</TableHead>
                <TableHead>Date/Time</TableHead>
                <TableHead>Fees</TableHead>
                <TableHead>OR #</TableHead>
                <TableHead>Parties & Addresses</TableHead>
                <TableHead>Witnesses</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell className="py-8 text-center text-slate-500" colSpan={12}>
                    Loading entries...
                  </TableCell>
                </TableRow>
              ) : paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell className="py-8 text-center text-slate-500" colSpan={12}>
                    No entries found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row) => (
                  <TableRow key={row.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50/40 hover:bg-blue-50/40">
                    <TableCell>{row.entry_number}</TableCell>
                    <TableCell className="min-w-48 font-medium text-slate-900">{row.title}</TableCell>
                    <TableCell>{row.book_number}</TableCell>
                    <TableCell>{row.page_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.notarial_type}</Badge>
                    </TableCell>
                    <TableCell className="min-w-40">{row.date_time}</TableCell>
                    <TableCell>P {row.fees}</TableCell>
                    <TableCell>{row.or_number}</TableCell>
                    <TableCell className="min-w-64 max-w-64 whitespace-normal break-words">{row.parties}</TableCell>
                    <TableCell className="min-w-56 max-w-56 whitespace-normal break-words">{row.witnesses}</TableCell>
                    <TableCell>
                      <Badge variant={row.remarks === 'Copy Retained' ? 'success' : 'default'}>{row.remarks}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          onClick={() => setError('Edit flow will be added next.')}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                          onClick={() => handleArchiveEntry(row.sourceId)}
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:hidden">
        {loading ? (
          <Card>
            <CardContent className="p-4 text-sm text-slate-500">Loading entries...</CardContent>
          </Card>
        ) : paginatedRows.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-slate-500">No entries found.</CardContent>
          </Card>
        ) : (
          paginatedRows.map((row) => (
            <Card key={row.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Entry #{row.entry_number}</p>
                    <p className="text-sm font-semibold text-slate-900">{row.title}</p>
                  </div>
                  <Badge variant={row.remarks === 'Copy Retained' ? 'success' : 'default'}>{row.remarks}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <p>
                    <span className="font-medium text-slate-700">Book:</span> {row.book_number}
                  </p>
                  <p>
                    <span className="font-medium text-slate-700">Page:</span> {row.page_number}
                  </p>
                  <p>
                    <span className="font-medium text-slate-700">Type:</span> {row.notarial_type}
                  </p>
                  <p>
                    <span className="font-medium text-slate-700">Fees:</span> P {row.fees}
                  </p>
                </div>

                <p className="text-xs text-slate-600">
                  <span className="font-medium text-slate-700">Date/Time:</span> {row.date_time}
                </p>
                <p className="text-xs text-slate-600">
                  <span className="font-medium text-slate-700">OR #:</span> {row.or_number}
                </p>
                <p className="text-xs text-slate-600">
                  <span className="font-medium text-slate-700">Parties:</span> {row.parties}
                </p>
                <p className="text-xs text-slate-600">
                  <span className="font-medium text-slate-700">Witnesses:</span> {row.witnesses}
                </p>

                <div className="flex items-center justify-end gap-1 pt-1">
                  <button
                    type="button"
                    className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    onClick={() => setError('Edit flow will be added next.')}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-md p-1.5 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                    onClick={() => handleArchiveEntry(row.sourceId)}
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <span>
          {rows.length === 0
            ? 'Showing 0 entries'
            : `Showing ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, rows.length)} of ${rows.length} entries`}
        </span>
        <div className="flex items-center gap-2">
          <AppButton variant="outline" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={currentPage <= 1}>
            Previous
          </AppButton>
          <span>
            Page {currentPage} / {totalPages}
          </span>
          <AppButton
            variant="outline"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage >= totalPages}
          >
            Next
          </AppButton>
        </div>
      </div>

      {isAddModalOpen ? (
        <AddEntryModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleCreateEntry}
          books={books}
          defaultBookId={selectedBookId}
          submitting={isSubmittingEntry}
          errorMessage={entrySubmitError}
        />
      ) : null}
    </section>
  );
}
