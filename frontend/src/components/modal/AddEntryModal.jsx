import React, { useMemo, useState } from 'react';
import Alert from '../ui/Alert';
import AppButton from '../ui/AppButton';
import ConfirmSubmitDialog from '../ui/ConfirmSubmitDialog';
import Input from '../ui/Input';
import PeopleInput from '../ui/PeopleInput';
import Select from '../ui/Select';
import {
  findOverlappingPeople,
  formatPartyIdsOnly,
  normalizeParties,
  normalizeWitnesses,
  sanitizeEntryTitle,
} from '../../lib/entryFormData';

const notarialTypeLabel = {
  ACK: 'Acknowledgement',
  SUB: 'Subscription',
  CERT: 'Certification',
};

const remarksLabel = {
  CR: 'Copy Retained',
  NCR: 'No Copy Retained',
};

const formatPeopleForSummary = (people) => {
  if (!people || people.length === 0) return '—';
  return people
    .map((p) => {
      let line = p.name;
      if (p.address) line += ` (${p.address})`;
      return line;
    })
    .join('\n');
};

const DEFAULT_FORM = {
  book: '',
  entry_number: '',
  title: '',
  date_time: '',
  notarial_type: 'ACK',
  fees: '',
  or_number: '',
  remarks: 'CR',
};

