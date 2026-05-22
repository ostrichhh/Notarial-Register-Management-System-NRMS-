import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Lock } from 'lucide-react';

import AxiosInstance from './Axios';
import Alert from './ui/Alert';
import PageHeader from './ui/PageHeader';
import { Button } from './ui/shadcn/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/shadcn/Dialog';
import { Label } from './ui/shadcn/Label';
import { Separator } from './ui/shadcn/Separator';
import PasswordInput from './ui/PasswordInput';
import { useAuth } from '../context/AuthContext';
import { summarizeApiError } from '../lib/friendlyErrors';
import { setFlashMessage } from '../lib/flashMessages';
import VisualPreferencesCard from './settings/VisualPreferencesCard';

export default function Settings() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');

  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdErr, setPwdErr] = useState('');

  async function submitPasswordChange(e) {
    e.preventDefault();
    setPwdErr('');
    if (newPassword.length < 8) {
      setPwdErr('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdErr('New password and confirmation do not match.');
      return;
    }
    setPwdBusy(true);
    try {
      await AxiosInstance.post('/auth/change-password/', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordModalOpen(false);
      await logout();
      setFlashMessage('login', {
        variant: 'success',
        title: 'Password updated',
        msg: 'Password changed. Please log in with your new password.',
      });
      navigate('/login', {
        replace: true,
        state: { passwordChangedMessage: 'Password changed. Please log in with your new password.' },
      });
    } catch (err) {
      const body = err.response?.data;
      setPwdErr(summarizeApiError(body, err.message || 'Could not update password.'));
    } finally {
      setPwdBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Visual preferences for this device and your account password."
      />

      <div className="grid gap-6 lg:grid-cols-1">
        <VisualPreferencesCard />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5 text-red-700 dark:text-red-400" aria-hidden />
              Change password
            </CardTitle>
            <CardDescription>For security, you will be asked to sign in again after a successful change.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Open a secure dialog to update your password.
            </p>
            <Button type="button" onClick={() => setPasswordModalOpen(true)}>
              Change password
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={passwordModalOpen}
        onOpenChange={(open) => {
          setPasswordModalOpen(open);
          if (!open && !pwdBusy) {
            setPwdErr('');
          }
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              For security, you will be asked to sign in again after a successful change.
            </DialogDescription>
          </DialogHeader>

          {pwdErr ? (
            <Alert variant="error" dismissible title="Password update failed" onDismiss={() => setPwdErr('')}>
              {pwdErr}
            </Alert>
          ) : null}

          <form className="space-y-4" onSubmit={submitPasswordChange}>
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <PasswordInput
                id="current-password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="bg-slate-50 dark:bg-slate-900 dark:border-slate-700"
              />
            </div>
            <Separator className="dark:bg-slate-700" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <PasswordInput
                  id="new-password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="bg-slate-50 dark:bg-slate-900 dark:border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <PasswordInput
                  id="confirm-password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="bg-slate-50 dark:bg-slate-900 dark:border-slate-700"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPasswordModalOpen(false)} disabled={pwdBusy}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                isLoading={pwdBusy}
                loadingLabel="Updating…"
                disabled={!currentPassword || !newPassword || !confirmPassword}
              >
                Update password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
