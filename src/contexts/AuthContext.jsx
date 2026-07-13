import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import supabase from '../lib/supabase';

const AuthContext = createContext({ user: null, officer: null, session: null, loading: true, refreshOfficer: () => {} });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [officer, setOfficer] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOfficer = useCallback(async (tok) => {
    if (!tok) { setOfficer(null); return; }
    try {
      const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${tok}` } });
      if (res.ok) setOfficer(await res.json());
      else setOfficer(null);
    } catch {
      setOfficer(null);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.access_token) fetchOfficer(session.access_token);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.access_token) fetchOfficer(session.access_token);
      else setOfficer(null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchOfficer]);

  const refreshOfficer = useCallback(() => {
    if (session?.access_token) fetchOfficer(session.access_token);
  }, [session, fetchOfficer]);

  return (
    <AuthContext.Provider value={{ user, officer, session, loading, refreshOfficer }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
