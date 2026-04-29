import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, ChevronRight, Users, Package, CheckCircle, Star, Clock, Pencil, X, LogOut } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { DEMO_ROOM, DEMO_ITEMS, DEMO_PAYMENTS } from '../utils';

const NameModal: React.FC<{ current: string; onSubmit: (name: string) => void; onClose: () => void }> = ({ current, onSubmit, onClose }) => {
  const [name, setName] = useState(current);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="card modal-enter w-full max-w-sm p-8 space-y-6 text-center relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto">
          <Zap className="w-8 h-8 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{current ? 'Change name' : 'Hey there! 👋'}</h2>
          <p className="text-white/50 text-sm mt-1">What should your group call you?</p>
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
          className="btn-primary w-full"
          disabled={!name.trim()}
          onClick={() => onSubmit(name.trim())}
        >
          {current ? 'Save →' : "Let's Go →"}
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
      className="card-hover p-5 cursor-pointer border-indigo-500/20 hover:border-indigo-400/40 transition-all"
      onClick={() => navigate('/demo')}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-yellow-400 text-xs font-bold bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full">
              ✨ DEMO SESSION
            </span>
          </div>
          <h3 className="font-bold text-white">{DEMO_ROOM.building}</h3>
          <p className="text-white/50 text-sm">Captain: {DEMO_ROOM.captainName} • {DEMO_ROOM.platform}</p>
        </div>
        <span className="badge-delivered">DELIVERED</span>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Members', value: DEMO_ROOM.memberCount, icon: <Users className="w-3 h-3" /> },
          { label: 'Items', value: DEMO_ITEMS.filter(i => i.status !== 'oos').length, icon: <Package className="w-3 h-3" /> },
          { label: 'Cart', value: `₹${DEMO_ROOM.totalCartValue}`, icon: <Star className="w-3 h-3" /> },
          { label: 'All Paid', value: '✓', icon: <CheckCircle className="w-3 h-3" /> },
        ].map(stat => (
          <div key={stat.label} className="bg-white/5 rounded-xl p-2.5 text-center">
            <div className="text-white/40 flex justify-center mb-0.5">{stat.icon}</div>
            <div className="text-white font-bold text-sm">{stat.value}</div>
            <div className="text-white/40 text-[10px]">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-white/50">Total settled: <span className="text-emerald-400 font-semibold">₹{totalValue}</span></span>
        <div className="flex items-center gap-1 text-indigo-400 font-medium">
          <span>View full session</span>
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
      <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-3 text-center">Recent Rooms</p>
      <div className="space-y-2">
        {history.slice(0, 3).map(entry => (
          <Link
            key={entry.roomCode}
            to={entry.role === 'captain' ? `/captain/${entry.roomCode}` : `/member/${entry.roomCode}`}
            className="flex items-center gap-3 card p-3 hover:bg-white/10 hover:border-white/20 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-base flex-shrink-0">
              {PLATFORM_EMOJI[entry.platform] || '📦'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white text-sm font-semibold truncate">{entry.building}</p>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  entry.role === 'captain' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/10 text-white/50'
                }`}>{entry.role === 'captain' ? 'Captain' : 'Member'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/30">
                <Clock className="w-3 h-3" />
                <span>{formatTime(entry.visitedAt)}</span>
                <span className="font-mono">· #{entry.roomCode}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" />
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

      <div className="min-h-screen flex flex-col">
        {/* Top nav */}
        <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">DropRun</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1.5 border border-white/10">
                  <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold">
                    {displayName[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="text-white/70 text-sm hidden sm:inline">{displayName}</span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-all"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="text-white/70 hover:text-white text-sm font-medium px-4 py-2 transition-colors">
                  Login
                </Link>
                <Link to="/signup" className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-5 py-2 rounded-full shadow-lg shadow-indigo-500/20 transition-all">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </nav>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          {/* Hero */}
          <div className="text-center space-y-4 mb-12 max-w-lg">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-4 py-1.5 text-indigo-300 text-sm font-medium mb-2">
              <Zap className="w-3.5 h-3.5" />
              Hyper-local order pooling
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight">
              Order Together,{' '}
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Save Together
              </span>
            </h1>
            <p className="text-white/50 text-lg leading-relaxed">
              Pool your Blinkit, Zepto & Instamart orders with your hostel mates.
              One Captain, one delivery, zero individual delivery fees.
            </p>
          </div>

          {/* Action cards */}
          <div className="grid sm:grid-cols-2 gap-4 w-full max-w-lg mb-12">
            <button
              onClick={handleCreate}
              className="group relative overflow-hidden bg-gradient-to-br from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 rounded-2xl p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-900/60 border border-indigo-500/30"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-6 translate-x-6 group-hover:scale-150 transition-transform duration-500" />
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center mb-4">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-white font-bold text-xl mb-1">Create Room</h2>
              <p className="text-indigo-200/70 text-sm leading-relaxed">
                Be the Captain. Invite your group and manage the order.
              </p>
              <div className="flex items-center gap-1 mt-4 text-indigo-300 text-sm font-medium group-hover:gap-2 transition-all">
                Start a run <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            <button
              onClick={handleJoin}
              className="group relative overflow-hidden bg-white/5 hover:bg-white/10 rounded-2xl p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-white/5 border border-white/10 hover:border-white/20"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/3 rounded-full -translate-y-6 translate-x-6 group-hover:scale-150 transition-transform duration-500" />
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                <Users className="w-5 h-5 text-white/70" />
              </div>
              <h2 className="text-white font-bold text-xl mb-1">Join Room</h2>
              <p className="text-white/40 text-sm leading-relaxed">
                Got a Room Code? Jump in and add your items.
              </p>
              <div className="flex items-center gap-1 mt-4 text-white/50 text-sm font-medium group-hover:text-white/70 group-hover:gap-2 transition-all">
                Enter code <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </div>

          {/* How it works */}
          <div className="w-full max-w-lg mb-8">
            <div className="grid grid-cols-3 gap-3">
              {[
                { step: '1', text: 'Captain creates a room & shares the 6-digit code', color: 'text-indigo-400' },
                { step: '2', text: 'Members join, paste item links & quantities', color: 'text-emerald-400' },
                { step: '3', text: 'Captain orders, splits are calculated automatically', color: 'text-purple-400' },
              ].map(({ step, text, color }) => (
                <div key={step} className="glass-panel rounded-xl p-3 text-center">
                  <div className={`text-2xl font-black mb-1.5 ${color}`}>{step}</div>
                  <p className="text-white/50 text-[11px] leading-snug">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Demo section */}
          <div className="w-full max-w-lg mb-12">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-3 text-center">
              See how it works
            </p>
            <DemoCard />
          </div>

          {/* Recent rooms */}
          <RecentRooms />
        </main>

        <footer className="text-center py-8 text-white/20 text-xs border-t border-white/5">
          DropRun — Zero-friction order pooling for your building
        </footer>
      </div>
    </>
  );
};
