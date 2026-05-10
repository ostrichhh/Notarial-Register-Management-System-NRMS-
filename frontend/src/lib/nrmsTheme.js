const STORAGE_KEY = 'nrms_theme';

/** @returns {'light' | 'dark'} */
export function readNrmsTheme() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'dark' || v === 'light') return v;
  } catch {
    /* ignore */
  }
  return 'light';
}

/** @param {'light' | 'dark'} mode */
export function applyNrmsTheme(mode) {
  const root = document.documentElement;
  if (mode === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

/** @param {'light' | 'dark'} mode */
export function persistNrmsTheme(mode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  applyNrmsTheme(mode);
}
