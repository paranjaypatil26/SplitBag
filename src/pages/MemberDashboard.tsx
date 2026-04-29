import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, ExternalLink, X, Zap, Loader2, Package, Trash2, Pencil, Check,
} from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import type { Room, ItemSubmission, OOSPreference } from '../types';
import type { Platform, RoomStatus, ItemStatus } from '../types';
import { CountdownTimer } from '../components/CountdownTimer';
import { ProgressBar } from '../components/ProgressBar';
import { StatusBadge } from '../components/StatusBadge';
import { SkeletonCard, EmptyState } from '../components/Loading';
import { UPIModal } from '../components/UPIModal';
import toast from 'react-hot-toast';

// ── Save visited room to history ───────────────────────────────
function saveRoomToHistory(roomCode: string, building: string, platform: string, role: 'captain' | 'member') {
  const key = 'droprun_room_history';
  const existing: Array<{ roomCode: string; building: string; platform: string; role: string; visitedAt: number }> =
    JSON.parse(localStorage.getItem(key) || '[]');
  const filtered = existing.filter(r => r.roomCode !== roomCode);
  filtered.unshift({ roomCode, building, platform, role, visitedAt: Date.now() });
  localStorage.setItem(key, JSON.stringify(filtered.slice(0, 10)));
}

// ── DB mappers ───────────────────────────────────────────────

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

// ── Add Item Form ─────────────────────────────────────────────

interface AddItemFormProps {
  onClose: () => void;
  onSubmit: (data: Omit<ItemSubmission, 'id' | 'memberUid' | 'memberName' | 'submittedAt' | 'status'>) => Promise<unknown>;
  allItems: ItemSubmission[];
}

