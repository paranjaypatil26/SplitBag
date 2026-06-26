import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Users, Package, Lock, ShoppingBag, CheckCircle,
  Copy, Share2, ExternalLink, X, Check, Plus, Loader2, Trash2, Pencil, Zap
} from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import type { Room, ItemSubmission } from '../types';
import type { Platform, RoomStatus, OOSPreference, ItemStatus } from '../types';
import { CountdownTimer } from '../components/CountdownTimer';
import { ProgressBar } from '../components/ProgressBar';
import { StatusBadge } from '../components/StatusBadge';
import { SkeletonCard, EmptyState } from '../components/Loading';
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

// ── Inline Add-Item Form ───────────────────────────────────────

interface AddItemFormProps {
  onClose: () => void;
  onSubmit: (data: { itemLink: string; itemName: string; price: number; quantity: number; subtotal: number; oosPreference: OOSPreference }) => Promise<unknown>;
  allItems: ItemSubmission[];
}

const AddItemForm: React.FC<AddItemFormProps> = ({ onClose, onSubmit }) => {
  const [link, setLink]         = React.useState('');
  const [name, setName]         = React.useState('');
  const [price, setPrice]       = React.useState('');
  const [qty, setQty]           = React.useState('1');
  const [oosPreference, setOos] = React.useState<OOSPreference>('substitute');
  const [saving, setSaving]     = React.useState(false);

  const handleSubmit = async () => {
    if (!link.trim() || !name.trim() || !price) { toast.error('Fill in all fields'); return; }
    const p = parseFloat(price);
    const q = parseInt(qty, 10) || 1;
    if (isNaN(p) || p <= 0) { toast.error('Enter a valid price'); return; }
    
    setSaving(true);
    try { await onSubmit({ itemLink: link.trim(), itemName: name.trim(), price: p, quantity: q, subtotal: p * q, oosPreference }); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="glass-card w-full max-w-md p-6 space-y-4 relative border border-white/[0.08] shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-brand-muted hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-white font-display font-semibold text-lg flex items-center gap-2">
          <Zap className="w-4 h-4 text-brand-cyan" /> Add My Items
        </h2>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-brand-muted text-[10px] font-semibold uppercase tracking-wider">Item Link</label>
            <input id="cap-item-link" className="input-field" placeholder="Paste product URL (Blinkit, Zepto, etc.)" value={link} onChange={e => setLink(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-brand-muted text-[10px] font-semibold uppercase tracking-wider">Item Name</label>
            <input id="cap-item-name" className="input-field" placeholder="e.g. Organic Bananas 1 dozen" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-brand-muted text-[10px] font-semibold uppercase tracking-wider">Price</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted/40 font-semibold font-mono">₹</span>
                <input id="cap-item-price" type="number" className="input-field pl-8 font-mono" placeholder="0" value={price} onChange={e => setPrice(e.target.value)} min="0" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-brand-muted text-[10px] font-semibold uppercase tracking-wider">Qty</label>
              <input id="cap-item-qty" type="number" className="input-field font-mono text-center" placeholder="1" value={qty} onChange={e => setQty(e.target.value)} min="1" />
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
          <button id="cap-submit-item-btn" onClick={handleSubmit} disabled={saving} className="btn-primary flex items-center justify-center gap-2 py-3 text-xs">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── DB row mappers ──────────────────────────────────────────

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

// ── Component ───────────────────────────────────────────────

export const CaptainDashboard: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { user, displayName } = useAuth();
  const [showForm, setShowForm] = useState(false);

  const [room, setRoom]       = useState<Room | null>(null);
  const [items, setItems]     = useState<ItemSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState(false);

  // Group items by identical link to compress the Captain's feed
  const groupedItems = useMemo(() => {
    const groups: Record<string, ItemSubmission[]> = {};
    for (const item of items) {
      let l = (item.itemLink || '').trim();
      if (l.endsWith('/')) l = l.slice(0, -1);
      
      const key = l;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return Object.values(groups);
  }, [items]);

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

  // ── expiry check ──────────────────────────────────────────

  const handleExpiryCheck = useCallback(async (r: Room) => {
    if (r.status !== 'open' || Date.now() < r.expiryTime) return;
    const hit = r.totalCartValue >= r.threshold * 0.75;
    if (hit) {
      const newExpiry = Date.now() + 5 * 60 * 1000;
      await supabase.from('rooms').update({ expiry_time: newExpiry }).eq('room_code', r.roomCode);
      toast('⏰ Room auto-extended by 5 min — threshold nearly hit!');
    } else {
      await supabase.from('rooms').update({ status: 'dissolved' }).eq('room_code', r.roomCode);
      toast.error('Room dissolved — threshold not met');
      navigate('/');
    }
  }, [navigate]);

  // ── realtime subscription ─────────────────────────────────

  useEffect(() => {
    if (!roomCode) return;
    let cancelled = false;

    const load = async () => {
      const { data: roomRow, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (error || !roomRow) { navigate('/'); return; }

      const roomData = mapRoom(roomRow);
      if (!cancelled) { setRoom(roomData); setLoading(false); }
      handleExpiryCheck(roomData);

      // Save to history
      saveRoomToHistory(roomCode, roomData.building, roomData.platform, 'captain');

      await fetchItems();
    };

    load();

    const channel = supabase
      .channel(`captain-${roomCode}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'rooms',
        filter: `room_code=eq.${roomCode}`,
      }, (payload) => {
        if (payload.new) {
          const r = mapRoom(payload.new as Record<string, unknown>);
          setRoom(r);
          handleExpiryCheck(r);
        }
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'items',
        filter: `room_code=eq.${roomCode}`,
      }, () => fetchItems())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomCode, navigate, fetchItems, handleExpiryCheck]);

  // ── add own items (captain) ──────────────────────────────

  const handleAddItem = async (data: { itemLink: string; itemName: string; price: number; quantity: number; subtotal: number; oosPreference: OOSPreference }) => {
    if (!user || !roomCode) return;
    const { error } = await supabase.from('items').insert({
      room_code:      roomCode,
      member_uid:     user.id,
      member_name:    displayName || 'Captain',
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
    await supabase.rpc('add_to_cart_value', { p_room_code: roomCode, p_amount: data.subtotal });
    toast.success(`"${data.itemName}" added!`);
    setShowForm(false);
  };

  // ── actions ───────────────────────────────────────────────

  const updateStatus = async (status: RoomStatus) => {
    if (!roomCode) return;
    await supabase.from('rooms').update({ status }).eq('room_code', roomCode);
    toast.success(`Room status → ${status}`);
    if (status === 'locked') navigate(`/splits/${roomCode}`);
    if (status === 'dissolved') navigate('/');
  };

  const copyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    toast.success('Room code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareRoom = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}/join`;
    if (navigator.share) {
      navigator.share({ title: 'Join my Split Bag!', text: `Room code: ${roomCode}`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Join link copied!');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-brand-navy">
      <div className="p-4 border-b border-white/5"><div className="skeleton h-8 w-40 rounded-lg" /></div>
      <div className="p-4 space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
    </div>
  );

  if (!room) return null;

  const addedCount = items.filter(i => i.status === 'added').length;
  const pendingCount = items.filter(i => i.status === 'pending').length;
  const oosCount = items.filter(i => i.status === 'oos').length;
  const isOpen = room.status === 'open';
  const isCaptain = user?.id === room.captainUid;

  const platformEmoji: Record<string, string> = {
    Blinkit: '🟡', Zepto: '🟣', 'Swiggy Instamart': '🟠',
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-navy relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full filter blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3" />
      
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
            <p className="text-brand-muted text-xs font-sans">
              {platformEmoji[room.platform]} {room.platform} · Captain: {room.captainName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOpen && (
            <CountdownTimer expiryTime={room.expiryTime} />
          )}
          <ThemeToggle />
        </div>
      </nav>

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6 relative z-10">

        {/* Room code share card */}
        <div className="card-premium p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-2xl">
          <div className="space-y-1.5 flex-1 w-full">
            <p className="text-brand-muted text-[10px] font-bold uppercase tracking-wider">ROOM CODE — Share with your group</p>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-extrabold font-mono tracking-[0.3em] bg-gradient-to-r from-brand-cyan to-brand-orange bg-clip-text text-transparent">
                {room.roomCode}
              </span>
              <button id="copy-code-btn" onClick={copyCode} className="p-2 rounded-xl bg-white/5 border border-white/5 text-brand-muted hover:text-white hover:bg-white/10 hover:border-white/10 transition-all" title="Copy code">
                {copied ? <Check className="w-4 h-4 text-brand-cyan" /> : <Copy className="w-4 h-4" />}
              </button>
              <button id="share-btn" onClick={shareRoom} className="p-2 rounded-xl bg-white/5 border border-white/5 text-brand-muted hover:text-white hover:bg-white/10 hover:border-white/10 transition-all" title="Share link">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none text-center px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] min-w-[80px]">
              <div className="text-xl font-bold font-mono text-white">{room.memberCount}</div>
              <div className="text-brand-muted text-[10px] font-semibold uppercase tracking-wider mt-0.5">Members</div>
            </div>
            <div className="flex-1 sm:flex-none text-center px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] min-w-[90px]">
              <div className="text-xl font-bold font-mono text-brand-cyan">₹{room.totalCartValue}</div>
              <div className="text-brand-muted text-[10px] font-semibold uppercase tracking-wider mt-0.5">Cart Total</div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <ProgressBar value={room.totalCartValue} threshold={room.threshold} />

        {/* Add items & Captain controls panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Controls */}
          {isCaptain && (
            <div className="card-premium p-5 space-y-3.5 md:col-span-2">
              <p className="text-brand-muted text-xs font-bold uppercase tracking-wider">Captain Controls</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {room.status === 'open' && (
                  <button id="lock-room-btn" onClick={() => updateStatus('locked')}
                    className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-brand-orange/15 border border-brand-orange/30 text-brand-orange text-xs font-semibold hover:bg-brand-orange/25 transition-all">
                    <Lock className="w-3.5 h-3.5 animate-pulse" /> Lock Room
                  </button>
                )}
                {room.status === 'locked' && (
                  <button id="ordering-btn" onClick={() => updateStatus('ordering')}
                    className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan text-xs font-semibold hover:bg-brand-cyan/25 transition-all">
                    <ShoppingBag className="w-3.5 h-3.5" /> Mark Ordered
                  </button>
                )}
                {room.status === 'ordering' && (
                  <button id="delivered-btn" onClick={() => updateStatus('delivered')}
                    className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan text-xs font-semibold hover:bg-brand-cyan/30 transition-all">
                    <CheckCircle className="w-3.5 h-3.5" /> Delivered
                  </button>
                )}
                {room.status === 'locked' && (
                  <Link id="splits-btn" to={`/splits/${roomCode}`}
                    className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan text-xs font-semibold hover:bg-brand-cyan/25 transition-all text-center">
                    <Users className="w-3.5 h-3.5" /> View Splits
                  </Link>
                )}
                {(room.status === 'open' || room.status === 'locked') && (
                  <button
                    id="dissolve-room-btn"
                    onClick={() => {
                      if (confirm('Dissolve this room? This cannot be undone.')) updateStatus('dissolved');
                    }}
                    className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400/80 text-xs font-semibold hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Dissolve
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick action: Add own items */}
          {isOpen ? (
            <button
              id="cap-add-item-btn"
              onClick={() => setShowForm(true)}
              className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-sm font-semibold rounded-2xl md:col-span-1"
            >
              <Plus className="w-4 h-4" /> Add My Items
            </button>
          ) : (
            <div className="glass-card p-5 flex items-center justify-center text-center text-brand-muted text-xs font-medium md:col-span-1">
              Room is closed to new item submissions.
            </div>
          )}
        </div>

        {/* Item stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Pending', count: pendingCount, color: 'text-brand-orange border-brand-orange/20 bg-brand-orange/5' },
            { label: 'Added',   count: addedCount,   color: 'text-brand-cyan border-brand-cyan/20 bg-brand-cyan/5' },
            { label: 'OOS',     count: oosCount,     color: 'text-red-400 border-red-500/20 bg-red-500/5' },
          ].map(s => (
            <div key={s.label} className={`glass-card p-3 text-center border ${s.color}`}>
              <div className="text-2xl font-black font-mono">{s.count}</div>
              <div className="text-white/60 text-[10px] font-semibold uppercase tracking-wider mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Item feed */}
        <div className="space-y-4">
          <h2 className="text-white font-display font-semibold text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-cyan" />
            Items ({groupedItems.length} unique items)
          </h2>

          {groupedItems.length === 0 ? (
            <EmptyState icon="📦" title="No items yet" description="Members will submit their items once they join." />
          ) : (
            <div className="space-y-3">
              {groupedItems.map((group, groupIdx) => {
                const firstItem = group[0];
                const totalQty = group.reduce((acc, curr) => acc + curr.quantity, 0);
                const totalSubtotal = group.reduce((acc, curr) => acc + curr.subtotal, 0);
                
                let groupStatus: ItemStatus = 'added';
                if (group.some(i => i.status === 'pending')) groupStatus = 'pending';
                else if (group.every(i => i.status === 'oos')) groupStatus = 'oos';

                const toggleGroupStatus = async () => {
                   const next: ItemStatus =
                      groupStatus === 'pending' ? 'added' :
                      groupStatus === 'added'   ? 'oos'   : 'pending';
                   
                   await Promise.all(group.map(async item => {
                      if (item.status !== next) {
                         await supabase.from('items').update({ status: next }).eq('id', item.id);
                      }
                   }));
                };

                return (
                  <div
                    key={firstItem.itemLink + groupIdx}
                    className={`glass-card p-4 space-y-3 border transition-all duration-300
                      ${groupStatus === 'added' ? 'border-l-[3px] border-l-brand-cyan border-brand-cyan/25 bg-brand-cyan/[0.02]' :
                        groupStatus === 'oos'   ? 'border-l-[3px] border-l-red-500 border-red-500/25 bg-red-500/[0.02]' :
                        'border-l-[3px] border-l-brand-orange border-brand-orange/25 bg-brand-orange/[0.02]'
                      }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-brand-cyan font-sans font-bold text-xs">
                            {group.map(i => `${i.memberName} (x${i.quantity})`).join(', ')}
                          </span>
                          {groupStatus === 'added'   && <span className="chip-added font-semibold text-[9px]">✓ ADDED</span>}
                          {groupStatus === 'oos'     && <span className="chip-oos font-semibold text-[9px]">OOS</span>}
                          {groupStatus === 'pending' && <span className="chip-pending font-semibold text-[9px]">PENDING</span>}
                        </div>
                        
                        <p className="text-white font-display font-semibold text-base truncate">
                           {group.length > 1 ? <span className="text-brand-cyan mr-1 font-mono">[x{totalQty}]</span> : null}
                           {firstItem.itemName}
                        </p>
                        
                        <p className="text-brand-muted text-xs font-sans mt-0.5">
                          {group.length === 1 ? `₹${firstItem.price} × ${totalQty} = ` : `Combined total = `} 
                          <span className="text-brand-orange font-bold font-mono">₹{totalSubtotal}</span>
                          <span className={`ml-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            firstItem.oosPreference === 'substitute' ? 'text-brand-orange bg-brand-orange/10' : 'text-red-400 bg-red-500/10'
                          }`}>
                            {firstItem.oosPreference === 'substitute' ? '↔ Substitute' : '✕ Cancel if OOS'}
                          </span>
                        </p>
                      </div>

                      {isCaptain && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={async () => {
                              const newPriceStr = prompt(`Enter correct price for ${firstItem.itemName}:`, String(firstItem.price));
                              if (!newPriceStr) return;
                              const newPrice = parseFloat(newPriceStr);
                              if (isNaN(newPrice) || newPrice <= 0) { toast.error('Invalid price'); return; }
                              
                              const loadingId = toast.loading('Updating prices...');
                              await Promise.all(group.map(async item => {
                                 await supabase.from('items').update({ price: newPrice, subtotal: newPrice * item.quantity }).eq('id', item.id);
                              }));
                              toast.success('Prices corrected!', { id: loadingId });
                            }}
                            className="p-2 rounded-xl border border-white/10 text-brand-muted hover:text-brand-orange hover:bg-brand-orange/10 hover:border-brand-orange/30 transition-all text-xs font-semibold flex items-center justify-center gap-1.5 px-3"
                            title="Edit Price if Wrong"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Fix Price
                          </button>
                          
                          <button
                            onClick={toggleGroupStatus}
                            className={`p-2 rounded-xl border transition-all text-xs font-semibold flex items-center justify-center gap-1.5 px-3 ${
                              groupStatus === 'added'
                                ? 'bg-brand-cyan/20 border-brand-cyan/30 text-brand-cyan hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400'
                                : groupStatus === 'oos'
                                ? 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-white/10 hover:border-white/20 hover:text-brand-muted'
                                : 'bg-white/5 border-white/10 text-brand-muted hover:bg-brand-cyan/20 hover:border-brand-cyan/30 hover:text-brand-cyan'
                            }`}
                            title={groupStatus === 'pending' ? 'Mark as Added' : groupStatus === 'added' ? 'Mark as OOS' : 'Reset to Pending'}
                          >
                            {groupStatus === 'added' ? <><Check className="w-3.5 h-3.5" /> Added</> : groupStatus === 'oos' ? <><X className="w-3.5 h-3.5" /> OOS</> : <><Check className="w-3.5 h-3.5" /> Mark Added</>}
                          </button>
                        </div>
                      )}
                    </div>

                    <a
                      href={firstItem.itemLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-brand-cyan hover:text-brand-cyan/80 text-xs group transition-colors pt-1"
                    >
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate group-hover:underline font-mono text-[11px] text-brand-muted/70">{firstItem.itemLink}</span>
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delivered state banner */}
        {room.status === 'delivered' && (
          <div className="glass-card p-6 text-center space-y-4 border-brand-cyan/30 bg-brand-cyan/5 shadow-2xl">
            <div className="text-4xl">🎉</div>
            <h3 className="text-white font-display font-semibold text-lg">Order Delivered!</h3>
            <p className="text-brand-muted text-sm font-sans">
              Hand off the items and collect payments from members.
            </p>
            <Link to={`/splits/${roomCode}`} className="btn-primary inline-flex items-center gap-2 py-3 text-sm">
              <Users className="w-4 h-4" /> View Payment Splits
            </Link>
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
    </div>
  );
};
