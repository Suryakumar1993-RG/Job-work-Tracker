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

function App() {
  return (
    <DataProvider>
      <ToastProvider>
        <ModalProvider>
          <AuthProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
                <Route path="/app" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="products" element={<ProductsPage />} />
                  <Route path="jobworkers" element={<JobWorkersPage />} />
                  <Route path="transporters" element={<TransportersPage />} />
                  <Route path="users" element={<UsersPage />} />
                  
                  {/* Transaction routes */}
                  <Route path="deliverynotes" element={<DeliveryNotePage />} />
                  <Route path="production" element={<ProductionPage />} />
                  <Route path="grn" element={<GRNPage />} />
                  <Route path="acceptance" element={<AcceptancePage />} />
                  <Route path="aging" element={<AgingPage />} />
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
