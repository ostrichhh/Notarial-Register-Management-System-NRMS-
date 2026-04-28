import React from 'react';
import { NavLink } from 'react-router';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/notarial-register-book', label: 'Notarial Register Book' },
  { to: '/notarial-entries', label: 'Notarial Entries' },
  { to: '/manage-user', label: 'Manage User' },
];

export default function Navbar() {
  return (
    <nav className="w-full bg-white p-4 shadow-sm md:w-72 md:p-6">
      <div className="mb-6">
        <h2 className="text-center text-2xl font-bold text-red-600 md:text-left">NRMS</h2>
      </div>
      <ul className="flex flex-col gap-2">
        {links.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
