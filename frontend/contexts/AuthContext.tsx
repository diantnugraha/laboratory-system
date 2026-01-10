'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/services/api';
import { getCookie, setCookie, deleteCookie } from '@/lib/cookieStorage';

interface User {
  id: number;
  username: string;
  email: string;
  display_name: string;
  role_id: number;
  roleObject?: {
    id: number;
    name: string;
  };
  // Backward compatibility fields
  name: string; // mapped from display_name
  role: string; // mapped from role.name
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token on mount - sync with Zustand auth-storage
  useEffect(() => {
    // First try auth-storage (Zustand store) - this is the primary source
    const authStorageCookie = getCookie('auth-storage');
    if (authStorageCookie) {
      try {
        const parsed = JSON.parse(authStorageCookie);
        if (parsed.state?.token && parsed.state?.isAuthenticated) {
          // Restore user from Zustand store
          const storedUser = parsed.state.user;
          if (storedUser) {
            // Get role name from either role_name field or role.name object
            const roleName = storedUser.role_name || storedUser.role?.name || '';
            const user: User = {
              id: storedUser.id,
              username: storedUser.username,
              email: storedUser.email,
              display_name: storedUser.display_name,
              role_id: storedUser.role_id,
              roleObject: storedUser.role,
              name: storedUser.display_name,
              role: roleName,
            };
            setUser(user);
          }
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Fallback to auth-token cookie (legacy)
    const token = getCookie('auth-token');
    if (token) {
      setIsAuthenticated(true);
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: backendUser, token } = response.data.data;
      
      // Map backend user to frontend User format
      const user: User = {
        id: backendUser.id,
        username: backendUser.username,
        email: backendUser.email,
        display_name: backendUser.display_name,
        role_id: backendUser.role_id,
        roleObject: backendUser.role,
        // Backward compatibility fields
        name: backendUser.display_name,
        role: backendUser.role?.name || '',
      };
      
      setUser(user);
      setIsAuthenticated(true);
      
      // Store token in cookie
      setCookie('auth-token', token, 7);
      
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      return { success: false, message: errorMessage };
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    // Remove token from cookie
    deleteCookie('auth-token');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


