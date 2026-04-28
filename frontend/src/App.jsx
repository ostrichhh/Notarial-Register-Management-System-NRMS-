import { BrowserRouter, Routes, Route } from 'react-router';
import Navbar from './components/navigation/navbar';
import Dashboard from './components/Dashboard';
import NotarialRegisterBooks from './components/NotarialRegisterBooks';
import NotarialEntries from './components/NotarialEntries';
import ManageUser from './components/ManageUser';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/notarial-register-book" element={<NotarialRegisterBooks />} />
            <Route path="/notarial-entries" element={<NotarialEntries />} />
            <Route path="/manage-user" element={<ManageUser />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
