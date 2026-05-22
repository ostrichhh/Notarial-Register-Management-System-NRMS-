import React from 'react';

import { cn } from '../../lib/utils';

export function Table({ children, className = '' }) {
  return <table className={cn('w-full border-collapse text-sm', className)}>{children}</table>;
}

export function TableHeader({ children }) {
  return (
    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
      {children}
    </thead>
  );
}

export function TableBody({ children }) {
  return <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{children}</tbody>;
}

export function TableRow({ children, className = '' }) {
  return <tr className={cn('align-top', className)}>{children}</tr>;
}

export function TableHead({ children, className = '' }) {
  return <th className={cn('px-3 py-3 font-semibold', className)}>{children}</th>;
}

export function TableCell({ children, className = '', ...props }) {
  return (
    <td className={cn('px-3 py-3 text-slate-700 dark:text-slate-300', className)} {...props}>
      {children}
    </td>
  );
}
