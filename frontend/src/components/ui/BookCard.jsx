import React from 'react';
import { Edit, Archive } from 'lucide-react';

import { BRAND } from '../../lib/brandClasses';

export default function BookCard({
  book,
  entryCount,
  isFull,
  progressPercent,
  onOpen,
  onEdit,
  onArchive,
}) {
  const { book_number, appointment_date, expiration_date } = book;
  const isArchived = Boolean(book.is_archived);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <article
      className={`relative rounded-xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-950 ${
        isArchived
          ? 'border-dashed border-slate-300 bg-slate-50 opacity-80 dark:border-slate-700 dark:bg-slate-900/60'
          : !isFull ? BRAND.accentBorder : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      {/* Action buttons — top right */}
      {!isArchived ? (
        <div className="absolute right-3 top-3 flex items-center gap-1">
          <button
            type="button"
            title="Edit book"
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            onClick={(e) => { e.stopPropagation(); onEdit && onEdit(book); }}
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Archive book"
            className="rounded-md p-1.5 text-amber-500 transition-colors hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/40 dark:hover:text-amber-400"
            onClick={(e) => { e.stopPropagation(); onArchive && onArchive(book); }}
          >
            <Archive className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* Clickable body */}
      <div
        className={isArchived ? 'cursor-default' : 'cursor-pointer'}
        role="button"
        tabIndex={0}
        onClick={isArchived ? undefined : onOpen}
        onKeyDown={(e) => !isArchived && e.key === 'Enter' && onOpen()}
      >
        <h3 className="mb-1 pr-16 text-lg font-semibold text-slate-900">Book {book_number}</h3>

        <p className="text-sm text-slate-600">{entryCount} / 525 entries</p>
        <p className="mt-0.5 text-sm">
          <span
            className={`font-medium ${isArchived || isFull ? 'text-slate-500 dark:text-slate-400' : BRAND.accentText}`}
          >
            {isArchived ? 'Archived slot' : isFull ? 'Full' : 'Active'}
          </span>
        </p>

        {/* Dates */}
        <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-500 dark:text-slate-400">
          <p>
            <span className="font-medium text-slate-600 dark:text-slate-300">Appointed:</span>{' '}
            {formatDate(appointment_date)}
          </p>
          <p>
            <span className="font-medium text-slate-600 dark:text-slate-300">Expires:</span>{' '}
            {formatDate(expiration_date)}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className={`h-full rounded-full transition-all ${isArchived || isFull ? 'bg-slate-400' : BRAND.progressFill}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </article>
  );
}
