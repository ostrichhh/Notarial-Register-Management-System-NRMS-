import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';

import Alert from '../ui/Alert';
import AuthField from './AuthField';
import AuthFormCard from './AuthFormCard';
import AuthCenteredShell from './AuthCenteredShell';
import { Button } from '../ui/shadcn/Button';
import PageSpinner from '../ui/PageSpinner';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';
import VisualPreferencesCard from '../settings/VisualPreferencesCard';
import { summarizeApiError } from '../../lib/friendlyErrors';
import { consumeFlashMessage, setFlashMessage } from '../../lib/flashMessages';

function summarizeLoginFailure(err) {
  if (!err.response) {
    const code = err.code;
    if (code === 'ECONNABORTED') {
      return 'The server took too long to respond. Try again or check whether the service is running.';
    }
    if (err.message === 'Network Error' || code === 'ERR_NETWORK') {
      return `Cannot reach the service at ${API_BASE_URL.trim()}. Please check that the backend is running and try again.`;
    }
    return err.message || 'No response from the service.';
  }

  return summarizeApiError(err.response.data, 'The username or password is incorrect.');
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hydrated, isAuthenticated, requiresPasswordChange, loginWithCredentials } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const flash = consumeFlashMessage('login');
    if (flash) {
      setAlert(flash);
      navigate({ pathname: location.pathname, search: location.search ?? '' }, { replace: true, state: {} });
      return undefined;
    }

    const msg = location.state?.postLogoutMessage || location.state?.firstLoginMessage || location.state?.passwordChangedMessage;
    if (!msg) return undefined;

    const raf = window.requestAnimationFrame(() => {
      const passwordNotice = location.state?.firstLoginMessage || location.state?.passwordChangedMessage;
      setAlert({ variant: 'success', title: passwordNotice ? 'Password updated' : 'Signed out', msg });
      navigate({ pathname: location.pathname, search: location.search ?? '' }, { replace: true, state: {} });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [location.state?.firstLoginMessage, location.state?.passwordChangedMessage, location.state?.postLogoutMessage, navigate, location.pathname, location.search]);

  if (!hydrated) {
    return <PageSpinner />;
  }

  if (isAuthenticated && requiresPasswordChange) {
    return <Navigate to="/first-login" replace />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setAlert(null);

    const u = username.trim();
    if (!u || !password) {
      setAlert({ variant: 'warning', title: 'Missing fields', msg: 'Enter both username and password.' });
      return;
    }

    setLoading(true);
    try {
      const { requiresPasswordChange: forceChange } = await loginWithCredentials({ username: u, password });
      if (forceChange) {
        navigate('/first-login', { replace: true });
      } else {
        setFlashMessage('dashboard', {
          variant: 'success',
          title: 'Signed in',
          msg: 'You have logged in successfully.',
        });
        navigate('/', {
          replace: true,
          state: { loginMessage: 'You have logged in successfully.' },
        });
      }
    } catch (err) {
      const text = summarizeLoginFailure(err);
      setAlert({
        variant: 'error',
        title: 'Sign-in failed',
        msg: text,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCenteredShell>
      <AuthFormCard
        eyebrow="Notarial Register Management System"
        heading="Login"
        centerHeading
        description="Authorized legal personnel only."
        footer="Session expires after 20 minutes of inactivity."
        banner={
          alert ? (
            <Alert
              variant={alert.variant}
              title={alert.title}
              dismissible
              onDismiss={() => setAlert(null)}
            >
              {alert.msg}
            </Alert>
          ) : null
        }
      >
        <form className="space-y-6" onSubmit={handleSubmit} autoComplete="off" noValidate>
          <AuthField
            id="login-username"
            label="Username"
            name="nrms-login-user"
            autoComplete="off"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={loading}
          />
          <AuthField
            id="login-password"
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />

          <Button type="submit" className="h-11 w-full" size="lg" isLoading={loading} loadingLabel="Signing in…">
            Login
          </Button>
        </form>

        <div className="mt-8 border-t border-slate-100 pt-6">
          <VisualPreferencesCard embedded />
        </div>
      </AuthFormCard>
    </AuthCenteredShell>
  );
}
