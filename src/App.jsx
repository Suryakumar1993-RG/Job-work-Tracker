import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ToastProvider } from './components/Toast';
import { ModalProvider } from './components/Modal';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import JobWorkersPage from './pages/JobWorkersPage';
import TransportersPage from './pages/TransportersPage';
import UsersPage from './pages/UsersPage';
import DeliveryNotePage from './pages/DeliveryNotePage';
import ProductionPage from './pages/ProductionPage';
import GRNPage from './pages/GRNPage';
import AcceptancePage from './pages/AcceptancePage';
import AgingPage from './pages/AgingPage';

function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RoleRoute({ id, children }) {
  const { checkAccess, getAllMenus, currentUser } = useAuth();
  
  // Find the menu to get its required roles
  const menus = getAllMenus();
  const menu = menus.find(m => m.id === id);
  
  if (!menu) {
    // If not a standard menu, let it pass or handle custom (like dashboard)
    return children;
  }

  if (!checkAccess(menu.roles)) {
    return (
      <div className="card glass text-center" style={{ padding: '40px', margin: '20px' }}>
        <h3 style={{ color: 'var(--danger)' }}>🚨 Access Denied</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>
          Your current role ({currentUser.role}) does not have permission to view this page.
        </p>
      </div>
    );
  }
  
  return children;
}

function HomeRedirect() {
  const { currentUser } = useAuth();
  if (currentUser?.role === 'job_worker') {
    return <Navigate to="/app/acceptance" replace />;
  }
  return <Navigate to="/app/dashboard" replace />;
}

function App() {
  return (
    <DataProvider>
      <ToastProvider>
        <ModalProvider>
          <AuthProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/app" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  <Route path="dashboard" element={<RoleRoute id="dashboard"><DashboardPage /></RoleRoute>} />
                  <Route path="products" element={<RoleRoute id="products"><ProductsPage /></RoleRoute>} />
                  <Route path="jobworkers" element={<RoleRoute id="jobworkers"><JobWorkersPage /></RoleRoute>} />
                  <Route path="transporters" element={<RoleRoute id="transporters"><TransportersPage /></RoleRoute>} />
                  <Route path="users" element={<RoleRoute id="users"><UsersPage /></RoleRoute>} />
                  
                  {/* Transaction routes */}
                  <Route path="deliverynotes" element={<RoleRoute id="deliverynotes"><DeliveryNotePage /></RoleRoute>} />
                  <Route path="production" element={<RoleRoute id="production"><ProductionPage /></RoleRoute>} />
                  <Route path="grn" element={<RoleRoute id="grn"><GRNPage /></RoleRoute>} />
                  <Route path="acceptance" element={<RoleRoute id="acceptance"><AcceptancePage /></RoleRoute>} />
                  <Route path="aging" element={<RoleRoute id="aging"><AgingPage /></RoleRoute>} />
                </Route>
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Router>
          </AuthProvider>
        </ModalProvider>
      </ToastProvider>
    </DataProvider>
  );
}

export default App;
