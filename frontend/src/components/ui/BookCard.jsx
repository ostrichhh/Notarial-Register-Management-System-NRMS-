import React from 'react';

export default function BookCard({ bookNumber, entryCount, isFull, progressPercent, onOpen }) {
  return (
    <article
      className={`cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        !isFull ? 'border-blue-200' : 'border-slate-200'
      }`}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => event.key === 'Enter' && onOpen()}
    >
      <h3 className="mb-2 text-lg font-semibold text-slate-900">Book {bookNumber}</h3>
      <p className="text-sm text-slate-600">{entryCount} entries recorded</p>
      <p className="mt-1 text-sm text-slate-600">Status: {isFull ? 'Full' : 'Active'}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-sky-500" style={{ width: `${progressPercent}%` }} />
      </div>
    </article>
  );
}
