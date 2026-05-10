/**
 * OCASION Law Office / NRMS brand tokens (Tailwind class strings).
 * Prefer importing these over scattered blue-* utilities so the UI stays red/black aligned.
 */
export const BRAND = {
  /** Primary filled control (segmented tabs, pill toggles) */
  tabActive: 'bg-red-700 text-white shadow-sm dark:bg-red-700 dark:text-white',

  /** Table row hover tint */
  rowHoverTint: 'hover:bg-red-50/45 dark:hover:bg-red-950/25',

  /** Icon-only actions in dense tables (restore, row tools) */
  iconButton:
    'rounded-md p-1.5 text-red-700 transition-colors hover:bg-red-50 hover:text-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300 dark:focus-visible:ring-offset-slate-950',

  accentText: 'text-red-700 dark:text-red-400',
  accentBorder: 'border-red-200 dark:border-red-900',
  accentBorderStrong: 'border-red-300 dark:border-red-800',

  /** Inline text links */
  link: 'font-medium text-red-700 underline-offset-2 hover:text-red-800 hover:underline dark:text-red-400 dark:hover:text-red-300',

  /** Chip / pill secondary actions */
  chip:
    'rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800 transition-colors hover:bg-red-100 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60',

  /** Compact control in forms (e.g. “Add ID”) */
  subControl:
    'flex items-center gap-1 rounded px-2 py-0.5 text-xs text-red-700 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40',

  /** Progress / meter fill */
  progressFill: 'bg-red-600 dark:bg-red-500',

  /** Primary CTA block button (legacy AppButton primary) */
  buttonPrimary: 'bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-600',
};
