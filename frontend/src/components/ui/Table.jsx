import React from 'react';

export function Table({ children }) {
  return <table className="w-full border-collapse text-sm">{children}</table>;
}

export function TableHeader({ children }) {
  return <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">{children}</thead>;
}

export function TableBody({ children }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

export function TableRow({ children, className = '' }) {
  return <tr className={`align-top ${className}`}>{children}</tr>;
}

export function TableHead({ children, className = '' }) {
  return <th className={`px-3 py-3 font-semibold ${className}`}>{children}</th>;
}

export function TableCell({ children, className = '', ...props }) {
  return (
    <td className={`px-3 py-3 text-slate-700 ${className}`} {...props}>
      {children}
    </td>
  );
}
