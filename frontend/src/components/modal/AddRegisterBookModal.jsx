import React, { useState } from 'react';
import AppButton from '../ui/AppButton';

const DEFAULT_TOTAL_PAGES = 105;

export default function AddRegisterBookModal({
  isOpen,
  onClose,
  onSubmit,
  disabledReason = '',
  submitting = false,
}) {
  const [formData, setFormData] = useState({
    book_number: '',
    total_pages: DEFAULT_TOTAL_PAGES,
  });

  if (!isOpen) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: name === 'total_pages' ? Number(value) : value,
    }));
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    await onSubmit(formData);
  };

  const isDisabled = Boolean(disabledReason) || submitting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Add Register Book</h2>
          <button type="button" className="text-slate-500 hover:text-slate-700" onClick={onClose}>
            x
          </button>
        </div>

        <form className="flex flex-col gap-2 p-5" onSubmit={handleFormSubmit}>
          <label htmlFor="book_number" className="text-sm font-medium text-slate-700">
            Book Number
          </label>
          <input
            id="book_number"
            name="book_number"
            type="text"
            placeholder="Example: 2026-001"
            value={formData.book_number}
            onChange={handleChange}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring"
            required
          />

          <label htmlFor="total_pages" className="mt-2 text-sm font-medium text-slate-700">
            Total Pages
          </label>
          <input
            id="total_pages"
            name="total_pages"
            type="number"
            min="1"
            value={formData.total_pages}
            onChange={handleChange}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring"
            required
          />

          {disabledReason && (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
              {disabledReason}
            </p>
          )}

          <div className="mt-3 flex justify-end gap-2">
            <AppButton type="button" variant="secondary" onClick={onClose}>
              Cancel
            </AppButton>
            <AppButton type="submit" variant="primary" disabled={isDisabled}>
              {submitting ? 'Adding...' : 'Add Book'}
            </AppButton>
          </div>
        </form>
      </div>
    </div>
  );
}
