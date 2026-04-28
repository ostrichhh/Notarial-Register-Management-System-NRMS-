import React, { useMemo, useState } from 'react';
import AppButton from '../ui/AppButton';
import Input from '../ui/Input';
import Select from '../ui/Select';

const parsePeople = (value) => {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...addressParts] = line.split('|');
      return {
        name: (name || '').trim(),
        address: addressParts.join('|').trim(),
      };
    })
    .filter((person) => person.name.length > 0);
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
  const [formData, setFormData] = useState({
    book: defaultBookId || '',
    entry_number: '',
    title: '',
    date_time: '',
    notarial_type: 'ACK',
    fees: '',
    or_number: '',
    remarks: 'CR',
    partiesInput: '',
    witnessesInput: '',
  });

  const bookOptions = useMemo(() => books || [], [books]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const parties = parsePeople(formData.partiesInput).map((party) => ({
      ...party,
      identities: [],
    }));
    const witnesses = parsePeople(formData.witnessesInput);

    const payload = {
      book: Number(formData.book),
      entry_number: Number(formData.entry_number),
      title: formData.title,
      date_time: formData.date_time ? new Date(formData.date_time).toISOString() : '',
      notarial_type: formData.notarial_type,
      fees: formData.fees,
      or_number: formData.or_number,
      remarks: formData.remarks,
      parties,
      witnesses,
    };

    const success = await onSubmit(payload);
    if (success) {
      setFormData({
        book: defaultBookId || '',
        entry_number: '',
        title: '',
        date_time: '',
        notarial_type: 'ACK',
        fees: '',
        or_number: '',
        remarks: 'CR',
        partiesInput: '',
        witnessesInput: '',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Add New Notarial Entry</h2>
          <button type="button" className="text-slate-500 hover:text-slate-700" onClick={onClose}>
            x
          </button>
        </div>

        <form className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="text-sm text-slate-700">
            Book
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
            Entry Number
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

          <label className="text-sm text-slate-700 md:col-span-2">
            Title
            <Input
              className="mt-1"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </label>

          <label className="text-sm text-slate-700">
            Date / Time
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
            Notarial Type
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

          <label className="text-sm text-slate-700">
            Fees
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
            OR Number
            <Input
              className="mt-1"
              name="or_number"
              value={formData.or_number}
              onChange={handleChange}
              required
            />
          </label>

          <label className="text-sm text-slate-700">
            Remarks
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

          <label className="text-sm text-slate-700">
            Parties (one per line, format: Name|Address)
            <textarea
              className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2"
              name="partiesInput"
              value={formData.partiesInput}
              onChange={handleChange}
              placeholder="Juan Dela Cruz|Manila"
              required
            />
          </label>

          <label className="text-sm text-slate-700">
            Witnesses (one per line, format: Name|Address)
            <textarea
              className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2"
              name="witnessesInput"
              value={formData.witnessesInput}
              onChange={handleChange}
              placeholder="Pedro Santos|Quezon City"
              required
            />
          </label>

          {errorMessage && <p className="md:col-span-2 rounded-md bg-red-50 p-2 text-sm text-red-700">{errorMessage}</p>}

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
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
  );
}
