import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, setAuthToken, getAuthToken } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = sessionStorage.getItem('current_user');
    const token = getAuthToken();
    if (saved && token) {
      try {
        setUser(JSON.parse(saved));
      } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const persistUser = (userData) => {
    sessionStorage.setItem('current_user', JSON.stringify(userData));
    setUser(userData);
  };

  const login = useCallback(async (email, password) => {
    try {
      const data = await authApi.login({ email, password });
      setAuthToken(data.token);
      persistUser(data.user);
      return { user: data.user };
    } catch (err) {
      return { error: err.message || 'Login failed' };
    }
  }, []);

  const register = useCallback(async (name, email, password, role, group_id) => {
    try {
      await authApi.register({ name, email, password, role, group_id: role === 'student' ? group_id : undefined });
      return { success: true };
    } catch (err) {
      return { error: err.message || 'Registration failed' };
    }
  }, []);

  const verifyEmailCode = useCallback(async (email, code) => {
    try {
      const data = await authApi.verifyEmailCode({ email, code });
      setAuthToken(data.token);
      persistUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      return { error: err.message || 'Verification failed' };
    }
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    sessionStorage.removeItem('current_user');
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedData) => {
    persistUser(updatedData);
  }, []);

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, login, register, verifyEmailCode, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
