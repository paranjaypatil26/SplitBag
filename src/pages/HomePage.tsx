import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, ChevronRight, Users, Package, CheckCircle, Star, Clock, X, LogOut, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { DEMO_ROOM, DEMO_ITEMS, DEMO_PAYMENTS } from '../utils';
import { ThemeToggle } from '../components/ThemeToggle';

const NameModal: React.FC<{ current: string; onSubmit: (name: string) => void; onClose: () => void }> = ({ current, onSubmit, onClose }) => {
  const [name, setName] = useState(current);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="card modal-enter w-full max-w-sm p-8 space-y-6 text-center relative border border-white/[0.08] shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-brand-muted hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
        <div className="w-16 h-16 rounded-2xl bg-brand-cyan/15 border border-brand-cyan/30 flex items-center justify-center mx-auto">
          <Zap className="w-8 h-8 text-brand-cyan" />
        </div>
        <div>
          <h2 className="text-xl font-display font-semibold text-white">{current ? 'Change Name' : 'Hey there! 👋'}</h2>
          <p className="text-brand-muted text-sm mt-1">What should your group call you?</p>
        </div>
        <div>
          <input
            className="input-field text-center text-lg font-semibold"
            placeholder="Your name..."
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && onSubmit(name.trim())}
            autoFocus
          />
        </div>
        <button
          className="btn-primary w-full text-sm font-semibold"
          disabled={!name.trim()}
          onClick={() => onSubmit(name.trim())}
        >
          {current ? 'Save Changes' : "Let's Go ⚡"}
        </button>
      </div>
    </div>
  );
};

