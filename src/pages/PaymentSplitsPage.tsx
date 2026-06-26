import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Zap, Check, Users } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import type { Room, ItemSubmission, MemberPayment } from '../types';
import type { Platform, RoomStatus, OOSPreference, ItemStatus } from '../types';
import { UPIModal } from '../components/UPIModal';
import { SkeletonCard } from '../components/Loading';
import toast from 'react-hot-toast';
import { calcMemberDeliveryShare } from '../utils';
import { ThemeToggle } from '../components/ThemeToggle';

// ── DB mappers ────────────────────────────────────────────────

const mapRoom = (r: Record<string, unknown>): Room => ({
  roomCode:       r.room_code as string,
  captainUid:     r.captain_uid as string,
  captainName:    r.captain_name as string,
  captainUPI:     r.captain_upi as string,
  building:       r.building as string,
  platform:       r.platform as Platform,
  status:         r.status as RoomStatus,
  expiryTime:     r.expiry_time as number,
  threshold:      r.threshold as number,
  deliveryFee:    r.delivery_fee as number,
  totalCartValue: r.total_cart_value as number,
  memberCount:    r.member_count as number,
  createdAt:      r.created_at as number,
});

const mapItem = (r: Record<string, unknown>): ItemSubmission => ({
  id:            r.id as string,
  memberUid:     r.member_uid as string,
  memberName:    r.member_name as string,
  itemLink:      r.item_link as string,
  itemName:      r.item_name as string,
  price:         r.price as number,
  quantity:      r.quantity as number,
  subtotal:      r.subtotal as number,
  oosPreference: r.oos_preference as OOSPreference,
  status:        r.status as ItemStatus,
  submittedAt:   r.submitted_at as number,
});

// ── Component ─────────────────────────────────────────────────

