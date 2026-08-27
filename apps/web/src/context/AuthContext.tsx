import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@triarc/shared-types';
import { fetchUsers } from '../services/api.ts';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  setCurrentUser: (user: User) => void;
  switchUserById: (userId: string) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers()
      .then((data) => {
        setUsers(data);
        const savedId = localStorage.getItem('triarc_active_user_id');
        const defaultUser = data.find((u) => u.id === savedId) || data.find((u) => u.username === 'alex') || data[0];
        if (defaultUser) {
          setCurrentUser(defaultUser);
        }
      })
      .catch((err) => {
        console.error('Failed to load users:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const switchUserById = (userId: string) => {
    const found = users.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
      localStorage.setItem('triarc_active_user_id', found.id);
    }
  };

  const handleSetCurrentUser = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('triarc_active_user_id', user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        setCurrentUser: handleSetCurrentUser,
        switchUserById,
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
