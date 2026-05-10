import React from 'react';
import { Loader2 } from 'lucide-react';

export default function PageSpinner({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
      <Loader2 className="h-9 w-9 animate-spin text-red-700 dark:text-red-500" aria-hidden />
      <p className="text-sm font-medium">{label}</p>
      <span className="sr-only">{label}</span>
    </div>
  );
}
