import React from 'react';
import { Navigate, Outlet } from 'react-router';

import PageSpinner from '../ui/PageSpinner';
import { useAuth } from '../../context/AuthContext';

/** Guards app shell: redirects unauthenticated or users who must change password. */
export default function ProtectedRoutes() {
  const { hydrated, isAuthenticated, requiresPasswordChange } = useAuth();

  if (!hydrated) {
    return <PageSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiresPasswordChange) {
    return <Navigate to="/first-login" replace />;
  }

  return <Outlet />;
}
