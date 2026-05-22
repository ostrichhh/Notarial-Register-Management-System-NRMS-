import React from 'react';

import { Input } from '../ui/shadcn/Input';
import { Label } from '../ui/shadcn/Label';
import PasswordInput from '../ui/PasswordInput';
import { cn } from '../../lib/utils';

export default function AuthField({
  id,
  label,
  hint,
  error,
  className,
  inputClassName,
  labelClassName,
  ...inputProps
}) {
  const showError = Boolean(error);
  const fieldType = inputProps?.type ?? 'text';

  return (
    <div className={cn('space-y-2', className)}>
      <Label
        htmlFor={id}
        className={cn(
          'text-xs font-semibold uppercase tracking-wide text-white/90 md:text-slate-700 dark:text-slate-300',
          labelClassName
        )}
      >
        {label}
      </Label>
      {fieldType === 'password' ? (
        <PasswordInput
          id={id}
          autoComplete={inputProps.autoComplete ?? 'current-password'}
          className={cn(
            'h-11 border-white/25 bg-black/35 text-white placeholder:text-zinc-500 md:border-slate-300 md:bg-white md:text-slate-900 md:placeholder:text-slate-400',
            'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500',
            showError && 'border-red-500 md:border-red-600 dark:border-red-500',
            inputClassName
          )}
          buttonClassName="text-zinc-400 hover:bg-white/10 hover:text-white md:text-slate-500 md:hover:bg-slate-100 md:hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-invalid={showError ? 'true' : undefined}
          aria-describedby={hint ? `${id}-hint` : showError ? `${id}-error` : undefined}
          {...inputProps}
        />
      ) : (
        <Input
          id={id}
          autoComplete={inputProps.autoComplete ?? 'username'}
          className={cn(
            'h-11 border-white/25 bg-black/35 text-white placeholder:text-zinc-500 md:border-slate-300 md:bg-white md:text-slate-900 md:placeholder:text-slate-400',
            'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500',
            showError && 'border-red-500 md:border-red-600 dark:border-red-500',
            inputClassName
          )}
          aria-invalid={showError ? 'true' : undefined}
          aria-describedby={hint ? `${id}-hint` : showError ? `${id}-error` : undefined}
          {...inputProps}
        />
      )}
      {hint && !showError ? (
        <p id={`${id}-hint`} className="text-xs text-zinc-400 md:text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
      {showError ? (
        <p id={`${id}-error`} className="text-xs font-medium text-red-600 md:text-red-700 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
