import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, FileCheck2, History, Pencil, Plus, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { useLocation } from 'react-router';

import AxiosInstance from '../Axios';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../ui/PageHeader';
import Select from '../ui/Select';
import { Button } from '../ui/shadcn/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import {
  AccessNotice,
  DataTable,
  FilterPanel,
  FormInput,
  Modal,
  SearchBar,
  StatusBadge,
  Tabs,
  ToastNotification,
} from './WorkflowComponents';
import { intakeRows, draftRows, roleMatrix, workflowSteps } from './workflowData';

const roleTabs = ['Client Intake', 'Queue Management', 'Queue History', 'Draft Entries', 'Entry Finalization'];
const moduleAccess = Object.fromEntries(roleTabs.map((tab) => [tab, ['ADMIN', 'ATTORNEY', 'SECRETARY']]));

const notarialTypeOptions = [
  { value: '', label: 'Select type' },
  { value: 'ACK', label: 'Acknowledgement' },
  { value: 'SUB', label: 'Subscription' },
  { value: 'CERT', label: 'Certification' },
];

const remarksOptions = [
  { value: '', label: 'Select remarks' },
  { value: 'CR', label: 'Copy Retained' },
  { value: 'NCR', label: 'No Copy Retained' },
];

const statusLabel = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  DRAFT: 'Draft',
  READY: 'Completed',
  FINALIZED: 'Finalized',
};

function normalizeRole(role) {
  return role || 'SECRETARY';
}

function can(role, action) {
  const normalized = normalizeRole(role);
  const rules = {
    createIntake: ['ADMIN', 'ATTORNEY', 'SECRETARY'],
    processQueue: ['ADMIN', 'ATTORNEY'],
    editDraft: ['ADMIN', 'ATTORNEY', 'SECRETARY'],
    finalize: ['ADMIN', 'ATTORNEY'],
    cancelQueue: ['ADMIN', 'ATTORNEY', 'SECRETARY'],
  };
  return rules[action]?.includes(normalized);
}

function asStatus(value) {
  return statusLabel[value] || value || 'Draft';
}

function intakeClientSummary(intake) {
  return (intake.parties || []).map((party) => party.name).filter(Boolean).join(', ') || intake.client_name || '—';
}

function normalizeDraft(apiDraft) {
  const intake = apiDraft.intake_detail || {};
  return {
    id: apiDraft.id,
    intakeId: apiDraft.intake,
    queueNumber: intake.queue_number || '—',
    clientName: intakeClientSummary(intake),
    parties: intake.parties || [],
    scheduledDate: intake.scheduled_date,
    intakeStatus: intake.status,
    documentTitle: apiDraft.document_title || '',
    notarialType: apiDraft.notarial_type || '',
    notarizationDateTime: toLocalDatetimeValue(apiDraft.notarization_datetime),
    witnesses: Array.isArray(apiDraft.witnesses) ? apiDraft.witnesses : [],
    fees: apiDraft.fees ?? '',
    orNumber: apiDraft.or_number || '',
    remarks: apiDraft.remarks || '',
    status: apiDraft.status,
    createdAt: apiDraft.created_at,
    finalizedEntry: apiDraft.finalized_entry,
    finalizedBookNumber: apiDraft.finalized_book_number,
    finalizedPageNumber: apiDraft.finalized_page_number,
    finalizedEntryNumber: apiDraft.finalized_entry_number,
  };
}

function toLocalDatetimeValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function compactWitnesses(witnesses = []) {
  return witnesses
    .map((witness) => ({
      name: String(witness?.name || witness || '').trim(),
      address: String(witness?.address || 'On file').trim(),
    }))
    .filter((witness) => witness.name);
}

function hasPartyIds(draft) {
  return (draft.parties || []).every((party) => party.id_type && party.id_number);
}

function isDraftComplete(draft) {
  return Boolean(
      draft?.documentTitle?.trim() &&
      draft?.notarialType &&
      draft?.notarizationDateTime &&
      draft?.fees &&
      draft?.orNumber?.trim() &&
      draft?.remarks &&
      compactWitnesses(draft?.witnesses).length > 0 &&
      hasPartyIds(draft)
  );
}

function incompleteDraftMessage(draft) {
  const missing = [];
  if (!draft?.documentTitle?.trim()) missing.push('Document Title');
  if (!draft?.notarialType) missing.push('Notarial Type');
  if (!draft?.notarizationDateTime) missing.push('Date and Time of Notarization');
  if (!draft?.fees) missing.push('Fees');
  if (!draft?.orNumber?.trim()) missing.push('OR Number');
  if (!draft?.remarks) missing.push('Remarks');
  if (compactWitnesses(draft?.witnesses).length === 0) missing.push('Witnesses');
  if (!hasPartyIds(draft)) missing.push('Client ID Type and ID Number');
  return missing.length ? `Complete these fields first: ${missing.join(', ')}.` : '';
}

function sortBooks(books) {
  return [...books].sort((a, b) => String(a.book_number).localeCompare(String(b.book_number), undefined, { numeric: true }));
}

function findOpenSlot(book, usedEntries) {
  const totalEntries = Number(book.total_pages || 105) * 5;
  for (let entry = 1; entry <= totalEntries; entry += 1) {
    if (!usedEntries.has(entry)) return { entryNumber: entry, pageNumber: Math.ceil(entry / 5) };
  }
  return null;
}

