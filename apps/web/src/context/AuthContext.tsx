import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@triarc/shared-types';
import {
  fetchUsers,
  loginUser,
  registerUser,
  quickLoginUser,
  fetchCurrentProfile,
  setAuthToken,
  getAuthToken,
  setUnauthorizedHandler
} from '../services/api.ts';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  users: User[];
  setCurrentUser: (user: User) => void;
  switchUserById: (userId: string) => Promise<void>;
  login: (credentials: { username?: string; password?: string; userId?: string }) => Promise<void>;
  register: (data: { username: string; name?: string; email: string; password: string }) => Promise<void>;
  quickLogin: (userId: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  isLoading: boolean;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadUsersList = async () => {
    try {
      const data = await fetchUsers();
      setUsers(data);
      return data;
    } catch (err) {
      console.error('Failed to load users list:', err);
      return [];
    }
  };

  const initAuth = useCallback(async () => {
    setIsLoading(true);
    const allUsers = await loadUsersList();
    const existingToken = getAuthToken();

    if (existingToken) {
      try {
        const { user } = await fetchCurrentProfile();
        setCurrentUser(user);
        setIsLoading(false);
        return;
      } catch (err) {
        // Token invalid, clear it
        setAuthToken(null);
      }
    }

    // Default fallback in demo mode
    const savedId = typeof localStorage !== 'undefined' ? localStorage.getItem('triarc_active_user_id') : null;
    const defaultUser = allUsers.find((u) => u.id === savedId) ||
      allUsers.find((u) => u.username === 'alex' && !u.is_external) ||
      allUsers.find((u) => !u.is_external) ||
      allUsers[0];

    if (defaultUser) {
      try {
        const res = await loginUser({ username: defaultUser.username, password: 'password123' });
        setCurrentUser(res.user);
      } catch {
        try {
          const res = await quickLoginUser(defaultUser.id);
          setCurrentUser(res.user);
        } catch {
          setCurrentUser(defaultUser);
        }
      }
    }
    setIsLoading(false);
  }, []);


  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Any request that comes back 401 means the session is gone: drop the user
  // and surface the login modal instead of leaving the UI in a half-broken
  // state throwing generic errors on every subsequent call.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setCurrentUser(null);
      setIsLoginModalOpen(true);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('triarc_active_user_id');
      }
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = async (credentials: { username?: string; password?: string; userId?: string }) => {
    const res = await loginUser(credentials);
    setCurrentUser(res.user);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('triarc_active_user_id', res.user.id);
    }
    setIsLoginModalOpen(false);
  };

  const register = async (data: { username: string; name?: string; email: string; password: string }) => {
    const res = await registerUser(data);
    setCurrentUser(res.user);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('triarc_active_user_id', res.user.id);
    }
    setIsLoginModalOpen(false);
  };

  const quickLogin = async (userId: string) => {
    const res = await quickLoginUser(userId);
    setCurrentUser(res.user);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('triarc_active_user_id', res.user.id);
    }
    setIsLoginModalOpen(false);
  };

  const switchUserById = async (userId: string) => {
    await quickLogin(userId);
  };

  const logout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('triarc_active_user_id');
      localStorage.removeItem('triarc_token');
    }
    setIsLoginModalOpen(true);
  };

  const refreshProfile = async () => {
    try {
      const { user } = await fetchCurrentProfile();
      setCurrentUser(user);
    } catch {
      // Ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        users,
        setCurrentUser: (u) => setCurrentUser(u),
        switchUserById,
        login,
        register,
        quickLogin,
        logout,
        refreshProfile,
        isLoginModalOpen,
        setIsLoginModalOpen,
        isLoading
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
