import React from 'react';

import { OCASION_LOGO_LIGHT_SRC } from '../../constants/branding';
import { cn } from '../../lib/utils';

/** Two-column branded shell used by login / first-login flows (mobile stacks). */
export default function AuthSplitShell({ children }) {
  return (
    <div className="grid min-h-[100dvh] w-full bg-zinc-950 md:grid-cols-[minmax(0,42%)_1fr]">
      <aside className="relative hidden flex-col overflow-hidden px-10 py-12 text-white md:flex">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_-10%,rgba(185,28,28,0.35),transparent_55%)] pointer-events-none" />
        <div className="relative flex flex-col gap-12">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-400">OCASION</p>
            <h2 className="text-3xl font-bold leading-snug lg:text-[2rem]">Law Office</h2>
            <p className="max-w-xs text-sm text-zinc-400">& Notary Public — Notarial Registry Management.</p>
          </div>

          <div className="mt-auto rounded-2xl border border-white/15 bg-black/35 p-5 backdrop-blur-sm">
            <p className="text-sm italic leading-relaxed text-zinc-200">
              &ldquo;Institutional safeguards for every instrument you swear to truth.&rdquo;
            </p>
            <div className="mt-6 border-t border-white/10 pt-4">
              <div className="inline-flex rounded-xl bg-white p-3 shadow-md ring-1 ring-black/5">
                <img
                  src={OCASION_LOGO_LIGHT_SRC}
                  alt="OCASION LAW OFFICE"
                  className="h-auto max-h-[4.75rem] w-full max-w-[11rem] object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main
        className={cn(
          'relative flex flex-col justify-center px-4 py-10 sm:px-8 md:bg-slate-50 md:py-14',
          'bg-gradient-to-b from-zinc-900 via-zinc-950 to-black md:bg-none'
        )}
      >
        <div className="mx-auto mb-8 flex w-full max-w-md shrink-0 justify-center md:hidden">
          <div className="rounded-xl bg-white px-4 py-3 shadow-lg ring-1 ring-white/20">
            <img
              src={OCASION_LOGO_LIGHT_SRC}
              alt="OCASION LAW OFFICE"
              className="h-auto max-h-16 w-auto max-w-[12rem] object-contain"
            />
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
