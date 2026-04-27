'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const MapPickerClient = dynamic(() => import('./MapPickerClient'), { ssr: false });

export interface LocationValue {
  lat: number;
  lng: number;
  address: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

// Centro por defecto: Entre Ríos / Corrientes
const DEFAULT_LAT = -31.7;
const DEFAULT_LNG = -60.5;

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    { headers: { 'Accept-Language': 'es' } }
  );
  const data = await res.json();
  return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
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
  const [query, setQuery] = useState(value?.address ?? '');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincroniza el input si el value cambia externamente
  useEffect(() => { if (value?.address) setQuery(value.address); }, [value?.address]);

  const lat = value?.lat ?? DEFAULT_LAT;
  const lng = value?.lng ?? DEFAULT_LNG;

  function handleQueryChange(q: string) {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 3) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=ar`,
          { headers: { 'Accept-Language': 'es' } }
        );
        setResults(await res.json());
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 400);
  }

  function selectResult(r: NominatimResult) {
    const v = { lat: parseFloat(r.lat), lng: parseFloat(r.lon), address: r.display_name };
    onChange(v);
    setQuery(r.display_name);
    setResults([]);
  }

  const handleMapChange = useCallback(async (lat: number, lng: number) => {
    const address = await reverseGeocode(lat, lng);
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
      () => setGpsLoading(false)
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[#555555]">
        {label} <span style={{ color: '#8BAF4E' }}>*</span>
      </span>

      {/* Buscador */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          placeholder="Escribí una dirección o localidad…"
          className="w-full border border-[#E0E0E0] rounded-lg px-4 py-2.5 pr-10 text-sm text-[#111111] bg-white focus:outline-none focus:ring-2 focus:ring-[#8BAF4E] focus:border-transparent transition"
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <span className="animate-spin inline-block w-4 h-4 border-2 border-[#8BAF4E] border-t-transparent rounded-full" />
          </span>
        )}
        {/* Dropdown de resultados */}
        {results.length > 0 && (
          <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-[#E0E0E0] rounded-xl shadow-lg overflow-hidden">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => selectResult(r)}
                  className="w-full text-left px-4 py-2.5 text-sm text-[#111111] hover:bg-[#F2F2F0] transition truncate"
                >
                  📍 {r.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Botón GPS */}
      <button
        type="button"
        onClick={useGPS}
        disabled={gpsLoading}
        className="self-start flex items-center gap-1.5 text-xs font-medium hover:underline disabled:opacity-50"
        style={{ color: '#8BAF4E' }}
      >
        {gpsLoading
          ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-[#8BAF4E] border-t-transparent rounded-full" /> Obteniendo ubicación…</>
          : <> 📡 Usar mi ubicación actual</>
        }
      </button>

      {/* Mapa */}
      <div className="rounded-xl overflow-hidden border border-gray-200">
        <MapPickerClient lat={lat} lng={lng} onChange={handleMapChange} />
      </div>

      {value && (
        <p className="text-xs text-gray-400 truncate">📍 {value.address}</p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
