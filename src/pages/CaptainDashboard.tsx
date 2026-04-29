import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Users, Package, Lock, ShoppingBag, CheckCircle,
  Copy, Share2, ExternalLink, X, Check, Plus, Loader2, Trash2, Pencil
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

// ── Save visited room to history ───────────────────────────────
function saveRoomToHistory(roomCode: string, building: string, platform: string, role: 'captain' | 'member') {
  const key = 'droprun_room_history';
  const existing: Array<{ roomCode: string; building: string; platform: string; role: string; visitedAt: number }> =
    JSON.parse(localStorage.getItem(key) || '[]');
  const filtered = existing.filter(r => r.roomCode !== roomCode);
  filtered.unshift({ roomCode, building, platform, role, visitedAt: Date.now() });
  localStorage.setItem(key, JSON.stringify(filtered.slice(0, 10)));
}

// ── Inline Add-Item Form (reused from MemberDashboard) ──────

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
    // Removed duplicate check to allow combining
    setSaving(true);
    try { await onSubmit({ itemLink: link.trim(), itemName: name.trim(), price: p, quantity: q, subtotal: p * q, oosPreference }); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6 space-y-4 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        <h2 className="text-white font-bold text-lg">Add My Items</h2>
        <div className="space-y-3">
          <input id="cap-item-link" className="input-field" placeholder="Item URL (Blinkit / Zepto / Instamart)" value={link} onChange={e => setLink(e.target.value)} />
          <input id="cap-item-name" className="input-field" placeholder="Item name" value={name} onChange={e => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">₹</span>
              <input id="cap-item-price" type="number" className="input-field pl-7" placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} min="0" />
            </div>
            <input id="cap-item-qty" type="number" className="input-field" placeholder="Qty" value={qty} onChange={e => setQty(e.target.value)} min="1" />
          </div>
          {price && qty && (
            <div className="text-right text-white/60 text-sm">Subtotal: <span className="text-white font-bold">₹{(parseFloat(price||'0') * (parseInt(qty,10)||1)).toFixed(0)}</span></div>
          )}
          <div>
            <p className="text-white/50 text-xs mb-2">If out of stock:</p>
            <div className="grid grid-cols-2 gap-2">
              {(['substitute','cancel'] as OOSPreference[]).map(opt => (
                <button key={opt} onClick={() => setOos(opt)} className={`py-2 rounded-xl border text-sm font-semibold transition-all ${ oosPreference === opt ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'border-white/10 text-white/40 hover:border-white/20' }`}>
                  {opt === 'substitute' ? '↔ Substitute' : '✕ Cancel'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary py-2.5">Cancel</button>
          <button id="cap-submit-item-btn" onClick={handleSubmit} disabled={saving} className="btn-primary flex items-center justify-center gap-2 py-2.5">
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

  /*
  const toggleItemStatus = async (item: ItemSubmission) => {
    const next: ItemStatus =
      item.status === 'pending' ? 'added' :
      item.status === 'added'   ? 'oos'   : 'pending';
    await supabase.from('items').update({ status: next }).eq('id', item.id);
  };
  */

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
      navigator.share({ title: 'Join my DropRun!', text: `Room code: ${roomCode}`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Join link copied!');
    }
  };

  // ── render ────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen flex flex-col">
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
        <div className="flex items-center gap-2">
          {isOpen && (
            <CountdownTimer expiryTime={room.expiryTime} />
          )}
        </div>
      </nav>

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-5">

        {/* Room code share card */}
        <div className="card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-white/40 text-xs font-medium mb-1">ROOM CODE — Share with your group</p>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-black text-white tracking-widest font-mono">{room.roomCode}</span>
              <button id="copy-code-btn" onClick={copyCode} className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button id="share-btn" onClick={shareRoom} className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="text-center px-3 py-1.5 rounded-lg bg-white/5 border border-white/8">
              <div className="text-lg font-black text-white">{room.memberCount}</div>
              <div className="text-white/40 text-[10px]">Members</div>
            </div>
            <div className="text-center px-3 py-1.5 rounded-lg bg-white/5 border border-white/8">
              <div className="text-lg font-black text-white">₹{room.totalCartValue}</div>
              <div className="text-white/40 text-[10px]">Cart</div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <ProgressBar value={room.totalCartValue} threshold={room.threshold} />

        {/* Captain can also add their own items */}
        {isOpen && (
          <button
            id="cap-add-item-btn"
            onClick={() => setShowForm(true)}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
          >
            <Plus className="w-4 h-4" /> Add My Own Items
          </button>
        )}

        {/* Status controls */}
        {isCaptain && (
          <div className="card p-4 space-y-3">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">Captain Controls</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {room.status === 'open' && (
                <button id="lock-room-btn" onClick={() => updateStatus('locked')}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-semibold hover:bg-amber-500/30 transition-all">
                  <Lock className="w-3.5 h-3.5" /> Lock Room
                </button>
              )}
              {room.status === 'locked' && (
                <button id="ordering-btn" onClick={() => updateStatus('ordering')}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-sm font-semibold hover:bg-indigo-500/30 transition-all">
                  <ShoppingBag className="w-3.5 h-3.5" /> Mark Ordered
                </button>
              )}
              {room.status === 'ordering' && (
                <button id="delivered-btn" onClick={() => updateStatus('delivered')}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/30 transition-all">
                  <CheckCircle className="w-3.5 h-3.5" /> Delivered
                </button>
              )}
              {room.status === 'locked' && (
                <Link id="splits-btn" to={`/splits/${roomCode}`}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm font-semibold hover:bg-purple-500/30 transition-all">
                  <Users className="w-3.5 h-3.5" /> View Splits
                </Link>
              )}
              {(room.status === 'open' || room.status === 'locked') && (
                <button
                  id="dissolve-room-btn"
                  onClick={() => {
                    if (confirm('Dissolve this room? This cannot be undone.')) updateStatus('dissolved');
                  }}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400/70 text-sm font-semibold hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Dissolve
                </button>
              )}
            </div>
          </div>
        )}

        {/* Item stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Pending', count: pendingCount, color: 'text-yellow-400' },
            { label: 'Added',   count: addedCount,   color: 'text-emerald-400' },
            { label: 'OOS',     count: oosCount,     color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="card p-3 text-center">
              <div className={`text-2xl font-black ${s.color}`}>{s.count}</div>
              <div className="text-white/40 text-xs">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Item feed */}
        <div className="space-y-3">
          <h2 className="text-white font-bold flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-400" />
            Items ({groupedItems.length} unique items)
          </h2>

          {groupedItems.length === 0
            ? <EmptyState icon="📦" title="No items yet" description="Members will submit their items once they join." />
            : groupedItems.map((group, groupIdx) => {
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
                  <div key={firstItem.itemLink + groupIdx} className={`card p-4 space-y-2 border transition-all ${
                    groupStatus === 'added' ? 'border-emerald-500/30 bg-emerald-500/5' :
                    groupStatus === 'oos'   ? 'border-red-500/30 bg-red-500/5' :
                    'border-white/8'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-indigo-300 text-xs font-semibold">
                            {group.map(i => `${i.memberName} (${i.quantity})`).join(', ')}
                          </span>
                          {groupStatus === 'added'   && <span className="chip-added">✓ ADDED</span>}
                          {groupStatus === 'oos'     && <span className="chip-oos">OOS</span>}
                          {groupStatus === 'pending' && <span className="chip-pending">PENDING</span>}
                        </div>
                        <p className="text-white font-semibold truncate">
                           {group.length > 1 ? <span className="text-emerald-400 mr-1">[x{totalQty}]</span> : null}{firstItem.itemName}
                        </p>
                        <p className="text-white/50 text-sm">
                          {group.length === 1 ? `₹${firstItem.price} × ${totalQty} = ` : `Combined total = `} 
                          <span className="text-white font-medium">₹{totalSubtotal}</span>
                          <span className={`ml-2 text-xs ${firstItem.oosPreference === 'substitute' ? 'text-amber-400' : 'text-red-400'}`}>
                            {firstItem.oosPreference === 'substitute' ? '↔ Sub' : '✕ Cancel if OOS'}
                          </span>
                        </p>
                      </div>

                      {isCaptain && (
                        <div className="flex flex-col sm:flex-row gap-1.5 flex-shrink-0">
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
                            className={`p-1.5 rounded-lg border transition-all text-xs font-semibold flex items-center justify-center gap-1.5 px-3 bg-white/5 border-white/10 text-white/40 hover:bg-amber-500/20 hover:border-amber-500/30 hover:text-amber-400`}
                            title="Edit Price if Wrong"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Fix Price
                          </button>
                          <button
                            onClick={toggleGroupStatus}
                            className={`p-1.5 rounded-lg border transition-all text-xs font-semibold flex items-center justify-center gap-1.5 px-3 ${
                              groupStatus === 'added'
                                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400'
                                : groupStatus === 'oos'
                                ? 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-white/10 hover:border-white/20 hover:text-white/60'
                                : 'bg-white/5 border-white/10 text-white/40 hover:bg-emerald-500/20 hover:border-emerald-500/30 hover:text-emerald-400'
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
                      className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs group transition-colors"
                    >
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate group-hover:underline">{firstItem.itemLink}</span>
                    </a>
                  </div>
                );
              })
          }
        </div>

        {/* Delivered state */}
        {room.status === 'delivered' && (
          <div className="card p-6 text-center space-y-3 border-emerald-500/20 bg-emerald-500/5">
            <div className="text-4xl">🎉</div>
            <h3 className="text-white font-bold text-lg">Order Delivered!</h3>
            <p className="text-white/50 text-sm">
              Hand off the items and collect payments from members.
            </p>
            <Link to={`/splits/${roomCode}`} className="btn-primary inline-flex items-center gap-2">
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
