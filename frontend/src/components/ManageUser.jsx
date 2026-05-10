import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  Search,
  PencilLine,
  UserX,
  UserCheck,
  PlusCircle,
  Trash2,
} from 'lucide-react';

import AxiosInstance from './Axios';
import PageHeader from './ui/PageHeader';
import StatCard from './ui/StatCard';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/Table';
import { Badge } from './ui/shadcn/Badge';
import { Button } from './ui/shadcn/Button';
import { Input } from './ui/shadcn/Input';
import AlertDialog from './ui/AlertDialog';
import AddEditUserDialog from './modal/AddEditUserDialog';
import { useAuth } from '../context/AuthContext';

// ─── Helpers ────────────────────────────────────────────────────────────────

const ROLE_LABEL = {
  ATTORNEY: 'Primary Notary',
  SECRETARY: 'Legal Secretary',
  ADMIN: 'Admin',
};

const ROLE_COLOR = {
  ATTORNEY: 'text-red-700 font-semibold',
  SECRETARY: 'text-amber-700 font-semibold',
  ADMIN: 'text-slate-700 font-semibold',
};

function formatLastActive(dateStr) {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHrs < 24) return `${diffHrs} hour${diffHrs !== 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatPadded(n) {
  return String(n).padStart(2, '0');
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ManageUser() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = add mode
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    try {
      const usersRes = await AxiosInstance.get('/users/');
      setUsers(usersRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const currentUserId = currentUser?.id == null ? null : String(currentUser.id);
  const managedUsers = useMemo(
    () => users.filter((u) => currentUserId == null || String(u.id) !== currentUserId),
    [users, currentUserId],
  );
  const activeCount = users.filter((u) => u.is_active).length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const inactiveCount = users.filter((u) => !u.is_active).length;

  // ── Table filter ─────────────────────────────────────────────────────────
  const filtered = managedUsers.filter((u) => {
    const q = search.toLowerCase();
    const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
    return (
      fullName.includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      ROLE_LABEL[u.role]?.toLowerCase().includes(q)
    );
  });

  const ordered = [...filtered].sort((a, b) => {
    const aName = `${a.last_name || ''} ${a.first_name || ''} ${a.username || ''}`.trim();
    const bName = `${b.last_name || ''} ${b.first_name || ''} ${b.username || ''}`.trim();
    return aName.localeCompare(bName, undefined, { sensitivity: 'base' });
  });

  // ── CRUD handlers ─────────────────────────────────────────────────────────
  function openAdd() {
    setEditingUser(null);
    setDialogOpen(true);
  }

  function openEdit(user) {
    setEditingUser(user);
    setDialogOpen(true);
  }

  async function handleSave(payload, userId) {
    if (userId) {
      await AxiosInstance.patch(`/users/${userId}/`, payload);
    } else {
      await AxiosInstance.post('/users/', payload);
    }

    await fetchUsers();
  }

  async function handleToggleActive(user) {
    await AxiosInstance.post(`/users/${user.id}/deactivate/`);

    await fetchUsers();
  }

  function requestDeleteUser(user) {
    setDeleteConfirm(user);
  }

  async function handleDeleteUser() {
    if (!deleteConfirm) return;

    setDeleteLoading(true);
    try {
      await AxiosInstance.delete(`/users/${deleteConfirm.id}/`);
      setDeleteConfirm(null);
      await fetchUsers();
    } finally {
      setDeleteLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ── */}
      <PageHeader
        title="User Management"
        subtitle="Control institutional access and audit office staff performance."
        actions={
          <Button onClick={openAdd} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Add New User
          </Button>
        }
      />

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Active Personnel"
          value={loading ? '—' : formatPadded(activeCount)}
          subLabel="Authorized office staff"
          icon={Users}
          iconColor="text-red-500"
        />
        <StatCard
          label="Admin Accounts"
          value={loading ? '—' : formatPadded(adminCount)}
          subLabel="Users with management access"
          icon={ShieldCheck}
          iconColor="text-red-600"
        />
        <StatCard
          label="Inactive Accounts"
          value={loading ? '—' : formatPadded(inactiveCount)}
          subLabel="Accounts currently disabled"
          icon={UserX}
          iconColor="text-amber-500"
        />
      </div>

      {/* ── Staff Table ── */}
      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        {/* Table toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">Registered Office Staff</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Filter staff…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-slate-400">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : ordered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-slate-400">
                    {search ? 'No staff match your search.' : 'No staff members found.'}
                  </TableCell>
                </TableRow>
              ) : (
                ordered.map((user) => (
                  <TableRow key={user.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/80">
                    {/* Name + email */}
                    <TableCell>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.username}
                      </p>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300">@{user.username}</p>
                      {user.email ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                      ) : null}
                    </TableCell>

                    {/* Role */}
                    <TableCell>
                      <span className={ROLE_COLOR[user.role] || 'text-slate-700'}>
                        {ROLE_LABEL[user.role] || user.role}
                      </span>
                    </TableCell>

                    {/* Status badge */}
                    <TableCell>
                      <Badge variant={user.is_active ? 'active' : 'inactive'}>
                        {user.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </TableCell>

                    {/* Last login */}
                    <TableCell className="text-slate-500 text-sm">
                      {formatLastActive(user.last_login)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit */}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit user"
                          onClick={() => openEdit(user)}
                        >
                          <PencilLine className="h-4 w-4 text-slate-500" />
                        </Button>

                        {/* Deactivate / Reactivate */}
                        <Button
                          variant="ghost"
                          size="icon"
                          title={user.is_active ? 'Deactivate user' : 'Reactivate user'}
                          onClick={() => handleToggleActive(user)}
                        >
                          {user.is_active ? (
                            <UserX className="h-4 w-4 text-red-500" />
                          ) : (
                            <UserCheck className="h-4 w-4 text-emerald-500" />
                          )}
                        </Button>

                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete user"
                          onClick={() => requestDeleteUser(user)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        {!loading && (
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            Showing {filtered.length} of {managedUsers.length} {managedUsers.length === 1 ? 'user' : 'users'}
          </div>
        )}
      </div>

      {/* ── Add / Edit Dialog ── */}
      <AddEditUserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={editingUser}
        onSave={handleSave}
      />

      <AlertDialog
        isOpen={Boolean(deleteConfirm)}
        title="Delete User?"
        description={
          deleteConfirm
            ? `@${deleteConfirm.username} will be permanently deleted. This action cannot be undone.`
            : ''
        }
        variant="danger"
        confirmLabel="Delete user"
        confirmLoadingLabel="Deleting…"
        loading={deleteLoading}
        onConfirm={handleDeleteUser}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