function createUsedEntriesMap(entries) {
  const usedByBook = new Map();
  entries
    .filter((entry) => !entry.is_archived)
    .forEach((entry) => {
      const key = String(entry.book);
      const used = usedByBook.get(key) ?? new Set();
      used.add(Number(entry.entry_number));
      usedByBook.set(key, used);
    });
  return usedByBook;
}

function assignDraftSlots(drafts, books, entries, includeDraft) {
  const usedByBook = createUsedEntriesMap(entries);
  return drafts
    .filter((draft) => draft.intakeStatus === 'COMPLETED' && includeDraft(draft))
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
    .map((draft) => {
      for (const book of sortBooks(books.filter((item) => !item.is_archived))) {
        const key = String(book.id);
        const used = usedByBook.get(key) ?? new Set();
        const slot = findOpenSlot(book, used);
        if (slot) {
          used.add(slot.entryNumber);
          usedByBook.set(key, used);
          return { ...draft, assignment: { book, ...slot } };
        }
      }
      return { ...draft, assignment: null };
    });
}

function computeAssignments(drafts, books, entries) {
  return assignDraftSlots(drafts, books, entries, (draft) => draft.status === 'READY');
}

function computeDraftEncodingAssignments(drafts, books, entries) {
  return assignDraftSlots(drafts, books, entries, (draft) => !['FINALIZED', 'CANCELLED'].includes(draft.status));
}

function computeNextAssignment(drafts, books, entries) {
  const projected = assignDraftSlots(drafts, books, entries, (draft) => draft.status === 'READY');
  return assignDraftSlots(
    [{ id: 'next', intakeStatus: 'COMPLETED', status: 'DRAFT', createdAt: new Date().toISOString() }],
    books,
    [
      ...entries,
      ...projected
        .filter((draft) => draft.assignment)
        .map((draft) => ({
          book: draft.assignment.book.id,
          entry_number: draft.assignment.entryNumber,
          is_archived: false,
        })),
    ],
    () => true
  )[0]?.assignment || null;
}

function emptyParty() {
  return { name: '', address: '', id_type: '', id_number: '' };
}