const DemoCard: React.FC = () => {
  const navigate = useNavigate();
  const totalValue = DEMO_PAYMENTS.reduce((s, p) => s + p.total, 0);
  return (
    <div
      className="card-premium hover:-translate-y-1 hover:border-brand-cyan/30 p-5 cursor-pointer transition-all duration-300 group shadow-lg"
      onClick={() => navigate('/demo')}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-brand-orange text-[10px] font-sans font-bold bg-brand-orange/10 border border-brand-orange/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
              ✨ DEMO SESSION
            </span>
          </div>
          <h3 className="font-display font-semibold text-white text-base truncate">{DEMO_ROOM.building}</h3>
          <p className="text-brand-muted text-xs">Captain: {DEMO_ROOM.captainName} • {DEMO_ROOM.platform}</p>
        </div>
        <span className="badge-delivered flex-shrink-0">DELIVERED</span>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Members', value: DEMO_ROOM.memberCount, icon: <Users className="w-3.5 h-3.5" />, accent: 'text-brand-cyan' },
          { label: 'Items', value: DEMO_ITEMS.filter(i => i.status !== 'oos').length, icon: <Package className="w-3.5 h-3.5" />, accent: 'text-brand-orange' },
          { label: 'Cart', value: `₹${DEMO_ROOM.totalCartValue}`, icon: <Star className="w-3.5 h-3.5" />, accent: 'text-brand-cyan' },
          { label: 'All Paid', value: '✓', icon: <CheckCircle className="w-3.5 h-3.5" />, accent: 'text-brand-orange' },
        ].map(stat => (
          <div key={stat.label} className="bg-brand-navy border border-white/[0.04] rounded-xl p-2.5 text-center">
            <div className={`flex justify-center mb-1 ${stat.accent}`}>{stat.icon}</div>
            <div className="text-white font-mono font-bold text-sm">{stat.value}</div>
            <div className="text-brand-muted text-[9px] uppercase tracking-wider mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs pt-1">
        <span className="text-brand-muted">Total settled: <span className="text-brand-cyan font-mono font-bold">₹{totalValue}</span></span>
        <div className="flex items-center gap-1 text-brand-cyan font-medium group-hover:text-brand-cyan/80 transition-colors">
          <span>View demo run</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

const PLATFORM_EMOJI: Record<string, string> = {
  Blinkit: '🟡', Zepto: '🟣', 'Swiggy Instamart': '🟠',
};

interface HistoryEntry {
  roomCode: string;
  building: string;
  platform: string;
  role: string;
  visitedAt: number;
}

const RecentRooms: React.FC = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem('droprun_room_history');
    if (raw) setHistory(JSON.parse(raw));
  }, []);

  if (history.length === 0) return null;

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="w-full max-w-lg mb-6">
      <p className="text-brand-muted/60 text-[10px] font-sans font-bold uppercase tracking-widest mb-3 text-center">Recent Rooms</p>
      <div className="space-y-2">
        {history.slice(0, 3).map(entry => (
          <Link
            key={entry.roomCode}
            to={entry.role === 'captain' ? `/captain/${entry.roomCode}` : `/member/${entry.roomCode}`}
            className="flex items-center gap-3 card hover:bg-white/[0.03] p-3 hover:border-brand-cyan/30 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-base flex-shrink-0">
              {PLATFORM_EMOJI[entry.platform] || '📦'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white text-sm font-semibold truncate">{entry.building}</p>
                <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                  entry.role === 'captain' ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/20' : 'bg-brand-orange/15 text-brand-orange border border-brand-orange/20'
                }`}>{entry.role === 'captain' ? 'Captain' : 'Member'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-brand-muted/60 mt-0.5">
                <Clock className="w-3 h-3" />
                <span>{formatTime(entry.visitedAt)}</span>
                <span className="font-mono">· #{entry.roomCode}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/25 group-hover:text-white/60 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
};

export const HomePage: React.FC = () => {
  const { displayName, setDisplayName, logout, user } = useAuth();
  const [showNameModal, setShowNameModal] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const navigate = useNavigate();

  const handleNameSubmit = (name: string) => {
    setDisplayName(name);
    setShowNameModal(false);
    setEditingName(false);
  };

  const handleCreate = () => {
    if (!user) { navigate('/login'); return; }
    navigate('/create');
  };

  const handleJoin = () => {
    if (!user) { navigate('/login'); return; }
    navigate('/join');
  };

  return (
    <>
      {(showNameModal || editingName) && (
        <NameModal
          current={editingName ? displayName : ''}
          onSubmit={handleNameSubmit}
          onClose={() => { setShowNameModal(false); setEditingName(false); }}
        />
      )}

      <div className="min-h-screen flex flex-col relative bg-brand-navy overflow-hidden">
        {/* Radial glows */}
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-white/10 rounded-full filter blur-[140px] pointer-events-none -translate-x-1/3 translate-y-1/3" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#F97316]/15 rounded-full filter blur-[140px] pointer-events-none translate-x-1/3 -translate-y-1/3" />

        {/* Top nav */}
        <nav className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-brand-navy/85 backdrop-blur-xl sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <img src="/logo.png" className="h-9 w-auto object-contain" alt="Split Bag" />
            <span className="font-display font-bold bg-gradient-to-r from-brand-cyan to-brand-orange bg-clip-text text-transparent text-lg tracking-tight">Split Bag</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-brand-card/90 rounded-full px-3 py-1.5 border border-white/[0.08]">
                  <div className="w-5 h-5 rounded-full bg-brand-cyan/20 border border-brand-cyan/30 flex items-center justify-center text-[10px] font-bold text-brand-cyan">
                    {displayName[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="text-white/80 text-sm hidden sm:inline font-sans">{displayName}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan ml-1 animate-pulse" />
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-brand-muted hover:text-red-400 hover:bg-red-400/10 rounded-full transition-all"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="text-brand-muted hover:text-white text-sm font-medium px-4 py-2 transition-colors">
                  Login
                </Link>
                <Link to="/signup" className="btn-secondary text-sm font-bold px-5 py-2 shadow-lg transition-all rounded-xl">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </nav>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 z-10 relative">
          {/* Hero */}
          <div className="text-center space-y-4 mb-12 max-w-xl">
            <div className="inline-flex items-center gap-2 bg-brand-cyan/10 border border-brand-cyan/25 rounded-full px-4 py-1.5 text-brand-cyan text-xs font-semibold uppercase tracking-wider mb-2">
              <Zap className="w-3.5 h-3.5" />
              Hyper-local order pooling ⚡
            </div>
            <h1 className="text-5xl sm:text-6xl font-display font-extrabold text-white leading-[1.1] tracking-tight">
              Order Together,<br />
              <span className="bg-gradient-to-r from-brand-cyan to-brand-orange bg-clip-text text-transparent">
                Save Together
              </span>
            </h1>
            <p className="text-brand-muted text-base sm:text-lg leading-relaxed max-w-lg mx-auto">
              Pool your Blinkit, Zepto & Swiggy Instamart orders with your hostel or building mates.
              One Captain, one delivery, zero individual delivery fees.
            </p>
          </div>

          {/* Action cards */}
          <div className="grid sm:grid-cols-2 gap-5 w-full max-w-lg mb-12">
            <button
              onClick={handleCreate}
              className="group relative overflow-hidden glass-card border-l-[3px] border-l-brand-cyan p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-cyan/10 hover:border-y-white/10 hover:border-r-white/10"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-brand-cyan/5 rounded-full -translate-y-6 translate-x-6 group-hover:scale-150 transition-transform duration-500" />
              <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 flex items-center justify-center mb-4 border border-brand-cyan/20">
                <Zap className="w-5 h-5 text-brand-cyan" />
              </div>
              <h2 className="text-white font-display font-semibold text-xl mb-1">Create Room</h2>
              <p className="text-brand-muted text-xs leading-relaxed">
                Be the Captain. Invite your group and manage the pooled order.
              </p>
              <div className="flex items-center gap-1 mt-4 text-brand-cyan text-xs font-semibold group-hover:gap-2 transition-all">
                <span>Start a run</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            <button
              onClick={handleJoin}
              className="group relative overflow-hidden glass-card border-l-[3px] border-l-brand-orange p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-orange/10 hover:border-y-white/10 hover:border-r-white/10"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-brand-orange/5 rounded-full -translate-y-6 translate-x-6 group-hover:scale-150 transition-transform duration-500" />
              <div className="w-10 h-10 rounded-xl bg-brand-orange/10 flex items-center justify-center mb-4 border border-brand-orange/20">
                <LinkIcon className="w-5 h-5 text-brand-orange" />
              </div>
              <h2 className="text-white font-display font-semibold text-xl mb-1">Join Room</h2>
              <p className="text-brand-muted text-xs leading-relaxed">
                Got a Room Code? Jump in and add your items to the cart.
              </p>
              <div className="flex items-center gap-1 mt-4 text-brand-orange text-xs font-semibold group-hover:gap-2 transition-all">
                <span>Enter code</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </div>

          {/* How it works */}
          <div className="w-full max-w-lg mb-10">
            <div className="grid grid-cols-3 gap-3">
              {[
                { step: '1', text: 'Captain creates a room & shares 6-digit code' },
                { step: '2', text: 'Members join, paste item links & quantities' },
                { step: '3', text: 'Captain orders, splits are calculated automatically' },
              ].map(({ step, text }) => (
                <div key={step} className="glass-card bg-brand-card/50 p-4 text-center">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-brand-cyan to-brand-orange text-white font-display font-bold text-sm mb-2 mx-auto shadow-md">
                    {step}
                  </div>
                  <p className="text-brand-muted text-[10px] leading-snug font-sans">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Demo section */}
          <div className="w-full max-w-lg mb-12">
            <p className="text-brand-muted/50 text-[10px] font-sans font-bold uppercase tracking-widest mb-3 text-center">
              See Live Demo
            </p>
            <DemoCard />
          </div>

          {/* Recent rooms */}
          <RecentRooms />
        </main>

        <footer className="text-center py-8 text-brand-muted/30 text-xs border-t border-white/[0.05] z-10 relative">
          Split Bag — Zero-friction order pooling for your building
        </footer>
      </div>
    </>
  );
};
