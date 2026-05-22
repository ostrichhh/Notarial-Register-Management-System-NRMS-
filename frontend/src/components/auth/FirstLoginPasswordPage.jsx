import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';

import Alert from '../ui/Alert';
import AuthField from './AuthField';
import AuthFormCard from './AuthFormCard';
import AuthCenteredShell from './AuthCenteredShell';
import { Button } from '../ui/shadcn/Button';
import PageSpinner from '../ui/PageSpinner';
import { useAuth } from '../../context/AuthContext';
import { summarizeApiError } from '../../lib/friendlyErrors';
import { setFlashMessage } from '../../lib/flashMessages';

export default function FirstLoginPasswordPage() {
  const navigate = useNavigate();
  const { hydrated, isAuthenticated, requiresPasswordChange, submitFirstLoginPasswordChange, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [doneMsg, setDoneMsg] = useState(null);

  if (!hydrated) {
    return <PageSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!requiresPasswordChange) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setAlert(null);
    setDoneMsg(null);

    if (!currentPassword.trim()) {
      setAlert({
        variant: 'warning',
        title: 'Current password required',
        msg: 'Enter the temporary password issued to your account.',
      });
      return;
    }
    if (newPassword.length < 8) {
      setAlert({
        variant: 'warning',
        title: 'New password too short',
        msg: 'Use at least 8 characters.',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setAlert({
        variant: 'warning',
        title: 'Mismatch',
        msg: 'New password and confirmation must match.',
      });
      return;
    }
    if (newPassword === currentPassword) {
      setAlert({
        variant: 'warning',
        title: 'Reuse not allowed',
        msg: 'Your new password must differ from your current temporary password.',
      });
      return;
    }

    setLoading(true);
    try {
      await submitFirstLoginPasswordChange({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      await logout();
      setFlashMessage('login', {
        variant: 'success',
        title: 'Password updated',
        msg: 'Password changed. Please log in with your new password.',
      });
      navigate('/login', {
        replace: true,
        state: { firstLoginMessage: 'Password changed. Please log in with your new password.' },
      });
    } catch (err) {
      const msg =
        err.response?.data && typeof err.response.data === 'object'
          ? summarizeApiError(err.response.data, 'Could not update your password.')
          : err.message || 'Could not reset password.';
      setAlert({ variant: 'error', title: 'Reset failed', msg });
    } finally {
      setLoading(false);
    }
  }

  const bannerAlerts = [];
  if (alert) {
    bannerAlerts.push(
      <Alert
        key="err"
        variant={alert.variant}
        title={alert.title}
        dismissible
        onDismiss={() => setAlert(null)}
      >
        {alert.msg}
      </Alert>
    );
  }
  if (doneMsg) {
    bannerAlerts.push(
      <Alert key="ok" variant="success" title="All set">
        {doneMsg}
      </Alert>
    );
  }

  return (
    <AuthCenteredShell>
      <div className="fixed inset-0 z-0 bg-slate-950/55 backdrop-blur-sm" aria-hidden />
      <div className="relative z-10 w-full max-w-xl">
        <AuthFormCard
          eyebrow="First Login"
          heading="Change your temporary password"
          centerHeading
          description="This one-time step is required before this account can access NRMS."
          banner={bannerAlerts.length ? <div className="flex flex-col gap-3">{bannerAlerts}</div> : null}
          footer="After saving, sign in again with your new password."
        >
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <AuthField
              id="first-current-password"
              label="Default Password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={loading || Boolean(doneMsg)}
            />
            <AuthField
              id="first-new-password"
              label="New Password"
              hint="Use at least 8 characters."
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading || Boolean(doneMsg)}
            />
            <AuthField
              id="first-confirm-password"
              label="Confirm Password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading || Boolean(doneMsg)}
            />

            <Button
              type="submit"
              className="h-11 w-full"
              size="lg"
              isLoading={loading}
              loadingLabel="Saving…"
              disabled={Boolean(doneMsg)}
            >
              Save Password
            </Button>
          </form>
        </AuthFormCard>
      </div>
    </AuthCenteredShell>
  );
}
