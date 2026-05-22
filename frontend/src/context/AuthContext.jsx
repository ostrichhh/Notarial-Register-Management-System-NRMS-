import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import AxiosInstance from '../components/Axios';
import nakedAuth from '../lib/nakedAuthClient';
import {
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
} from '../lib/nrmsSession';

const AuthContext = createContext(null);

/** Display name shown in header: full name when present, otherwise username */
export function formatWelcomeName(user) {
  if (!user) return null;
  const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  if (full) return full;
  return user.username || 'User';
}

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  const setUserPatch = useCallback((nextUser) => {
    setUserState(nextUser);
    const session = readStoredSession();
    if (session && nextUser) {
      writeStoredSession({ ...session, user: nextUser });
    }
  }, []);

  const hydrate = useCallback(async () => {
    const session = readStoredSession();
    if (!session?.access || !session?.refresh) {
      setUserState(null);
      setTokens(null);
      setHydrated(true);
      return;
    }

    setTokens({ access: session.access, refresh: session.refresh });

    try {
      const { data } = await AxiosInstance.get('/auth/me/');
      setUserState(data);
      writeStoredSession({ ...session, user: data });
    } catch {
      /** Interceptor may have cleared stale refresh; normalize empty session */
      setUserState(null);
      setTokens(null);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    function syncWithStoredSession(event) {
      const session = readStoredSession();
      if (!session?.access || !session?.refresh) {
        setUserState(null);
        setTokens(null);
        setHydrated(true);
        return;
      }

      setTokens((current) => {
        if (current?.access === session.access && current?.refresh === session.refresh) {
          return current;
        }
        return { access: session.access, refresh: session.refresh };
      });

      if (event?.type === 'pageshow' && event.persisted) {
        hydrate();
      }
    }

    window.addEventListener('pageshow', syncWithStoredSession);
    window.addEventListener('focus', syncWithStoredSession);
    document.addEventListener('visibilitychange', syncWithStoredSession);

    return () => {
      window.removeEventListener('pageshow', syncWithStoredSession);
      window.removeEventListener('focus', syncWithStoredSession);
      document.removeEventListener('visibilitychange', syncWithStoredSession);
    };
  }, [hydrate]);

  useEffect(() => {
    function onExpired() {
      setUserState(null);
      setTokens(null);
    }
    window.addEventListener('nrms:auth-expired', onExpired);
    return () => window.removeEventListener('nrms:auth-expired', onExpired);
  }, []);

  const persistSession = useCallback((access, refresh, nextUser) => {
    writeStoredSession({
      access,
      refresh,
      user: nextUser,
    });
    setTokens({ access, refresh });
    setUserState(nextUser);
  }, []);

  const loginWithCredentials = useCallback(async ({ username, password }) => {
    const { data } = await nakedAuth.post('auth/login/', { username, password });
    const access = data?.access;
    const refresh = data?.refresh;
    const nextUser = data?.user;
    if (!access || !refresh || !nextUser) {
      throw new Error('Incomplete login response from server.');
    }
    persistSession(access, refresh, nextUser);
    return { requiresPasswordChange: Boolean(nextUser.requires_password_change), user: nextUser };
  }, [persistSession]);

  const refreshMe = useCallback(async () => {
    const session = readStoredSession();
    if (!session?.access) return null;
    const { data } = await AxiosInstance.get('/auth/me/');
    setUserPatch(data);
    return data;
  }, [setUserPatch]);

  const submitFirstLoginPasswordChange = useCallback(
    async ({ currentPassword, newPassword, confirmPassword }) => {
      const { data } = await AxiosInstance.post('/auth/complete-first-login/', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      return data;
    },
    []
  );

  const logoutImmediate = useCallback(() => {
    clearStoredSession();
    setTokens(null);
    setUserState(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await AxiosInstance.post('/auth/logout/', {});
    } catch {
      /** Token may already be invalid — still clear client session */
    } finally {
      logoutImmediate();
    }
  }, [logoutImmediate]);

  const welcomeName = useMemo(() => formatWelcomeName(user) ?? 'Guest', [user]);

  const value = useMemo(
    () => ({
      user,
      tokens,
      welcomeName,
      isAuthenticated: Boolean(user && tokens?.access),
      requiresPasswordChange: Boolean(user?.requires_password_change),
      hydrated,
      loginWithCredentials,
      submitFirstLoginPasswordChange,
      refreshMe,
      logout,
      setUserPatch,
    }),
    [
      user,
      tokens,
      welcomeName,
      hydrated,
      loginWithCredentials,
      submitFirstLoginPasswordChange,
      refreshMe,
      logout,
      setUserPatch,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
