import React from 'react';

import { OCASION_LOGO_DARK_SRC, OCASION_LOGO_LIGHT_SRC } from '../../constants/branding';

export default function AuthCenteredShell({ children }) {
  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-black">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col items-center px-4 py-10">
        <div className="mb-8 flex w-full items-center justify-center">
          <img
            src={OCASION_LOGO_LIGHT_SRC}
            alt="OCASION LAW OFFICE & Notary Public"
            className="h-auto max-h-14 w-auto object-contain dark:hidden"
          />
          <img
            src={OCASION_LOGO_DARK_SRC}
            alt="OCASION LAW OFFICE & Notary Public"
            className="hidden h-auto max-h-14 w-auto object-contain opacity-90 brightness-110 contrast-125 dark:block"
          />
        </div>
        <div className="w-full max-w-md">{children}</div>
        <p className="mt-10 text-center text-xs text-slate-400 dark:text-slate-500">
          © 2026 Notarial Register Management System
        </p>
      </div>
    </div>
  );
}

