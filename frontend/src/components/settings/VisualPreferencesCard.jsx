import React, { useCallback, useState } from 'react';
import { Moon, Palette, Sun } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { applyNrmsTheme, persistNrmsTheme, readNrmsTheme } from '../../lib/nrmsTheme';
import { cn } from '../../lib/utils';

/**
 * Shared theme picker used in Settings and auth pages.
 *
 * @param {{ embedded?: boolean }} props
 * - embedded: renders without Card chrome (for login card embedding)
 */
export default function VisualPreferencesCard({ embedded = false }) {
  const [theme, setTheme] = useState(() => readNrmsTheme());

  const setAndPersistTheme = useCallback((nextTheme) => {
    try {
      setTheme(nextTheme);
      applyNrmsTheme(nextTheme);
      persistNrmsTheme(nextTheme);
    } catch {
      setTheme(nextTheme);
      applyNrmsTheme(nextTheme);
    }
  }, []);

  const content = (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => setAndPersistTheme('light')}
        className={cn(
          'flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-colors',
          theme === 'light'
            ? 'border-red-700 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-100'
            : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900'
        )}
      >
        <Sun className={cn('h-6 w-6', theme === 'light' ? 'text-red-700 dark:text-red-400' : 'text-slate-400')} />
        <span className="text-sm font-semibold text-slate-900 dark:text-white">Light Jurist</span>
        <span className="text-xs text-slate-600 dark:text-slate-400">Bright workspace for daytime filings.</span>
      </button>
      <button
        type="button"
        onClick={() => setAndPersistTheme('dark')}
        className={cn(
          'flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-colors',
          theme === 'dark'
            ? 'border-red-700 bg-red-950/30 text-red-100'
            : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900'
        )}
      >
        <Moon className={cn('h-6 w-6', theme === 'dark' ? 'text-red-400' : 'text-slate-400')} />
        <span className="text-sm font-semibold text-slate-900 dark:text-white">Dark Ledger</span>
        <span className="text-xs text-slate-600 dark:text-slate-400">Reduced glare for extended review sessions.</span>
      </button>
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <Palette className="h-4 w-4 text-red-700 dark:text-red-400" aria-hidden />
          Visual preferences
        </div>
        {content}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Palette className="h-5 w-5 text-red-700 dark:text-red-400" aria-hidden />
          Visual preferences
        </CardTitle>
        <CardDescription>Changes apply immediately and persist on this device.</CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}

