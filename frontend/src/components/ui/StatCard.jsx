import React from 'react';
import { cn } from '../../lib/utils';

export default function StatCard({ label, value, subLabel, icon: Icon, iconColor = 'text-slate-400', className }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        {Icon && <Icon className={cn('h-5 w-5', iconColor)} />}
      </div>
      <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
      {subLabel ? <div className="text-xs text-slate-500 dark:text-slate-400">{subLabel}</div> : null}
    </div>
  );
}
