import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  badgeNumber?: string;
  department: string;
  lastLogin?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Return a safe default instead of throwing to prevent React errors
    console.warn('useAuth called outside AuthProvider, returning default');
    return {
      user: null,
      loading: false,
      login: async () => { throw new Error('Not authenticated'); },
      logout: () => {},
      updateUser: () => {}
    };
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token and get user data with timeout
      const timeoutId = setTimeout(() => {
        setLoading(false);
      }, 5000); // 5 second timeout
      
      authAPI.getCurrentUser()
        .then((userData) => {
          clearTimeout(timeoutId);
          // Ensure all user data fields are primitives, not objects
          if (userData && userData.user) {
            const sanitizedUser: User = {
              id: String(userData.user.id || ''),
              username: String(userData.user.username || ''),
              email: String(userData.user.email || ''),
              firstName: String(userData.user.firstName || ''),
              lastName: String(userData.user.lastName || ''),
              role: String(userData.user.role || ''),
              badgeNumber: userData.user.badgeNumber ? String(userData.user.badgeNumber) : undefined,
              department: userData.user.department ? String(userData.user.department) : '',
              lastLogin: userData.user.lastLogin ? String(userData.user.lastLogin) : undefined,
            };
            setUser(sanitizedUser);
          }
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          console.warn('Auth check failed:', error);
          localStorage.removeItem('token');
        })
        .finally(() => {
          clearTimeout(timeoutId);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await authAPI.login(username, password);
      localStorage.setItem('token', response.token);
      // Ensure all user data fields are primitives, not objects
      if (response && response.user) {
        const sanitizedUser: User = {
          id: String(response.user.id || ''),
          username: String(response.user.username || ''),
          email: String(response.user.email || ''),
          firstName: String(response.user.firstName || ''),
          lastName: String(response.user.lastName || ''),
          role: String(response.user.role || ''),
          badgeNumber: response.user.badgeNumber ? String(response.user.badgeNumber) : undefined,
          department: response.user.department ? String(response.user.department) : '',
        };
        setUser(sanitizedUser);
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};