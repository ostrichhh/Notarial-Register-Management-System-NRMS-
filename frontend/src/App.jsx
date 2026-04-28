import { BrowserRouter, Routes, Route } from 'react-router';
import Navbar from './components/navigation/navbar';
import Dashboard from './components/Dashboard';
import NotarialRegisterBooks from './components/NotarialRegisterBooks';
import NotarialEntries from './components/NotarialEntries';
import ManageUser from './components/ManageUser';

function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen w-full flex-col md:flex-row">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
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
