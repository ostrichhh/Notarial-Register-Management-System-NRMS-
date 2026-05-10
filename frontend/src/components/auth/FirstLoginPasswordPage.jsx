import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';

import Alert from '../ui/Alert';
import AuthField from './AuthField';
import AuthFormCard from './AuthFormCard';
import AuthSplitShell from './AuthSplitShell';
import { Button } from '../ui/shadcn/Button';
import PageSpinner from '../ui/PageSpinner';
import { useAuth } from '../../context/AuthContext';

function parseApiErrors(data) {
  if (!data) return 'Could not validate form.';
  const fieldKeys = ['current_password', 'new_password', 'confirm_password', 'non_field_errors'];
  const parts = [];
  for (const key of fieldKeys) {
    if (Array.isArray(data[key])) parts.push(`${key}: ${data[key].join(' ')}`);
    else if (typeof data[key] === 'string') parts.push(`${key}: ${data[key]}`);
  }
  if (data.detail && typeof data.detail === 'string') parts.push(data.detail);
  return parts.filter(Boolean).join(' ') || 'Validation failed.';
}

export default function FirstLoginPasswordPage() {
  const navigate = useNavigate();
  const { hydrated, isAuthenticated, requiresPasswordChange, submitFirstLoginPasswordChange } = useAuth();
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
      const data = await submitFirstLoginPasswordChange({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setDoneMsg(data?.message || 'Password reset complete. Routing you to NRMS Dashboard.');
      window.setTimeout(() => {
        navigate('/', { replace: true });
      }, 900);
    } catch (err) {
      const msg =
        err.response?.data && typeof err.response.data === 'object'
          ? parseApiErrors(err.response.data)
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
    <AuthSplitShell>
      <AuthFormCard
        eyebrow="First Login"
        heading="Establish your secure password"
        description="You're required to change your starter password once before proceeding to the suite."
        banner={bannerAlerts.length ? <div className="flex flex-col gap-3">{bannerAlerts}</div> : null}
        footer="After confirmation you keep the same MFA posture as mandated by office counsel."
      >
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <AuthField
            id="first-current-password"
            label="Current Password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={loading || Boolean(doneMsg)}
          />
          <AuthField
            id="first-new-password"
            label="New Password"
            hint="Minimum 8 characters recommended by Django validators."
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
            Verify & Unlock Dashboard Access
          </Button>
        </form>
      </AuthFormCard>
    </AuthSplitShell>
  );
}
