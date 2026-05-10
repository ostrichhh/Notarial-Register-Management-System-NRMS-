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

function summarizeLoginFailure(err) {
  if (!err.response) {
    const code = err.code;
    if (code === 'ECONNABORTED') {
      return 'The server took too long to respond. Try again or check whether the Django API is running.';
    }
    if (err.message === 'Network Error' || code === 'ERR_NETWORK') {
      return `Cannot reach the API at ${API_BASE_URL.trim()}. Start the Django server (e.g. python manage.py runserver), check the URL matches how you opened this app (localhost vs 127.0.0.1), and set VITE_API_URL if needed.`;
    }
    return err.message || 'No response from server.';
  }

  const d = err.response.data;
  if (typeof d?.detail === 'string') return d.detail;
  if (Array.isArray(d?.detail)) return d.detail.join(' ');
  if (typeof d?.non_field_errors?.[0] === 'string') return d.non_field_errors[0];
  if (typeof d?.username?.[0] === 'string') return d.username[0];
  try {
    return JSON.stringify(d);
  } catch {
    return err.message || 'Sign-in rejected.';
  }
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
    const msg = location.state?.postLogoutMessage;
    if (!msg) return undefined;

    setAlert({ variant: 'success', title: 'Signed out', msg });

    const raf = window.requestAnimationFrame(() => {
      navigate({ pathname: location.pathname, search: location.search ?? '' }, { replace: true, state: {} });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [location.state?.postLogoutMessage, navigate, location.pathname, location.search]);

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
        navigate('/', { replace: true });
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
        eyebrow="NRMS Gateway"
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
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <AuthField
            id="login-username"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
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
