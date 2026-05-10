import React, { useState } from 'react';
import Alert from '../ui/Alert';
import AppButton from '../ui/AppButton';
import ConfirmSubmitDialog from '../ui/ConfirmSubmitDialog';
import Input from '../ui/Input';

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
    appointment_date: '',
    expiration_date: '',
  });

  const [showConfirm, setShowConfirm] = useState(false);

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

  const handleFormSubmit = (event) => {
    event.preventDefault();
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    const payload = {
      ...formData,
      appointment_date: formData.appointment_date || null,
      expiration_date: formData.expiration_date || null,
    };
    await onSubmit(payload);
  };

  const isDisabled = Boolean(disabledReason) || submitting;

  const confirmSummaryItems = [
    { label: 'Book Number', value: formData.book_number },
    { label: 'Total Pages', value: String(formData.total_pages) },
    {
      label: 'Appointment Date',
      value: formData.appointment_date
        ? new Date(formData.appointment_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
        : '—',
    },
    {
      label: 'Expiration Date',
      value: formData.expiration_date
        ? new Date(formData.expiration_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
        : '—',
    },
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Add Register Book</h2>
            <button
              type="button"
              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          <form className="flex flex-col gap-4 p-5" onSubmit={handleFormSubmit}>
            {/* Row 1: Book Number + Total Pages */}
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium text-slate-700">
                Book Number <span className="text-red-500">*</span>
                <Input
                  className="mt-1"
                  id="book_number"
                  name="book_number"
                  type="text"
                  placeholder="e.g. 2026-001"
                  value={formData.book_number}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Total Pages <span className="text-red-500">*</span>
                <Input
                  className="mt-1"
                  id="total_pages"
                  name="total_pages"
                  type="number"
                  min="1"
                  value={formData.total_pages}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>

            {/* Row 2: Appointment Date + Expiration Date */}
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium text-slate-700">
                Appointment Date
                <Input
                  className="mt-1"
                  id="appointment_date"
                  name="appointment_date"
                  type="date"
                  value={formData.appointment_date}
                  onChange={handleChange}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Expiration Date
                <Input
                  className="mt-1"
                  id="expiration_date"
                  name="expiration_date"
                  type="date"
                  value={formData.expiration_date}
                  onChange={handleChange}
                />
              </label>
            </div>

            {disabledReason && (
              <Alert variant="warning">{disabledReason}</Alert>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-2">
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

      <ConfirmSubmitDialog
        isOpen={showConfirm}
        title="Confirm New Register Book"
        description="Please review the details below before adding."
        summaryItems={confirmSummaryItems}
        confirmLabel="Confirm & Add"
        loading={submitting}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