function WorkflowStrip() {
  return (
    <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <CardContent className="p-4">
        <div className="grid gap-3 md:grid-cols-4">
          {workflowSteps.map((step, index) => (
            <div key={step} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/70">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-950">{index + 1}</span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{step}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ClientIntake({ role, intakes, onCreated, onToast }) {
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [parties, setParties] = useState([emptyParty()]);
  const [saving, setSaving] = useState(false);
  const readOnly = !can(role, 'createIntake');

  function updateParty(index, patch) {
    setParties((prev) => prev.map((party, itemIndex) => (itemIndex === index ? { ...party, ...patch } : party)));
  }

  function removeParty(index) {
    setParties((prev) => (prev.length > 1 ? prev.filter((_, itemIndex) => itemIndex !== index) : prev));
  }

  async function submitIntake(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await AxiosInstance.post('/client-intakes/', {
        scheduled_date: scheduledDate,
        parties: parties.map((party) => ({
          name: party.name.trim(),
          address: party.address.trim(),
          id_type: party.id_type.trim(),
          id_number: party.id_number.trim(),
        })),
      });
      setParties([emptyParty()]);
      onToast({ title: 'Client intake queued', message: 'Queue number was generated and the draft is ready for encoding.' });
      await onCreated();
    } catch (error) {
      const detail = error.response?.data?.detail || error.response?.data || error.message;
      onToast({ title: 'Intake not saved', message: typeof detail === 'string' ? detail : JSON.stringify(detail) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.9fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Client intake form</CardTitle>
          <CardDescription>Add one or more clients/parties. Each client must have exactly one ID type and ID number.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={submitIntake}>
            <FormInput label="Scheduled Date" type="date" value={scheduledDate} disabled={readOnly} onChange={(event) => setScheduledDate(event.target.value)} required />
            {parties.map((party, partyIndex) => (
              <div key={`party-${partyIndex}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Client / Party {partyIndex + 1}</p>
                  {partyIndex > 0 ? (
                    <Button type="button" variant="outline" size="sm" disabled={readOnly} onClick={() => removeParty(partyIndex)}>
                      <X className="h-4 w-4" />
                      Remove client
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormInput label="Client / Party Name" value={party.name} disabled={readOnly} onChange={(event) => updateParty(partyIndex, { name: event.target.value })} required />
                  <FormInput label="Address" value={party.address} disabled={readOnly} onChange={(event) => updateParty(partyIndex, { address: event.target.value })} required />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <FormInput label="ID Type" value={party.id_type} disabled={readOnly} onChange={(event) => updateParty(partyIndex, { id_type: event.target.value })} required />
                  <FormInput label="ID Number" value={party.id_number} disabled={readOnly} onChange={(event) => updateParty(partyIndex, { id_number: event.target.value })} required />
                </div>
              </div>
            ))}
            <div className="flex flex-wrap justify-between gap-2">
              <Button type="button" variant="outline" disabled={readOnly} onClick={() => setParties((prev) => [...prev, emptyParty()])}>
                <Plus className="h-4 w-4" />
                Add client
              </Button>
              <Button type="submit" disabled={readOnly || saving} className="bg-slate-950 hover:bg-slate-800">
                Create intake
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Queue preview</CardTitle>
          <CardDescription>Fresh workflow data only. No sample rows are preloaded.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'queue_number', label: 'Queue No.' },
              { key: 'client', label: 'Client(s)', render: intakeClientSummary },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge status={asStatus(row.status)} /> },
            ]}
            rows={intakes.filter((row) => ['PENDING', 'PROCESSING'].includes(row.status))}
            empty="No clients in the workflow queue yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}

function QueueManagement({ role, intakes, drafts, books, entries, onAction, onToast }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [confirm, setConfirm] = useState(null);

  const rows = useMemo(
    () =>
      intakes.filter((row) => {
        const matchesQuery = `${row.queue_number} ${intakeClientSummary(row)}`.toLowerCase().includes(query.toLowerCase());
        const isActive = ['PENDING', 'PROCESSING'].includes(row.status);
        return matchesQuery && isActive && (status === 'ALL' || row.status === status);
      }),
    [intakes, query, status]
  );

  async function runConfirmed() {
    if (!confirm) return;
    try {
      await AxiosInstance.post(`/client-intakes/${confirm.row.id}/${confirm.action}/`, confirm.action === 'cancel' ? { reason: 'Cancelled from queue management.' } : {});
      onToast({ title: confirm.successTitle, message: confirm.successMessage });
      setConfirm(null);
      await onAction();
    } catch (error) {
      const detail = error.response?.data?.detail || error.response?.data || error.message;
      onToast({ title: 'Queue action failed', message: typeof detail === 'string' ? detail : JSON.stringify(detail) });
    }
  }

  function openConfirm(row, action) {
    const assignment = action === 'complete' ? computeNextAssignment(drafts, books, entries) : null;
    const labels = {
      process: ['Process client?', 'This will move the client into processing.', 'Client moved to processing', `${row.queue_number} is now processing.`],
      complete: ['Complete queue item?', 'Warning: this cannot be undone. Completing this queue item removes it from the active queue and sends it to Draft Entry Encoding.', 'Queue item completed', `${row.queue_number} was marked complete and sent to drafting.`],
      cancel: ['Cancel and remove client?', 'This deletes the client from the active queue and releases any proposed Book/Page/Entry slot to the next client.', 'Client cancelled', `${row.queue_number} was removed from the queue.`],
    };
    const [title, description, successTitle, successMessage] = labels[action];
    setConfirm({ row, action, title, description, successTitle, successMessage, assignment });
  }

  return (
    <div className="space-y-5">
      <FilterPanel>
        <SearchBar value={query} onChange={setQuery} placeholder="Search queue..." />
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={[
            { value: 'ALL', label: 'All statuses' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'PROCESSING', label: 'Processing' },
          ]}
        />
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
          <SlidersHorizontal className="h-4 w-4 text-amber-700" />
          Queue actions require confirmation
        </div>
      </FilterPanel>
      <DataTable
        columns={[
          { key: 'queue_number', label: 'Queue Number' },
          { key: 'client', label: 'Client(s)', render: intakeClientSummary },
          { key: 'scheduled_date', label: 'Scheduled Date' },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge status={asStatus(row.status)} /> },
        ]}
        rows={rows}
        empty="No clients in queue."
        actions={
          can(role, 'processQueue') || can(role, 'cancelQueue')
            ? (row) => (
                <div className="flex justify-end gap-2">
                  {can(role, 'processQueue') ? (
                    <>
                      <Button type="button" size="sm" className="bg-slate-950 hover:bg-slate-800" onClick={() => openConfirm(row, 'process')}>
                        Process
                      </Button>
                      <Button type="button" size="sm" className="bg-emerald-700 hover:bg-emerald-800" onClick={() => openConfirm(row, 'complete')}>
                        Complete
                      </Button>
                    </>
                  ) : null}
                  {can(role, 'cancelQueue') ? (
                    <Button type="button" size="sm" className="bg-rose-700 hover:bg-rose-800" onClick={() => openConfirm(row, 'cancel')}>
                      <Trash2 className="h-4 w-4" />
                      Cancel
                    </Button>
                  ) : null}
                </div>
              )
            : null
        }
      />
      <Modal open={Boolean(confirm)} title={confirm?.title} description={confirm?.description} confirmLabel="Confirm" onClose={() => setConfirm(null)} onConfirm={runConfirmed}>
        {confirm?.action === 'complete' ? (
          <div className="grid gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="font-semibold">Proposed drafting assignment</p>
            {confirm.assignment ? (
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-md bg-white px-3 py-2 shadow-sm dark:bg-slate-950">
                  <span className="block text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Book</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{confirm.assignment.book.book_number}</span>
                </div>
                <div className="rounded-md bg-white px-3 py-2 shadow-sm dark:bg-slate-950">
                  <span className="block text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Page</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{confirm.assignment.pageNumber}</span>
                </div>
                <div className="rounded-md bg-white px-3 py-2 shadow-sm dark:bg-slate-950">
                  <span className="block text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Entry</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{confirm.assignment.entryNumber}</span>
                </div>
              </div>
            ) : (
              <p>No active book slot is available right now.</p>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function QueueHistory({ intakes, drafts }) {
  const [query, setQuery] = useState('');
  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return intakes
      .filter((intake) => ['COMPLETED', 'CANCELLED'].includes(intake.status))
      .map((intake) => {
        const draft = drafts.find((item) => item.intakeId === intake.id);
        return {
          ...intake,
          client: intakeClientSummary(intake),
          draftStatus: draft?.status,
          finalizedEntryNumber: draft?.finalizedEntryNumber,
          finalizedBookNumber: draft?.finalizedBookNumber,
          finalizedPageNumber: draft?.finalizedPageNumber,
        };
      })
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
      .filter((row) => {
        if (!normalizedQuery) return true;
        const allFields = [
          row.queue_number,
          row.client,
          row.scheduled_date,
          asStatus(row.status),
          asStatus(row.draftStatus || row.status),
          row.finalizedEntryNumber,
          row.finalizedBookNumber,
          row.finalizedPageNumber,
          row.cancel_reason,
        ]
          .filter((value) => value !== undefined && value !== null)
          .join(' ')
          .toLowerCase();
        return allFields.includes(normalizedQuery);
      });
  }, [drafts, intakes, query]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-amber-700" />
          Queue history
        </CardTitle>
        <CardDescription>Completed, cancelled, and finalized workflow clients are kept here for review.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SearchBar value={query} onChange={setQuery} placeholder="Search queue history..." />
        <DataTable
          columns={[
            { key: 'queue_number', label: 'Queue No.' },
            { key: 'client', label: 'Client(s)', render: intakeClientSummary },
            { key: 'scheduled_date', label: 'Scheduled Date' },
            { key: 'status', label: 'Queue Status', render: (row) => <StatusBadge status={asStatus(row.status)} /> },
            { key: 'draftStatus', label: 'Draft Status', render: (row) => <StatusBadge status={asStatus(row.draftStatus || row.status)} /> },
            {
              key: 'assignment',
              label: 'Final Assignment',
              render: (row) =>
                row.finalizedEntryNumber
                  ? `Book ${row.finalizedBookNumber}, Page ${row.finalizedPageNumber}, Entry ${row.finalizedEntryNumber}`
                  : '—',
            },
          ]}
          rows={rows}
          empty="No queue history yet."
        />
      </CardContent>
    </Card>
  );
}

function EditDraftButton({ onClick }) {
  return (
    <Button type="button" size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-950/30" onClick={onClick}>
      <Pencil className="h-4 w-4" />
      Edit
    </Button>
  );
}

function formatDraftDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function formatWitnesses(witnesses = []) {
  const names = compactWitnesses(witnesses).map((witness) => witness.name);
  return names.length ? names.join(', ') : '—';
}

function formatAssignment(assignment) {
  return assignment
    ? `Book ${assignment.book.book_number}, Page ${assignment.pageNumber}, Entry ${assignment.entryNumber}`
    : 'No active slot';
}

function AssignmentSummary({ assignment }) {
  const items = assignment
    ? [
        ['Book', assignment.book.book_number],
        ['Page', assignment.pageNumber],
        ['Entry', assignment.entryNumber],
      ]
    : [
        ['Book', '—'],
        ['Page', '—'],
        ['Entry', '—'],
      ];
  return (
    <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70 sm:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-md bg-white px-3 py-2 shadow-sm dark:bg-slate-950">
          <span className="block text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{label}</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">{value}</span>
        </div>
      ))}
    </div>
  );
}

function PersonDetailCard({ party }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-white p-3 dark:border-amber-900/60 dark:bg-slate-950">
      <p className="font-semibold text-slate-900 dark:text-slate-100">{party.name || '—'}</p>
      <p className="text-slate-700 dark:text-slate-300">{party.address || '—'}</p>
      <p className="text-slate-600 dark:text-slate-400">{party.id_type || 'ID'}: {party.id_number || '—'}</p>
    </div>
  );
}

function DetailGrid({ items }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{item.label}</p>
          <div className="mt-1 whitespace-pre-line break-words text-sm font-medium text-slate-900 dark:text-slate-100">{item.value || '—'}</div>
        </div>
      ))}
    </div>
  );
}

function DraftEntryEditor({ draft, assignment, readOnly, onPatch, onSave, saving, showSaveButton = true }) {
  if (!draft) return null;

  const witnesses = Array.isArray(draft.witnesses) ? draft.witnesses : [];
  const visibleWitnesses = witnesses.length ? witnesses : [{ name: '', address: '' }];

  function updateWitness(index, patch) {
    if (witnesses.length) {
      onPatch({ witnesses: witnesses.map((witness, itemIndex) => (itemIndex === index ? { ...witness, ...patch } : witness)) });
      return;
    }
    onPatch({ witnesses: [{ name: patch.name || '', address: patch.address || '' }] });
  }

  function updateParty(index, patch) {
    onPatch({ parties: (draft.parties || []).map((party, itemIndex) => (itemIndex === index ? { ...party, ...patch } : party)) });
  }

  function removeWitness(index) {
    onPatch({ witnesses: witnesses.filter((_, itemIndex) => itemIndex !== index) });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Client details</p>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{draft.queueNumber}</span>
        </div>
        {(draft.parties || []).map((party, partyIndex) => (
          <div key={`encoding-${party.id || partyIndex}`} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 md:grid-cols-2">
            <FormInput label={`Client / Party ${partyIndex + 1}`} value={party.name || ''} disabled={readOnly} onChange={(event) => updateParty(partyIndex, { name: event.target.value })} required />
            <FormInput label="Address" value={party.address || ''} disabled={readOnly} onChange={(event) => updateParty(partyIndex, { address: event.target.value })} required />
            <FormInput label="ID Type" value={party.id_type || ''} disabled={readOnly} onChange={(event) => updateParty(partyIndex, { id_type: event.target.value })} required />
            <FormInput label="ID Number" value={party.id_number || ''} disabled={readOnly} onChange={(event) => updateParty(partyIndex, { id_number: event.target.value })} required />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Projected assignment</p>
        <AssignmentSummary assignment={assignment} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput label="Document Title" value={draft.documentTitle} disabled={readOnly} onChange={(event) => onPatch({ documentTitle: event.target.value })} required />
        <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
          <span>Notarial Type</span>
          <Select value={draft.notarialType} disabled={readOnly} onChange={(event) => onPatch({ notarialType: event.target.value })} options={notarialTypeOptions} required />
        </label>
        <FormInput label="Date and Time of Notarization" type="datetime-local" value={draft.notarizationDateTime} disabled={readOnly} onChange={(event) => onPatch({ notarizationDateTime: event.target.value })} required />
        <FormInput label="Fees" type="number" min="0" step="0.01" value={draft.fees} disabled={readOnly} onChange={(event) => onPatch({ fees: event.target.value })} required />
        <FormInput label="OR Number" value={draft.orNumber} disabled={readOnly} onChange={(event) => onPatch({ orNumber: event.target.value })} required />
        <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
          <span>Remarks</span>
          <Select value={draft.remarks} disabled={readOnly} onChange={(event) => onPatch({ remarks: event.target.value })} options={remarksOptions} required />
        </label>
      </div>
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Witnesses</p>
        {visibleWitnesses.map((witness, index) => (
          <div key={`${draft.id}-witness-${index}`} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <FormInput label={`Witness ${index + 1}`} value={witness.name || ''} disabled={readOnly} onChange={(event) => updateWitness(index, { name: event.target.value, address: witness.address || '' })} required />
            <FormInput label="Witness Address" value={witness.address || ''} disabled={readOnly} onChange={(event) => updateWitness(index, { name: witness.name || '', address: event.target.value })} required />
            {witnesses.length > 1 ? (
              <div className="flex items-end">
                <Button type="button" variant="outline" size="sm" disabled={readOnly} onClick={() => removeWitness(index)}>
                  <X className="h-4 w-4" />
                  Remove
                </Button>
              </div>
            ) : null}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" disabled={readOnly} onClick={() => onPatch({ witnesses: [...witnesses, { name: '', address: '' }] })}>
          <Plus className="h-4 w-4" />
          Add witness
        </Button>
      </div>
      {!isDraftComplete(draft) ? <AccessNotice title="Draft cannot be saved yet" message={incompleteDraftMessage(draft)} /> : null}
      {showSaveButton ? (
        <div className="flex justify-end">
          <Button type="button" disabled={readOnly || !isDraftComplete(draft) || saving} className="bg-slate-950 hover:bg-slate-800" onClick={onSave}>
            {saving ? 'Saving...' : 'Save draft'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function DraftEntries({ role, drafts, draftAssignments, setDrafts, reload, onToast, selectedDraftId, setSelectedDraftId }) {
  const [selectedId, setSelectedId] = useState('');
  const [editingDraftId, setEditingDraftId] = useState('');
  const [savingId, setSavingId] = useState('');
  const eligibleDrafts = drafts.filter((draft) => draft.intakeStatus === 'COMPLETED' && !['FINALIZED', 'CANCELLED'].includes(draft.status));
  const encodingDrafts = eligibleDrafts.filter((draft) => draft.status !== 'READY');
  const savedDraftRows = eligibleDrafts.filter((draft) => draft.status === 'READY');
  const activeId = selectedDraftId || selectedId;
  const selected = encodingDrafts.find((draft) => String(draft.id) === String(activeId)) || encodingDrafts[0];
  const editingDraft = savedDraftRows.find((draft) => String(draft.id) === String(editingDraftId));
  const selectedAssignment = draftAssignments.find((draft) => String(draft.id) === String(selected?.id))?.assignment || null;
  const editingAssignment = draftAssignments.find((draft) => String(draft.id) === String(editingDraft?.id))?.assignment || null;
  const readOnly = !can(role, 'editDraft');

  useEffect(() => {
    if (!selectedDraftId) return;
    const raf = window.requestAnimationFrame(() => {
      const savedMatch = savedDraftRows.find((draft) => String(draft.id) === String(selectedDraftId));
      if (savedMatch) {
        setEditingDraftId(String(savedMatch.id));
        setSelectedDraftId?.('');
        return;
      }
      const encodingMatch = encodingDrafts.find((draft) => String(draft.id) === String(selectedDraftId));
      if (encodingMatch) setSelectedId(String(encodingMatch.id));
    });
    return () => window.cancelAnimationFrame(raf);
  }, [encodingDrafts, savedDraftRows, selectedDraftId, setSelectedDraftId]);

  function chooseDraft(id) {
    setSelectedId(String(id));
    setSelectedDraftId?.(String(id));
  }

  function updateDraft(draftId, patch) {
    setDrafts((prev) => prev.map((draft) => (draft.id === draftId ? { ...draft, ...patch } : draft)));
  }

  async function saveDraft(draft, closeAfterSave = false) {
    const message = incompleteDraftMessage(draft);
    if (message) {
      onToast({ title: 'Draft incomplete', message });
      return;
    }
    setSavingId(String(draft.id));
    try {
      await AxiosInstance.patch(`/client-intakes/${draft.intakeId}/`, {
        scheduled_date: draft.scheduledDate,
        parties: draft.parties.map((party) => ({
          name: String(party.name || '').trim(),
          address: String(party.address || '').trim(),
          id_type: String(party.id_type || '').trim(),
          id_number: String(party.id_number || '').trim(),
        })),
      });
      await AxiosInstance.patch(`/workflow-drafts/${draft.id}/`, {
        document_title: draft.documentTitle.trim(),
        notarial_type: draft.notarialType,
        notarization_datetime: draft.notarizationDateTime ? new Date(draft.notarizationDateTime).toISOString() : null,
        fees: draft.fees,
        or_number: draft.orNumber.trim(),
        remarks: draft.remarks,
        witnesses: compactWitnesses(draft.witnesses),
      });
      onToast({ title: 'Draft saved', message: `${draft.queueNumber} is complete and ready for finalization.` });
      if (closeAfterSave) setEditingDraftId('');
      if (String(selected?.id) === String(draft.id)) {
        setSelectedId('');
        setSelectedDraftId?.('');
      }
      await reload();
    } catch (error) {
      const detail = error.response?.data?.detail || error.response?.data || error.message;
      onToast({ title: 'Draft not saved', message: typeof detail === 'string' ? detail : JSON.stringify(detail) });
    } finally {
      setSavingId('');
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
      {selected ? (
        <>
          <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20">
            <CardHeader className="p-4">
              <CardTitle className="text-base">Client details from Intake</CardTitle>
              <CardDescription className="text-amber-900 dark:text-amber-200">IDs belong to clients/parties. Witnesses do not require IDs.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 pt-0 text-sm">
              <Select value={String(selected.id)} onChange={(event) => chooseDraft(event.target.value)} options={encodingDrafts.map((draft) => ({ value: String(draft.id), label: `${draft.queueNumber} - ${draft.clientName}` }))} />
              {(selected.parties || []).map((party) => <PersonDetailCard key={party.id || party.name} party={party} />)}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Projected assignment</p>
                <AssignmentSummary assignment={selectedAssignment} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Draft entry encoding</CardTitle>
              <CardDescription>Only unsaved queue drafts appear here. Saved drafts can be edited from the Drafted entries table.</CardDescription>
            </CardHeader>
            <CardContent>
              <DraftEntryEditor
                draft={selected}
                assignment={selectedAssignment}
                readOnly={readOnly}
                saving={savingId === String(selected.id)}
                onPatch={(patch) => updateDraft(selected.id, patch)}
                onSave={() => saveDraft(selected)}
              />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="xl:col-span-2">
          <CardContent className="p-6">
            <AccessNotice title="No drafts waiting for encoding" message="Saved drafts are listed below and can be edited through the modal." />
          </CardContent>
        </Card>
      )}
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Drafted entries</CardTitle>
          <CardDescription>Completed queue clients available for draft editing and finalization.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            tableClassName="min-w-[1180px]"
            actionsClassName="w-28"
            columns={[
              { key: 'queueNumber', label: 'Queue No.', headClassName: 'w-24', cellClassName: 'whitespace-nowrap' },
              { key: 'clientName', label: 'Client(s)', headClassName: 'w-44', cellClassName: 'whitespace-normal break-words' },
              { key: 'documentTitle', label: 'Document', headClassName: 'w-52', cellClassName: 'whitespace-normal break-words' },
              { key: 'notarialType', label: 'Type', headClassName: 'w-36', cellClassName: 'whitespace-normal break-words', render: (row) => notarialTypeOptions.find((item) => item.value === row.notarialType)?.label || row.notarialType || '—' },
              { key: 'notarizationDateTime', label: 'Notarization Date/Time', headClassName: 'w-44', cellClassName: 'whitespace-nowrap', render: (row) => formatDraftDateTime(row.notarizationDateTime) },
              { key: 'fees', label: 'Fees', headClassName: 'w-28', cellClassName: 'whitespace-nowrap', render: (row) => row.fees ? `₱ ${Number(row.fees).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—' },
              { key: 'orNumber', label: 'OR #', headClassName: 'w-24', cellClassName: 'whitespace-nowrap' },
              { key: 'remarks', label: 'Remarks', headClassName: 'w-36', cellClassName: 'whitespace-normal break-words', render: (row) => remarksOptions.find((item) => item.value === row.remarks)?.label || row.remarks || '—' },
              { key: 'witnesses', label: 'Witnesses', headClassName: 'w-44', cellClassName: 'whitespace-normal break-words', render: (row) => formatWitnesses(row.witnesses) },
              { key: 'assignment', label: 'Assignment', headClassName: 'w-48', cellClassName: 'whitespace-normal break-words', render: (row) => formatAssignment(draftAssignments.find((draft) => String(draft.id) === String(row.id))?.assignment) },
              { key: 'status', label: 'Draft Status', headClassName: 'w-32', render: (row) => <StatusBadge status={asStatus(row.status)} /> },
            ]}
            rows={savedDraftRows}
            empty="No drafted entries yet."
            actions={
              can(role, 'editDraft')
                ? (row) => <EditDraftButton onClick={() => setEditingDraftId(String(row.id))} />
                : null
            }
          />
        </CardContent>
      </Card>
      <Modal
        open={Boolean(editingDraft)}
        title="Edit drafted entry"
        description="Update the saved draft without sending it back to Draft Entry Encoding."
        confirmLabel="Close"
        contentClassName="max-h-[92vh] overflow-y-auto sm:max-w-4xl"
        footerClassName="flex-row justify-end"
        footerLeading={
          editingDraft ? (
            <Button
              type="button"
              disabled={readOnly || !isDraftComplete(editingDraft) || savingId === String(editingDraft.id)}
              className="bg-slate-950 hover:bg-slate-800"
              onClick={() => saveDraft(editingDraft, true)}
            >
              {savingId === String(editingDraft.id) ? 'Saving...' : 'Save draft'}
            </Button>
          ) : null
        }
        hideCancel
        onClose={() => setEditingDraftId('')}
        onConfirm={() => setEditingDraftId('')}
      >
        {editingDraft ? (
          <DraftEntryEditor
            draft={editingDraft}
            assignment={editingAssignment}
            readOnly={readOnly}
            saving={savingId === String(editingDraft.id)}
            showSaveButton={false}
            onPatch={(patch) => updateDraft(editingDraft.id, patch)}
            onSave={() => saveDraft(editingDraft, true)}
          />
        ) : null}
      </Modal>
    </div>
  );
}

function EntryFinalization({ role, assignments, reload, booksLoading, onToast, onEditDraft }) {
  const [confirmDraft, setConfirmDraft] = useState(null);
  const [viewDraft, setViewDraft] = useState(null);

  async function finalize() {
    if (!confirmDraft) return;
    try {
      await AxiosInstance.post(`/workflow-drafts/${confirmDraft.id}/finalize/`);
      onToast({ title: 'Entry finalized', message: `${confirmDraft.queueNumber} was assigned to the active register.` });
      setConfirmDraft(null);
      await reload();
    } catch (error) {
      const detail = error.response?.data?.detail || error.response?.data || error.message;
      onToast({ title: 'Finalization failed', message: typeof detail === 'string' ? detail : JSON.stringify(detail) });
    }
  }

  return (
    <div className="space-y-5">
      {!can(role, 'finalize') ? <AccessNotice title="View-only finalization" message="Secretary accounts can view entries waiting for finalization but cannot edit or finalize them." /> : null}
      {booksLoading ? <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">Loading active books and entries...</div> : null}
      <DataTable
        tableClassName="min-w-[980px]"
        actionsClassName="w-72"
        columns={[
          { key: 'queueNumber', label: 'Queue No.', headClassName: 'w-24', cellClassName: 'whitespace-nowrap' },
          { key: 'clientName', label: 'Client(s)', headClassName: 'w-48', cellClassName: 'whitespace-normal break-words' },
          { key: 'documentTitle', label: 'Document', headClassName: 'w-56', cellClassName: 'whitespace-normal break-words' },
          { key: 'notarizationDateTime', label: 'Notarization Date/Time', headClassName: 'w-44', cellClassName: 'whitespace-nowrap', render: (row) => formatDraftDateTime(row.notarizationDateTime) },
          { key: 'book', label: 'Book No.', headClassName: 'w-32', cellClassName: 'whitespace-nowrap', render: (row) => row.assignment ? `Book ${row.assignment.book.book_number}` : 'No active slot' },
          { key: 'page', label: 'Page', headClassName: 'w-20', cellClassName: 'whitespace-nowrap', render: (row) => row.assignment?.pageNumber ?? '—' },
          { key: 'entry', label: 'Entry', headClassName: 'w-20', cellClassName: 'whitespace-nowrap', render: (row) => row.assignment?.entryNumber ?? '—' },
          { key: 'status', label: 'Status', headClassName: 'w-32', render: (row) => <StatusBadge status={isDraftComplete(row) ? 'Completed' : 'Draft'} /> },
        ]}
        rows={assignments}
        empty="No draft entries waiting for finalization."
        actions={
          can(role, 'finalize')
            ? (row) => (
                <div className="flex flex-nowrap justify-end gap-2">
                  <Button type="button" size="sm" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900" onClick={() => setViewDraft(row)}>
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                  <EditDraftButton onClick={() => onEditDraft(row.id)} />
                  <Button type="button" size="sm" disabled={!row.assignment || !isDraftComplete(row)} className="bg-slate-950 hover:bg-slate-800" onClick={() => setConfirmDraft(row)}>
                    <FileCheck2 className="h-4 w-4" />
                    Finalize
                  </Button>
                </div>
              )
            : null
        }
      />
      <Modal
        open={Boolean(confirmDraft)}
        title="Finalize entry?"
        description="This creates the official notarial entry and assigns the shown Book/Page/Entry slot. Incomplete drafts cannot be finalized."
        confirmLabel="Finalize and lock"
        onClose={() => setConfirmDraft(null)}
        onConfirm={finalize}
      >
        {confirmDraft ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
            <p className="font-semibold text-slate-900 dark:text-slate-100">{confirmDraft.queueNumber} - {confirmDraft.clientName}</p>
            <p className="mt-1">Assignment: Book {confirmDraft.assignment.book.book_number}, Page {confirmDraft.assignment.pageNumber}, Entry {confirmDraft.assignment.entryNumber}.</p>
          </div>
        ) : null}
      </Modal>
      <Modal
        open={Boolean(viewDraft)}
        title="Draft entry details"
        description="Full entry preview before finalization."
        confirmLabel="Close"
        onClose={() => setViewDraft(null)}
        onConfirm={() => setViewDraft(null)}
        hideCancel
      >
        {viewDraft ? (
          <div className="space-y-4">
            <AssignmentSummary assignment={viewDraft.assignment} />
            <DetailGrid
              items={[
                { label: 'Queue No.', value: viewDraft.queueNumber },
                { label: 'Client(s)', value: viewDraft.clientName },
                { label: 'Document', value: viewDraft.documentTitle },
                { label: 'Date and Time of Notarization', value: formatDraftDateTime(viewDraft.notarizationDateTime) },
                { label: 'Notarial Type', value: notarialTypeOptions.find((item) => item.value === viewDraft.notarialType)?.label || viewDraft.notarialType },
                { label: 'Fees', value: viewDraft.fees ? `₱ ${Number(viewDraft.fees).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—' },
                { label: 'OR Number', value: viewDraft.orNumber },
                { label: 'Remarks', value: remarksOptions.find((item) => item.value === viewDraft.remarks)?.label || viewDraft.remarks },
                { label: 'Witnesses', value: formatWitnesses(viewDraft.witnesses) },
              ]}
            />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Clients / parties</p>
              <div className="grid gap-3 md:grid-cols-2">
                {(viewDraft.parties || []).map((party) => <PersonDetailCard key={`view-${party.id || party.name}`} party={party} />)}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

export default function WorkflowPage() {
  const location = useLocation();
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const [activeTab, setActiveTab] = useState('Client Intake');
  const [toast, setToast] = useState(null);
  const [intakes, setIntakes] = useState(intakeRows);
  const [drafts, setDrafts] = useState(draftRows);
  const [books, setBooks] = useState([]);
  const [entries, setEntries] = useState([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedDraftId, setSelectedDraftId] = useState('');

  const loadWorkflow = useCallback(async () => {
    setBooksLoading(true);
    try {
      const [bookResult, entryResult, intakeResult, draftResult] = await Promise.all([
        AxiosInstance.get('/books/'),
        AxiosInstance.get('/entries/'),
        AxiosInstance.get('/client-intakes/'),
        AxiosInstance.get('/workflow-drafts/'),
      ]);
      setBooks(Array.isArray(bookResult.data) ? bookResult.data : []);
      setEntries(Array.isArray(entryResult.data) ? entryResult.data : []);
      setIntakes(Array.isArray(intakeResult.data) ? intakeResult.data : []);
      setDrafts(Array.isArray(draftResult.data) ? draftResult.data.map(normalizeDraft) : []);
      setLoadError('');
    } catch (error) {
      setLoadError(error.response?.data?.detail || error.message || 'Could not load workflow data.');
    } finally {
      setBooksLoading(false);
    }
  }, []);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => loadWorkflow());
    return () => window.cancelAnimationFrame(raf);
  }, [loadWorkflow]);

  const assignments = useMemo(() => computeAssignments(drafts, books, entries), [books, drafts, entries]);
  const draftAssignments = useMemo(() => computeDraftEncodingAssignments(drafts, books, entries), [books, drafts, entries]);
  const activeQueueRows = useMemo(() => intakes.filter((row) => ['PENDING', 'PROCESSING'].includes(row.status)), [intakes]);
  const draftEncodingRows = useMemo(() => drafts.filter((draft) => draft.intakeStatus === 'COMPLETED' && !['FINALIZED', 'CANCELLED'].includes(draft.status)), [drafts]);

  useEffect(() => {
    if (location.state?.startAt !== 'auto' || booksLoading) return;
    const raf = window.requestAnimationFrame(() => {
      if (role === 'ATTORNEY' || role === 'ADMIN') {
        if (assignments.length) {
          setActiveTab('Entry Finalization');
        } else if (draftEncodingRows.length) {
          setActiveTab('Draft Entries');
        } else if (activeQueueRows.length) {
          setActiveTab('Queue Management');
        } else {
          setActiveTab('Client Intake');
        }
        return;
      }
      if (draftEncodingRows.length) {
        setActiveTab('Draft Entries');
      } else if (activeQueueRows.length) {
        setActiveTab('Queue Management');
      } else {
        setActiveTab('Client Intake');
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, [activeQueueRows.length, assignments.length, booksLoading, draftEncodingRows.length, location.state?.startAt, role]);

  function renderActiveModule() {
    if (!moduleAccess[activeTab]?.includes(role)) return <AccessNotice title="Module restricted" message="Your current role cannot open this workflow module." />;
    if (activeTab === 'Client Intake') return <ClientIntake role={role} intakes={intakes} onCreated={loadWorkflow} onToast={setToast} />;
    if (activeTab === 'Queue Management') return <QueueManagement role={role} intakes={intakes} drafts={drafts} books={books} entries={entries} onAction={loadWorkflow} onToast={setToast} />;
    if (activeTab === 'Queue History') return <QueueHistory intakes={intakes} drafts={drafts} />;
    if (activeTab === 'Draft Entries') return <DraftEntries role={role} drafts={drafts} draftAssignments={draftAssignments} setDrafts={setDrafts} reload={loadWorkflow} onToast={setToast} selectedDraftId={selectedDraftId} setSelectedDraftId={setSelectedDraftId} />;
    return (
      <EntryFinalization
        role={role}
        assignments={assignments}
        reload={loadWorkflow}
        booksLoading={booksLoading}
        onToast={setToast}
        onEditDraft={(id) => {
          setSelectedDraftId(String(id));
          setActiveTab('Draft Entries');
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workflow layer"
        title="Notarial workflow controls"
        subtitle="Client intake, queue processing, draft encoding, and first-come finalization."
        actions={
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
            <CheckCircle2 className="h-4 w-4" />
            {roleMatrix[role]?.label ?? 'Workflow'} view
          </div>
        }
      />
      <WorkflowStrip />
      {loadError ? <AccessNotice title="Workflow data unavailable" message={loadError} /> : null}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle>Workflow modules</CardTitle>
          <CardDescription>Activity is recorded in the existing Activity Logs page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Tabs tabs={roleTabs} active={activeTab} onChange={setActiveTab} />
          {renderActiveModule()}
        </CardContent>
      </Card>
      <ToastNotification toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
