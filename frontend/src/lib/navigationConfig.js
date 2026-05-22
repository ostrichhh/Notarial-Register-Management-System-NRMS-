import {
  Archive,
  BarChart3,
  BookMarked,
  ClipboardList,
  Files,
  GitBranch,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react';

/** @typedef {{ to: string, label: string, Icon: import('react').ComponentType<{ className?: string }>, allowedRoles?: string[] }} NavItem */

/** @type {NavItem[]} */
export const APP_NAV_ITEMS = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/notarial-register-book', label: 'Manage Register Books', Icon: BookMarked },
  { to: '/workflow', label: 'Workflow', Icon: GitBranch },
  { to: '/notarial-entries', label: 'Manage Notarial Entries', Icon: Files },
  { to: '/analytics', label: 'Analytics', Icon: BarChart3 },
  { to: '/audit-logs', label: 'Activity Logs', Icon: ClipboardList, allowedRoles: ['ADMIN', 'ATTORNEY'] },
  { to: '/archive', label: 'Archive', Icon: Archive },
  { to: '/manage-user', label: 'User Management', Icon: Users, allowedRoles: ['ADMIN'] },
  { to: '/settings', label: 'Settings', Icon: Settings },
];

/** Admin-only items are hidden from Attorney and Secretary users. */
export function filterNavItemsByRole(role, items = APP_NAV_ITEMS) {
  return items.filter((item) => {
    if (!item.allowedRoles?.length) return true;
    return role && item.allowedRoles.includes(role);
  });
}
