import React from 'react';
import { Navigate, useLocation } from 'react-router';

import { useAuth } from '../../context/AuthContext';

/** Blocks children when user's role is not in allowedRoles */
export default function RoleGuard({ allowedRoles, children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user?.role || !allowedRoles.includes(user.role)) {
    return (
      <Navigate
        to="/"
        replace
        state={{
          from: location.pathname,
          forbiddenMessage:
            'That area is restricted for your current user level.',
        }}
      />
    );
  }

  return children;
}