export default function AddEntryModal({
  isOpen,
  onClose,
  onSubmit,
  books,
  defaultBookId,
  submitting,
  errorMessage,
}) {
  const [formData, setFormData] = useState({ ...DEFAULT_FORM, book: defaultBookId || '' });
  const [parties, setParties] = useState([]);
  const [witnesses, setWitnesses] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [validationError, setValidationError] = useState('');

  const bookOptions = useMemo(() => books || [], [books]);

  const selectedBookLabel = useMemo(() => {
    const found = bookOptions.find((b) => String(b.id) === String(formData.book));
    return found ? `Book ${found.book_number}` : '—';
  }, [bookOptions, formData.book]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValidationError('');
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setValidationError('');

    const cleanParties = normalizeParties(parties);
    const cleanWitnesses = normalizeWitnesses(witnesses);
    const duplicatePeople = findOverlappingPeople(cleanParties, cleanWitnesses);
    const cleanTitle = sanitizeEntryTitle(formData.title, [...cleanParties, ...cleanWitnesses]);

    if (!cleanTitle) {
      setValidationError('Enter only the title or description of the instrument. Do not use party or witness names as the title.');
      return;
    }

    if (cleanParties.length === 0) {
      setValidationError('Add at least one party before saving the entry.');
      return;
    }

    if (duplicatePeople.length > 0) {
      setValidationError(`Parties and witnesses must be different people. Remove ${duplicatePeople.join(', ')} from either Parties or Witnesses.`);
      return;
    }

    const payload = {
      book: Number(formData.book),
      entry_number: Number(formData.entry_number),
      title: cleanTitle,
      date_time: formData.date_time ? new Date(formData.date_time).toISOString() : '',
      notarial_type: formData.notarial_type,
      fees: formData.fees,
      or_number: formData.or_number,
      remarks: formData.remarks,
      parties: cleanParties,
      witnesses: cleanWitnesses,
    };

    setPendingPayload(payload);
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    if (!pendingPayload) return;
    const success = await onSubmit(pendingPayload);
    if (success) {
      setShowConfirm(false);
      setPendingPayload(null);
      setFormData({ ...DEFAULT_FORM, book: defaultBookId || '' });
      setParties([]);
      setWitnesses([]);
      setValidationError('');
    } else {
      setShowConfirm(false);
    }
  };

  const confirmSummaryItems = pendingPayload
    ? [
        { label: 'Book', value: selectedBookLabel },
        { label: 'Entry #', value: String(pendingPayload.entry_number) },
        { label: 'Title', value: pendingPayload.title },
        {
          label: 'Date / Time',
          value: pendingPayload.date_time
            ? new Date(pendingPayload.date_time).toLocaleString()
            : '—',
        },
        {
          label: 'Notarial Type',
          value: notarialTypeLabel[pendingPayload.notarial_type] || pendingPayload.notarial_type,
        },
        {
          label: 'Fees',
          value: `₱ ${Number(pendingPayload.fees).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        },
        { label: 'OR Number', value: pendingPayload.or_number },
        { label: 'Remarks', value: remarksLabel[pendingPayload.remarks] || pendingPayload.remarks },
        { label: 'Parties', value: formatPeopleForSummary(pendingPayload.parties) },
        { label: 'Party IDs', value: formatPartyIdsOnly(pendingPayload.parties) },
        { label: 'Witnesses', value: formatPeopleForSummary(pendingPayload.witnesses) },
      ]
    : [];

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
        onClick={onClose}
      >
        <div
          className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
            <h2 className="text-lg font-semibold text-slate-900">Add New Notarial Entry</h2>
            <button
              type="button"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          <form className="flex flex-col gap-5 p-5" onSubmit={handleSubmit}>
            {/* Row 1: Book + Entry Number */}
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-slate-700">
                Book <span className="text-red-500">*</span>
                <Select
                  className="mt-1"
                  name="book"
                  value={formData.book}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Select a book' },
                    ...bookOptions.map((book) => ({
                      value: String(book.id),
                      label: `Book ${book.book_number}`,
                    })),
                  ]}
                  required
                />
              </label>

              <label className="text-sm text-slate-700">
                Entry Number <span className="text-red-500">*</span>
                <Input
                  className="mt-1"
                  name="entry_number"
                  type="number"
                  min="1"
                  max="525"
                  value={formData.entry_number}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>

            {/* Row 2: Title */}
            <label className="text-sm text-slate-700">
              Title / Instrument Only <span className="text-red-500">*</span>
              <Input
                className="mt-1"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Example: Deed of Sale, Affidavit of Loss"
                required
              />
            </label>

            {/* Row 3: Date/Time + Notarial Type */}
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-slate-700">
                Date / Time <span className="text-red-500">*</span>
                <Input
                  className="mt-1"
                  name="date_time"
                  type="datetime-local"
                  value={formData.date_time}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="text-sm text-slate-700">
                Notarial Type <span className="text-red-500">*</span>
                <Select
                  className="mt-1"
                  name="notarial_type"
                  value={formData.notarial_type}
                  onChange={handleChange}
                  options={[
                    { value: 'ACK', label: 'Acknowledgement' },
                    { value: 'SUB', label: 'Subscription' },
                    { value: 'CERT', label: 'Certification' },
                  ]}
                  required
                />
              </label>
            </div>

            {/* Row 4: Fees + OR Number + Remarks */}
            <div className="grid grid-cols-3 gap-3">
              <label className="text-sm text-slate-700">
                Fees <span className="text-red-500">*</span>
                <Input
                  className="mt-1"
                  name="fees"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.fees}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="text-sm text-slate-700">
                OR Number <span className="text-red-500">*</span>
                <Input
                  className="mt-1"
                  name="or_number"
                  value={formData.or_number}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="text-sm text-slate-700">
                Remarks <span className="text-red-500">*</span>
                <Select
                  className="mt-1"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  options={[
                    { value: 'CR', label: 'Copy Retained' },
                    { value: 'NCR', label: 'No Copy Retained' },
                  ]}
                  required
                />
              </label>
            </div>

            {/* Divider */}
            <hr className="border-slate-100" />

            {/* Parties */}
            <PeopleInput
              label="Parties"
              people={parties}
              onChange={setParties}
              withIdentities
              required
            />

            {/* Witnesses */}
            <PeopleInput
              label="Witnesses"
              people={witnesses}
              onChange={setWitnesses}
            />

            {/* Error */}
            {validationError && <Alert variant="error">{validationError}</Alert>}
            {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

            {/* Actions */}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-2">
              <AppButton type="button" variant="secondary" onClick={onClose}>
                Cancel
              </AppButton>
              <AppButton type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Entry'}
              </AppButton>
            </div>
          </form>
        </div>
      </div>

      <ConfirmSubmitDialog
        isOpen={showConfirm}
        title="Confirm New Entry"
        description="Please review the details below before submitting."
        summaryItems={confirmSummaryItems}
        confirmLabel="Confirm & Save"
        loading={submitting}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
