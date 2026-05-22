import React, { useEffect } from 'react';
import { CheckCircle2, Clock3, FileSearch, Search, X } from 'lucide-react';

import { cn } from '../../lib/utils';
import Input from '../ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { Badge } from '../ui/shadcn/Badge';
import { Button } from '../ui/shadcn/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/shadcn/Dialog';

const statusStyles = {
  Pending: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  Processing: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200',
  Completed: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
  Draft: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
  Review: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200',
  Finalized: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
  Archived: 'border-slate-300 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400',
  Override: 'border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-200',
  Cancelled: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200',
};

export function StatusBadge({ status }) {
  return (
    <Badge variant="outline" className={cn('border font-semibold', statusStyles[status])}>
      {status}
    </Badge>
  );
}

export function RoleAccessCard({ role, permissions }) {
  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardHeader className="p-4">
        <CardTitle className="text-sm text-slate-900 dark:text-slate-100">{role} access</CardTitle>
        <CardDescription>Visibility for this workflow module.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        {permissions.map((item) => (
          <div key={item} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-yellow-600" />
            <span>{item}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function DataTable({ columns, rows, empty = 'No records found.', actions, tableClassName = '', actionsClassName = '' }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="overflow-x-auto">
        <Table className={tableClassName}>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.headClassName}>{column.label}</TableHead>
              ))}
              {actions ? <TableHead className={cn('text-right', actionsClassName)}>Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/70">
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.cellClassName}>
                      {column.render ? column.render(row) : row[column.key]}
                    </TableCell>
                  ))}
                  {actions ? <TableCell className={cn('text-right align-middle', actionsClassName)}>{actions(row)}</TableCell> : null}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + (actions ? 1 : 0)} className="py-10 text-center text-slate-500 dark:text-slate-400">
                  {empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function Modal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  children,
  contentClassName = '',
  footerClassName = '',
  footerLeading = null,
  confirmDisabled = false,
  hideCancel = false,
  onClose,
  onConfirm,
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose?.() : undefined)}>
      <DialogContent className={contentClassName}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
        <DialogFooter className={cn('gap-2', footerClassName)}>
          {!hideCancel ? (
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          ) : null}
          {footerLeading}
          <Button type="button" className="bg-slate-900 hover:bg-slate-800" disabled={confirmDisabled} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Drawer({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30" role="presentation" onClick={onClose}>
      <aside
        className="h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
        role="dialog"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close preview">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-5">{children}</div>
      </aside>
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={cn(
            'border-b-2 px-3 py-2 text-sm font-semibold transition-colors',
            active === tab
              ? 'border-yellow-600 text-slate-950 dark:text-slate-100'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
          )}
          onClick={() => onChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

export function FormInput({ label, hint, className, ...props }) {
  return (
    <label className={cn('grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200', className)}>
      <span>{label}</span>
      <Input {...props} />
      {hint ? <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{hint}</span> : null}
    </label>
  );
}

export function SearchBar({ value, onChange, placeholder = 'Search records...' }) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="pl-9" />
    </div>
  );
}

export function FilterPanel({ children }) {
  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-900/60">
      {children}
    </div>
  );
}

export function AccessNotice({ title, message }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
      <p className="font-semibold">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}

export function ActivityTimeline({ logs }) {
  return (
    <div className="space-y-4">
      {logs.map((log, index) => (
        <div key={log.id} className="grid grid-cols-[auto_1fr] gap-3">
          <div className="flex flex-col items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-yellow-200 bg-yellow-50 text-yellow-700">
              <Clock3 className="h-4 w-4" />
            </span>
            {index < logs.length - 1 ? <span className="h-full w-px bg-slate-200" /> : null}
          </div>
          <Card className="rounded-lg">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{log.action}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{log.description}</p>
                </div>
                <UserBadge user={log.user} role={log.role} />
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{log.time}</p>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

export function UserBadge({ user, role }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
      <FileSearch className="h-3.5 w-3.5 text-slate-500" />
      {user}
      <span className="text-yellow-700">{role}</span>
    </span>
  );
}

export function ToastNotification({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => onDismiss?.(), 3200);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[70] rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
      <p className="font-semibold text-slate-900 dark:text-slate-100">{toast.title}</p>
      <p className="mt-0.5">{toast.message}</p>
    </div>
  );
}
