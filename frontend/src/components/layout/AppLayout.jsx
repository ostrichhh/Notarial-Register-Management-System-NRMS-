import React, { useEffect, useState } from 'react';
import { Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { Outlet, useLocation } from 'react-router';

import Navbar from '../navigation/navbar';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/shadcn/Button';

const ROUTE_DESCRIPTIONS = {
  '/': '',
  '/notarial-register-book': 'Manage Register Books',
  '/notarial-entries': 'Manage Notarial Entries',
  '/archive': 'Archive',
  '/audit-logs': 'Activity Logs',
  '/manage-user': 'User Management',
  '/analytics': 'Analytics & reports',
  '/settings': 'Settings',
  '/reports': 'Reports',
};

export default function AppLayout() {
  const { welcomeName, user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const subtitle = ROUTE_DESCRIPTIONS[location.pathname] ?? '';

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  function toggleSidebar() {
    const isMd = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
    if (isMd) setSidebarCollapsed((v) => !v);
    else setMobileOpen((v) => !v);
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="nrms-no-print fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <Navbar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-slate-200/80 md:border-l-0 dark:border-slate-800">
        <header className="nrms-no-print flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:gap-4 md:px-6">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileOpen || !sidebarCollapsed}
            onClick={toggleSidebar}
          >
            <span className="md:hidden">{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</span>
            <span className="hidden md:inline">
              {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </span>
          </Button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              OCASION LAW OFFICE & Notary · NRMS
            </p>
            <h1 className="truncate text-base font-bold text-slate-900 dark:text-white md:text-lg">
              Welcome,
              <span className="ml-1.5 font-semibold text-red-700 dark:text-red-400">{welcomeName}</span>
            </h1>
            {subtitle ? (
              <p className="truncate text-xs text-slate-600 dark:text-slate-400 md:text-sm">{subtitle}</p>
            ) : null}
          </div>

          <div className="shrink-0 text-right">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {user?.username ? `@${user.username}` : '—'}
            </p>
            <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {user?.role ?? '—'}
            </p>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
