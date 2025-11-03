import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginSimple from './pages/LoginSimple';
import Dashboard from './pages/Dashboard';
import NemsisRecords from './pages/NemsisRecords';
import NfirsRecords from './pages/NfirsRecords';
import Roster from './pages/Roster';
import Settings from './pages/Settings';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ component: Component }) => {
  // MUST call hooks FIRST - before any conditional returns
  // React Hooks Rules: hooks must be called in the same order every render
  const authContext = useAuth();
  const user = authContext?.user ?? null;
  const loading = authContext?.loading ?? false;

  // Handle loading state first
  if (loading) {
    return <LoadingSpinner />;
  }

  // Handle unauthenticated state
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Validate component exists
  if (!Component) {
    console.error('ProtectedRoute: No component provided');
    return <div>Error: No component provided</div>;
  }

  // Render component - Component is a React.ComponentType, so render it as JSX
  return (
    <Layout>
      <Component />
    </Layout>
  );
};

const AppContent: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginSimple />} />
        <Route path="/" element={<ProtectedRoute component={Dashboard} />} />
        <Route path="/nemsis" element={<ProtectedRoute component={NemsisRecords} />} />
        <Route path="/nfirs" element={<ProtectedRoute component={NfirsRecords} />} />
        <Route path="/roster" element={<ProtectedRoute component={Roster} />} />
        <Route path="/settings" element={<ProtectedRoute component={Settings} />} />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;