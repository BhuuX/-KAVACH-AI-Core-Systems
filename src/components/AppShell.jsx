import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, MessageSquareText, FileSearch, Users, Car,
  Network, MapPinned, FileOutput, ShieldAlert, LogOut, ChevronRight,
  Menu, X,
} from 'lucide-react';

const NAV = [
  { to: '/dashboard', label: 'Command Overview', short: 'Home', icon: LayoutDashboard },
  { to: '/copilot', label: 'AI Copilot', short: 'Copilot', icon: MessageSquareText },
  { to: '/cases', label: 'Case Registry', short: 'Cases', icon: FileSearch },
  { to: '/persons', label: 'Suspect Directory', short: 'Suspects', icon: Users },
  { to: '/vehicles', label: 'Vehicle Seizures', short: 'Vehicles', icon: Car },
  { to: '/network', label: 'Link Analysis', short: 'Network', icon: Network },
  { to: '/predictive', label: 'Predictive Mapping', short: 'Predictive', icon: MapPinned },
  { to: '/briefs', label: 'Investigation Briefs', short: 'Briefs', icon: FileOutput },
  { to: '/alerts', label: 'System Alerts', short: 'Alerts', icon: ShieldAlert },
];

// The four highest-frequency destinations get a permanent slot in the
// mobile bottom tab bar; everything else lives in the "More" drawer.
// This mirrors how field officers actually use the tool: check dashboard,
// ask the copilot, look up a case — those three dominate real usage.
const TAB_BAR_ITEMS = NAV.slice(0, 3);

const ROLE_LABEL = {
  investigator: 'Investigator',
  inspector: 'Inspector',
  superintendent: 'Superintendent of Police',
  analyst: 'Crime Analyst',
  admin: 'System Administrator',
};

function PageTitle() {
  const location = useLocation();
  const match = [...NAV, { to: '/admin', label: 'Admin Console' }].find((n) => location.pathname.startsWith(n.to));
  return match?.label || 'KAVACH AI';
}

