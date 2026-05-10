import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import AppButton from './AppButton';

/**
 * Shadcn-inspired confirmation dialog that displays a summary of data
 * before the user submits a form (add / edit).
 *
 * @param {boolean}  isOpen
 * @param {string}   title         e.g. "Confirm New Entry"
 * @param {string}   description   Optional subtitle
 * @param {{ label: string, value: string }[]} summaryItems  Key-value pairs to display
 * @param {string}   confirmLabel  Text for the confirm button (default: "Confirm")
 * @param {string}   cancelLabel   Text for the cancel button  (default: "Go Back")
 * @param {boolean}  loading       Disables buttons and shows a loading label
 * @param {() => void} onConfirm
 * @param {() => void} onCancel
 */
export default function ConfirmSubmitDialog({
  isOpen = false,
  title = 'Confirm Submission',
  description = '',
  summaryItems = [],
  confirmLabel = 'Confirm',
  cancelLabel = 'Go Back',
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4 dark:bg-black/60"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
            {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
        </div>

        {/* Summary Table */}
        <div className="max-h-80 overflow-y-auto px-5 py-4">
          <table className="w-full text-sm">
            <tbody>
              {summaryItems.map((item, index) => (
                <tr
                  key={index}
                  className={
                    index % 2 === 0
                      ? 'bg-slate-50/60 dark:bg-slate-900/60'
                      : 'bg-white dark:bg-slate-950'
                  }
                >
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-600 dark:text-slate-400">
                    {item.label}
                  </td>
                  <td className="max-w-xs break-words px-3 py-2 text-slate-900 dark:text-slate-100">
                    {item.value || <span className="text-slate-400 dark:text-slate-500">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/80">
          <AppButton type="button" variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </AppButton>
          <AppButton type="button" variant="primary" onClick={onConfirm} disabled={loading}>
            {loading ? 'Submitting...' : confirmLabel}
          </AppButton>
        </div>
      </div>
    </div>
  );
}
