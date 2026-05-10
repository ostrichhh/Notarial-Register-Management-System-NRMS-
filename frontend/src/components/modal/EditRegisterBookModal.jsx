import React, { useEffect, useState } from 'react';
import AppButton from '../ui/AppButton';
import ConfirmSubmitDialog from '../ui/ConfirmSubmitDialog';
import Input from '../ui/Input';

export default function EditRegisterBookModal({
  isOpen,
  onClose,
  onSubmit,
  book,
  submitting = false,
  errorMessage = '',
}) {
  const [formData, setFormData] = useState({
    book_number: '',
    total_pages: 105,
    appointment_date: '',
    expiration_date: '',
  });

  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (book) {
      setFormData({
        book_number: book.book_number || '',
        total_pages: book.total_pages ?? 105,
        appointment_date: book.appointment_date || '',
        expiration_date: book.expiration_date || '',
      });
    }
  }, [book]);

  if (!isOpen || !book) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
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
    await onSubmit(book.id, payload);
  };

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const confirmSummaryItems = [
    { label: 'Book Number', value: formData.book_number },
    { label: 'Total Pages', value: String(formData.total_pages) },
    { label: 'Appointment Date', value: formatDateLabel(formData.appointment_date) },
    { label: 'Expiration Date', value: formatDateLabel(formData.expiration_date) },
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Edit Register Book</h2>
              <p className="text-xs text-slate-500">Book {book.book_number}</p>
            </div>
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
                  name="book_number"
                  type="text"
                  value={formData.book_number}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Total Pages <span className="text-red-500">*</span>
                <Input
                  className="mt-1"
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
                  name="expiration_date"
                  type="date"
                  value={formData.expiration_date}
                  onChange={handleChange}
                />
              </label>
            </div>

            {errorMessage && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {errorMessage}
              </p>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-2">
              <AppButton type="button" variant="secondary" onClick={onClose}>
                Cancel
              </AppButton>
              <AppButton type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </AppButton>
            </div>
          </form>
        </div>
      </div>

      <ConfirmSubmitDialog
        isOpen={showConfirm}
        title="Confirm Book Update"
        description="Please review the changes below before saving."
        summaryItems={confirmSummaryItems}
        confirmLabel="Confirm & Save"
        loading={submitting}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
