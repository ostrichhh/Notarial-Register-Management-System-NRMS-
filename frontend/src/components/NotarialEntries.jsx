import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Archive, Download, Edit, Plus } from 'lucide-react';
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
  const years = [...new Set(
    entries
      .map((entry) => {
        const date = new Date(entry.date_time);
        return Number.isNaN(date.getTime()) ? null : date.getFullYear();
      })
      .filter(Boolean)
  )].sort((a, b) => a - b);

  if (years.length === 1) return years[0];
  if (years.length > 1) return `${years[0]}-${years[years.length - 1]}`;

  if (book?.appointment_date) {
    const date = new Date(`${book.appointment_date}T00:00:00`);
    if (!Number.isNaN(date.getTime())) return date.getFullYear();
  }

  return new Date().getFullYear();
};

const buildReportPage = ({ book, entriesByNumber, pageNumber, reportPageNumber, totalReportPages, year }) => {
  const firstEntryNumber = (pageNumber - 1) * 5 + 1;
  const pageEntryNumbers = new Set(Array.from({ length: 5 }, (_, index) => firstEntryNumber + index));
  const pageEntries = [...entriesByNumber.entries()]
    .filter(([entryNumber]) => pageEntryNumbers.has(entryNumber))
    .map(([, entry]) => entry);
  const reportYear = year || resolveReportYear(book, pageEntries);
  const appointmentDate = formatReportDate(book?.appointment_date);
  const expirationDate = formatReportDate(book?.expiration_date);
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
  const pages = pageNumbers
    .map((pageNumber, index) =>
      buildReportPage({
        book,
        entriesByNumber,
        pageNumber,
        reportPageNumber: index + 1,
        totalReportPages: pageNumbers.length,
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
    .register-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10px; line-height: 1.08; word-spacing: normal; }
    .register-table th, .register-table td { border: 1px solid #000; vertical-align: top; text-align: center; padding: 2px; white-space: pre-line; word-break: normal; overflow-wrap: break-word; hyphens: auto; }
    .register-table th { height: 58px; font-weight: 700; }
    .register-table td { height: 34px; }
    .register-table th:nth-child(1), .register-table td:nth-child(1) { width: 4%; }
    .register-table th:nth-child(2), .register-table td:nth-child(2) { width: 16%; }
    .register-table th:nth-child(3), .register-table td:nth-child(3) { width: 16%; }
    .register-table th:nth-child(4), .register-table td:nth-child(4) { width: 12%; }
    .register-table th:nth-child(5), .register-table td:nth-child(5) { width: 13%; }
    .register-table th:nth-child(6), .register-table td:nth-child(6) { width: 8%; }
    .register-table th:nth-child(7), .register-table td:nth-child(7) { width: 8%; }
    .register-table th:nth-child(8), .register-table td:nth-child(8) { width: 8%; }
    .register-table th:nth-child(9), .register-table td:nth-child(9) { width: 15%; }
    .entry-no { text-align: center; }
    .certification { margin: 16px 0 0 0.72in; font-size: 13px; }
    .signature { width: max-content; min-width: 2.7in; margin-top: 24px; margin-right: 0.75in; margin-left: auto; text-align: center; font-size: 12px; }
    .signature p { margin: 0; }
    footer { position: absolute; right: 0.35in; bottom: 0.1in; font-size: 14px; color: #666; }
  </style>
</head>
<body>${pages}</body>
</html>`;
};

export default function NotarialEntries() {
  const navigate = useNavigate();
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
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);
  const [archivedEntries, setArchivedEntries] = useState([]);

  const [editingEntry, setEditingEntry] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdatingEntry, setIsUpdatingEntry] = useState(false);
  const [editSubmitError, setEditSubmitError] = useState('');

  const [successMessage, setSuccessMessage] = useState('');
  const [archiveConfirm, setArchiveConfirm] = useState({ open: false, entryId: null });
  const [isArchiving, setIsArchiving] = useState(false);
  const [addSlot, setAddSlot] = useState(null);
  const [isAddingSlotEntry, setIsAddingSlotEntry] = useState(false);
  const [addSlotError, setAddSlotError] = useState('');
  const [reportBusy, setReportBusy] = useState(false);

  const pageSizeOptions = [5, 105, 525];

  const viewingBook = useMemo(() => {
    if (!selectedBookId) return null;
    return books.find((b) => String(b.id) === String(selectedBookId)) || null;
  }, [books, selectedBookId]);

  useEffect(() => {
    setPageSearch('');
    setPageNumberFilter('all');
  }, [selectedBookId]);

  const openPrintableReport = useCallback(async (filename, html) => {
    setReportBusy(true);
    const previousActiveElement = document.activeElement;
    let frame = null;
    let cleanupTimer = null;

    const cleanup = () => {
      if (cleanupTimer) window.clearTimeout(cleanupTimer);
      if (frame?.parentNode) frame.parentNode.removeChild(frame);
      setReportBusy(false);
      window.setTimeout(() => {
        if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
          previousActiveElement.focus({ preventScroll: true });
        } else {
          window.focus();
        }
      }, 0);
    };

    try {
      frame = document.createElement('iframe');
      frame.title = filename.replace(/\.html$/i, '');
      frame.setAttribute('aria-hidden', 'true');
      frame.style.position = 'fixed';
      frame.style.right = '0';
      frame.style.bottom = '0';
      frame.style.width = '1px';
      frame.style.height = '1px';
      frame.style.border = '0';
      frame.style.opacity = '0';
      frame.style.pointerEvents = 'none';
      document.body.appendChild(frame);

      const printDocument = frame.contentDocument || frame.contentWindow?.document;
      if (!printDocument || !frame.contentWindow) {
        throw new Error('Report print frame is unavailable.');
      }

      printDocument.open();
      printDocument.write(html);
      printDocument.close();

      await new Promise((resolve) => {
        const finish = () => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
        if (printDocument.readyState === 'complete') {
          finish();
          return;
        }
        frame.addEventListener('load', finish, { once: true });
      });

      if (printDocument.fonts?.ready) {
        await printDocument.fonts.ready;
      }

      const reportWindow = frame.contentWindow;
      const handleAfterPrint = () => cleanup();
      reportWindow.addEventListener('afterprint', handleAfterPrint, { once: true });
      cleanupTimer = window.setTimeout(cleanup, 4000);
      reportWindow.focus();
      reportWindow.print();
    } catch {
      cleanup();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setError('Print preview could not open, so the report was downloaded instead.');
    }
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
      const [entriesResponse, archivedEntriesResponse, booksResponse] = await Promise.all([
        AxiosInstance.get(`/entries/?book=${encodeURIComponent(selectedBookId)}`),
        AxiosInstance.get(`/entries/?book=${encodeURIComponent(selectedBookId)}&archived=true`),
        AxiosInstance.get('/books/'),
      ]);
      setEntries(entriesResponse.data || []);
      setArchivedEntries(archivedEntriesResponse.data || []);
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
        const [entriesResponse, archivedEntriesResponse] = await Promise.all([
          AxiosInstance.get(`/entries/?book=${encodeURIComponent(selectedBookId)}`),
          AxiosInstance.get(`/entries/?book=${encodeURIComponent(selectedBookId)}&archived=true`),
        ]);
        if (!isMounted) return;
        setEntries(entriesResponse.data || []);
        setArchivedEntries(archivedEntriesResponse.data || []);
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

  const handleEditEntry = (entryId) => {
    const found = entries.find((e) => e.id === entryId);
    if (found) {
      setEditingEntry(found);
      setEditSubmitError('');
      setIsEditModalOpen(true);
    }
  };

  const handleAddToDeletedSlot = (row) => {
    setAddSlot(row);
    setAddSlotError('');
  };

  const handleSubmitDeletedSlotEntry = async (payload) => {
    if (!addSlot) return false;
    try {
      setIsAddingSlotEntry(true);
      setAddSlotError('');
      await AxiosInstance.post(`/entries/${addSlot.sourceId}/replace-deleted/`, {
        ...payload,
        book: Number(addSlot.bookId),
        entry_number: Number(addSlot.entry_number),
      });
      setAddSlot(null);
      setSuccessMessage(`Entry #${addSlot.entry_number} has been added to the deleted slot.`);
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
            'Unable to add entry to this deleted slot.';
      setAddSlotError(apiMessage);
      return false;
    } finally {
      setIsAddingSlotEntry(false);
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
    for (const entry of [...entries, ...archivedEntries]) {
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
  }, [archivedEntries, entries]);

  const selectPageByNumber = useCallback((value) => {
    const normalized = String(value || '').trim();
    const pageNumber = normalized.replace(/^page\s+/i, '');

    setPageSearch(normalized);
    setPageNumberFilter(pageNumber ? pageNumber : 'all');
    setPage(1);
  }, []);

  const filteredEntries = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const formatSearchDateTime = (value) => {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return [
        toDateInputValue(value),
        date.toLocaleDateString(),
        date.toLocaleString(),
        date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      ].join(' ');
    };

    return [...entries, ...archivedEntries]
      .filter((entry) => String(entry.book) === String(selectedBookId))
      .sort((a, b) => a.entry_number - b.entry_number)
      .filter((entry) => {
        if (entry.is_archived) {
          const archivedFields = [
            entry.entry_number,
            entry.book_number,
            entry.page?.page_number,
            'archived archived slot archive slot',
            formatSearchDateTime(entry.date_time),
            formatSearchDateTime(entry.archived_at),
          ].join(' ').toLowerCase();
          const matchesPage =
            pageNumberFilter === 'all'
              ? true
              : String(entry.page?.page_number || '') === String(pageNumberFilter);
          return matchesPage && (normalizedSearch.length === 0 || archivedFields.includes(normalizedSearch));
        }

        const matchesType = typeFilter === 'all' ? true : entry.notarial_type === typeFilter;
        const matchesRemarks = remarksFilter === 'all' ? true : entry.remarks === remarksFilter;
        const matchesPage =
          pageNumberFilter === 'all'
            ? true
            : String(entry.page?.page_number || '') === String(pageNumberFilter);

        const title = (entry.title || '').toLowerCase();
        const parties = Array.isArray(entry.parties) ? entry.parties.map((p) => p?.name || '').join(' ').toLowerCase() : '';
        const witnesses = Array.isArray(entry.witnesses) ? entry.witnesses.map((w) => w?.name || '').join(' ').toLowerCase() : '';
        const orNumber = String(entry.or_number || '').toLowerCase();
        const entryNo = String(entry.entry_number || '');
        const notarizationDateText = formatSearchDateTime(entry.date_time).toLowerCase();

        const matchesSearch =
          normalizedSearch.length === 0 ||
          title.includes(normalizedSearch) ||
          entryNo.includes(normalizedSearch) ||
          parties.includes(normalizedSearch) ||
          witnesses.includes(normalizedSearch) ||
          orNumber.includes(normalizedSearch) ||
          notarizationDateText.includes(normalizedSearch);

        return matchesType && matchesRemarks && matchesPage && matchesSearch;
      });
  }, [archivedEntries, entries, selectedBookId, typeFilter, remarksFilter, pageNumberFilter, searchTerm]);

  const rows = useMemo(() => {
    return filteredEntries.map((entry) => {
      return {
        id: entry.id,
        is_archived: Boolean(entry.is_archived),
        is_deleted: Boolean(entry.is_deleted),
        entry_number: entry.entry_number,
        book_number: entry.book_number || entry.book,
        page_number: entry.page?.page_number || '—',
        title: entry.is_deleted ? 'Deleted archived slot' : entry.is_archived ? 'Archived slot' : entry.title || '—',
        date_time: new Date(entry.date_time).toLocaleString(),
        notarial_type: entry.is_deleted ? 'Deleted' : entry.is_archived ? 'Archived' : notarialTypeLabel[entry.notarial_type] || entry.notarial_type,
        fees: entry.is_archived ? '' : Number(entry.fees).toLocaleString(undefined, { minimumFractionDigits: 2 }),
        or_number: entry.is_archived ? '' : entry.or_number,
        remarks: entry.is_deleted ? 'Slot preserved' : entry.is_archived ? 'Archived slot' : remarksLabel[entry.remarks] || entry.remarks,
        parties: entry.is_deleted ? 'Deleted in archive; slot preserved' : entry.is_archived ? 'Moved to archive' : formatPeople(entry.parties),
        witnesses: entry.is_archived ? '—' : formatPeople(entry.witnesses),
        party_ids: entry.is_archived ? '—' : formatPartyIdsOnly(entry.parties),
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
    const allEntries = [...entries, ...archivedEntries];
    if (!Array.isArray(allEntries) || allEntries.length === 0) return;
    if (pageSize !== 5) return;
    const maxEntry = Math.max(...allEntries.map((e) => Number(e.entry_number) || 1));
    const activePage = Math.max(1, Math.ceil(maxEntry / 5));
    setPage((prev) => (prev === 1 ? activePage : prev));
  }, [archivedEntries, entries, pageSize, selectedBookId]);

  async function exportPage() {
    if (!viewingBook || reportBusy) return;
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

    await openPrintableReport(
      `nrms-book-${viewingBook.book_number}-page-${pageNumber}.html`,
      html
    );
  }

  async function exportBook() {
    if (!viewingBook || reportBusy) return;
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

    await openPrintableReport(
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
            <AppButton variant="outline" onClick={exportPage} disabled={!viewingBook || loading || reportBusy}>
              <Download className="mr-1 h-4 w-4" />
              {reportBusy ? 'Preparing...' : 'Export Page'}
            </AppButton>
            <AppButton variant="outline" onClick={exportBook} disabled={!viewingBook || loading || reportBusy}>
              <Download className="mr-1 h-4 w-4" />
              {reportBusy ? 'Preparing...' : 'Export Book'}
            </AppButton>
            <AppButton variant="danger" onClick={() => navigate('/workflow', { state: { startAt: 'auto' } })}>
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

      {reportBusy ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
          Preparing print preview...
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:grid-cols-5">
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
            placeholder="Entry #, title, parties, witnesses, OR #, date"
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
          <Table className="min-w-[1500px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Book</TableHead>
                <TableHead className="w-16">Page</TableHead>
                <TableHead className="w-20">Entry #</TableHead>
                <TableHead className="w-64">Title</TableHead>
                <TableHead className="w-72">Parties & Addresses</TableHead>
                <TableHead className="w-56">Witnesses</TableHead>
                <TableHead className="w-56">Party IDs</TableHead>
                <TableHead className="w-44">Date/Time</TableHead>
                <TableHead className="w-40">Type</TableHead>
                <TableHead className="w-28">Fees</TableHead>
                <TableHead className="w-28">OR #</TableHead>
                <TableHead className="w-40">Remarks</TableHead>
                <TableHead className="w-24">Actions</TableHead>
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
                    className={`border-b border-slate-100 dark:border-slate-800 ${
                      row.is_archived
                        ? 'bg-slate-100/80 text-slate-500 dark:bg-slate-900/70'
                        : `odd:bg-white even:bg-slate-50/40 dark:odd:bg-slate-950 dark:even:bg-slate-900/40 ${BRAND.rowHoverTint}`
                    }`}
                  >
                    <TableCell className="whitespace-nowrap">{row.book_number}</TableCell>
                    <TableCell className="whitespace-nowrap">{row.page_number}</TableCell>
                    <TableCell className="whitespace-nowrap font-semibold text-red-700 dark:text-red-400">
                      {row.entry_number}
                    </TableCell>
                    <TableCell className="whitespace-normal break-words font-medium text-slate-900 dark:text-white">
                      {row.title}
                    </TableCell>
                    <TableCell className="whitespace-normal break-words">{row.parties || '—'}</TableCell>
                    <TableCell className="whitespace-normal break-words">{row.witnesses || '—'}</TableCell>
                    <TableCell className="whitespace-pre-line break-words text-xs text-slate-600 dark:text-slate-400">
                      {row.party_ids || '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{row.date_time || '—'}</TableCell>
                    <TableCell>
                      {row.notarial_type && <Badge variant="outline">{row.notarial_type}</Badge>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{row.fees ? `₱ ${row.fees}` : '—'}</TableCell>
                    <TableCell className="whitespace-nowrap">{row.or_number || '—'}</TableCell>
                    <TableCell>
                      {row.remarks && (
                        <Badge variant={row.remarks === 'Copy Retained' ? 'success' : 'default'}>{row.remarks}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.is_archived ? (
                        row.is_deleted ? (
                          <button
                            type="button"
                            title="Add notarial entry to this deleted slot"
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                            onClick={() => handleAddToDeletedSlot(row)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add
                          </button>
                        ) : (
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Archived</span>
                        )
                      ) : (
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
                      )}
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
            <Card key={row.id} className={row.is_archived ? 'border-dashed bg-slate-50 opacity-80 dark:bg-slate-900/70' : ''}>
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
                  {row.is_archived ? (
                    row.is_deleted ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                        onClick={() => handleAddToDeletedSlot(row)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add
                      </button>
                    ) : (
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Archived</span>
                    )
                  ) : (
                    <>
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
                    </>
                  )}
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

      {addSlot ? (
        <AddEntryModal
          isOpen={Boolean(addSlot)}
          onClose={() => {
            setAddSlot(null);
            setAddSlotError('');
          }}
          onSubmit={handleSubmitDeletedSlotEntry}
          books={books}
          defaultBookId={addSlot.bookId}
          defaultEntryNumber={addSlot.entry_number}
          lockedSlot
          submitting={isAddingSlotEntry}
          errorMessage={addSlotError}
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
