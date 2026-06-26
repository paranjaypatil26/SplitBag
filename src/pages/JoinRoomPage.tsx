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
import { EmptyState, SkeletonCard } from '../components/Loading';
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
  isOverflowTarget?: boolean;
}> = ({ room, onJoin, joining, isOverflowTarget }) => {
  const thresholdHit = room.totalCartValue >= room.threshold;
  const progressPct  = Math.min(100, (room.totalCartValue / room.threshold) * 100);

  return (
    <div
      className={`glass-card p-5 space-y-4 hover:-translate-y-0.5 hover:shadow-2xl cursor-pointer transition-all duration-300 group
        ${thresholdHit
          ? 'border-brand-cyan/40 bg-brand-cyan/5 hover:border-brand-cyan/60'
          : isOverflowTarget
            ? 'border-brand-orange/40 bg-brand-orange/5 hover:border-brand-orange/60'
            : 'hover:border-brand-cyan/25'
        }`}
      onClick={() => !joining && onJoin(room)}
    >
      {/* Overflow / threshold badges */}
      {(thresholdHit || isOverflowTarget) && (
        <div className="flex items-center gap-2 flex-wrap">
          {thresholdHit && (
            <span className="inline-flex items-center gap-1 text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan uppercase tracking-wider">
              <CheckCircle2 className="w-3 h-3" /> Threshold reached · Free delivery 🎉
            </span>
          )}
          {isOverflowTarget && !thresholdHit && (
            <span className="inline-flex items-center gap-1 text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-brand-orange/15 border border-brand-orange/30 text-brand-orange animate-pulse uppercase tracking-wider">
              <ArrowRightLeft className="w-3 h-3" /> Accepting overflow
            </span>
          )}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`inline-flex items-center gap-1 text-[10px] font-sans font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${PLATFORM_COLOR[room.platform] ?? 'text-white/50 bg-white/5 border-white/10'}`}>
              {PLATFORM_EMOJI[room.platform]} {room.platform}
            </span>
          </div>
          <p className="text-white font-display font-semibold text-base truncate">{room.building}</p>
          <p className="text-brand-muted text-xs">Captain: {room.captainName}</p>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <CountdownTimer expiryTime={room.expiryTime} />
          <button
            id={`join-room-${room.roomCode}`}
            disabled={joining}
            onClick={e => { e.stopPropagation(); onJoin(room); }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-white text-xs font-semibold transition-all group-hover:gap-1.5 disabled:opacity-60
              ${thresholdHit
                ? 'bg-brand-cyan hover:bg-brand-cyan/90 shadow-[0_4px_12px_rgba(0,168,204,0.25)]'
                : isOverflowTarget
                  ? 'bg-brand-orange hover:bg-brand-orange/90 shadow-[0_4px_12px_rgba(249,115,22,0.25)]'
                  : 'bg-brand-cyan hover:bg-brand-cyan/90 shadow-[0_4px_12px_rgba(0,168,204,0.25)]'
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
      <div className="flex items-center gap-4 text-xs text-brand-muted">
        <span className="flex items-center gap-1 font-sans">
          <Users className="w-3.5 h-3.5 text-brand-cyan/70" />{room.memberCount} member{room.memberCount !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1 font-mono">
          ₹{room.totalCartValue} / ₹{room.threshold}
        </span>
        <span className="font-mono text-brand-muted/40 ml-auto">#{room.roomCode}</span>
      </div>

      {/* Progress */}
      <div className="pt-1">
        <div className="flex justify-between text-[10px] text-brand-muted mb-1.5 font-sans">
          <span>{thresholdHit ? '✓ Free delivery secured' : 'towards free delivery'}</span>
          <span className="font-mono">{Math.round(progressPct)}%</span>
        </div>
        <div className="progress-bar-container h-2">
          <div
            className={`progress-bar-fill h-full rounded-full transition-all duration-500`}
            style={{
              width: `${progressPct}%`,
              background: thresholdHit
                ? 'linear-gradient(90deg, #00A8CC, #10B981)'
                : isOverflowTarget
                  ? 'linear-gradient(90deg, #F97316, #DC6010)'
                  : 'linear-gradient(90deg, #00A8CC, #F97316)'
            }}
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="card-premium w-full max-w-sm p-6 space-y-5 relative border border-white/[0.08] shadow-2xl">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-brand-muted hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-brand-orange/10 border border-brand-orange/30 flex items-center justify-center mx-auto">
            <ArrowRightLeft className="w-7 h-7 text-brand-orange" />
          </div>
          <h2 className="text-white font-display font-semibold text-lg leading-tight">
            Room <span className="font-mono text-brand-orange">#{data.original.roomCode}</span> is Full!
          </h2>
          <p className="text-brand-muted text-sm font-sans">
            This room has already hit its free delivery threshold.
            Help another room in your building reach theirs!
          </p>
        </div>

        {/* Alternative room preview */}
        <div className="rounded-2xl border border-brand-cyan/20 bg-brand-cyan/5 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan uppercase tracking-wider flex items-center gap-1 animate-pulse">
              <ArrowRightLeft className="w-3 h-3" /> Sibling Room
            </span>
            <span className="font-mono font-bold text-white text-sm">#{best.roomCode}</span>
          </div>

          <div>
            <p className="text-white font-display font-semibold text-sm truncate">{best.building}</p>
            <p className="text-brand-muted text-xs">
              {PLATFORM_EMOJI[best.platform]} {best.platform} · Captain: {best.captainName}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-brand-muted font-sans">
              <span>₹{best.totalCartValue} cart · {best.memberCount} members</span>
              {neededForFreeDelivery > 0 && (
                <span className="text-brand-orange font-semibold font-mono">₹{neededForFreeDelivery} to go</span>
              )}
            </div>
            <div className="progress-bar-container h-1.5">
              <div
                className="progress-bar-fill h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #00A8CC, #F97316)' }}
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
              : <><ArrowRightLeft className="w-4 h-4" /> <span>Switch to #{best.roomCode}</span></>
            }
          </button>
        </div>

        {/* Stay option */}
        <button
          onClick={onStay}
          disabled={joining}
          className="w-full text-center text-brand-muted hover:text-white text-sm py-2 transition-colors font-semibold"
        >
          Stay in #{data.original.roomCode} anyway →
        </button>

        {/* Show more alternatives */}
        {data.alternatives.length > 1 && (
          <p className="text-center text-brand-muted/40 text-[10px]">
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
      r.totalCartValue < r.threshold &&
      isSameBuilding(r.building, room.building)
    ).sort((a, b) =>
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
    <div className="min-h-screen flex flex-col bg-brand-navy relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-white/5 rounded-full filter blur-[100px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      
      {/* Nav */}
      <nav className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-white/[0.08] sticky top-0 bg-brand-navy/85 backdrop-blur-xl z-10">
        <Link to="/" className="text-brand-muted hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-7 h-7 rounded-lg bg-brand-cyan/15 border border-brand-cyan/30 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-brand-cyan" />
          </div>
          <span className="font-display font-semibold text-white">Join a Room</span>
        </div>
        <button
          onClick={detectLocation}
          title="Refresh rooms"
          className="p-1.5 rounded-lg text-brand-muted hover:text-white hover:bg-white/5 transition-all"
        >
          {roomsLoading
            ? <Loader2 className="w-4 h-4 animate-spin text-brand-cyan" />
            : <RefreshCw className="w-4 h-4" />}
        </button>
      </nav>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-6 relative z-10">

        {/* ── Location header ────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(locStatus === 'idle' || locStatus === 'detecting') && nearbyRooms.length === 0 && otherRooms.length === 0 && (
              <>
                <Loader2 className="w-4 h-4 text-brand-cyan animate-spin" />
                <span className="text-brand-muted text-sm font-medium">Finding open rooms…</span>
              </>
            )}
            {locStatus === 'detecting' && (nearbyRooms.length > 0 || otherRooms.length > 0) && (
              <>
                <Navigation className="w-4 h-4 text-brand-cyan animate-pulse" />
                <span className="text-brand-muted text-sm font-medium">Pinpointing your location…</span>
              </>
            )}
            {locStatus === 'done' && (
              <>
                <MapPin className="w-4 h-4 text-brand-cyan" />
                <span className="text-white font-display font-semibold text-sm">
                  {locationLabel ? `Near ${locationLabel}` : 'Open rooms'}
                </span>
              </>
            )}
            {(locStatus === 'denied' || locStatus === 'error') && (
              <>
                <MapPin className="w-4 h-4 text-brand-muted/40" />
                <span className="text-brand-muted text-sm font-semibold uppercase tracking-wider">All open rooms</span>
              </>
            )}
          </div>
          {(locStatus === 'denied' || locStatus === 'error') && (
            <button
              onClick={detectLocation}
              className="flex items-center gap-1 text-brand-cyan hover:text-brand-cyan/80 text-xs font-semibold transition-colors"
            >
              <Navigation className="w-3 h-3" /> Enable GPS
            </button>
          )}
        </div>

        {/* ── Nearby rooms ──────────────────────────────────── */}
        {nearbyRooms.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-brand-cyan/80 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> Near you
            </p>
            {nearbyRooms.map(renderRoomCard)}
          </div>
        )}

        {/* ── All other open rooms ──────────────────────────── */}
        {otherRooms.length > 0 && (
          <div className="space-y-3">
            {nearbyRooms.length > 0 && (
              <p className="text-xs font-semibold text-brand-muted/60 uppercase tracking-wider">Other open rooms</p>
            )}
            {otherRooms.map(renderRoomCard)}
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────── */}
        {!roomsLoading && nearbyRooms.length === 0 && otherRooms.length === 0
          && locStatus !== 'detecting' && locStatus !== 'idle' && (
          <EmptyState
            icon="📭"
            title="No open rooms right now"
            description="Ask your Captain for the room code, or create your own run."
          />
        )}

        {/* ── Skeleton ──────────────────────────────────────── */}
        {(roomsLoading || locStatus === 'idle') && nearbyRooms.length === 0 && otherRooms.length === 0 && (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* ── Divider ───────────────────────────────────────── */}
        <div className="lightning-divider" />

        {/* ── Manual code entry ─────────────────────────────── */}
        <div className="card-premium p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-brand-cyan/70" />
            <p className="text-brand-muted text-xs font-semibold uppercase tracking-wider">Enter room code manually</p>
          </div>
          <div className="flex gap-2">
            <input
              id="room-code-input"
              className="input-field flex-1 text-center text-2xl font-mono font-bold tracking-[0.35em] uppercase placeholder:text-base placeholder:font-normal placeholder:tracking-normal"
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
              className="btn-primary flex items-center justify-center gap-1.5 px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {joining === code.toUpperCase()
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><span>Join</span><ChevronRight className="w-4 h-4" /></>
              }
            </button>
          </div>
        </div>

        {/* Tip */}
        <p className="text-center text-brand-muted/40 text-[10px] flex items-center justify-center gap-1.5 font-sans">
          <Clock className="w-3.5 h-3.5" />
          Rooms in the same building support smart overflow redirect
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
