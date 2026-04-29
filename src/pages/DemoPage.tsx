import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Zap, CheckCircle, ExternalLink,
  Users, Package, TrendingUp, Star
} from 'lucide-react';
import { DEMO_ROOM, DEMO_ITEMS, DEMO_PAYMENTS } from '../utils';
import { StatusBadge } from '../components/StatusBadge';

export const DemoPage: React.FC = () => {
  const totalItems = DEMO_ITEMS.length;
  const allPaid = DEMO_PAYMENTS.every(p => p.paymentStatus === 'paid');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/5 sticky top-0 bg-gray-950/80 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white text-sm sm:text-base">Demo Session</span>
          </div>
        </div>
        <span className="text-yellow-400 text-xs font-bold bg-yellow-400/10 border border-yellow-400/20 px-2 py-1 rounded-full">
          ✨ DEMO
        </span>
      </nav>

      {/* Hero banner */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-indigo-900/40 border-b border-indigo-500/20 px-6 py-8 text-center">
        <div className="max-w-xl mx-auto space-y-2">
          <p className="text-indigo-300 text-sm font-medium">Completed • {DEMO_ROOM.building}</p>
          <h1 className="text-3xl font-black text-white">{DEMO_ROOM.platform} Group Run</h1>
          <p className="text-white/50 text-sm">
            Captain <span className="text-indigo-300">{DEMO_ROOM.captainName}</span> led{' '}
            {DEMO_ROOM.memberCount} members to pool ₹{DEMO_ROOM.totalCartValue} worth of groceries —
            hitting the free delivery threshold!
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <StatusBadge status={DEMO_ROOM.status} />
            <span className="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
              Free Delivery Unlocked
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Members', value: DEMO_ROOM.memberCount, icon: <Users className="w-4 h-4" />, color: 'text-indigo-400', sub: 'joined the run' },
            { label: 'Items', value: totalItems, icon: <Package className="w-4 h-4" />, color: 'text-purple-400', sub: `${DEMO_ITEMS.filter(i => i.status === 'oos').length} OOS` },
            { label: 'Cart Value', value: `₹${DEMO_ROOM.totalCartValue}`, icon: <TrendingUp className="w-4 h-4" />, color: 'text-emerald-400', sub: 'above threshold' },
            { label: 'All Settled', value: allPaid ? '✓' : '…', icon: <Star className="w-4 h-4" />, color: 'text-yellow-400', sub: 'in < 2 min' },
          ].map(stat => (
            <div key={stat.label} className="card p-4 space-y-1">
              <div className={`flex items-center gap-1.5 ${stat.color}`}>
                {stat.icon}
                <span className="text-white/40 text-xs font-medium">{stat.label}</span>
              </div>
              <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-white/30 text-[11px]">{stat.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">

          {/* Item Feed */}
          <div className="space-y-4">
            <h2 className="text-white font-bold flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-400" />
              Item Submissions
            </h2>
            <div className="space-y-3">
              {DEMO_ITEMS.map(item => (
                <div key={item.id} className="card p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-indigo-300 text-xs font-semibold">{item.memberName}</span>
                        {item.status === 'added' && <span className="chip-added">✓ ADDED</span>}
                        {item.status === 'oos' && <span className="chip-oos">OOS</span>}
                        {item.status === 'pending' && <span className="chip-pending">PENDING</span>}
                      </div>
                      <p className="text-white font-semibold">{item.itemName}</p>
                      <p className="text-white/50 text-sm">
                        ₹{item.price} × {item.quantity} ={' '}
                        <span className="text-white font-medium">₹{item.subtotal}</span>
                      </p>
                    </div>
                    <span className={`flex-shrink-0 badge text-xs ${item.oosPreference === 'substitute' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' : 'bg-red-500/15 text-red-400 border border-red-500/25'}`}>
                      {item.oosPreference === 'substitute' ? '↔ Sub' : '✕ Cancel'}
                    </span>
                  </div>
                  <a
                    href={item.itemLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs group transition-colors"
                  >
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate group-hover:underline">{item.itemLink}</span>
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Payment splits */}
          <div className="space-y-4">
            <h2 className="text-white font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Payment Splits
            </h2>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8">
                    <th className="text-left px-4 py-3 text-white/40 text-xs font-semibold uppercase tracking-wider">Member</th>
                    <th className="text-right px-3 py-3 text-white/40 text-xs font-semibold uppercase tracking-wider">Items</th>
                    <th className="text-right px-3 py-3 text-white/40 text-xs font-semibold uppercase tracking-wider">Total</th>
                    <th className="text-center px-4 py-3 text-white/40 text-xs font-semibold uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {DEMO_PAYMENTS.map(p => (
                    <tr key={p.memberUid} className="bg-emerald-500/3">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-300">
                            {p.memberName[0]}
                          </div>
                          <span className="text-white font-medium">{p.memberName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-right text-white/50">{p.itemCount}</td>
                      <td className="px-3 py-3.5 text-right text-white font-bold">₹{p.total}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="chip-paid">✓ PAID</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-white/10 bg-white/3">
                    <td className="px-4 py-3.5 text-white/50 font-semibold text-xs uppercase tracking-wider">TOTAL</td>
                    <td className="px-3 py-3.5 text-right text-white/50">{DEMO_ITEMS.filter(i => i.status === 'added').length}</td>
                    <td className="px-3 py-3.5 text-right text-white font-black text-base">
                      ₹{DEMO_PAYMENTS.reduce((s, p) => s + p.total, 0)}
                    </td>
                    <td className="px-4 py-3.5 text-center text-emerald-400 text-sm font-bold">All ✓</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Timeline */}
            <h2 className="text-white font-bold flex items-center gap-2 pt-2">
              <span className="text-indigo-400">⚡</span> Session Timeline
            </h2>
            <div className="card p-5 space-y-4">
              {[
                { time: '9:00 PM', event: `${DEMO_ROOM.captainName} created Room DEMO01`, color: 'bg-indigo-500' },
                { time: '9:02 PM', event: '4 members joined via the 6-digit code', color: 'bg-purple-500' },
                { time: '9:08 PM', event: `${DEMO_ITEMS.length} items submitted — ₹${DEMO_ROOM.totalCartValue} cart value`, color: 'bg-emerald-500' },
                { time: '9:10 PM', event: 'Free delivery threshold crossed 🎉 Auto-extended', color: 'bg-yellow-500' },
                { time: '9:15 PM', event: 'Captain locked room & viewed splits', color: 'bg-amber-500' },
                { time: '9:17 PM', event: 'Order placed on Blinkit', color: 'bg-indigo-500' },
                { time: '9:42 PM', event: 'Delivery arrived — all items handed off', color: 'bg-emerald-500' },
                { time: '9:44 PM', event: 'All members paid via UPI ✓', color: 'bg-emerald-500' },
              ].map((evt, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full mt-1 ${evt.color}`} />
                    {i < 7 && <div className="w-px flex-1 min-h-[20px] bg-white/10 mt-1" />}
                  </div>
                  <div className="flex-1 pb-2">
                    <span className="text-white/30 text-xs font-mono">{evt.time}</span>
                    <p className="text-white/70 text-sm mt-0.5">{evt.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="card p-6 text-center bg-gradient-to-r from-indigo-900/30 to-purple-900/20 border-indigo-500/20 space-y-4">
          <h3 className="text-white font-bold text-xl">Ready to start your own run?</h3>
          <p className="text-white/50 text-sm">Create a room, share the code, pool orders — done in under 2 minutes.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/create" className="btn-primary inline-flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" />
              Create a Room
            </Link>
            <Link to="/join" className="btn-secondary inline-flex items-center justify-center gap-2">
              Join a Room
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};