const AddItemForm: React.FC<AddItemFormProps> = ({ onClose, onSubmit, allItems }) => {
  const [link, setLink]       = useState('');
  const [name, setName]       = useState('');
  const [price, setPrice]     = useState('');
  const [qty, setQty]         = useState('1');
  const [oosPreference, setOos] = useState<OOSPreference>('substitute');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!link.trim() || !name.trim() || !price) {
      toast.error('Fill in all required fields'); return;
    }
    const p = parseFloat(price);
    const q = parseInt(qty, 10) || 1;
    if (isNaN(p) || p <= 0) { toast.error('Enter a valid price'); return; }

    // Removed duplicate URL block to allow multiple users to order the same item

    setLoading(true);
    try {
      await onSubmit({ itemLink: link.trim(), itemName: name.trim(), price: p, quantity: q, subtotal: p * q, oosPreference });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6 space-y-4 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-white font-bold text-lg">Add Item</h2>

        <div className="space-y-3">
          <input id="item-link" className="input-field" placeholder="Item URL (Blinkit / Zepto / Instamart)" value={link} onChange={e => setLink(e.target.value)} />
          <input id="item-name" className="input-field" placeholder="Item name" value={name} onChange={e => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">₹</span>
              <input id="item-price" type="number" className="input-field pl-7" placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} min="0" />
            </div>
            <input id="item-qty" type="number" className="input-field" placeholder="Qty" value={qty} onChange={e => setQty(e.target.value)} min="1" />
          </div>

          {price && qty && (
            <div className="text-right text-white/60 text-sm">
              Subtotal: <span className="text-white font-bold">₹{(parseFloat(price || '0') * (parseInt(qty, 10) || 1)).toFixed(0)}</span>
            </div>
          )}

          <div>
            <p className="text-white/50 text-xs mb-2">If out of stock:</p>
            <div className="grid grid-cols-2 gap-2">
              {(['substitute', 'cancel'] as OOSPreference[]).map(opt => (
                <button key={opt} onClick={() => setOos(opt)}
                  className={`py-2 rounded-xl border text-sm font-semibold transition-all ${
                    oosPreference === opt ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'border-white/10 text-white/40 hover:border-white/20'
                  }`}>
                  {opt === 'substitute' ? '↔ Substitute' : '✕ Cancel'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary py-2.5">Cancel</button>
          <button id="submit-item-btn" onClick={handleSubmit} disabled={loading}
            className="btn-primary flex items-center justify-center gap-2 py-2.5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Member Dashboard ──────────────────────────────────────────

export const MemberDashboard: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { user, displayName } = useAuth();

  const [room, setRoom]           = useState<Room | null>(null);
  const [items, setItems]         = useState<ItemSubmission[]>([]);
  const [myPayment, setMyPayment] = useState<'pending' | 'paid'>('pending');
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [showUPI, setShowUPI]     = useState(false);

  // ── fetch helpers ─────────────────────────────────────────

  const fetchItems = useCallback(async () => {
    if (!roomCode) return;
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('room_code', roomCode)
      .order('submitted_at', { ascending: true });
    if (data) setItems(data.map(mapItem));
  }, [roomCode]);

  const fetchPayment = useCallback(async () => {
    if (!roomCode || !user) return;
    const { data } = await supabase
      .from('payments')
      .select('payment_status')
      .eq('room_code', roomCode)
      .eq('member_uid', user.id)
      .single();
    if (data) setMyPayment(data.payment_status as 'pending' | 'paid');
  }, [roomCode, user]);

  // ── realtime ──────────────────────────────────────────────

  useEffect(() => {
    if (!roomCode || !user) return;
    let cancelled = false;

    const load = async () => {
      const { data: roomRow, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (error || !roomRow) { navigate('/'); return; }
      const mapped = mapRoom(roomRow);
      if (!cancelled) { setRoom(mapped); setLoading(false); }

      // save to history
      saveRoomToHistory(roomCode, mapped.building, mapped.platform, 'member');

      await fetchItems();
      await fetchPayment();
    };

    load();

    const channel = supabase
      .channel(`member-${roomCode}-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'rooms',
        filter: `room_code=eq.${roomCode}`,
      }, (payload) => {
        if (payload.new) setRoom(mapRoom(payload.new as Record<string, unknown>));
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'items',
        filter: `room_code=eq.${roomCode}`,
      }, () => fetchItems())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'payments',
        filter: `room_code=eq.${roomCode}`,
      }, () => fetchPayment())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomCode, user, navigate, fetchItems, fetchPayment]);

  // ── add item ──────────────────────────────────────────────

  const handleAddItem = async (data: Omit<ItemSubmission, 'id' | 'memberUid' | 'memberName' | 'submittedAt' | 'status'>) => {
    if (!user || !roomCode) return;

    const { error } = await supabase.from('items').insert({
      room_code:      roomCode,
      member_uid:     user.id,
      member_name:    displayName || 'Member',
      item_link:      data.itemLink,
      item_name:      data.itemName,
      price:          data.price,
      quantity:       data.quantity,
      subtotal:       data.subtotal,
      oos_preference: data.oosPreference,
      status:         'pending',
      submitted_at:   Date.now(),
    });

    if (error) { toast.error('Failed to add item'); return; }

    // Atomically increment cart value
    await supabase.rpc('add_to_cart_value', {
      p_room_code: roomCode,
      p_amount:    data.subtotal,
    });

    toast.success(`"${data.itemName}" added!`);
    setShowForm(false);
  };

  // ── delete own item ────────────────────────────────────────

  const handleDeleteItem = async (item: ItemSubmission) => {
    if (!roomCode) return;
    const { error } = await supabase.from('items').delete().eq('id', item.id);
    if (error) { toast.error('Failed to delete item'); return; }
    // Decrement cart value
    await supabase.rpc('add_to_cart_value', { p_room_code: roomCode, p_amount: -item.subtotal });
    toast.success(`"${item.itemName}" removed`);
  };

  // ── edit quantity of own item ──────────────────────────────

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState('');

  const startEdit = (item: ItemSubmission) => {
    setEditingItemId(item.id!);
    setEditQty(String(item.quantity));
  };

  const saveEdit = async (item: ItemSubmission) => {
    const newQty = parseInt(editQty, 10);
    if (isNaN(newQty) || newQty < 1) { toast.error('Quantity must be at least 1'); return; }
    const newSubtotal = item.price * newQty;
    const diff = newSubtotal - item.subtotal;
    const { error } = await supabase.from('items')
      .update({ quantity: newQty, subtotal: newSubtotal })
      .eq('id', item.id);
    if (error) { toast.error('Failed to update quantity'); return; }
    if (diff !== 0) await supabase.rpc('add_to_cart_value', { p_room_code: roomCode!, p_amount: diff });
    setEditingItemId(null);
    toast.success('Quantity updated');
  };

  // ── render ────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen flex flex-col">
      <div className="p-4 border-b border-white/5"><div className="skeleton h-8 w-40 rounded-lg" /></div>
      <div className="p-4 space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
    </div>
  );

  if (!room) return null;

  const myItems = items.filter(i => i.memberUid === user?.id);
  const mySubtotal = myItems.reduce((s, i) => s + i.subtotal, 0);
  const deliveryShare = room.totalCartValue > 0
    ? Math.round((mySubtotal / room.totalCartValue) * room.deliveryFee)
    : 0;
  const myTotal = mySubtotal + (room.totalCartValue >= room.threshold ? 0 : deliveryShare);
  const isOpen = room.status === 'open';

  const platformEmoji: Record<string, string> = {
    Blinkit: '🟡', Zepto: '🟣', 'Swiggy Instamart': '🟠',
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/5 sticky top-0 bg-gray-950/80 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold">{room.building}</span>
              <StatusBadge status={room.status} />
            </div>
            <p className="text-white/40 text-xs">{platformEmoji[room.platform]} {room.platform} · Captain: {room.captainName}</p>
          </div>
        </div>
        {isOpen && <CountdownTimer expiryTime={room.expiryTime} />}
      </nav>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-6 space-y-5">

        {/* Room info */}
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-white/40 text-xs">Room</p>
            <span className="text-2xl font-black text-white tracking-widest font-mono">{room.roomCode}</span>
          </div>
          <div className="text-right">
            <p className="text-white/40 text-xs">Members</p>
            <p className="text-white font-bold">{room.memberCount}</p>
          </div>
        </div>

        {/* Progress */}
        <ProgressBar value={room.totalCartValue} threshold={room.threshold} />

        {/* Add item button */}
        {isOpen && (
          <button
            id="add-item-btn"
            onClick={() => setShowForm(true)}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
          >
            <Plus className="w-4 h-4" /> Add My Items
          </button>
        )}

        {/* My items */}
        <div className="space-y-3">
          <h2 className="text-white font-bold flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-400" />
            My Items ({myItems.length})
          </h2>

          {myItems.length === 0
            ? <EmptyState icon={isOpen ? '⏳' : '📦'} title={isOpen ? 'Add your items!' : 'No items added'} description={isOpen ? 'Add your items before the timer runs out.' : 'You did not add any items this run.'} />
            : myItems.map(item => (
                <div key={item.id} className={`card p-4 space-y-2 border transition-all ${
                  item.status === 'added' ? 'border-emerald-500/30 bg-emerald-500/5' :
                  item.status === 'oos'   ? 'border-red-500/30 bg-red-500/5' : 'border-white/8'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        {item.status === 'added'   && <span className="chip-added">✓ ADDED</span>}
                        {item.status === 'oos'     && <span className="chip-oos">OOS</span>}
                        {item.status === 'pending' && <span className="chip-pending">PENDING</span>}
                      </div>
                      <p className="text-white font-semibold truncate">{item.itemName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {isOpen && editingItemId === item.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-white/40 text-sm">₹{item.price} ×</span>
                            <input
                              type="number"
                              min="1"
                              value={editQty}
                              onChange={e => setEditQty(e.target.value)}
                              className="w-14 bg-white/10 border border-indigo-500/50 rounded-lg px-2 py-0.5 text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              onKeyDown={e => e.key === 'Enter' && saveEdit(item)}
                              autoFocus
                            />
                            <button onClick={() => saveEdit(item)} className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditingItemId(null)} className="p-1 rounded-lg bg-white/10 text-white/40 hover:bg-white/20 transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-white/50 text-sm">
                            ₹{item.price} × {item.quantity} = <span className="text-white font-medium">₹{item.subtotal}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    {isOpen && item.status === 'pending' && editingItemId !== item.id && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          id={`edit-qty-${item.id}`}
                          onClick={() => startEdit(item)}
                          title="Edit quantity"
                          className="p-1.5 rounded-lg border border-white/10 text-white/30 hover:text-indigo-300 hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`delete-item-${item.id}`}
                          onClick={() => handleDeleteItem(item)}
                          title="Remove item"
                          className="p-1.5 rounded-lg border border-white/10 text-white/30 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <a href={item.itemLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs group transition-colors">
                    <ExternalLink className="w-3 h-3" />
                    <span className="truncate group-hover:underline">{item.itemLink}</span>
                  </a>
                </div>
              ))
          }
        </div>

        {/* All items feed */}
        {items.filter(i => i.memberUid !== user?.id).length > 0 && (
          <div className="space-y-3">
            <h2 className="text-white/60 font-semibold text-sm flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              Other Members' Items
            </h2>
            {items.filter(i => i.memberUid !== user?.id).map(item => (
              <div key={item.id} className="card p-3 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white/70 text-sm font-medium truncate">{item.itemName}</p>
                  <p className="text-white/30 text-xs">{item.memberName} · ₹{item.subtotal}</p>
                </div>
                {item.status === 'added'   && <span className="chip-added">✓</span>}
                {item.status === 'oos'     && <span className="chip-oos">OOS</span>}
                {item.status === 'pending' && <span className="chip-pending">…</span>}
              </div>
            ))}
          </div>
        )}

        {/* Payment section */}
        {(room.status === 'locked' || room.status === 'ordering' || room.status === 'delivered') && mySubtotal > 0 && (
          <div className={`card p-5 space-y-4 border ${myPayment === 'paid' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold">Your Total</h3>
              {myPayment === 'paid'
                ? <span className="chip-paid">✓ PAID</span>
                : <span className="chip-pending">UNPAID</span>
              }
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-white/60">
                <span>Items subtotal</span>
                <span>₹{mySubtotal}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Delivery share</span>
                <span>{room.totalCartValue >= room.threshold ? <span className="text-emerald-400">Free 🎉</span> : `₹${deliveryShare}`}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-base border-t border-white/10 pt-2 mt-2">
                <span>Total to pay {room.captainName}</span>
                <span>₹{myTotal}</span>
              </div>
            </div>

            {myPayment !== 'paid' && (
              <button
                id="pay-captain-btn"
                onClick={() => setShowUPI(true)}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              >
                Pay ₹{myTotal} via UPI
              </button>
            )}
          </div>
        )}

      </div>

      {showForm && (
        <AddItemForm
          onClose={() => setShowForm(false)}
          onSubmit={handleAddItem}
          allItems={items}
        />
      )}

      {showUPI && room && user && (
        <UPIModal
          amount={myTotal}
          captainUPI={room.captainUPI!}
          captainName={room.captainName}
          roomCode={room.roomCode}
          memberUid={user.id}
          memberName={displayName || 'Member'}
          onClose={() => setShowUPI(false)}
          onPaid={() => setMyPayment('paid')}
        />
      )}
    </div>
  );
};
