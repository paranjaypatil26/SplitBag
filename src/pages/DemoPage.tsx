import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Zap, CheckCircle, ExternalLink,
  Users, Package, TrendingUp, Star
} from 'lucide-react';
import { DEMO_ROOM, DEMO_ITEMS, DEMO_PAYMENTS } from '../utils';
import { StatusBadge } from '../components/StatusBadge';
import { ThemeToggle } from '../components/ThemeToggle';

export const DemoPage: React.FC = () => {
  const totalItems = DEMO_ITEMS.length;
  const allPaid = DEMO_PAYMENTS.every(p => p.paymentStatus === 'paid');

  return (
    <div className="min-h-screen flex flex-col bg-brand-navy relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-white/5 rounded-full filter blur-[100px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-brand-orange/5 rounded-full filter blur-[100px] pointer-events-none translate-x-1/2 translate-y-1/2" />

      {/* Nav */}
      <nav className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/[0.08] sticky top-0 bg-brand-navy/85 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-brand-muted hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-cyan/15 border border-brand-cyan/30 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-brand-cyan" />
            </div>
            <span className="font-display font-semibold text-white text-sm sm:text-base">Demo Session</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-brand-orange text-xs font-bold bg-brand-orange/10 border border-brand-orange/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
            ✨ DEMO
          </span>
          <ThemeToggle />
        </div>
      </nav>

      {/* Hero banner */}
      <div className="bg-gradient-to-r from-brand-cyan/10 via-brand-orange/5 to-brand-cyan/10 border-b border-white/[0.08] px-6 py-10 text-center relative z-10">
        <div className="max-w-xl mx-auto space-y-3">
          <p className="text-brand-cyan text-xs font-bold uppercase tracking-wider">Completed • {DEMO_ROOM.building}</p>
          <h1 className="text-3xl font-display font-bold text-white leading-tight">{DEMO_ROOM.platform} Group Run</h1>
          <p className="text-brand-muted text-sm font-sans leading-relaxed">
            Captain <span className="text-white font-semibold">{DEMO_ROOM.captainName}</span> led{' '}
            <span className="text-white font-semibold">{DEMO_ROOM.memberCount} members</span> to pool <span className="text-brand-orange font-bold font-mono">₹{DEMO_ROOM.totalCartValue}</span> worth of items —
            hitting the free delivery threshold!
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <StatusBadge status={DEMO_ROOM.status} />
            <span className="inline-flex items-center gap-1.5 text-[11px] font-sans font-semibold uppercase tracking-wider border bg-brand-cyan/10 text-brand-cyan border-brand-cyan/25 px-3 py-1 rounded-full">
              <CheckCircle className="w-3.5 h-3.5" />
              Free Delivery Unlocked
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8 relative z-10">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Members', value: DEMO_ROOM.memberCount, icon: <Users className="w-4.5 h-4.5" />, color: 'text-brand-cyan border-brand-cyan/20 bg-brand-cyan/[0.02]', sub: 'joined the run' },
            { label: 'Items', value: totalItems, icon: <Package className="w-4.5 h-4.5" />, color: 'text-brand-orange border-brand-orange/20 bg-brand-orange/[0.02]', sub: `${DEMO_ITEMS.filter(i => i.status === 'oos').length} OOS` },
            { label: 'Cart Value', value: `₹${DEMO_ROOM.totalCartValue}`, icon: <TrendingUp className="w-4.5 h-4.5" />, color: 'text-brand-cyan border-brand-cyan/20 bg-brand-cyan/[0.02]', sub: 'above threshold' },
            { label: 'All Paid', value: allPaid ? '✓' : '…', icon: <Star className="w-4.5 h-4.5" />, color: 'text-brand-orange border-brand-orange/20 bg-brand-orange/[0.02]', sub: 'settled quickly' },
          ].map(stat => (
            <div key={stat.label} className={`glass-card p-4 space-y-1.5 border ${stat.color} shadow-lg`}>
              <div className="flex items-center gap-1.5 text-brand-muted">
                {stat.icon}
                <span className="text-[10px] font-bold uppercase tracking-wider">{stat.label}</span>
              </div>
              <div className="text-2xl font-extrabold font-mono text-white">{stat.value}</div>
              <div className="text-brand-muted/50 text-[10px] font-sans">{stat.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">

          {/* Item Feed */}
          <div className="space-y-4">
            <h2 className="text-white font-display font-semibold text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-brand-cyan" />
              Item Submissions
            </h2>
            <div className="space-y-3">
              {DEMO_ITEMS.map(item => (
                <div key={item.id} className={`glass-card p-4 space-y-3 shadow-md border transition-all duration-300
                  ${item.status === 'added' ? 'border-l-[3px] border-l-brand-cyan border-brand-cyan/25 bg-brand-cyan/[0.02]' :
                    item.status === 'oos'   ? 'border-l-[3px] border-l-red-500 border-red-500/25 bg-red-500/[0.02]' :
                    'border-l-[3px] border-l-brand-orange border-brand-orange/25 bg-brand-orange/[0.02]'
                  }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-brand-cyan font-sans font-bold text-xs">{item.memberName}</span>
                        {item.status === 'added' && <span className="chip-added font-semibold text-[9px] px-2 py-0.5">✓ ADDED</span>}
                        {item.status === 'oos' && <span className="chip-oos font-semibold text-[9px] px-2 py-0.5">OOS</span>}
                        {item.status === 'pending' && <span className="chip-pending font-semibold text-[9px] px-2 py-0.5">PENDING</span>}
                      </div>
                      <p className="text-white font-display font-semibold text-base truncate">{item.itemName}</p>
                      <p className="text-brand-muted text-xs font-sans mt-0.5">
                        ₹{item.price} × {item.quantity} ={' '}
                        <span className="text-brand-orange font-bold font-mono">₹{item.subtotal}</span>
                      </p>
                    </div>
                    <span className={`flex-shrink-0 inline-flex items-center text-[10px] font-sans font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                      item.oosPreference === 'substitute'
                        ? 'bg-brand-orange/10 text-brand-orange border-brand-orange/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {item.oosPreference === 'substitute' ? '↔ Sub' : '✕ Cancel'}
                    </span>
                  </div>
                  <a
                    href={item.itemLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-brand-cyan hover:text-brand-cyan/80 text-xs group transition-colors pt-1 border-t border-white/[0.04]"
                  >
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate group-hover:underline font-mono text-[11px] text-brand-muted/70">{item.itemLink}</span>
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Payment splits */}
          <div className="space-y-4">
            <h2 className="text-white font-display font-semibold text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-brand-cyan" />
              Payment Splits
            </h2>
            <div className="card-premium overflow-hidden shadow-md">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.01]">
                    <th className="text-left px-4 py-3 text-brand-muted text-[10px] font-bold uppercase tracking-wider">Member</th>
                    <th className="text-right px-3 py-3 text-brand-muted text-[10px] font-bold uppercase tracking-wider">Items</th>
                    <th className="text-right px-3 py-3 text-brand-muted text-[10px] font-bold uppercase tracking-wider">Total</th>
                    <th className="text-center px-4 py-3 text-brand-muted text-[10px] font-bold uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {DEMO_PAYMENTS.map(p => (
                    <tr key={p.memberUid} className="hover:bg-white/[0.01]">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-brand-cyan/20 border border-brand-cyan/20 flex items-center justify-center text-[10px] font-bold text-brand-cyan">
                            {p.memberName[0]}
                          </div>
                          <span className="text-white font-semibold text-sm">{p.memberName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-right text-brand-muted font-mono">{p.itemCount}</td>
                      <td className="px-3 py-3.5 text-right text-white font-bold font-mono">₹{p.total}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan uppercase tracking-wider">
                          ✓ PAID
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/[0.08] bg-white/[0.02]">
                    <td className="px-4 py-3.5 text-brand-muted font-bold text-[10px] uppercase tracking-wider">TOTAL</td>
                    <td className="px-3 py-3.5 text-right text-brand-muted font-mono">{DEMO_ITEMS.filter(i => i.status === 'added').length}</td>
                    <td className="px-3 py-3.5 text-right text-brand-orange font-extrabold font-mono text-base">
                      ₹{DEMO_PAYMENTS.reduce((s, p) => s + p.total, 0)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-sans font-bold px-2.5 py-0.5 rounded-full bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan uppercase tracking-wider">
                        All ✓
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Timeline */}
            <h2 className="text-white font-display font-semibold text-lg flex items-center gap-2 pt-2">
              <span className="text-brand-cyan">⚡</span> Session Timeline
            </h2>
            <div className="card-premium p-5 space-y-4 shadow-md">
              {[
                { time: '9:00 PM', event: `${DEMO_ROOM.captainName} created Room DEMO01`, color: 'bg-brand-cyan' },
                { time: '9:02 PM', event: '4 members joined via the 6-digit code', color: 'bg-brand-cyan/70' },
                { time: '9:08 PM', event: `${DEMO_ITEMS.length} items submitted — ₹${DEMO_ROOM.totalCartValue} cart value`, color: 'bg-brand-orange' },
                { time: '9:10 PM', event: 'Free delivery threshold crossed 🎉 Auto-extended', color: 'bg-brand-cyan' },
                { time: '9:15 PM', event: 'Captain locked room & viewed splits', color: 'bg-brand-orange' },
                { time: '9:17 PM', event: 'Order placed on Blinkit', color: 'bg-brand-cyan' },
                { time: '9:42 PM', event: 'Delivery arrived — all items handed off', color: 'bg-brand-cyan' },
                { time: '9:44 PM', event: 'All members paid via UPI ✓', color: 'bg-brand-orange animate-pulse' },
              ].map((evt, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${evt.color}`} />
                    {i < 7 && <div className="w-px flex-1 min-h-[22px] bg-white/10 mt-1.5" />}
                  </div>
                  <div className="flex-1 pb-1">
                    <span className="text-brand-muted/40 text-[10px] font-mono">{evt.time}</span>
                    <p className="text-white/80 text-sm font-sans mt-0.5">{evt.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="card-premium p-6 text-center bg-gradient-to-r from-brand-cyan/5 to-brand-orange/5 border border-white/[0.08] shadow-2xl space-y-4">
          <h3 className="text-white font-display font-semibold text-lg">Ready to start your own run?</h3>
          <p className="text-brand-muted text-sm font-sans max-w-md mx-auto leading-relaxed">Create a room, share the code, pool orders — done in under 2 minutes.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link to="/create" className="btn-primary inline-flex items-center justify-center gap-2 py-3.5 text-sm font-semibold rounded-xl">
              <Zap className="w-4 h-4" />
              Create a Room
            </Link>
            <Link to="/join" className="btn-secondary inline-flex items-center justify-center gap-2 py-3.5 text-sm font-semibold rounded-xl">
              Join a Room
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};
