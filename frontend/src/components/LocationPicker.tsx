'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Navigation } from 'lucide-react';

const MapPickerClient = dynamic(() => import('./MapPickerClient'), { ssr: false });

export interface LocationValue {
  lat: number;
  lng: number;
  address: string;
}

interface MbFeature {
  geometry: { coordinates: [number, number] }; // [lng, lat]
  place_name: string;
  text: string;
}

const DEFAULT_LAT = -31.7;
const DEFAULT_LNG = -60.5;

const _cache = new Map<string, MbFeature[]>();

const TOKEN = () => process.env.NEXT_PUBLIC_MAPTILER_KEY ?? '';

async function geocodeForward(q: string): Promise<MbFeature[]> {
  const key = q.toLowerCase().trim();
  const hit = _cache.get(key);
  if (hit) return hit;
  try {
    const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json`
      + `?key=${TOKEN()}&country=ar&limit=5&language=es&types=place,locality,neighbourhood,address`;
    const data: { features: MbFeature[] } = await (await fetch(url)).json();
    const features = data.features ?? [];
    if (_cache.size >= 30) { const k = _cache.keys().next().value; if (k) _cache.delete(k); }
    _cache.set(key, features);
    return features;
  } catch { return []; }
}

async function geocodeReverse(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json`
      + `?key=${TOKEN()}&language=es&limit=1`;
    const data: { features: MbFeature[] } = await (await fetch(url)).json();
    return data.features[0]?.place_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch { return `${lat.toFixed(5)}, ${lng.toFixed(5)}`; }
}

function parseName(f: MbFeature) {
  const parts = f.place_name.split(', ').filter(p => p !== 'Argentina');
  return { main: parts[0] ?? f.place_name, sub: parts.slice(1).join(', ') };
}

export default function LocationPicker({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: LocationValue | null;
  onChange: (v: LocationValue) => void;
  error?: string;
}) {
  const [query,      setQuery]      = useState(value?.address ?? '');
  const [results,    setResults]    = useState<MbFeature[]>([]);
  const [status,     setStatus]     = useState<'idle' | 'searching' | 'done'>('idle');
  const [gpsLoading, setGpsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  useEffect(() => { if (value?.address) setQuery(value.address); }, [value?.address]);

  const lat = value?.lat ?? DEFAULT_LAT;
  const lng = value?.lng ?? DEFAULT_LNG;

  function handleQueryChange(q: string) {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); setStatus('idle'); return; }

    const key = q.toLowerCase().trim();
    const cached = _cache.get(key);
    if (cached) { setResults(cached); setStatus('done'); return; }

    setStatus('searching');
    debounceRef.current = setTimeout(async () => {
      const data = await geocodeForward(q);
      setResults(data);
      setStatus('done');
    }, 300);
  }

  function selectResult(f: MbFeature) {
    const v: LocationValue = { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], address: f.place_name };
    onChange(v);
    setQuery(f.place_name);
    setResults([]);
    setStatus('idle');
    inputRef.current?.blur();
  }

  const handleMapChange = useCallback(async (lat: number, lng: number) => {
    const address = await geocodeReverse(lat, lng);
    onChange({ lat, lng, address });
    setQuery(address);
  }, [onChange]);

  async function useGPS() {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        await handleMapChange(coords.latitude, coords.longitude);
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <style>{`
        .lp-sug-ul{position:absolute;z-index:200;left:0;right:0;top:calc(100% + 4px);background:#fff;border:1px solid #E0E0E0;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.12);overflow:hidden;max-height:280px;overflow-y:auto}
        .lp-sug-btn{display:block;width:100%;text-align:left;padding:10px 16px;background:transparent;border:none;border-bottom:1px solid rgba(0,0,0,.05);cursor:pointer;transition:background .15s}
        .lp-sug-btn:last-child{border-bottom:none}
        .lp-sug-btn:hover,.lp-sug-btn:active{background:#F2F2F0}
        .lp-sug-main{font-size:13px;font-weight:600;color:#111;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .lp-sug-sub{font-size:11px;color:#888;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .lp-sug-msg{padding:12px 16px;font-size:13px;color:#999;display:flex;align-items:center;gap:8px}
        .lp-spin{display:inline-block;width:12px;height:12px;border:2px solid rgba(139,175,78,.2);border-top-color:#8BAF4E;border-radius:50%;animation:lpspin .6s linear infinite;flex-shrink:0}
        @keyframes lpspin{to{transform:rotate(360deg)}}
        @media(max-width:640px){
          .lp-sug-ul{position:fixed;bottom:0;left:0;right:0;top:auto;border-radius:16px 16px 0 0;max-height:55vh;z-index:9999;box-shadow:0 -4px 32px rgba(0,0,0,.15);border:none;border-top:1px solid #E0E0E0}
          .lp-sug-btn{padding:16px 20px}
          .lp-sug-main{font-size:15px}
          .lp-sug-sub{font-size:13px;margin-top:3px}
        }
      `}</style>
      <span className="text-sm font-medium text-[#555555]">
        {label} <span style={{ color: '#8BAF4E' }}>*</span>
      </span>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          placeholder="Escribí una dirección o localidad…"
          className="w-full border border-[#E0E0E0] rounded-lg px-4 py-2.5 pr-10 text-sm text-[#111111] bg-white focus:outline-none focus:ring-2 focus:ring-[#8BAF4E] focus:border-transparent transition"
        />
        {status === 'searching' && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <span className="lp-spin" />
          </span>
        )}
        {status === 'done' && (
          <ul className="lp-sug-ul">
            {results.length > 0 ? results.map((f, i) => {
              const { main, sub } = parseName(f);
              return (
                <li key={i}>
                  <button type="button" className="lp-sug-btn" onClick={() => selectResult(f)}>
                    <div className="lp-sug-main" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={12} /> {main}
                    </div>
                    {sub && <div className="lp-sug-sub">{sub}</div>}
                  </button>
                </li>
              );
            }) : (
              <li className="lp-sug-msg">Sin resultados</li>
            )}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={useGPS}
        disabled={gpsLoading}
        className="self-start flex items-center gap-1.5 text-xs font-medium hover:underline disabled:opacity-50"
        style={{ color: '#8BAF4E' }}
      >
        {gpsLoading
          ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-[#8BAF4E] border-t-transparent rounded-full" /> Obteniendo ubicación…</>
          : <><Navigation size={12} /> Usar mi ubicación actual</>
        }
      </button>

      <div className="rounded-xl overflow-hidden border border-gray-200">
        <MapPickerClient lat={lat} lng={lng} onChange={handleMapChange} />
      </div>

      {value && (
        <p className="text-xs text-gray-400 truncate" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <MapPin size={12} /> {value.address}
        </p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
