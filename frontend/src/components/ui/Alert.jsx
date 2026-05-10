import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  X,
} from 'lucide-react';

const variants = {
  error: {
    container:
      'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200',
    icon: 'text-red-500 dark:text-red-400',
    IconComponent: AlertCircle,
  },
  success: {
    container:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
    icon: 'text-emerald-500 dark:text-emerald-400',
    IconComponent: CheckCircle2,
  },
  warning: {
    container:
      'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
    icon: 'text-amber-500 dark:text-amber-400',
    IconComponent: AlertTriangle,
  },
  info: {
    container:
      'border-red-200 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100',
    icon: 'text-red-600 dark:text-red-400',
    IconComponent: Info,
  },
};

/**
 * Shadcn-inspired reusable Alert component.
 *
 * @param {'error'|'success'|'warning'|'info'} variant
 * @param {string}  title       Optional bold title line
 * @param {string}  children    Description / body text
 * @param {boolean} dismissible Show close button
 * @param {() => void} onDismiss  Called when the close button is clicked
 * @param {string}  className   Extra classes
 */
export default function Alert({
  variant = 'info',
  title,
  children,
  dismissible = false,
  onDismiss,
  className = '',
}) {
  const style = variants[variant] || variants.info;
  const { IconComponent } = style;

  return (
    <div
      role="alert"
      className={`relative flex items-start gap-3 rounded-lg border p-3 text-sm ${style.container} ${className}`}
    >
      <IconComponent className={`mt-0.5 h-4 w-4 shrink-0 ${style.icon}`} />

      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold leading-tight">{title}</p>}
        {children && <p className={`${title ? 'mt-0.5' : ''} leading-snug`}>{children}</p>}
      </div>

      {dismissible && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-auto shrink-0 rounded-md p-0.5 opacity-70 transition-opacity hover:opacity-100"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
