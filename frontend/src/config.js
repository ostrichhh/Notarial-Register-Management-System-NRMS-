/**
 * In dev (`npm run dev`), default to same-origin `/django/` so Vite proxies to Django (vite.config.js).
 * Override with `VITE_API_URL` for a direct URL or production builds pointing at your API host.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '/django/' : 'http://127.0.0.1:8000/')
