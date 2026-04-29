import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Building2, Zap, Clock, CreditCard, ChevronRight, Loader2,
  MapPin, Navigation, CheckCircle2,
} from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import type { Platform } from '../types';
import { generateRoomCode } from '../utils';
import toast from 'react-hot-toast';

const PLATFORMS: Platform[] = ['Blinkit', 'Zepto', 'Swiggy Instamart'];
const PLATFORM_EMOJI: Record<Platform, string> = {
  Blinkit: '🟡',
  Zepto: '🟣',
  'Swiggy Instamart': '🟠',
};
const TIMERS = [10, 15, 20];

// ── Nominatim reverse-geocode ─────────────────────────────────

interface NominatimResult {
  address: {
    building?:     string;
    amenity?:      string;
    leisure?:      string;
    tourism?:      string;
    residential?:  string;
    neighbourhood?: string;
    suburb?:       string;
    road?:         string;
    house_number?: string;
    postcode?:     string;
    city?:         string;
    town?:         string;
    village?:      string;
  };
  display_name: string;
}

async function reverseGeocode(lat: number, lon: number): Promise<string[]> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=18&addressdetails=1`;
  const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error('Geocoding request failed');
  const data: NominatimResult = await res.json();
  const a = data.address;

  const suggestions = new Set<string>();

  // Priority order: most specific → most general
  if (a.building)      suggestions.add(a.building);
  if (a.amenity)       suggestions.add(a.amenity);
  if (a.leisure)       suggestions.add(a.leisure);
  if (a.tourism)       suggestions.add(a.tourism);
  if (a.residential)   suggestions.add(a.residential);
  if (a.neighbourhood) suggestions.add(a.neighbourhood);
  if (a.suburb)        suggestions.add(a.suburb);

  // Road + house number combo
  if (a.road && a.house_number) suggestions.add(`${a.house_number} ${a.road}`);
  else if (a.road)              suggestions.add(a.road);

  // City/ town fallback
  const city = a.city || a.town || a.village;
  if (city) suggestions.add(city);

  return [...suggestions].slice(0, 5);
}

// ── Component ─────────────────────────────────────────────────

export const CreateRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, displayName } = useAuth();

  const [building, setBuilding]         = useState('');
  const [platform, setPlatform]         = useState<Platform>('Blinkit');
  const [timerMinutes, setTimerMinutes] = useState(15);
  const [threshold, setThreshold]       = useState(200);
  const [upiId, setUpiId]               = useState('');
  const [loading, setLoading]           = useState(false);

  // Location detection state
  const [detecting, setDetecting]         = useState(false);
  const [suggestions, setSuggestions]     = useState<string[]>([]);
  const [locationUsed, setLocationUsed]   = useState(false);

  // ── Detect Location ────────────────────────────────────────

  const handleDetectLocation = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Location not supported by your browser');
      return;
    }

    setDetecting(true);
    setSuggestions([]);
    toast('📍 Detecting your location…', { duration: 2000 });

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const results = await reverseGeocode(coords.latitude, coords.longitude);
          if (results.length === 0) {
            toast.error('No nearby buildings found. Please type manually.');
          } else {
            setSuggestions(results);
            // Auto-pick the first suggestion
            setBuilding(results[0]);
            setLocationUsed(true);
            toast.success('Location detected!');
          }
        } catch {
          toast.error('Could not fetch address. Please type manually.');
        } finally {
          setDetecting(false);
        }
      },
      (err) => {
        setDetecting(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('Location permission denied. Please type your building name.');
        } else {
          toast.error('Could not get location. Please type manually.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // ── Create Room ────────────────────────────────────────────

  const handleCreate = async () => {
    if (!user) { toast.error('Not authenticated yet, please wait'); return; }
    if (!building.trim()) { toast.error('Enter your building / hostel name'); return; }
    if (!upiId.trim())    { toast.error('Enter your UPI ID to receive payments'); return; }

    setLoading(true);
    try {
      const roomCode   = generateRoomCode();
      const now        = Date.now();
      const expiryTime = now + timerMinutes * 60 * 1000;

      const { error } = await supabase.from('rooms').insert({
        room_code:        roomCode,
        captain_uid:      user.id,
        captain_name:     displayName || 'Captain',
        captain_upi:      upiId.trim(),
        building:         building.trim(),
        platform,
        status:           'open',
        expiry_time:      expiryTime,
        threshold,
        delivery_fee:     30,
        total_cart_value: 0,
        member_count:     1,
        created_at:       now,
      });

      if (error) throw error;
      toast.success(`Room ${roomCode} created!`);
      navigate(`/captain/${roomCode}`);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? String(err);
      console.error('Create room error:', err);
      toast.error(`Error: ${msg}`, { duration: 8000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-white/5 sticky top-0 bg-gray-950/80 backdrop-blur-xl z-10">
        <Link to="/" className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-white text-sm sm:text-base">Create a Room</span>
        </div>
      </nav>

      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-6">

          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black text-white">Start a Group Run</h1>
            <p className="text-white/40 text-sm">Share the room code after creating</p>
          </div>

          <div className="card p-6 space-y-5">

            {/* Building — with location detect */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-white/60 text-sm font-medium">
                <Building2 className="w-3.5 h-3.5" /> Building / Hostel Name
              </label>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  {locationUsed && (
                    <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                  )}
                  <input
                    id="building-input"
                    className={`input-field w-full transition-all ${locationUsed ? 'pl-9' : ''}`}
                    placeholder="e.g. Hostel Block C, Tower 4"
                    value={building}
                    onChange={e => { setBuilding(e.target.value); setLocationUsed(false); }}
                  />
                </div>

                {/* Detect Location button */}
                <button
                  id="detect-location-btn"
                  onClick={handleDetectLocation}
                  disabled={detecting}
                  title="Auto-detect from GPS"
                  className="flex-shrink-0 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-indigo-500/40 bg-indigo-600/15 text-indigo-300 hover:bg-indigo-600/30 hover:border-indigo-500/70 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {detecting
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Navigation className="w-4 h-4" />
                  }
                  <span className="text-xs font-semibold hidden sm:block">
                    {detecting ? 'Detecting…' : 'Detect'}
                  </span>
                </button>
              </div>

              {/* Location suggestions dropdown */}
              {suggestions.length > 0 && (
                <div className="mt-1.5 rounded-xl border border-white/10 bg-gray-900/90 backdrop-blur divide-y divide-white/5 overflow-hidden shadow-xl">
                  <p className="px-3 py-2 text-[10px] text-white/30 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> Nearby locations — tap to select
                  </p>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setBuilding(s);
                        setLocationUsed(true);
                        setSuggestions([]);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors hover:bg-white/5 ${
                        building === s ? 'text-indigo-300 font-medium' : 'text-white/70'
                      }`}
                    >
                      {building === s
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        : <MapPin className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                      }
                      {s}
                    </button>
                  ))}
                  <button
                    onClick={() => setSuggestions([])}
                    className="w-full text-center px-3 py-2 text-xs text-white/30 hover:text-white/50 transition-colors"
                  >
                    Type manually instead
                  </button>
                </div>
              )}

              <p className="text-white/25 text-xs flex items-center gap-1">
                <Navigation className="w-3 h-3" />
                Tap "Detect" to auto-fill from your GPS location
              </p>
            </div>

            {/* Platform */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-white/60 text-sm font-medium">
                <Zap className="w-3.5 h-3.5" /> Platform
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORMS.map(p => (
                  <button
                    key={p}
                    id={`platform-${p.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => setPlatform(p)}
                    className={`p-3 rounded-xl border text-center transition-all duration-200 ${
                      platform === p
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                        : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
                    }`}
                  >
                    <div className="text-2xl mb-1">{PLATFORM_EMOJI[p]}</div>
                    <div className="text-xs font-semibold">{p}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Timer */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-white/60 text-sm font-medium">
                <Clock className="w-3.5 h-3.5" /> Collection Window
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TIMERS.map(t => (
                  <button
                    key={t}
                    id={`timer-${t}`}
                    onClick={() => setTimerMinutes(t)}
                    className={`py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                      timerMinutes === t
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
                    }`}
                  >
                    {t} min
                  </button>
                ))}
              </div>
            </div>

            {/* Threshold */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-white/60 text-sm font-medium">
                <CreditCard className="w-3.5 h-3.5" /> Free Delivery Threshold
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 font-medium">₹</span>
                <input
                  id="threshold-input"
                  type="number"
                  className="input-field pl-7"
                  value={threshold}
                  onChange={e => setThreshold(Number(e.target.value))}
                  min={0}
                />
              </div>
              <p className="text-white/30 text-xs">
                Orders above this amount get free delivery (otherwise ₹30 split among members)
              </p>
            </div>

            {/* UPI ID */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-white/60 text-sm font-medium">
                <CreditCard className="w-3.5 h-3.5" /> Your UPI ID{' '}
                <span className="text-white/30 text-xs font-normal">(for receiving payments)</span>
              </label>
              <input
                id="upi-input"
                className="input-field"
                placeholder="yourname@upi"
                value={upiId}
                onChange={e => setUpiId(e.target.value)}
              />
            </div>
          </div>

          <button
            id="create-room-btn"
            onClick={handleCreate}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Create Room
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
          <p className="text-center text-white/30 text-xs">Your group will use the room code to join</p>
        </div>
      </div>
    </div>
  );
};
