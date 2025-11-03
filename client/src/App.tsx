import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
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
  // Validate component first
  if (!Component) {
    console.error('ProtectedRoute: No component provided');
    return <div>Error: No component provided</div>;
  }

  if (typeof Component !== 'function') {
    console.error('ProtectedRoute: Component is not a function', Component);
    return <div>Error: Invalid component type</div>;
  }

  try {
    const { user, loading } = useAuth();

    if (loading) {
      return <LoadingSpinner />;
    }

    if (!user) {
      return <Navigate to="/login" replace />;
    }

    // Render component directly without extra wrapper
    const ComponentToRender = Component;
    return (
      <Layout>
        <ComponentToRender />
      </Layout>
    );
  } catch (error) {
    console.error('ProtectedRoute error:', error);
    // If auth fails, redirect to login
    return <Navigate to="/login" replace />;
  }
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