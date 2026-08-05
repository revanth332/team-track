import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';

interface User {
  username: string;
  name: string;
  position: 'employee' | 'lead' | 'manager' | 'superadmin';
  role: string; // Alias for position to support existing components
  lead_id: string | null;
  manager_id: string | null;
  email: string;
  admin: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    setUser(null);
  }, []);

  const decodeAndSetUser = useCallback((token: string) => {
    try {
      const decoded = jwtDecode<any>(token);
      // Map new token structure to User interface
      setUser({
        username: decoded.sub,
        name: decoded.name || 'Unknown User',
        position: decoded.position || 'employee',
        role: decoded.position || 'employee',
        lead_id: decoded.lead_id || null,
        manager_id: decoded.manager_id || null,
        email: decoded.sub, // The UI often appends @miraclesoft.com
        admin: (decoded.position || 'employee') === 'lead',
      });
    } catch (error) {
      console.error('Failed to decode token:', error);
      logout();
    }
  }, [logout]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      decodeAndSetUser(token);
    }

    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth_unauthorized', handleUnauthorized);
  }, [decodeAndSetUser, logout]);

  const login = useCallback((token: string) => {
    localStorage.setItem('access_token', token);
    decodeAndSetUser(token);
  }, [decodeAndSetUser]);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
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
