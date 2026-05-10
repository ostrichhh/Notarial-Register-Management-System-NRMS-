import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Archive, Download, Edit } from 'lucide-react';
import AxiosInstance from './Axios';
import Alert from './ui/Alert';
import AlertDialog from './ui/AlertDialog';
import AppButton from './ui/AppButton';
import Badge from './ui/Badge';
import { Card, CardContent } from './ui/Card';
import FilterSelect from './ui/FilterSelect';
import Input from './ui/Input';
import PageHeader from './ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import { BRAND } from '../lib/brandClasses';
import { formatPartyIdsOnly } from '../lib/entryFormData';
import AddEntryModal from './modal/AddEntryModal';
import EditEntryModal from './modal/EditEntryModal';

const notarialTypeLabel = {
  ACK: 'Acknowledgement',
  SUB: 'Subscription',
  CERT: 'Certification',
};

const remarksLabel = {
  CR: 'Copy Retained',
  NCR: 'No Copy Retained',
};

const REPORT_NOTARY = {
  name: 'ATTY. SHERICK JOSHUA BACANI',
  office: 'BALAOAN, LA UNION',
  country: 'PHILIPPINES',
};

const toDateInputValue = (dateValue) => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatReportDate = (dateValue) => {
  if (!dateValue) return '';
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatReportDateTime = (dateValue) => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatCurrency = (value) => {
  const number = Number(value);
  if (Number.isNaN(number)) return '';
  return `PHP ${number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatPeople = (people = []) => {
  if (!Array.isArray(people) || people.length === 0) {
    return 'N/A';
  }

  return people
    .map((person) => `${person.name}${person.address ? ` (${person.address})` : ''}`)
    .join(', ');
};

const buildReportRow = (entry, fallbackEntryNumber) => {
  if (!entry) {
    return `
      <tr>
        <td class="entry-no">${fallbackEntryNumber}</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    `;
  }

  return `
    <tr>
      <td class="entry-no">${escapeHtml(entry.entry_number || fallbackEntryNumber)}</td>
      <td>${escapeHtml(entry.title)}</td>
      <td>${escapeHtml(formatPeople(entry.parties))}</td>
      <td>${escapeHtml(formatPeople(entry.witnesses))}</td>
      <td>${escapeHtml(formatPartyIdsOnly(entry.parties))}</td>
      <td>${escapeHtml(formatReportDateTime(entry.date_time))}</td>
      <td>${escapeHtml(notarialTypeLabel[entry.notarial_type] || entry.notarial_type)}</td>
      <td>${escapeHtml(`${formatCurrency(entry.fees)}${entry.or_number ? ` / OR ${entry.or_number}` : ''}`)}</td>
      <td>${escapeHtml(remarksLabel[entry.remarks] || entry.remarks)}</td>
    </tr>
  `;
};

const resolveReportYear = (book, entries = []) => {
  if (book?.appointment_date) {
    const date = new Date(`${book.appointment_date}T00:00:00`);
    if (!Number.isNaN(date.getTime())) return date.getFullYear();
  }

  const entryWithDate = entries.find((entry) => entry.date_time);
  if (entryWithDate) {
    const date = new Date(entryWithDate.date_time);
    if (!Number.isNaN(date.getTime())) return date.getFullYear();
  }

  return new Date().getFullYear();
};

const buildReportPage = ({ book, entriesByNumber, pageNumber, reportPageNumber, totalReportPages, year }) => {
  const reportYear = year || (book?.appointment_date
    ? new Date(`${book.appointment_date}T00:00:00`).getFullYear()
    : new Date().getFullYear());
  const appointmentDate = formatReportDate(book?.appointment_date);
  const expirationDate = formatReportDate(book?.expiration_date);
  const firstEntryNumber = (pageNumber - 1) * 5 + 1;
  const rows = Array.from({ length: 5 }, (_, index) => {
    const entryNumber = firstEntryNumber + index;
    return buildReportRow(entriesByNumber.get(entryNumber), entryNumber);
  }).join('');

  return `
    <section class="report-page">
      <header>
        <p class="form-title">JUDICIAL FORM 143. AS AMENDED</p>
        <div class="page-book-line">
          <span>Page No. <strong>${escapeHtml(pageNumber)}</strong></span>
          <span>Book No. <strong>${escapeHtml(book?.book_number || '')}</strong></span>
        </div>
        <p class="register-line">
          NOTARIAL REGISTER OF <strong><u>${escapeHtml(REPORT_NOTARY.name)}</u></strong>
          OF <strong><u>${escapeHtml(REPORT_NOTARY.office)}</u></strong>, ${escapeHtml(REPORT_NOTARY.country)}
          FOR THE YEAR <strong><u>${escapeHtml(reportYear)}</u></strong>
        </p>
        <p class="appointment-line">
          Under appointment made on <u>${escapeHtml(appointmentDate || '________________')}</u>
          and expiring <u>${escapeHtml(expirationDate || '________________')}</u>
        </p>
      </header>

      <table class="register-table">
        <thead>
          <tr>
            <th>ENTRY<br />NUMBER</th>
            <th>TITLE DESCRIPTION OF<br />INSTRUMENT</th>
            <th>NAMES &amp; ADDRESSES OF<br />PARTIES</th>
            <th>NAMES &amp; ADDRESSES<br />OF WITNESSES</th>
            <th>COMPETENT<br />EVIDENCE OF<br />IDENTITY</th>
            <th>DATE &amp;<br />TIME OF<br />NOTARIZATION</th>
            <th>TYPE OF<br />NOTARIAL<br />ACT</th>
            <th>FEES &amp; O.R. NO.</th>
            <th>OTHER PLACE OF<br />NOTARIZATION OTHER<br />THAN OFFICE OF<br />NOTARY PUBLIC AND/OR<br />REMARKS</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <p class="certification">
        I HEREBY CERTIFY that during the week beginning ______ and ending ______ instruments were sworn to,
        executed, and/or acknowledged before me.
      </p>

      <div class="signature">
        <p><strong><u>${escapeHtml(REPORT_NOTARY.name)}</u></strong></p>
        <p>Notary Public</p>
      </div>

      <footer>${escapeHtml(reportPageNumber)}${totalReportPages ? ` / ${escapeHtml(totalReportPages)}` : ''}</footer>
    </section>
  `;
};

const buildReportHtml = ({ title, book, entries, pageNumbers }) => {
  const entriesByNumber = new Map(
    entries.map((entry) => [Number(entry.entry_number), entry])
  );
  const year = resolveReportYear(book, entries);

  const pages = pageNumbers
    .map((pageNumber, index) =>
      buildReportPage({
        book,
        entriesByNumber,
        pageNumber,
        reportPageNumber: index + 1,
        totalReportPages: pageNumbers.length,
        year,
      })
    )
    .join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: legal landscape; margin: 0.35in; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #000; background: #fff; font-family: "Times New Roman", Times, serif; }
    .report-page { position: relative; min-height: 7.8in; padding: 0.35in 0.15in 0.2in; page-break-after: always; }
    .report-page:last-child { page-break-after: auto; }
    .form-title { margin: 0 0 0.34in; text-align: center; font: 700 12px Arial, sans-serif; }
    .page-book-line { display: flex; justify-content: flex-end; gap: 14px; margin-bottom: 4px; font: 12px Arial, sans-serif; }
    .register-line, .appointment-line { margin: 0; font: 12px Arial, sans-serif; }
    .appointment-line { margin-bottom: 16px; }
    .register-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px; line-height: 1.05; }
    .register-table th, .register-table td { border: 1px solid #000; vertical-align: top; text-align: center; padding: 2px 3px; white-space: pre-line; word-break: break-word; }
    .register-table th { height: 62px; font-weight: 700; }
    .register-table td { height: 34px; }
    .register-table th:nth-child(1), .register-table td:nth-child(1) { width: 4.1%; }
    .register-table th:nth-child(2), .register-table td:nth-child(2) { width: 17.5%; }
    .register-table th:nth-child(3), .register-table td:nth-child(3) { width: 17%; }
    .register-table th:nth-child(4), .register-table td:nth-child(4) { width: 12.3%; }
    .register-table th:nth-child(5), .register-table td:nth-child(5) { width: 12.8%; }
    .register-table th:nth-child(6), .register-table td:nth-child(6) { width: 6.9%; }
    .register-table th:nth-child(7), .register-table td:nth-child(7) { width: 9.1%; }
    .register-table th:nth-child(8), .register-table td:nth-child(8) { width: 8.2%; }
    .register-table th:nth-child(9), .register-table td:nth-child(9) { width: 11.8%; }
    .entry-no { text-align: center; }
    .certification { margin: 16px 0 0 0.72in; font-size: 13px; }
    .signature { margin-top: 24px; margin-right: 0.75in; text-align: right; font-size: 12px; }
    .signature p { margin: 0; }
    footer { position: absolute; right: 0.35in; bottom: 0.1in; font-size: 14px; color: #666; }
  </style>
</head>
<body>${pages}</body>
</html>`;
};

export default function NotarialEntries() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedBookId = searchParams.get('bookId');
  const selectedBookNumber = searchParams.get('bookNumber');

  const [entries, setEntries] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [remarksFilter, setRemarksFilter] = useState('all');
  const [pageSearch, setPageSearch] = useState('');
  const [pageNumberFilter, setPageNumberFilter] = useState('all');
  const [notarizationDate, setNotarizationDate] = useState('');
  const [pageSize, setPageSize] = useState(5);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);
  const [entrySubmitError, setEntrySubmitError] = useState('');
  const [page, setPage] = useState(1);

  const [editingEntry, setEditingEntry] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdatingEntry, setIsUpdatingEntry] = useState(false);
  const [editSubmitError, setEditSubmitError] = useState('');

  const [successMessage, setSuccessMessage] = useState('');
  const [archiveConfirm, setArchiveConfirm] = useState({ open: false, entryId: null });
  const [isArchiving, setIsArchiving] = useState(false);

  const pageSizeOptions = [5, 105, 525];

  const viewingBook = useMemo(() => {
    if (!selectedBookId) return null;
    return books.find((b) => String(b.id) === String(selectedBookId)) || null;
  }, [books, selectedBookId]);

  useEffect(() => {
    setPageSearch('');
    setPageNumberFilter('all');
  }, [selectedBookId]);

  const openPrintableReport = useCallback((filename, html) => {
    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
      reportWindow.document.open();
      reportWindow.document.write(html);
      reportWindow.document.close();
      reportWindow.focus();
      reportWindow.setTimeout(() => reportWindow.print(), 250);
      return;
    }

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  const fetchEntriesData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      if (!selectedBookId) {
        // No book selected; defer to initial loader to pick active book.
        setEntries([]);
        return;
      }
      const [entriesResponse, booksResponse] = await Promise.all([
        AxiosInstance.get(`/entries/?book=${encodeURIComponent(selectedBookId)}`),
        AxiosInstance.get('/books/'),
      ]);
      setEntries(entriesResponse.data || []);
      setBooks(booksResponse.data || []);
    } catch {
      setError('Unable to load entries. Please check your backend service.');
    } finally {
      setLoading(false);
    }
  }, [selectedBookId]);

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const [booksResponse, liteEntriesResponse] = await Promise.all([
          AxiosInstance.get('/books/'),
          AxiosInstance.get('/entries/?lite=true'),
        ]);

        if (!isMounted) {
          return;
        }

        setBooks(booksResponse.data || []);
        const lite = Array.isArray(liteEntriesResponse.data) ? liteEntriesResponse.data : [];

        // If opened directly from sidebar, default to ACTIVE book + ACTIVE page.
        if (!selectedBookId) {
          const counts = lite.reduce((acc, e) => {
            const bid = e.book;
            acc[bid] = (acc[bid] || 0) + 1;
            return acc;
          }, {});
          const sorted = [...(booksResponse.data || [])].sort((a, b) => {
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            if (aTime !== bTime) return bTime - aTime;
            return b.id - a.id;
          });
          const active = sorted.find((b) => (counts[b.id] || 0) < 525) || sorted[0];
          if (active) {
            setSearchParams(
              { bookId: String(active.id), bookNumber: active.book_number },
              { replace: true }
            );
            return;
          }
        }

        // Book already chosen → load only that book's entries (active records).
        const entriesResponse = await AxiosInstance.get(`/entries/?book=${encodeURIComponent(selectedBookId)}`);
        if (!isMounted) return;
        setEntries(entriesResponse.data || []);
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
  }, [selectedBookId, setSearchParams]);

  const handleRequestArchive = (entryId) => {
    setArchiveConfirm({ open: true, entryId });
  };

  const handleConfirmArchive = async () => {
    const { entryId } = archiveConfirm;
    try {
      setIsArchiving(true);
      await AxiosInstance.post(`/entries/${entryId}/archive/`);
      setArchiveConfirm({ open: false, entryId: null });
      setSuccessMessage('Entry archived successfully.');
      await fetchEntriesData();
    } catch (requestError) {
      const apiMessage =
        requestError?.response?.data?.detail ||
        requestError?.response?.data?.message ||
        'Failed to archive entry.';
      setError(apiMessage);
      setArchiveConfirm({ open: false, entryId: null });
    } finally {
      setIsArchiving(false);
    }
  };

  const handleCreateEntry = async (payload) => {
    try {
      setIsSubmittingEntry(true);
      setEntrySubmitError('');
      await AxiosInstance.post('/entries/', payload);
      setIsAddModalOpen(false);
      setSuccessMessage('Entry created successfully.');
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

  const handleEditEntry = (entryId) => {
    const found = entries.find((e) => e.id === entryId);
    if (found) {
      setEditingEntry(found);
      setEditSubmitError('');
      setIsEditModalOpen(true);
    }
  };

  const handleUpdateEntry = async (entryId, payload) => {
    try {
      setIsUpdatingEntry(true);
      setEditSubmitError('');
      await AxiosInstance.put(`/entries/${entryId}/`, payload);
      setIsEditModalOpen(false);
      setEditingEntry(null);
      setSuccessMessage('Entry updated successfully.');
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
            'Unable to update entry.';
      setEditSubmitError(apiMessage);
      return false;
    } finally {
      setIsUpdatingEntry(false);
    }
  };

  const pageOptions = useMemo(() => {
    const pages = new Set();
    for (const entry of entries) {
      const pageNumber = entry.page?.page_number;
      if (pageNumber !== undefined && pageNumber !== null && pageNumber !== '') {
        pages.add(String(pageNumber));
      }
    }

    return [...pages]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      .map((pageNumber) => ({
        value: pageNumber,
        label: `Page ${pageNumber}`,
      }));
  }, [entries]);

  const selectPageByNumber = useCallback((value) => {
    const normalized = String(value || '').trim();
    const pageNumber = normalized.replace(/^page\s+/i, '');

    setPageSearch(normalized);
    setPageNumberFilter(pageNumber ? pageNumber : 'all');
    setPage(1);
  }, []);

  const filteredEntries = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return entries
      .filter((entry) => String(entry.book) === String(selectedBookId))
      .sort((a, b) => a.entry_number - b.entry_number)
      .filter((entry) => {
        const matchesType = typeFilter === 'all' ? true : entry.notarial_type === typeFilter;
        const matchesRemarks = remarksFilter === 'all' ? true : entry.remarks === remarksFilter;
        const matchesPage =
          pageNumberFilter === 'all'
            ? true
            : String(entry.page?.page_number || '') === String(pageNumberFilter);
        const matchesDate =
          !notarizationDate || toDateInputValue(entry.date_time) === notarizationDate;

        const title = (entry.title || '').toLowerCase();
        const parties = Array.isArray(entry.parties) ? entry.parties.map((p) => p?.name || '').join(' ').toLowerCase() : '';
        const witnesses = Array.isArray(entry.witnesses) ? entry.witnesses.map((w) => w?.name || '').join(' ').toLowerCase() : '';
        const orNumber = String(entry.or_number || '').toLowerCase();
        const entryNo = String(entry.entry_number || '');

        const matchesSearch =
          normalizedSearch.length === 0 ||
          title.includes(normalizedSearch) ||
          entryNo.includes(normalizedSearch) ||
          parties.includes(normalizedSearch) ||
          witnesses.includes(normalizedSearch) ||
          orNumber.includes(normalizedSearch);

        return matchesType && matchesRemarks && matchesPage && matchesDate && matchesSearch;
      });
  }, [entries, selectedBookId, typeFilter, remarksFilter, pageNumberFilter, notarizationDate, searchTerm]);

  const rows = useMemo(() => {
    return filteredEntries.map((entry) => {
      return {
        id: entry.id,
        entry_number: entry.entry_number,
        book_number: entry.book_number || entry.book,
        page_number: entry.page?.page_number || '—',
        title: entry.title || '—',
        date_time: new Date(entry.date_time).toLocaleString(),
        notarial_type: notarialTypeLabel[entry.notarial_type] || entry.notarial_type,
        fees: Number(entry.fees).toLocaleString(undefined, { minimumFractionDigits: 2 }),
        or_number: entry.or_number,
        remarks: remarksLabel[entry.remarks] || entry.remarks,
        parties: formatPeople(entry.parties),
        witnesses: formatPeople(entry.witnesses),
        party_ids: formatPartyIdsOnly(entry.parties),
        sourceId: entry.id,
        bookId: entry.book,
      };
    });
  }, [filteredEntries]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  const viewingLabel = useMemo(() => {
    if (viewingBook) return `Viewing Book ${viewingBook.book_number}`;
    if (selectedBookId) return `Viewing Book ${selectedBookNumber || selectedBookId}`;
    return 'Pick a book to view entries';
  }, [viewingBook, selectedBookId, selectedBookNumber]);

  useEffect(() => {
    if (!selectedBookId) return;
    if (!Array.isArray(entries) || entries.length === 0) return;
    if (pageSize !== 5) return;
    const maxEntry = Math.max(...entries.map((e) => Number(e.entry_number) || 1));
    const activePage = Math.max(1, Math.ceil(maxEntry / 5));
    setPage((prev) => (prev === 1 ? activePage : prev));
  }, [entries, pageSize, selectedBookId]);

  function exportPage() {
    if (!viewingBook) return;
    const pageNumber =
      pageNumberFilter !== 'all'
        ? Number(pageNumberFilter)
        : currentPage;
    const html = buildReportHtml({
      title: `Book ${viewingBook.book_number} - Page ${pageNumber}`,
      book: viewingBook,
      entries,
      pageNumbers: [pageNumber],
    });

    openPrintableReport(
      `nrms-book-${viewingBook.book_number}-page-${pageNumber}.html`,
      html
    );
  }

  function exportBook() {
    if (!viewingBook) return;
    const totalBookPages =
      Number(viewingBook.total_pages) ||
      Math.max(1, ...entries.map((entry) => Number(entry.page?.page_number) || 1));
    const pageNumbers = Array.from({ length: totalBookPages }, (_, index) => index + 1);
    const html = buildReportHtml({
      title: `Book ${viewingBook.book_number} - Complete Register`,
      book: viewingBook,
      entries,
      pageNumbers,
    });

    openPrintableReport(
      `nrms-book-${viewingBook.book_number}-complete-register.html`,
      html
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Dashboard / Notarial Entries"
        title="Manage Notarial Entries"
        subtitle="Review, manage, and audit all official notarized records within the system."
        actions={
          <>
            <AppButton variant="outline" onClick={exportPage} disabled={!viewingBook || loading}>
              <Download className="mr-1 h-4 w-4" />
              Export Page
            </AppButton>
            <AppButton variant="outline" onClick={exportBook} disabled={!viewingBook || loading}>
              <Download className="mr-1 h-4 w-4" />
              Export Book
            </AppButton>
            <AppButton variant="danger" onClick={() => setIsAddModalOpen(true)} disabled={!viewingBook}>
              + New Entry
            </AppButton>
          </>
        }
      />

      {successMessage && (
        <Alert variant="success" dismissible onDismiss={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:grid-cols-6">
        <label className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
          <span>Page</span>
          <Input
            list="nrms-page-options"
            placeholder="Search page..."
            value={pageSearch}
            onChange={(event) => {
              setPageSearch(event.target.value);
              if (!event.target.value.trim()) {
                setPageNumberFilter('all');
                setPage(1);
              }
            }}
            onBlur={(event) => selectPageByNumber(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                selectPageByNumber(event.currentTarget.value);
              }
            }}
          />
          <datalist id="nrms-page-options">
            {pageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </datalist>
        </label>
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
          label="Remarks"
          value={remarksFilter}
          onChange={(event) => {
            setRemarksFilter(event.target.value);
            setPage(1);
          }}
          options={[
            { value: 'all', label: 'All Remarks' },
            { value: 'CR', label: 'Copy Retained' },
            { value: 'NCR', label: 'No Copy Retained' },
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
        <label className="space-y-1 text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
          <span>Quick Search</span>
          <Input
            placeholder="Entry #, title, parties, witnesses, OR #"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
          <span>Date of Notarization</span>
          <Input
            type="date"
            value={notarizationDate}
            onChange={(event) => {
              setNotarizationDate(event.target.value);
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
                <TableHead>Book</TableHead>
                <TableHead>Page</TableHead>
                <TableHead>Entry #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Parties & Addresses</TableHead>
                <TableHead>Witnesses</TableHead>
                <TableHead>Party IDs</TableHead>
                <TableHead>Date/Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Fees</TableHead>
                <TableHead>OR #</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell className="py-8 text-center text-slate-500 dark:text-slate-400" colSpan={13}>
                    Loading entries...
                  </TableCell>
                </TableRow>
              ) : paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell className="py-8 text-center text-slate-500 dark:text-slate-400" colSpan={13}>
                    No entries found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={`border-b border-slate-100 dark:border-slate-800 odd:bg-white even:bg-slate-50/40 dark:odd:bg-slate-950 dark:even:bg-slate-900/40 ${BRAND.rowHoverTint}`}
                  >
                    <TableCell>{row.book_number}</TableCell>
                    <TableCell>{row.page_number}</TableCell>
                    <TableCell className="font-semibold text-red-700 dark:text-red-400">
                      {row.entry_number}
                    </TableCell>
                    <TableCell className="min-w-48 font-medium text-slate-900 dark:text-white">
                      {row.title}
                    </TableCell>
                    <TableCell className="min-w-64 max-w-64 whitespace-normal break-words">{row.parties || '—'}</TableCell>
                    <TableCell className="min-w-56 max-w-56 whitespace-normal break-words">{row.witnesses || '—'}</TableCell>
                    <TableCell className="min-w-48 max-w-48 whitespace-pre-line break-words text-xs text-slate-600 dark:text-slate-400">
                      {row.party_ids || '—'}
                    </TableCell>
                    <TableCell className="min-w-40">{row.date_time || '—'}</TableCell>
                    <TableCell>
                      {row.notarial_type && <Badge variant="outline">{row.notarial_type}</Badge>}
                    </TableCell>
                    <TableCell>{row.fees ? `₱ ${row.fees}` : '—'}</TableCell>
                    <TableCell>{row.or_number || '—'}</TableCell>
                    <TableCell>
                      {row.remarks && (
                        <Badge variant={row.remarks === 'Copy Retained' ? 'success' : 'default'}>{row.remarks}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Edit entry"
                          className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                          onClick={() => handleEditEntry(row.sourceId)}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Archive entry"
                          className="rounded-md p-1.5 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/30 dark:hover:text-amber-400"
                          onClick={() => handleRequestArchive(row.sourceId)}
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
            <CardContent className="p-4 text-sm text-slate-500 dark:text-slate-400">Loading entries...</CardContent>
          </Card>
        ) : paginatedRows.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-slate-500 dark:text-slate-400">No entries found.</CardContent>
          </Card>
        ) : (
          paginatedRows.map((row) => (
            <Card key={row.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Entry #{row.entry_number}</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{row.title}</p>
                  </div>
                  <Badge variant={row.remarks === 'Copy Retained' ? 'success' : 'default'}>{row.remarks}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <p>
                    <span className="font-medium text-slate-700 dark:text-slate-300">Book:</span> {row.book_number}
                  </p>
                  <p>
                    <span className="font-medium text-slate-700 dark:text-slate-300">Page:</span> {row.page_number}
                  </p>
                  <p>
                    <span className="font-medium text-slate-700 dark:text-slate-300">Entry #:</span> {row.entry_number}
                  </p>
                  <p>
                    <span className="font-medium text-slate-700 dark:text-slate-300">Type:</span> {row.notarial_type}
                  </p>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Parties:</span> {row.parties}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Witnesses:</span> {row.witnesses}
                </p>
                <p className="whitespace-pre-line text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Party IDs:</span> {row.party_ids}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <p>
                    <span className="font-medium text-slate-700 dark:text-slate-300">Date/Time:</span> {row.date_time}
                  </p>
                  <p>
                    <span className="font-medium text-slate-700 dark:text-slate-300">Fees:</span> ₱ {row.fees}
                  </p>
                  <p>
                    <span className="font-medium text-slate-700 dark:text-slate-300">OR #:</span> {row.or_number}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-1 pt-1">
                  <button
                    type="button"
                    className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                    onClick={() => handleEditEntry(row.sourceId)}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-md p-1.5 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/30 dark:hover:text-amber-400"
                    onClick={() => handleRequestArchive(row.sourceId)}
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
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

      {isEditModalOpen ? (
        <EditEntryModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingEntry(null);
            setEditSubmitError('');
          }}
          onSubmit={handleUpdateEntry}
          entry={editingEntry}
          submitting={isUpdatingEntry}
          errorMessage={editSubmitError}
        />
      ) : null}

      <AlertDialog
        isOpen={archiveConfirm.open}
        title="Archive this entry?"
        description="This entry will be moved to the archive. You can restore it later from the archived records."
        variant="warning"
        confirmLabel="Archive"
        loading={isArchiving}
        onConfirm={handleConfirmArchive}
        onCancel={() => setArchiveConfirm({ open: false, entryId: null })}
      />
    </section>
  );
}
