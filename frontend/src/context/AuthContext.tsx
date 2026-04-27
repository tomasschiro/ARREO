'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import api from '@/lib/api';
import type { User } from '@/types';

interface RegisterData {
  nombre: string;
  email: string;
  password: string;
  rol: 'transportista' | 'productor' | 'consignataria';
  zona?: string;
  telefono?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      api.get('/auth/me')
        .then(({ data }) => setUser(data.usuario))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setUser(data.usuario);
  }

  async function register(registerData: RegisterData) {
    const { data } = await api.post('/auth/register', registerData);
    localStorage.setItem('token', data.token);
    setUser(data.usuario);
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
  }

  function updateUser(updated: Partial<User>) {
    setUser(prev => prev ? { ...prev, ...updated } : prev);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
