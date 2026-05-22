import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { Input } from './shadcn/Input';
import { cn } from '../../lib/utils';

export default React.forwardRef(function PasswordInput(
  { className, buttonClassName, disabled, ...props },
  ref
) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  const inputProps = { ...props };
  delete inputProps.type;

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={visible ? 'text' : 'password'}
        disabled={disabled}
        className={cn('nrms-password-input pr-10', className)}
        {...inputProps}
      />
      <button
        type="button"
        className={cn(
          'absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
          buttonClassName
        )}
        onClick={() => setVisible((current) => !current)}
        disabled={disabled}
        aria-label={visible ? 'Hide password' : 'Show password'}
        title={visible ? 'Hide password' : 'Show password'}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
});
