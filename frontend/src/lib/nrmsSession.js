const STORAGE_KEY = 'nrms_auth_session';

/**
 * Per-tab JWT + user snapshot (user is refreshed via /auth/me/ on hydrate).
 */
export function readStoredSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) localStorage.removeItem(STORAGE_KEY);
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
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function patchStoredAccess(access) {
  const prev = readStoredSession();
  if (!prev?.refresh) return;
  writeStoredSession({ ...prev, access });
}

export function clearStoredSession() {
  sessionStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY);
}

export function sessionStorageKeys() {
  return { STORAGE_KEY };
}
