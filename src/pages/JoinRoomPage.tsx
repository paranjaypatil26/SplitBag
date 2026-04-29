import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Zap, Loader2, MapPin, Navigation, Users,
  Clock, RefreshCw, ChevronRight, Search, ArrowRightLeft,
  CheckCircle2, X,
} from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import type { Room } from '../types';
import type { Platform, RoomStatus } from '../types';
import { CountdownTimer } from '../components/CountdownTimer';
import toast from 'react-hot-toast';

// ── DB mapper ─────────────────────────────────────────────────

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

// ── Nominatim reverse-geocode ─────────────────────────────────

async function reverseGeocode(lat: number, lon: number): Promise<string[]> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=16&addressdetails=1`;
  const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error('Geocoding failed');
  const data = await res.json();
  const a = data.address ?? {};

  const terms = new Set<string>();
  if (a.building)      terms.add(a.building);
  if (a.amenity)       terms.add(a.amenity);
  if (a.leisure)       terms.add(a.leisure);
  if (a.residential)   terms.add(a.residential);
  if (a.neighbourhood) terms.add(a.neighbourhood);
  if (a.suburb)        terms.add(a.suburb);
  if (a.road)          terms.add(a.road);
  const city = a.city || a.town || a.village;
  if (city)            terms.add(city);

  return [...terms].slice(0, 6);
}

// ── Same-building heuristic ───────────────────────────────────
// Two rooms are "in the same building" if their building strings share
// at least 2 significant words, or are an exact (case-insensitive) match.

function isSameBuilding(a: string, b: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^\w\s]/g, ' ').trim();

  if (normalize(a) === normalize(b)) return true;

  const sig = (s: string) =>
    new Set(normalize(s).split(/\s+/).filter(w => w.length > 2));

  const aWords = sig(a);
  const bWords = sig(b);
  const overlap = [...aWords].filter(w => bWords.has(w));
  return overlap.length >= Math.min(2, Math.min(aWords.size, bWords.size));
}

// ── Platform meta ─────────────────────────────────────────────

const PLATFORM_EMOJI: Record<string, string> = {
  Blinkit: '🟡', Zepto: '🟣', 'Swiggy Instamart': '🟠',
};

const PLATFORM_COLOR: Record<string, string> = {
  Blinkit:           'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  Zepto:             'text-purple-400 bg-purple-400/10 border-purple-400/20',
  'Swiggy Instamart':'text-orange-400 bg-orange-400/10 border-orange-400/20',
};

// ── Room card ─────────────────────────────────────────────────

const RoomCard: React.FC<{
  room: Room;
  onJoin: (room: Room) => void;
  joining: boolean;
  isOverflowTarget?: boolean;   // badge: "🔀 Accepting overflow"
}> = ({ room, onJoin, joining, isOverflowTarget }) => {
  const thresholdHit = room.totalCartValue >= room.threshold;
  const progressPct  = Math.min(100, (room.totalCartValue / room.threshold) * 100);

  return (
    <div
      className={`card p-4 space-y-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl cursor-pointer group
        ${thresholdHit
          ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-400/50 hover:shadow-emerald-900/30'
          : isOverflowTarget
            ? 'border-indigo-500/40 bg-indigo-500/5 hover:border-indigo-400/60 hover:shadow-indigo-900/30'
            : 'hover:border-indigo-500/40 hover:shadow-indigo-900/30'
        }`}
      onClick={() => !joining && onJoin(room)}
    >
      {/* Overflow / threshold badges */}
      {(thresholdHit || isOverflowTarget) && (
        <div className="flex items-center gap-2 flex-wrap -mb-1">
          {thresholdHit && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
              <CheckCircle2 className="w-3 h-3" /> Threshold reached · Free delivery 🎉
            </span>
          )}
          {isOverflowTarget && !thresholdHit && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 animate-pulse">
              <ArrowRightLeft className="w-3 h-3" /> Accepting overflow members
            </span>
          )}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${PLATFORM_COLOR[room.platform] ?? 'text-white/50 bg-white/5 border-white/10'}`}>
              {PLATFORM_EMOJI[room.platform]} {room.platform}
            </span>
          </div>
          <p className="text-white font-bold truncate">{room.building}</p>
          <p className="text-white/40 text-xs">Captain: {room.captainName}</p>
        </div>

        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <CountdownTimer expiryTime={room.expiryTime} />
          <button
            id={`join-room-${room.roomCode}`}
            disabled={joining}
            onClick={e => { e.stopPropagation(); onJoin(room); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold transition-all group-hover:gap-2 disabled:opacity-60
              ${thresholdHit
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : isOverflowTarget
                  ? 'bg-indigo-500 hover:bg-indigo-400 ring-1 ring-indigo-400/50'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
          >
            {joining
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <><span>Join</span><ChevronRight className="w-3 h-3" /></>
            }
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-white/50">
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />{room.memberCount} member{room.memberCount !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1">
          ₹{room.totalCartValue} / ₹{room.threshold}
        </span>
        <span className="font-mono text-white/30">#{room.roomCode}</span>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between text-[10px] text-white/30 mb-1">
          <span>{thresholdHit ? '✓ Free delivery secured' : 'towards free delivery'}</span>
          <span>{Math.round(progressPct)}%</span>
        </div>
        <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${thresholdHit ? 'bg-emerald-400' : isOverflowTarget ? 'bg-indigo-400' : 'bg-indigo-500'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// ── Overflow Modal ────────────────────────────────────────────

interface OverflowData {
  original: Room;
  alternatives: Room[];
}

const OverflowModal: React.FC<{
  data: OverflowData;
  joining: boolean;
  onStay: () => void;
  onSwitch: (room: Room) => void;
  onClose: () => void;
}> = ({ data, joining, onStay, onSwitch, onClose }) => {
  const best = data.alternatives[0];
  const neededForFreeDelivery = Math.max(0, best.threshold - best.totalCartValue);
  const progressPct = Math.min(100, (best.totalCartValue / best.threshold) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="card w-full max-w-sm p-6 space-y-5 relative animate-[slideUp_0.25s_ease]">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-white font-bold text-lg leading-tight">
            Room <span className="font-mono">#{data.original.roomCode}</span> is full!
          </h2>
          <p className="text-white/50 text-sm">
            This room has already hit its free delivery threshold.
            Another room in the same building needs members!
          </p>
        </div>

        {/* Alternative room preview */}
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/8 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center gap-1">
              <ArrowRightLeft className="w-3 h-3" /> Suggested room
            </span>
            <span className="font-mono font-bold text-white text-sm">#{best.roomCode}</span>
          </div>

          <div>
            <p className="text-white font-semibold text-sm">{best.building}</p>
            <p className="text-white/40 text-xs">
              {PLATFORM_EMOJI[best.platform]} {best.platform} · Captain: {best.captainName}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-white/50">
              <span>₹{best.totalCartValue} cart · {best.memberCount} members</span>
              {neededForFreeDelivery > 0 && (
                <span className="text-amber-400 font-medium">₹{neededForFreeDelivery} to free delivery</span>
              )}
            </div>
            <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-400 rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => onSwitch(best)}
            disabled={joining}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm"
          >
            {joining
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><ArrowRightLeft className="w-4 h-4" /> Switch to #{best.roomCode}</>
            }
          </button>
        </div>

        {/* Stay option */}
        <button
          onClick={onStay}
          disabled={joining}
          className="w-full text-center text-white/40 hover:text-white/70 text-sm py-2 transition-colors"
        >
          Stay in #{data.original.roomCode} anyway →
        </button>

        {/* Show more alternatives */}
        {data.alternatives.length > 1 && (
          <p className="text-center text-white/25 text-xs">
            + {data.alternatives.length - 1} more room{data.alternatives.length > 2 ? 's' : ''} available in this building
          </p>
        )}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────

export const JoinRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // manual code entry
  const [code, setCode]       = useState('');
  const [joining, setJoining] = useState<string | null>(null);

  // overflow state
  const [overflowData, setOverflowData] = useState<OverflowData | null>(null);

  // location + rooms
  const [locationTerms, setLocationTerms] = useState<string[]>([]);
  const [nearbyRooms, setNearbyRooms]     = useState<Room[]>([]);
  const [otherRooms, setOtherRooms]       = useState<Room[]>([]);
  const [locStatus, setLocStatus]         = useState<'idle' | 'detecting' | 'done' | 'denied' | 'error'>('idle');
  const [roomsLoading, setRoomsLoading]   = useState(false);

  // all open rooms (flat, for building-sibling lookup)
  const [allOpenRooms, setAllOpenRooms]   = useState<Room[]>([]);

  // ── fetch all open rooms ──────────────────────────────────

  const fetchAllRooms = useCallback(async (terms: string[]) => {
    setRoomsLoading(true);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const lowerTerms = terms.map(t => t.toLowerCase());
      const now = Date.now();

      const allOpen = (data ?? [])
        .map(mapRoom)
        .filter(r => r.expiryTime > now);

      setAllOpenRooms(allOpen);

      const isNearby = (r: Room) =>
        lowerTerms.length > 0 &&
        lowerTerms.some(
          t => r.building.toLowerCase().includes(t) ||
               t.includes(r.building.toLowerCase().split(/[,\s]+/)[0])
        );

      const nearby = allOpen
        .filter(isNearby)
        .sort((a, b) => (b.totalCartValue / b.threshold) - (a.totalCartValue / a.threshold));

      const nearbySet = new Set(nearby.map(r => r.roomCode));
      const other = allOpen
        .filter(r => !nearbySet.has(r.roomCode))
        .sort((a, b) => (b.totalCartValue / b.threshold) - (a.totalCartValue / a.threshold));

      setNearbyRooms(nearby);
      setOtherRooms(other);
    } catch (err) {
      console.error(err);
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  // ── detect location on mount ──────────────────────────────

  const detectLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocStatus('error');
      fetchAllRooms([]);
      return;
    }

    setLocStatus('detecting');
    setNearbyRooms([]);
    setOtherRooms([]);
    fetchAllRooms([]);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const terms = await reverseGeocode(coords.latitude, coords.longitude);
          setLocationTerms(terms);
          setLocStatus('done');
          await fetchAllRooms(terms);
        } catch {
          setLocStatus('error');
        }
      },
      (err) => {
        setLocStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'error');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [fetchAllRooms]);

  useEffect(() => { detectLocation(); }, [detectLocation]);

  // ── realtime ───────────────────────────────────────────────

  useEffect(() => {
    const channel = supabase
      .channel('join-page-rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        fetchAllRooms(locationTerms);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [locationTerms, fetchAllRooms]);

  // ── overflow detector: given a room, find siblings under threshold ──

  const findOverflowAlternatives = useCallback((room: Room): Room[] => {
    return allOpenRooms.filter(r =>
      r.roomCode !== room.roomCode &&
      r.status === 'open' &&
      r.expiryTime > Date.now() &&
      r.totalCartValue < r.threshold &&    // hasn't hit threshold yet → needs members
      isSameBuilding(r.building, room.building)
    ).sort((a, b) =>
      // prioritise rooms closest to threshold (most progress)
      (b.totalCartValue / b.threshold) - (a.totalCartValue / a.threshold)
    );
  }, [allOpenRooms]);

  // ── actual join (after overflow check or forced) ──────────

  const doJoin = useCallback(async (roomCode: string, roomData: Room) => {
    if (!user) { toast.error('Not authenticated yet'); return; }

    setJoining(roomCode);
    try {
      if (roomData.captainUid === user.id) {
        navigate(`/captain/${roomCode}`);
        return;
      }
      if (roomData.status !== 'open') {
        toast.error(`Room is ${roomData.status} — can't join now.`);
        return;
      }
      if (roomData.expiryTime <= Date.now()) {
        toast.error('This room has expired.');
        return;
      }

      const { data: existing } = await supabase
        .from('items').select('id').eq('room_code', roomCode).eq('member_uid', user.id).limit(1);

      if (!existing || existing.length === 0) {
        await supabase.rpc('increment_member_count', { p_room_code: roomCode });
      }

      navigate(`/member/${roomCode}`);
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setJoining(null);
    }
  }, [user, navigate]);

  // ── join handler with overflow interception ───────────────

  const handleJoin = useCallback(async (roomOrCode: Room | string, force = false) => {
    if (!user) { toast.error('Not authenticated yet'); return; }

    let roomData: Room | null = null;
    let roomCode: string;

    if (typeof roomOrCode === 'string') {
      roomCode = roomOrCode.trim().toUpperCase();
      if (roomCode.length !== 6) { toast.error('Room code must be 6 characters'); return; }
      const { data, error } = await supabase
        .from('rooms').select('*').eq('room_code', roomCode).single();
      if (error || !data) { toast.error('Room not found. Check the code and try again.'); return; }
      roomData = mapRoom(data);
    } else {
      roomData = roomOrCode;
      roomCode = roomOrCode.roomCode;
    }

    // ── Overflow check ─────────────────────────────────────
    // If room already hit threshold AND there are sibling rooms that still need
    // members, intercept and show the overflow modal (unless user forced past it).
    if (!force && roomData.totalCartValue >= roomData.threshold) {
      const alts = findOverflowAlternatives(roomData);
      if (alts.length > 0) {
        setOverflowData({ original: roomData, alternatives: alts });
        return;
      }
    }

    await doJoin(roomCode, roomData);
  }, [user, findOverflowAlternatives, doJoin]);

  // ── compute which room codes are overflow targets ─────────

  const overflowTargetCodes = React.useMemo(() => {
    const set = new Set<string>();
    for (const room of allOpenRooms) {
      if (room.totalCartValue >= room.threshold) {
        const alts = allOpenRooms.filter(r =>
          r.roomCode !== room.roomCode &&
          r.status === 'open' &&
          r.expiryTime > Date.now() &&
          r.totalCartValue < r.threshold &&
          isSameBuilding(r.building, room.building)
        );
        alts.forEach(a => set.add(a.roomCode));
      }
    }
    return set;
  }, [allOpenRooms]);

  // ── render ────────────────────────────────────────────────

  const locationLabel = locationTerms.slice(0, 2).join(', ') || null;

  const renderRoomCard = (room: Room) => (
    <RoomCard
      key={room.roomCode}
      room={room}
      onJoin={handleJoin}
      joining={joining === room.roomCode}
      isOverflowTarget={overflowTargetCodes.has(room.roomCode)}
    />
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-white/5 sticky top-0 bg-gray-950/80 backdrop-blur-xl z-10">
        <Link to="/" className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-white">Join a Room</span>
        </div>
        <button
          onClick={detectLocation}
          title="Refresh rooms"
          className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all"
        >
          {roomsLoading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <RefreshCw className="w-4 h-4" />}
        </button>
      </nav>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-5">

        {/* ── Location header ────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(locStatus === 'idle' || locStatus === 'detecting') && nearbyRooms.length === 0 && otherRooms.length === 0 && (
              <>
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                <span className="text-white/60 text-sm font-medium">Finding open rooms…</span>
              </>
            )}
            {locStatus === 'detecting' && (nearbyRooms.length > 0 || otherRooms.length > 0) && (
              <>
                <Navigation className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span className="text-white/60 text-sm font-medium">Pinpointing your location…</span>
              </>
            )}
            {locStatus === 'done' && (
              <>
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span className="text-white font-semibold text-sm">
                  {locationLabel ? `Near ${locationLabel}` : 'Open rooms'}
                </span>
              </>
            )}
            {(locStatus === 'denied' || locStatus === 'error') && (
              <>
                <MapPin className="w-4 h-4 text-white/30" />
                <span className="text-white/50 text-sm">All open rooms</span>
              </>
            )}
          </div>
          {(locStatus === 'denied' || locStatus === 'error') && (
            <button
              onClick={detectLocation}
              className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-xs font-semibold transition-colors"
            >
              <Navigation className="w-3 h-3" /> Enable location
            </button>
          )}
        </div>

        {/* ── Nearby rooms ──────────────────────────────────── */}
        {nearbyRooms.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-emerald-400/80 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> Near you
            </p>
            {nearbyRooms.map(renderRoomCard)}
          </div>
        )}

        {/* ── All other open rooms ──────────────────────────── */}
        {otherRooms.length > 0 && (
          <div className="space-y-3">
            {nearbyRooms.length > 0 && (
              <p className="text-xs font-semibold text-white/30 uppercase tracking-wider">Other open rooms</p>
            )}
            {otherRooms.map(renderRoomCard)}
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────── */}
        {!roomsLoading && nearbyRooms.length === 0 && otherRooms.length === 0
          && locStatus !== 'detecting' && locStatus !== 'idle' && (
          <div className="card p-6 text-center space-y-2 border-dashed">
            <div className="text-3xl">📭</div>
            <p className="text-white/60 font-medium text-sm">No open rooms right now</p>
            <p className="text-white/30 text-xs">
              Ask your Captain for the room code, or create your own run.
            </p>
          </div>
        )}

        {/* ── Skeleton ──────────────────────────────────────── */}
        {(roomsLoading || locStatus === 'idle') && nearbyRooms.length === 0 && otherRooms.length === 0 && (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="card p-4 space-y-3 animate-pulse">
                <div className="flex justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="skeleton h-4 w-24 rounded" />
                    <div className="skeleton h-5 w-48 rounded" />
                    <div className="skeleton h-3 w-32 rounded" />
                  </div>
                  <div className="skeleton h-8 w-14 rounded-lg" />
                </div>
                <div className="skeleton h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        )}

        {/* ── Divider ───────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/8" />
          <span className="text-white/25 text-xs font-medium uppercase tracking-wider">or enter code manually</span>
          <div className="flex-1 h-px bg-white/8" />
        </div>

        {/* ── Manual code entry ─────────────────────────────── */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Search className="w-3.5 h-3.5 text-white/40" />
            <p className="text-white/50 text-xs font-medium">Have a room code from your Captain?</p>
          </div>
          <div className="flex gap-2">
            <input
              id="room-code-input"
              className="input-field flex-1 text-center text-2xl font-black tracking-[0.35em] uppercase placeholder:text-base placeholder:font-normal placeholder:tracking-normal"
              maxLength={6}
              placeholder="ABC123"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && code.length === 6 && handleJoin(code)}
            />
            <button
              id="join-room-btn"
              onClick={() => handleJoin(code)}
              disabled={!!joining || code.length < 6}
              className="btn-primary flex items-center justify-center gap-1.5 px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {joining === code.toUpperCase()
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><span>Join</span><ChevronRight className="w-4 h-4" /></>
              }
            </button>
          </div>
        </div>

        {/* Tip */}
        <p className="text-center text-white/25 text-xs flex items-center justify-center gap-1.5">
          <Clock className="w-3 h-3" />
          Rooms with sibling rooms auto-suggest overflow redirection
        </p>
      </div>

      {/* ── Overflow modal ────────────────────────────────────── */}
      {overflowData && (
        <OverflowModal
          data={overflowData}
          joining={!!joining}
          onClose={() => setOverflowData(null)}
          onStay={() => {
            const { original } = overflowData;
            setOverflowData(null);
            doJoin(original.roomCode, original);
          }}
          onSwitch={(alt) => {
            setOverflowData(null);
            doJoin(alt.roomCode, alt);
          }}
        />
      )}
    </div>
  );
};
