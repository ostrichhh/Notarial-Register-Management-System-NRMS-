import React from 'react';

import { BRAND } from '../../lib/brandClasses';
import { cn } from '../../lib/utils';

/**
 * Compact icon-only control for tables and cards — uses BRAND.iconButton.
 */
export default function BrandIconButton({ className, children, ...props }) {
  return (
    <button type="button" className={cn(BRAND.iconButton, className)} {...props}>
      {children}
    </button>
  );
}
