import React from 'react';

import { BRAND } from '../../lib/brandClasses';

const variants = {
  primary: `${BRAND.buttonPrimary} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-600`,
  secondary:
    'bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600',
  outline:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

export default function AppButton({ variant = 'primary', className = '', ...props }) {
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