export const PaymentSplitsPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user, displayName } = useAuth();

  const [room, setRoom]             = useState<Room | null>(null);
  const [items, setItems]           = useState<ItemSubmission[]>([]);
  const [payments, setPayments]     = useState<Record<string, string>>({});
  const [loading, setLoading]       = useState(true);
  const [selectedMember, setSelected] = useState<MemberPayment | null>(null);

  // ── fetch helpers ─────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!roomCode) return;

    const [roomRes, itemsRes, paymentsRes] = await Promise.all([
      supabase.from('rooms').select('*').eq('room_code', roomCode).single(),
      supabase.from('items').select('*').eq('room_code', roomCode),
      supabase.from('payments').select('*').eq('room_code', roomCode),
    ]);

    if (roomRes.data)     setRoom(mapRoom(roomRes.data));
    if (itemsRes.data)    setItems(itemsRes.data.map(mapItem));
    if (paymentsRes.data) {
      const map: Record<string, string> = {};
      for (const p of paymentsRes.data) map[p.member_uid] = p.payment_status;
      setPayments(map);
    }

    setLoading(false);
  }, [roomCode]);

  // ── realtime ──────────────────────────────────────────────

  useEffect(() => {
    if (!roomCode) return;

    fetchAll();

    const channel = supabase
      .channel(`splits-${roomCode}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms',    filter: `room_code=eq.${roomCode}` }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items',    filter: `room_code=eq.${roomCode}` }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `room_code=eq.${roomCode}` }, () => fetchAll())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomCode, fetchAll]);

  // ── compute splits ─────────────────────────────────────────

  const computeSplits = (): MemberPayment[] => {
    if (!room) return [];

    const byMember: Record<string, { name: string; items: ItemSubmission[] }> = {};
    for (const item of items) {
      if (!byMember[item.memberUid]) byMember[item.memberUid] = { name: item.memberName, items: [] };
      byMember[item.memberUid].items.push(item);
    }

    return Object.entries(byMember).map(([uid, { name, items: memberItems }]) => {
      const itemCount   = memberItems.reduce((s, i) => s + i.quantity, 0);
      const subtotal    = memberItems.reduce((s, i) => s + i.subtotal, 0);
      const freeDelivery = room.totalCartValue >= room.threshold;
      const deliveryShare = freeDelivery ? 0 : calcMemberDeliveryShare(subtotal, room.totalCartValue, room.deliveryFee);
      const total        = subtotal + deliveryShare;
      const paymentStatus = (payments[uid] === 'paid' ? 'paid' : 'pending') as 'paid' | 'pending';

      return { memberUid: uid, memberName: name, itemCount, subtotal, deliveryShare, total, paymentStatus };
    });
  };

  const togglePayment = async (mp: MemberPayment) => {
    if (!roomCode) return;
    const newStatus = mp.paymentStatus === 'paid' ? 'pending' : 'paid';
    const { error } = await supabase.from('payments').upsert(
      { room_code: roomCode, member_uid: mp.memberUid, member_name: mp.memberName, payment_status: newStatus },
      { onConflict: 'room_code,member_uid' }
    );
    if (error) { toast.error('Failed to update payment'); return; }
    toast.success(`${mp.memberName} marked as ${newStatus}`);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-brand-navy">
      <div className="p-4 border-b border-white/5"><div className="skeleton h-8 w-40 rounded-lg" /></div>
      <div className="p-6 space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
    </div>
  );

  if (!room) return <p className="text-white text-center p-10 font-sans">Room not found</p>;

  const splits = computeSplits();
  const allPaid = splits.length > 0 && splits.every(s => s.paymentStatus === 'paid');
  const totalCollected = splits.filter(s => s.paymentStatus === 'paid').reduce((a, s) => a + s.total, 0);
  const totalOwed      = splits.reduce((a, s) => a + s.total, 0);
  const isCaptain      = user?.id === room.captainUid;
  const freeDelivery   = room.totalCartValue >= room.threshold;

  return (
    <div className="min-h-screen flex flex-col bg-brand-navy relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-white/5 rounded-full filter blur-[100px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      
      {/* Nav */}
      <nav className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/[0.08] sticky top-0 bg-brand-navy/85 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3">
          <Link to={isCaptain ? `/captain/${roomCode}` : `/member/${roomCode}`}
            className="text-brand-muted hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-cyan/15 border border-brand-cyan/30 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-brand-cyan" />
            </div>
            <span className="font-display font-semibold text-white text-sm sm:text-base">Payment Splits</span>
          </div>
        </div>
        <ThemeToggle />
      </nav>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6 relative z-10">

        {/* Summary header */}
        <div className="card-premium p-5 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-brand-muted text-[10px] font-bold uppercase tracking-wider">Room Code</p>
              <p className="text-white font-mono font-bold tracking-widest text-xl">{room.roomCode}</p>
            </div>
            <div className="text-right">
              <p className="text-brand-muted text-[10px] font-bold uppercase tracking-wider">Payment Status</p>
              <p className={`font-display font-semibold text-sm ${allPaid ? 'text-brand-cyan' : 'text-brand-orange animate-pulse'}`}>
                {allPaid ? '✓ All Settled' : `${splits.filter(s => s.paymentStatus === 'pending').length} Pending`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-3.5 border-t border-white/[0.08]">
            <div className="text-center">
              <p className="text-white font-bold font-mono text-base">₹{room.totalCartValue}</p>
              <p className="text-brand-muted text-[10px] font-semibold uppercase tracking-wider mt-0.5">Cart Value</p>
            </div>
            <div className="text-center">
              <p className={`font-bold text-base ${freeDelivery ? 'text-brand-cyan font-sans' : 'text-white font-mono'}`}>
                {freeDelivery ? <span>Free 🎉</span> : `₹${room.deliveryFee}`}
              </p>
              <p className="text-brand-muted text-[10px] font-semibold uppercase tracking-wider mt-0.5">Delivery</p>
            </div>
            <div className="text-center">
              <p className="text-white font-bold font-mono text-base">
                ₹{totalCollected}<span className="text-brand-muted/40 font-normal text-xs">/{totalOwed}</span>
              </p>
              <p className="text-brand-muted text-[10px] font-semibold uppercase tracking-wider mt-0.5">Collected</p>
            </div>
          </div>
        </div>

        {/* Splits table */}
        <div className="card-premium overflow-hidden shadow-2xl">
          <div className="grid grid-cols-5 gap-2 px-4 py-3 border-b border-white/[0.08] text-brand-muted text-[10px] font-bold uppercase tracking-wider bg-white/[0.01]">
            <span className="col-span-2">Member</span>
            <span className="text-right">Items</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Status</span>
          </div>

          {splits.length === 0 ? (
            <div className="px-4 py-10 text-center text-brand-muted text-sm font-sans">No items submitted yet</div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {splits.map(mp => (
                <div
                  key={mp.memberUid}
                  className={`grid grid-cols-5 gap-2 px-4 py-4 items-center transition-colors
                    ${mp.memberUid === user?.id ? 'bg-brand-cyan/[0.03]' : 'hover:bg-white/[0.01]'}`}
                >
                  <div className="col-span-2 flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                      ${mp.paymentStatus === 'paid'
                        ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/20'
                        : 'bg-brand-orange/20 text-brand-orange border border-brand-orange/20'}`}>
                      {mp.memberName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{mp.memberName}</p>
                      {mp.memberUid === user?.id && <p className="text-brand-cyan text-[10px] font-semibold uppercase tracking-wider">You</p>}
                    </div>
                  </div>
                  
                  <div className="text-right text-brand-muted text-sm font-mono">{mp.itemCount}</div>
                  
                  <div className="text-right">
                    <p className="text-white font-bold font-mono text-sm">₹{mp.total}</p>
                    {!freeDelivery && <p className="text-brand-muted/40 text-[10px] font-mono">+₹{mp.deliveryShare} del.</p>}
                  </div>
                  
                  <div className="flex justify-end">
                    {isCaptain ? (
                      <button
                        onClick={() => togglePayment(mp)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all uppercase tracking-wider
                          ${mp.paymentStatus === 'paid'
                            ? 'bg-brand-cyan/10 border-brand-cyan/30 text-brand-cyan hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
                            : 'border-white/10 text-brand-muted hover:bg-brand-cyan/10 hover:border-brand-cyan/30 hover:text-brand-cyan'
                        }`}
                      >
                        {mp.paymentStatus === 'paid' ? <><Check className="w-3.5 h-3.5" /> PAID</> : 'Mark paid'}
                      </button>
                    ) : mp.memberUid === user?.id ? (
                      mp.paymentStatus === 'paid' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan uppercase tracking-wider">
                          ✓ PAID
                        </span>
                      ) : (
                        <button
                          id="pay-from-splits-btn"
                          onClick={() => setSelected(mp)}
                          className="btn-primary text-xs py-1.5 px-3 rounded-xl"
                        >
                          Pay ₹{mp.total}
                        </button>
                      )
                    ) : (
                      <span className={mp.paymentStatus === 'paid' ? 'inline-flex items-center gap-1 text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan uppercase tracking-wider' : 'inline-flex items-center gap-1 text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-brand-orange/15 border border-brand-orange/30 text-brand-orange uppercase tracking-wider'}>
                        {mp.paymentStatus === 'paid' ? '✓ PAID' : 'PENDING'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Total row */}
          <div className="grid grid-cols-5 gap-2 px-4 py-3.5 border-t border-white/[0.08] bg-white/[0.02] items-center">
            <span className="col-span-2 text-brand-muted text-xs font-bold uppercase tracking-wider">Total Sum</span>
            <span className="text-right text-brand-muted text-sm font-mono">{splits.reduce((a, s) => a + s.itemCount, 0)}</span>
            <span className="text-right text-white font-extrabold font-mono">₹{totalOwed}</span>
            <span className="text-right">
              {allPaid ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-sans font-bold px-2.5 py-0.5 rounded-full bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan uppercase tracking-wider">
                  ALL ✓
                </span>
              ) : (
                <span className="text-brand-muted text-[10px] font-mono">₹{totalCollected} in</span>
              )}
            </span>
          </div>
        </div>

        {/* UPI QR / Link for Captain */}
        {isCaptain && (
          <div className="glass-card p-5 space-y-2 border border-brand-cyan/20 bg-brand-cyan/5 shadow-2xl">
            <div className="flex items-center gap-2">
              <Zap className="w-4.5 h-4.5 text-brand-cyan" />
              <p className="text-white font-display font-semibold text-sm">
                Your UPI ID: <span className="font-mono text-brand-orange font-bold select-all">{room.captainUPI}</span>
              </p>
            </div>
            <p className="text-brand-muted text-xs font-sans">
              Members will use this address to pay you directly. Once received, mark them as PAID above.
            </p>
          </div>
        )}

        {/* All Settled celebration */}
        {allPaid && (
          <div className="glass-card p-6 text-center space-y-3 border-brand-cyan/20 bg-brand-cyan/5 shadow-2xl">
            <div className="text-4xl">🎉</div>
            <h3 className="text-white font-display font-semibold text-base">All Settled!</h3>
            <p className="text-brand-muted text-sm font-sans">Everyone has completed their transfers. Great run!</p>
          </div>
        )}
      </div>

      {selectedMember && room && user && (
        <UPIModal
          amount={selectedMember.total}
          captainUPI={room.captainUPI!}
          captainName={room.captainName}
          roomCode={room.roomCode}
          memberUid={user.id}
          memberName={displayName || 'Member'}
          onClose={() => setSelected(null)}
          onPaid={() => {
            setPayments(prev => ({ ...prev, [user.id]: 'paid' }));
            setSelected(null);
          }}
        />
      )}
    </div>
  );
};
