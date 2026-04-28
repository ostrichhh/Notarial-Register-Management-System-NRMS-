import React from 'react';
import { Link } from 'react-router';
import './navbar.css';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h2>NRMS</h2>
      </div>
      <ul className="navbar-links">
        <li>
          <Link to="/">Dashboard</Link>
        </li>
        <li>
          <Link to="/notarial-register-book">Notarial Register Book</Link>
        </li>
        <li>
          <Link to="/notarial-entries">Notarial Entries</Link>
        </li>
        <li>
          <Link to="/manage-user">Manage User</Link>
        </li>
      </ul>
    </nav>
  );
}
