import React from 'react';

const variants = {
  default:
    'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300',
  outline:
    'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-200',
};

export default function Badge({ variant = 'default', children }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}
