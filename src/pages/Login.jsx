import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import supabase from '../lib/supabase';
import { signInWithGoogle } from '../lib/googleAuth';
import { ShieldCheck, Lock, Mail, Loader2, AlertTriangle, ChevronDown } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { role: 'Investigator', email: 'investigator@kavach.gov.in' },
  { role: 'Inspector', email: 'inspector@kavach.gov.in' },
  { role: 'Superintendent', email: 'superintendent@kavach.gov.in' },
  { role: 'Crime Analyst', email: 'analyst@kavach.gov.in' },
  { role: 'Administrator', email: 'admin@kavach.gov.in' },
];

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Kavach@2024');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  if (!loading && user) { navigate('/dashboard', { replace: true }); }

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr('');
    if (!email || !password) { setErr('Badge email and password are required.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setErr(error.message);
    else navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-[100dvh] w-full bg-navy-950 relative overflow-x-hidden overflow-y-auto flex items-center justify-center px-4 py-8 sm:px-6 safe-top safe-bottom">
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{
        backgroundImage: 'linear-gradient(#c9a227 1px, transparent 1px), linear-gradient(90deg, #c9a227 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-navy-700/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-crimson-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-5xl grid md:grid-cols-2 rounded-2xl sm:rounded-3xl overflow-hidden border border-navy-700/60 shadow-2xl shadow-black/60 animate-fade-slide-up">
        {/* Brand panel — compact on mobile, full presence on desktop */}
        <div className="bg-gradient-to-br from-navy-900 via-navy-850 to-navy-950 px-6 py-8 sm:p-10 flex flex-col items-center justify-center text-center relative scan-line">
          <img src="/brand/kavach-emblem.png" alt="KAVACH AI" className="w-20 h-20 sm:w-40 sm:h-40 object-contain drop-shadow-[0_0_25px_rgba(201,162,39,0.35)] mb-3 sm:mb-6" />
          <h1 className="font-serif text-2xl sm:text-3xl text-cream-100 tracking-wide">KAVACH AI</h1>
          <p className="text-gold-400 text-[11px] sm:text-xs tracking-[0.3em] font-mono mt-2 uppercase">Safeguarding Karnataka</p>
          <p className="hidden sm:block text-slate-mist text-sm mt-6 leading-relaxed max-w-xs">
            Intelligent Investigation Copilot for the Karnataka State Police.
            Grounded AI, explainable leads, zero fabricated evidence.
          </p>
          <div className="mt-4 sm:mt-8 flex items-center gap-2 text-[11px] sm:text-xs text-slate-mist font-mono border-t border-navy-700 pt-3 sm:pt-4 w-full justify-center">
            <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
            <span>Restricted Government System</span>
          </div>
        </div>

        {/* Auth panel */}
        <div className="bg-navy-900/60 backdrop-blur-xl px-5 py-7 sm:p-10 flex flex-col justify-center">
          <h2 className="font-serif text-xl sm:text-2xl text-cream-100 mb-1">Officer Sign-In</h2>
          <p className="text-slate-mist text-sm mb-5 sm:mb-6">Enter your service credentials to continue.</p>

          {err && (
            <div className="mb-4 flex items-start gap-2 bg-crimson-600/15 border border-crimson-500/40 text-crimson-400 text-sm px-3 py-2.5 rounded-lg animate-fade-slide-up">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" /> <span>{err}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4" autoComplete="on">
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-mist font-mono">Service Email</label>
              <div className="mt-1.5 flex items-center gap-2 bg-navy-950/60 border border-navy-700 rounded-xl px-3.5 py-3 focus-within:border-gold-500 transition-colors">
                <Mail size={17} className="text-slate-mist shrink-0" />
                <input type="email" inputMode="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@kavach.gov.in"
                  className="bg-transparent outline-none text-cream-100 text-[16px] sm:text-sm w-full placeholder:text-slate-mist/50" />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-mist font-mono">Password</label>
              <div className="mt-1.5 flex items-center gap-2 bg-navy-950/60 border border-navy-700 rounded-xl px-3.5 py-3 focus-within:border-gold-500 transition-colors">
                <Lock size={17} className="text-slate-mist shrink-0" />
                <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="bg-transparent outline-none text-cream-100 text-[16px] sm:text-sm w-full" />
              </div>
            </div>
            <button type="submit" disabled={busy}
              className="tap-target w-full bg-gold-500 active:bg-gold-400 disabled:opacity-60 text-navy-950 font-semibold rounded-xl py-3.5 sm:py-3 flex items-center justify-center gap-2 transition-colors duration-150">
              {busy ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
              {busy ? 'Verifying…' : 'Access KAVACH AI'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-slate-mist text-xs">
            <div className="h-px bg-navy-700 flex-1" /> OR <div className="h-px bg-navy-700 flex-1" />
          </div>
          <button onClick={() => signInWithGoogle('KAVACH AI')}
            className="tap-target w-full border border-navy-700 active:border-gold-500 text-cream-100 rounded-xl py-3.5 sm:py-3 text-sm transition-colors duration-150">
            Sign in with Google
          </button>

          <div className="mt-6 border-t border-navy-700 pt-4">
            <button onClick={() => setShowDemo((s) => !s)}
              className="tap-target w-full flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-mist font-mono mb-1">
              <span>Demo Role Access</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${showDemo ? 'rotate-180' : ''}`} />
            </button>
            {showDemo && (
              <div className="animate-fade-slide-up">
                <p className="text-[10px] text-slate-mist/70 mb-2">Password: Kavach@2024</p>
                <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto kavach-scroll pr-1">
                  {DEMO_ACCOUNTS.map((d) => (
                    <button key={d.email} onClick={() => { setEmail(d.email); setPassword('Kavach@2024'); setShowDemo(false); }}
                      className="tap-target text-left text-xs bg-navy-950/40 active:bg-navy-800/60 border border-navy-700/60 rounded-lg px-3 py-2.5 text-slate-mist active:text-cream-100 transition-colors flex justify-between items-center gap-2">
                      <span className="shrink-0">{d.role}</span><span className="font-mono opacity-60 truncate">{d.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
