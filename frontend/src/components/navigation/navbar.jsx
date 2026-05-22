import React, { useCallback, useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { LogOut } from 'lucide-react';

import AlertDialog from '../ui/AlertDialog';
import { Button } from '../ui/shadcn/Button';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { OCASION_LOGO_DARK_SRC, OCASION_LOGO_LIGHT_SRC } from '../../constants/branding';
import { filterNavItemsByRole } from '../../lib/navigationConfig';
import { setFlashMessage } from '../../lib/flashMessages';

export default function Navbar({ collapsed, mobileOpen, onNavigate }) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const links = filterNavItemsByRole(user?.role);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const openConfirm = useCallback(() => setConfirmOpen(true), []);
  const closeConfirm = useCallback(() => {
    if (!loggingOut) setConfirmOpen(false);
  }, [loggingOut]);

  async function handleConfirmLogout() {
    setLoggingOut(true);
    try {
      await logout();
      setFlashMessage('login', {
        variant: 'success',
        title: 'Signed out',
        msg: 'You have signed out successfully.',
      });
      navigate('/login', {
        replace: true,
        state: { postLogoutMessage: 'You have signed out successfully.' },
      });
    } finally {
      setLoggingOut(false);
      setConfirmOpen(false);
      onNavigate?.();
    }
  }

  return (
    <>
      <AlertDialog
        isOpen={confirmOpen}
        title="Sign out?"
        description="You will need to authenticate again before accessing NRMS workspaces."
        variant="warning"
        confirmLabel="Logout"
        confirmLoadingLabel="Signing out…"
        cancelLabel="Stay signed in"
        loading={loggingOut}
        onCancel={closeConfirm}
        onConfirm={handleConfirmLogout}
      />

      <aside
        className={cn(
          'nrms-no-print fixed left-0 top-0 z-50 flex h-[100dvh] flex-shrink-0 flex-col border-r border-slate-200 bg-white text-slate-800 shadow-xl transition-[width,transform] duration-200 ease-out md:static md:z-auto md:shadow-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100',
          collapsed ? 'md:w-[4.75rem]' : 'w-[min(92vw,18rem)] md:w-[18rem]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div
          className={cn(
            'flex shrink-0 items-center border-b border-slate-100 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950',
            collapsed ? 'md:justify-center md:px-2' : ''
          )}
        >
          <img
            src={OCASION_LOGO_LIGHT_SRC}
            alt="OCASION LAW OFFICE & Notary Public"
            className={cn(
              'h-auto max-h-[4.25rem] w-full object-contain object-left dark:hidden',
              collapsed ? 'md:max-h-12 md:w-12 md:object-center' : ''
            )}
          />
          <img
            src={OCASION_LOGO_DARK_SRC}
            alt="OCASION LAW OFFICE & Notary Public"
            className={cn(
              'hidden h-auto max-h-[4.25rem] w-full object-contain object-left opacity-90 brightness-110 contrast-125 dark:block',
              collapsed ? 'md:max-h-12 md:w-12 md:object-center' : ''
            )}
          />
        </div>

        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3" aria-label="Main navigation">
          <ul className="flex flex-col gap-1">
            {links.map((item) => {
              const IconComponent = item.Icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    title={collapsed ? item.label : undefined}
                    onClick={() => onNavigate?.()}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        collapsed && 'md:justify-center md:gap-0 md:px-2',
                        isActive
                          ? 'bg-red-700 text-white shadow-sm dark:bg-red-700 dark:text-white'
                          : 'text-slate-600 hover:bg-red-50 hover:text-red-900 dark:text-slate-300 dark:hover:bg-red-950/40 dark:hover:text-red-200'
                      )
                    }
                  >
                    <IconComponent className="h-5 w-5 shrink-0" aria-hidden />
                    <span className={cn('truncate', collapsed && 'md:sr-only')}>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openConfirm}
            title="Log out"
            className={cn(
              'w-full gap-2 border-red-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50 hover:text-red-900 dark:border-red-900 dark:bg-slate-950 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300',
              collapsed ? 'md:justify-center md:px-2' : 'justify-center sm:justify-start'
            )}
          >
            <LogOut className="h-4 w-4 shrink-0 md:mr-0" />
            <span className={cn(collapsed && 'md:sr-only')}>Logout</span>
          </Button>
        </div>
      </aside>
    </>
  );
}
