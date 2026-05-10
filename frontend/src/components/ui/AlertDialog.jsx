import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

import { Button } from './shadcn/Button';

const icons = {
  danger: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
};

const iconColors = {
  danger: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-red-600',
};

const confirmVariants = {
  danger: 'destructive',
  warning: 'default',
  info: 'default',
};

/**
 * Confirmation dialog overlay (shadcn-styled triggers).
 *
 * @param {'danger'|'warning'|'info'} variant
 */
export default function AlertDialog({
  isOpen = false,
  title = 'Are you sure?',
  description = '',
  variant = 'danger',
  confirmLabel = 'Continue',
  cancelLabel = 'Cancel',
  loading = false,
  confirmLoadingLabel = 'Processing…',
  onConfirm,
  onCancel,
}) {
  if (!isOpen) {
    return null;
  }

  const IconComponent = icons[variant] || icons.info;
  const iconColor = iconColors[variant] || iconColors.info;
  const confirmVariant = confirmVariants[variant] || confirmVariants.info;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 dark:bg-black/60"
      onClick={loading ? undefined : onCancel}
    >
      <div
        role="dialog"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={description ? 'confirm-dialog-desc' : undefined}
        className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex gap-4 p-6">
          <div className={`mt-0.5 shrink-0 ${iconColor}`}>
            <IconComponent className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="confirm-dialog-title" className="text-base font-semibold text-slate-900">
              {title}
            </h3>
            {description ? (
              <p id="confirm-dialog-desc" className="mt-1 text-sm text-slate-600">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-3 dark:border-slate-800 dark:bg-slate-900/80">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant === 'destructive' ? 'destructive' : 'default'}
            onClick={onConfirm}
            isLoading={loading}
            loadingLabel={confirmLoadingLabel}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
