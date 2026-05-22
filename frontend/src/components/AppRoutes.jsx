import React from 'react';
import { Navigate, Route, Routes } from 'react-router';

import ProtectedRoutes from './auth/ProtectedRoutes';
import Analytics from './Analytics';
import AuditLogs from './AuditLogs';
import FirstLoginPasswordPage from './auth/FirstLoginPasswordPage';
import LoginPage from './auth/LoginPage';
import AppLayout from './layout/AppLayout';
import Archive from './Archive';
import Dashboard from './Dashboard';
import ManageUser from './ManageUser';
import NotarialEntries from './NotarialEntries';
import NotarialRegisterBooks from './NotarialRegisterBooks';
import RoleGuard from './roles/RoleGuard';
import Settings from './Settings';
import WorkflowPage from './workflow/WorkflowPage';

/**
 * Routing after auth hydrate (see AuthProvider): public auth pages + protected NRMS workspace.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/first-login" element={<FirstLoginPasswordPage />} />

      <Route element={<ProtectedRoutes />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/notarial-register-book" element={<NotarialRegisterBooks />} />
          <Route path="/notarial-entries" element={<NotarialEntries />} />
          <Route path="/workflow" element={<WorkflowPage />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/reports" element={<Navigate to="/analytics" replace />} />
          <Route
            path="/manage-user"
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <ManageUser />
              </RoleGuard>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <RoleGuard allowedRoles={['ADMIN', 'ATTORNEY']}>
                <AuditLogs />
              </RoleGuard>
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}
