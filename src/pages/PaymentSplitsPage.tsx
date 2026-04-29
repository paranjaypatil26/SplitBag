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

  // ── render ────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen flex flex-col">
      <div className="p-4 border-b border-white/5"><div className="skeleton h-8 w-40 rounded-lg" /></div>
      <div className="p-6 space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
    </div>
  );

  if (!room) return <p className="text-white text-center p-10">Room not found</p>;

  const splits = computeSplits();
  const allPaid = splits.length > 0 && splits.every(s => s.paymentStatus === 'paid');
  const totalCollected = splits.filter(s => s.paymentStatus === 'paid').reduce((a, s) => a + s.total, 0);
  const totalOwed      = splits.reduce((a, s) => a + s.total, 0);
  const isCaptain      = user?.id === room.captainUid;
  const freeDelivery   = room.totalCartValue >= room.threshold;

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-white/5 sticky top-0 bg-gray-950/80 backdrop-blur-xl z-10">
        <Link to={isCaptain ? `/captain/${roomCode}` : `/member/${roomCode}`}
          className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Users className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-white">Payment Splits</span>
        </div>
      </nav>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-6 space-y-5">

        {/* Summary header */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/40 text-xs">Room</p>
              <p className="text-white font-black tracking-wider text-xl">{room.roomCode}</p>
            </div>
            <div className="text-right">
              <p className="text-white/40 text-xs">Status</p>
              <p className={`font-bold text-sm ${allPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
                {allPaid ? '✓ All Settled' : `${splits.filter(s => s.paymentStatus === 'pending').length} Pending`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1 border-t border-white/8">
            <div className="text-center">
              <p className="text-white font-black text-xl">₹{room.totalCartValue}</p>
              <p className="text-white/40 text-xs">Cart Value</p>
            </div>
            <div className="text-center">
              <p className={`font-black text-xl ${freeDelivery ? 'text-emerald-400' : 'text-white'}`}>
                {freeDelivery ? <span>Free 🎉</span> : `₹${room.deliveryFee}`}
              </p>
              <p className="text-white/40 text-xs">Delivery</p>
            </div>
            <div className="text-center">
              <p className="text-white font-black text-xl">
                ₹{totalCollected}<span className="text-white/30 font-normal text-sm">/{totalOwed}</span>
              </p>
              <p className="text-white/40 text-xs">Collected</p>
            </div>
          </div>
        </div>

        {/* Splits table */}
        <div className="card overflow-hidden">
          <div className="grid grid-cols-5 gap-2 px-4 py-3 border-b border-white/8 text-white/40 text-xs font-semibold uppercase tracking-wider">
            <span className="col-span-2">Member</span>
            <span className="text-right">Items</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Status</span>
          </div>

          {splits.length === 0
            ? <div className="px-4 py-8 text-center text-white/30 text-sm">No items submitted yet</div>
            : splits.map(mp => (
                <div key={mp.memberUid}
                  className={`grid grid-cols-5 gap-2 px-4 py-3.5 border-b border-white/5 last:border-0 items-center hover:bg-white/3 transition-colors ${mp.memberUid === user?.id ? 'bg-indigo-500/5' : ''}`}>
                  <div className="col-span-2 flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      mp.paymentStatus === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-300'}`}>
                      {mp.memberName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{mp.memberName}</p>
                      {mp.memberUid === user?.id && <p className="text-indigo-400 text-xs">You</p>}
                    </div>
                  </div>
                  <div className="text-right text-white/60 text-sm">{mp.itemCount}</div>
                  <div className="text-right">
                    <p className="text-white font-bold text-sm">₹{mp.total}</p>
                    {!freeDelivery && <p className="text-white/30 text-xs">+₹{mp.deliveryShare} del.</p>}
                  </div>
                  <div className="flex justify-end">
                    {isCaptain ? (
                      <button
                        onClick={() => togglePayment(mp)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                          mp.paymentStatus === 'paid'
                            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
                            : 'border-white/10 text-white/40 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400'
                        }`}
                      >
                        {mp.paymentStatus === 'paid' ? <><Check className="w-3 h-3" /> PAID</> : 'Mark paid'}
                      </button>
                    ) : mp.memberUid === user?.id ? (
                      mp.paymentStatus === 'paid'
                        ? <span className="chip-paid flex items-center gap-1"><Check className="w-3 h-3" /> PAID</span>
                        : <button id="pay-from-splits-btn" onClick={() => setSelected(mp)}
                            className="btn-primary text-xs py-1.5 px-3">
                            Pay ₹{mp.total}
                          </button>
                    ) : (
                      <span className={mp.paymentStatus === 'paid' ? 'chip-paid' : 'chip-pending'}>
                        {mp.paymentStatus === 'paid' ? '✓ PAID' : 'UNPAID'}
                      </span>
                    )}
                  </div>
                </div>
              ))
          }

          {/* Total row */}
          <div className="grid grid-cols-5 gap-2 px-4 py-3.5 border-t border-white/10 bg-white/3 items-center">
            <span className="col-span-2 text-white/60 text-sm font-semibold uppercase tracking-wider">Total</span>
            <span className="text-right text-white/60 text-sm">{splits.reduce((a,s) => a+s.itemCount, 0)}</span>
            <span className="text-right text-white font-black">₹{totalOwed}</span>
            <span className="text-right">
              {allPaid
                ? <span className="chip-paid">All ✓</span>
                : <span className="text-white/40 text-xs">₹{totalCollected} in</span>
              }
            </span>
          </div>
        </div>

        {/* UPI QR for captain */}
        {isCaptain && (
          <div className="card p-4 space-y-2 border border-indigo-500/20 bg-indigo-500/5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              <p className="text-white font-semibold text-sm">Your UPI: <span className="font-mono text-indigo-300">{room.captainUPI}</span></p>
            </div>
            <p className="text-white/40 text-xs">Share this with members so they can pay you directly</p>
          </div>
        )}

        {allPaid && (
          <div className="card p-6 text-center space-y-2 border border-emerald-500/20 bg-emerald-500/5">
            <div className="text-4xl">🎉</div>
            <h3 className="text-white font-bold">All Settled!</h3>
            <p className="text-white/50 text-sm">Everyone has paid. Great run!</p>
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
