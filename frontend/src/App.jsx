import { BrowserRouter } from 'react-router';

import { AuthProvider } from './context/AuthContext';
import AppRoutes from './components/AppRoutes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