export default function AppShell() {
  const { officer } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const handleLogout = async () => {
    if (window.catalyst) {
      window.catalyst.auth.signOut(window.location.origin + '/login');
    } else {
      console.log('[KAVACH] Logging out of local mock Catalyst session');
      navigate('/login', { replace: true });
    }
  };

  const isTabActive = (to) => location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to));

  return (
    <div className="min-h-screen bg-navy-950 flex">
      {/* ---------- Desktop Sidebar (lg and up) ---------- */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-gradient-to-b from-navy-900 to-navy-950 border-r border-navy-800 flex-col">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-navy-800">
          <img src="/brand/kavach-emblem.png" alt="" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="font-serif text-lg text-cream-100 leading-none">KAVACH AI</h1>
            <p className="text-[10px] text-gold-400 font-mono tracking-widest mt-1">SAFEGUARDING KARNATAKA</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto kavach-scroll">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group ${
                  isActive ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30' : 'text-slate-mist hover:bg-navy-800/60 hover:text-cream-100 border border-transparent'
                }`
              }>
              <Icon size={17} />
              <span className="flex-1">{label}</span>
              <ChevronRight size={14} className="opacity-0 group-hover:opacity-40" />
            </NavLink>
          ))}
          {officer?.role === 'admin' && (
            <NavLink to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mt-3 border-t border-navy-800 pt-4 ${
                  isActive ? 'bg-crimson-600/15 text-crimson-400 border-crimson-500/30' : 'text-slate-mist hover:bg-navy-800/60 hover:text-cream-100'
                }`
              }>
              <ShieldAlert size={17} />
              <span className="flex-1">Admin Console</span>
            </NavLink>
          )}
        </nav>

        <div className="border-t border-navy-800 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-navy-800 border border-gold-500/30 flex items-center justify-center text-gold-400 font-serif text-sm shrink-0">
              {officer?.full_name?.[0] || '?'}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-cream-100 truncate">{officer?.full_name || 'Loading\u2026'}</p>
              <p className="text-[11px] text-slate-mist truncate">{officer ? ROLE_LABEL[officer.role] : ''}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-xs text-slate-mist hover:text-crimson-400 border border-navy-700 hover:border-crimson-500/40 rounded-lg py-2.5 transition-colors">
            <LogOut size={14} /> End Session
          </button>
        </div>
      </aside>

      {/* ---------- Mobile Top Header ---------- */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 bg-navy-900/95 backdrop-blur-md border-b border-navy-800 safe-top">
        <div className="h-14 px-4 flex items-center justify-between">
          <button onClick={() => setDrawerOpen(true)} aria-label="Open menu"
            className="touch-target flex items-center justify-center -ml-2 rounded-lg text-cream-100 active:bg-navy-800/60 transition-colors">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <img src="/brand/kavach-emblem.png" alt="" className="w-6 h-6 object-contain shrink-0" />
            <h1 className="font-serif text-[15px] text-cream-100 truncate"><PageTitle /></h1>
          </div>
          <div className="w-9 h-9 rounded-full bg-navy-800 border border-gold-500/30 flex items-center justify-center text-gold-400 font-serif text-xs shrink-0">
            {officer?.full_name?.[0] || '?'}
          </div>
        </div>
      </header>

      {/* ---------- Mobile Slide-in Drawer ---------- */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 w-[82%] max-w-[320px] bg-gradient-to-b from-navy-900 to-navy-950 z-50 flex flex-col safe-top safe-bottom shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-navy-800">
                <div className="flex items-center gap-3">
                  <img src="/brand/kavach-emblem.png" alt="" className="w-9 h-9 object-contain" />
                  <div>
                    <h1 className="font-serif text-base text-cream-100 leading-none">KAVACH AI</h1>
                    <p className="text-[9px] text-gold-400 font-mono tracking-widest mt-1">SAFEGUARDING KARNATAKA</p>
                  </div>
                </div>
                <button onClick={() => setDrawerOpen(false)} aria-label="Close menu"
                  className="touch-target flex items-center justify-center rounded-lg text-slate-mist active:bg-navy-800/60 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex items-center gap-3 px-5 py-4 border-b border-navy-800">
                <div className="w-11 h-11 rounded-full bg-navy-800 border border-gold-500/30 flex items-center justify-center text-gold-400 font-serif text-base shrink-0">
                  {officer?.full_name?.[0] || '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-cream-100 truncate font-medium">{officer?.full_name || 'Loading\u2026'}</p>
                  <p className="text-xs text-slate-mist truncate">{officer ? ROLE_LABEL[officer.role] : ''}</p>
                </div>
              </div>

              <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto kavach-scroll">
                {NAV.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to}
                    className={({ isActive }) =>
                      `touch-target flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] transition-colors ${
                        isActive ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30' : 'text-slate-mist active:bg-navy-800/60 border border-transparent'
                      }`
                    }>
                    <Icon size={19} />
                    <span className="flex-1">{label}</span>
                  </NavLink>
                ))}
                {officer?.role === 'admin' && (
                  <NavLink to="/admin"
                    className={({ isActive }) =>
                      `touch-target flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] transition-colors mt-3 border-t border-navy-800 pt-4 ${
                        isActive ? 'bg-crimson-600/15 text-crimson-400 border-crimson-500/30' : 'text-slate-mist active:bg-navy-800/60'
                      }`
                    }>
                    <ShieldAlert size={19} />
                    <span className="flex-1">Admin Console</span>
                  </NavLink>
                )}
              </nav>

              <div className="border-t border-navy-800 p-4">
                <button onClick={handleLogout}
                  className="touch-target w-full flex items-center justify-center gap-2 text-sm text-slate-mist active:text-crimson-400 border border-navy-700 active:border-crimson-500/40 rounded-xl py-3 transition-colors">
                  <LogOut size={16} /> End Session
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ---------- Mobile Bottom Tab Bar ---------- */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-navy-900/95 backdrop-blur-md border-t border-navy-800 safe-bottom">
        <div className="grid grid-cols-4 h-16">
          {TAB_BAR_ITEMS.map(({ to, short, icon: Icon }) => {
            const active = isTabActive(to);
            return (
              <NavLink key={to} to={to}
                className="touch-target flex flex-col items-center justify-center gap-1 relative">
                {active && (
                  <motion.span layoutId="tab-indicator" className="absolute top-0 h-0.5 w-8 bg-gold-500 rounded-full" />
                )}
                <Icon size={20} className={active ? 'text-gold-400' : 'text-slate-mist'} />
                <span className={`text-[10px] font-medium ${active ? 'text-gold-400' : 'text-slate-mist'}`}>{short}</span>
              </NavLink>
            );
          })}
          <button onClick={() => setDrawerOpen(true)} className="touch-target flex flex-col items-center justify-center gap-1">
            <Menu size={20} className="text-slate-mist" />
            <span className="text-[10px] font-medium text-slate-mist">More</span>
          </button>
        </div>
      </nav>

      {/* ---------- Main Content ---------- */}
      <main className="flex-1 min-w-0 overflow-y-auto kavach-scroll pt-14 pb-16 lg:pt-0 lg:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
