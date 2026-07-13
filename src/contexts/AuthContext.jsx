import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext({ user: null, officer: null, session: null, loading: true, refreshOfficer: () => {} });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [officer, setOfficer] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOfficer = useCallback(async () => {
    try {
      const res = await fetch('/api/me');
      if (res.ok) setOfficer(await res.json());
      else setOfficer(null);
    } catch {
      setOfficer(null);
    }
  }, []);

  useEffect(() => {
    // If running in Zoho Catalyst environment
    if (window.catalyst) {
      const catalystApp = window.catalyst;
      catalystApp.auth.isUserAuthenticated()
        .then((response) => {
          if (response && response.user_details) {
            const userDetails = response.user_details;
            setUser(userDetails);
            // Session token is managed via HTTP cookies on AppSail,
            // so we set a dummy token to satisfy the authFetch pipeline
            const token = 'catalyst-active-session';
            setSession({ access_token: token });
            fetchOfficer();
          } else {
            setUser(null);
            setOfficer(null);
            setSession(null);
          }
        })
        .catch(() => {
          setUser(null);
          setOfficer(null);
          setSession(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // Exclusive Catalyst Local Mock mode (no Supabase references)
      console.log('[KAVACH] Running in local mock Catalyst environment');
      const mockUser = {
        id: '12345',
        first_name: 'Dev',
        last_name: 'Officer',
        email_address: 'officer.dev@ksp.gov.in'
      };
      setUser(mockUser);
      setSession({ access_token: 'mock-session-token' });
      fetchOfficer();
      setLoading(false);
    }
  }, [fetchOfficer]);

  const refreshOfficer = useCallback(() => {
    fetchOfficer();
  }, [fetchOfficer]);

  return (
    <AuthContext.Provider value={{ user, officer, session, loading, refreshOfficer }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
