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
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for existing token on mount
  useEffect(() => {
    const token = getCookie('auth-token');
    if (token) {
      // Token exists, but user data needs to be fetched from API
      // For now, just set isAuthenticated - user can be fetched if needed
      // This will be handled by the API interceptor or can be improved later
      setIsAuthenticated(true);
    }
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
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
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


