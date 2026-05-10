import React from 'react';
import Select from './Select';

export default function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
      <span>{label}</span>
      <Select value={value} onChange={onChange} options={options} />
    </label>
  );
}
