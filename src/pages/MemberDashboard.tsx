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
import { ThemeToggle } from '../components/ThemeToggle';

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

const AddItemForm: React.FC<AddItemFormProps> = ({ onClose, onSubmit }) => {
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

    setLoading(true);
    try {
      await onSubmit({ itemLink: link.trim(), itemName: name.trim(), price: p, quantity: q, subtotal: p * q, oosPreference });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="glass-card w-full max-w-md p-6 space-y-4 relative border border-white/[0.08] shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-brand-muted hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-white font-display font-semibold text-lg flex items-center gap-2">
          <Zap className="w-4 h-4 text-brand-cyan" /> Add Item
        </h2>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-brand-muted text-[10px] font-semibold uppercase tracking-wider">Item Link</label>
            <input id="item-link" className="input-field" placeholder="Paste product URL (Blinkit, Zepto, etc.)" value={link} onChange={e => setLink(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-brand-muted text-[10px] font-semibold uppercase tracking-wider">Item Name</label>
            <input id="item-name" className="input-field" placeholder="e.g. Organic Milk 1L" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-brand-muted text-[10px] font-semibold uppercase tracking-wider">Price</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted/40 font-semibold font-mono">₹</span>
                <input id="item-price" type="number" className="input-field pl-8 font-mono" placeholder="0" value={price} onChange={e => setPrice(e.target.value)} min="0" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-brand-muted text-[10px] font-semibold uppercase tracking-wider">Qty</label>
              <input id="item-qty" type="number" className="input-field font-mono text-center" placeholder="1" value={qty} onChange={e => setQty(e.target.value)} min="1" />
            </div>
          </div>

          {price && qty && (
            <div className="text-right text-brand-muted text-xs font-sans">
              Subtotal: <span className="text-brand-orange font-bold font-mono">₹{(parseFloat(price || '0') * (parseInt(qty, 10) || 1)).toFixed(0)}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-brand-muted text-[10px] font-semibold uppercase tracking-wider">If out of stock</label>
            <div className="grid grid-cols-2 gap-2">
              {(['substitute', 'cancel'] as OOSPreference[]).map(opt => (
                <button
                  key={opt}
                  onClick={() => setOos(opt)}
                  className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                    oosPreference === opt
                      ? 'bg-brand-cyan/15 border-brand-cyan text-white shadow-lg shadow-brand-cyan/10'
                      : 'border-white/10 text-brand-muted hover:border-white/20 hover:text-white'
                  }`}
                >
                  {opt === 'substitute' ? '↔ Substitute' : '✕ Cancel item'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary py-3 text-xs" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', boxShadow: 'none' }}>
            Cancel
          </button>
          <button id="submit-item-btn" onClick={handleSubmit} disabled={loading}
            className="btn-primary flex items-center justify-center gap-2 py-3 text-xs">
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

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-brand-navy">
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
    <div className="min-h-screen flex flex-col bg-brand-navy relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-white/5 rounded-full filter blur-[100px] pointer-events-none translate-x-1/3 -translate-y-1/3" />
      
      {/* Nav */}
      <nav className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/[0.08] sticky top-0 bg-brand-navy/85 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-brand-muted hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-display font-semibold text-sm sm:text-base">{room.building}</span>
              <StatusBadge status={room.status} />
            </div>
            <p className="text-brand-muted text-xs font-sans">{platformEmoji[room.platform]} {room.platform} · Captain: {room.captainName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOpen && <CountdownTimer expiryTime={room.expiryTime} />}
          <ThemeToggle />
        </div>
      </nav>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6 relative z-10">

        {/* Room info */}
        <div className="card-premium p-5 flex items-center justify-between shadow-2xl">
          <div className="space-y-1">
            <p className="text-brand-muted text-[10px] font-bold uppercase tracking-wider">ROOM CODE</p>
            <span className="text-3xl font-extrabold font-mono tracking-[0.2em] bg-gradient-to-r from-brand-cyan to-brand-orange bg-clip-text text-transparent">
              {room.roomCode}
            </span>
          </div>
          <div className="text-right space-y-0.5">
            <p className="text-brand-muted text-[10px] font-bold uppercase tracking-wider">Members</p>
            <p className="text-xl font-bold font-mono text-white">{room.memberCount}</p>
          </div>
        </div>

        {/* Progress */}
        <ProgressBar value={room.totalCartValue} threshold={room.threshold} />

        {/* Add item button */}
        {isOpen ? (
          <button
            id="add-item-btn"
            onClick={() => setShowForm(true)}
            className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-sm font-semibold rounded-2xl"
          >
            <Plus className="w-4 h-4" /> Add My Items
          </button>
        ) : (
          <div className="glass-card p-4 text-center text-brand-muted text-xs font-medium">
            Room status: <span className="font-semibold text-white uppercase">{room.status}</span>. submissions are closed.
          </div>
        )}

        {/* My items */}
        <div className="space-y-3.5">
          <h2 className="text-white font-display font-semibold text-base flex items-center gap-2">
            <Package className="w-4.5 h-4.5 text-brand-cyan" />
            My Items ({myItems.length})
          </h2>

          {myItems.length === 0 ? (
            <EmptyState
              icon={isOpen ? '⏳' : '📦'}
              title={isOpen ? 'Add your items!' : 'No items added'}
              description={isOpen ? 'Add items before the timer runs out.' : 'You did not add any items this run.'}
            />
          ) : (
            <div className="space-y-3">
              {myItems.map(item => (
                <div
                  key={item.id}
                  className={`glass-card p-4 space-y-3 border transition-all duration-300
                    ${item.status === 'added' ? 'border-l-[3px] border-l-brand-cyan border-brand-cyan/25 bg-brand-cyan/[0.02]' :
                      item.status === 'oos'   ? 'border-l-[3px] border-l-red-500 border-red-500/25 bg-red-500/[0.02]' :
                      'border-l-[3px] border-l-brand-orange border-brand-orange/25 bg-brand-orange/[0.02]'
                    }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {item.status === 'added'   && <span className="chip-added font-semibold text-[9px]">✓ ADDED</span>}
                        {item.status === 'oos'     && <span className="chip-oos font-semibold text-[9px]">OOS</span>}
                        {item.status === 'pending' && <span className="chip-pending font-semibold text-[9px]">PENDING</span>}
                      </div>
                      
                      <p className="text-white font-display font-semibold text-base truncate">{item.itemName}</p>
                      
                      <div className="flex items-center gap-2 mt-1">
                        {isOpen && editingItemId === item.id ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-brand-muted text-xs">₹{item.price} ×</span>
                            <input
                              type="number"
                              min="1"
                              value={editQty}
                              onChange={e => setEditQty(e.target.value)}
                              className="w-14 bg-white/10 border border-brand-cyan/50 rounded-xl px-2 py-1 text-white text-xs text-center focus:outline-none focus:ring-2 focus:ring-brand-cyan/30"
                              onKeyDown={e => e.key === 'Enter' && saveEdit(item)}
                              autoFocus
                            />
                            <button onClick={() => saveEdit(item)} className="p-1.5 rounded-lg bg-brand-cyan/20 text-brand-cyan hover:bg-brand-cyan/30 transition-colors">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditingItemId(null)} className="p-1.5 rounded-lg bg-white/10 text-brand-muted hover:text-white transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-brand-muted text-xs font-sans">
                            ₹{item.price} × {item.quantity} = <span className="text-brand-orange font-bold font-mono">₹{item.subtotal}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {isOpen && item.status === 'pending' && editingItemId !== item.id && (
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          id={`edit-qty-${item.id}`}
                          onClick={() => startEdit(item)}
                          title="Edit quantity"
                          className="p-2 rounded-xl border border-white/10 text-brand-muted hover:text-brand-cyan hover:border-brand-cyan/30 hover:bg-brand-cyan/10 transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`delete-item-${item.id}`}
                          onClick={() => handleDeleteItem(item)}
                          title="Remove item"
                          className="p-2 rounded-xl border border-white/10 text-brand-muted hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <a
                    href={item.itemLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-brand-cyan hover:text-brand-cyan/80 text-xs group transition-colors pt-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span className="truncate group-hover:underline font-mono text-[11px] text-brand-muted/70">{item.itemLink}</span>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All items feed */}
        {items.filter(i => i.memberUid !== user?.id).length > 0 && (
          <div className="space-y-3.5">
            <h2 className="text-brand-muted font-display font-semibold text-xs uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-cyan" />
              Other Members' Items
            </h2>
            <div className="grid grid-cols-1 gap-2.5">
              {items.filter(i => i.memberUid !== user?.id).map(item => (
                <div key={item.id} className={`glass-card p-4 flex items-center justify-between gap-3 border transition-all duration-300
                  ${item.status === 'added' ? 'border-l-[3px] border-l-brand-cyan border-brand-cyan/25 bg-brand-cyan/[0.02]' :
                    item.status === 'oos'   ? 'border-l-[3px] border-l-red-500 border-red-500/25 bg-red-500/[0.02]' :
                    'border-l-[3px] border-l-brand-orange border-brand-orange/25 bg-brand-orange/[0.02]'
                  }`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-sans text-sm font-semibold truncate">{item.itemName}</p>
                    <p className="text-brand-muted text-xs font-sans mt-0.5">{item.memberName} · Qty {item.quantity} · <span className="font-mono font-semibold text-brand-orange">₹{item.subtotal}</span></p>
                  </div>
                  {item.status === 'added'   && <span className="chip-added font-semibold text-[9px] px-2 py-0.5">✓ ADDED</span>}
                  {item.status === 'oos'     && <span className="chip-oos font-semibold text-[9px] px-2 py-0.5">OOS</span>}
                  {item.status === 'pending' && <span className="chip-pending font-semibold text-[9px] px-2 py-0.5">PENDING</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment section */}
        {(room.status === 'locked' || room.status === 'ordering' || room.status === 'delivered') && mySubtotal > 0 && (
          <div className={`glass-card p-5 space-y-4 border shadow-2xl ${
            myPayment === 'paid' ? 'border-brand-cyan/20 bg-brand-cyan/5' : 'border-brand-orange/20 bg-brand-orange/5'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-display font-semibold text-base">Your Bill Details</h3>
              {myPayment === 'paid' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-sans font-bold px-2.5 py-0.5 rounded-full bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan uppercase tracking-wider">
                  ✓ PAID
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-sans font-bold px-2.5 py-0.5 rounded-full bg-brand-orange/15 border border-brand-orange/30 text-brand-orange uppercase tracking-wider">
                  UNPAID
                </span>
              )}
            </div>

            <div className="space-y-2 text-sm font-sans divide-y divide-white/5">
              <div className="flex justify-between text-brand-muted pb-2">
                <span>Items subtotal</span>
                <span className="font-mono text-white">₹{mySubtotal}</span>
              </div>
              <div className="flex justify-between text-brand-muted py-2">
                <span>Delivery share</span>
                <span>{room.totalCartValue >= room.threshold ? <span className="text-brand-cyan font-semibold">Free 🎉</span> : <span className="font-mono text-white">₹{deliveryShare}</span>}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-base pt-2">
                <span>Total Amount to Pay</span>
                <span className="font-mono text-brand-orange text-lg">₹{myTotal}</span>
              </div>
            </div>

            {myPayment !== 'paid' && (
              <button
                id="pay-captain-btn"
                onClick={() => setShowUPI(true)}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 font-semibold text-sm"
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
