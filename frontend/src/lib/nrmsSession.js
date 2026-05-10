const STORAGE_KEY = 'nrms_auth_session';

/**
 * Persisted JWT + user snapshot (user is refreshed via /auth/me/ on hydrate).
 */
export function readStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.access || !data?.refresh) return null;
    return data;
  } catch {
    return null;
  }
}

/** @param {{ access: string, refresh: string, user?: object }} session */
export function writeStoredSession(session) {
  const prev = readStoredSession() || {};
  const next = {
    ...prev,
    access: session.access,
    refresh: session.refresh,
    ...(session.user !== undefined ? { user: session.user } : {}),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function patchStoredAccess(access) {
  const prev = readStoredSession();
  if (!prev?.refresh) return;
  writeStoredSession({ ...prev, access });
}

export function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export function sessionStorageKeys() {
  return { STORAGE_KEY };
}
