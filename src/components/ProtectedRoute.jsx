import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert } from 'lucide-react';

export default function ProtectedRoute({ children, roles = null }) {
  const { user, officer, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-navy-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-mist font-mono text-sm tracking-widest">AUTHENTICATING SESSION…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Only enforce a role check when the route explicitly declares a
  // non-empty allow-list. Routes with no `roles` prop (the default app
  // shell wrapper) must NOT block access — that was the bug: an empty
  // array default made `roles.includes(...)` always false, locking out
  // every officer regardless of rank.
  const hasRoleRestriction = Array.isArray(roles) && roles.length > 0;

  if (hasRoleRestriction && officer && !roles.includes(officer.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-navy-950 p-6">
        <div className="text-center max-w-md border border-crimson-500/40 bg-crimson-600/10 rounded-lg p-8">
          <ShieldAlert className="mx-auto mb-4 text-crimson-400" size={40} />
          <h2 className="font-serif text-xl text-cream-100 mb-2">Access Restricted</h2>
          <p className="text-slate-mist text-sm">Your role does not have clearance to view this module. This attempt has been logged.</p>
        </div>
      </div>
    );
  }

  return children;
}
