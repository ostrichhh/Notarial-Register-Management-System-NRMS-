import axios from 'axios';

import { API_BASE_URL } from '../config';
import { clearStoredSession, patchStoredAccess, readStoredSession } from '../lib/nrmsSession';

const AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
    accept: 'application/json',
  },
});

/** Dedicated client for refresh to avoid interceptor recursion */
const nakedClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
  headers: { 'Content-Type': 'application/json', accept: 'application/json' },
});

AxiosInstance.interceptors.request.use((config) => {
  const session = readStoredSession();
  if (session?.access) {
    const headers = config.headers ?? {};
    headers.Authorization = `Bearer ${session.access}`;
    config.headers = headers;
  }
  return config;
});

AxiosInstance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const cfg = error.config;
    const status = error.response?.status;
    if (status !== 401 || !cfg || cfg._nrmsRetry) {
      return Promise.reject(error);
    }

    /** Skip retry for refresh and login endpoints */
    const url = String(cfg.url || '');
    if (url.includes('/auth/refresh') || url.includes('/auth/login')) {
      return Promise.reject(error);
    }

    cfg._nrmsRetry = true;
    const refresh = readStoredSession()?.refresh;
    if (!refresh) {
      clearStoredSession();
      return Promise.reject(error);
    }

    try {
      const { data } = await nakedClient.post('auth/refresh/', { refresh });
      const access = data?.access;
      if (!access) throw new Error('No access token returned');
      patchStoredAccess(access);
      const headers = cfg.headers ?? {};
      headers.Authorization = `Bearer ${access}`;
      cfg.headers = headers;
      return AxiosInstance(cfg);
    } catch (e) {
      clearStoredSession();
      window.dispatchEvent(new CustomEvent('nrms:auth-expired'));
      return Promise.reject(e);
    }
  }
);

export default AxiosInstance;
