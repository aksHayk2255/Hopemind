import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: Record<string, any>) => Promise<User>;
  quickDemoLogin: (account: 'mother_priya' | 'mother_ananya' | 'doctor' | 'admin') => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_ACCOUNTS = {
  mother_priya: {
    email: 'priya@example.com',
    password: 'Password123!',
    label: 'Priya Sharma (Mother - Standard / Improving)',
    role: 'mother' as UserRole
  },
  mother_ananya: {
    email: 'ananya@example.com',
    password: 'Password123!',
    label: 'Ananya Patel (Mother - Critical / High Risk Q10)',
    role: 'mother' as UserRole
  },
  doctor: {
    email: 'doctor.sharma@example.com',
    password: 'Password123!',
    label: 'Dr. Sunita Sharma (Perinatal Psychiatrist)',
    role: 'doctor' as UserRole
  },
  admin: {
    email: 'admin@hopemind.org',
    password: 'AdminPass123!',
    label: 'Administrator (System & Model Governance)',
    role: 'admin' as UserRole
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('hopemind_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('hopemind_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('hopemind_token');
      if (storedToken) {
        try {
          const res = await authService.getMe();
          setUser(res.user);
          localStorage.setItem('hopemind_user', JSON.stringify(res.user));
        } catch (err) {
          console.warn('Session expired or token invalid');
          localStorage.removeItem('hopemind_token');
          localStorage.removeItem('hopemind_user');
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authService.login(email, password);
      localStorage.setItem('hopemind_token', res.access_token);
      localStorage.setItem('hopemind_user', JSON.stringify(res.user));
      setToken(res.access_token);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: Record<string, any>): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authService.register(data);
      localStorage.setItem('hopemind_token', res.access_token);
      localStorage.setItem('hopemind_user', JSON.stringify(res.user));
      setToken(res.access_token);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const quickDemoLogin = async (account: 'mother_priya' | 'mother_ananya' | 'doctor' | 'admin'): Promise<User> => {
    const demo = DEMO_ACCOUNTS[account];
    return await login(demo.email, demo.password);
  };

  const logout = () => {
    localStorage.removeItem('hopemind_token');
    localStorage.removeItem('hopemind_user');
    setUser(null);
    setToken(null);
  };

  const refreshUser = async () => {
    try {
      const res = await authService.getMe();
      setUser(res.user);
      localStorage.setItem('hopemind_user', JSON.stringify(res.user));
    } catch (e) {
      console.error('Failed to refresh user:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        quickDemoLogin,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
