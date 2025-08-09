// src/state/auth.tsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getMe, logoutAPI, type Me } from '../lib/api';

type AuthCtx = {
  me: Me | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getMe();     // <- uses cookie
      setMe(data);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try { await logoutAPI(); } catch {}
    setMe(null);
  };

  // On first load, check session
  useEffect(() => { void refresh(); }, []);

  const value = useMemo(() => ({ me, loading, refresh, logout }), [me, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
