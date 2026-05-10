import React from 'react';

import { cn } from '../../lib/utils';

export default function AuthFormCard({
  eyebrow,
  heading,
  description,
  banner,
  children,
  footer,
  centerHeading = false,
  className,
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-black/8 md:shadow-lg',
        'border-white/10 bg-white/[0.04] backdrop-blur-sm md:border-slate-200 md:bg-white',
        'dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/30',
        className
      )}
    >
      {/* Mobile / dark-pane readable text */}
      <div
        className={cn(
          'mb-6 space-y-1 text-white md:text-slate-900 dark:text-slate-100',
          centerHeading && 'text-center'
        )}
      >
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-300 md:text-slate-500 dark:text-slate-400">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
        {description ? (
          <p className="text-sm leading-relaxed text-zinc-300 md:text-slate-600 dark:text-slate-300">{description}</p>
        ) : null}
      </div>

      {banner ? <div className="mb-4">{banner}</div> : null}

      <div>{children}</div>

      {footer ? (
        <div className="mt-6 border-t border-white/10 pt-6 text-center text-xs text-zinc-400 md:border-slate-100 md:text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
