'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { MapPin, Calendar, Beef, Scale, Route, Truck } from 'lucide-react';

type Viaje = {
  id: number;
  origen: string;
  destino: string;
  fecha_salida: string;
  tipo_hacienda: string;
  cantidad_cabezas: number;
  peso_total_kg: number | null;
  tipo_jaula: string | null;
  condicion_camino: string | null;
  estado: string;
  zona_publicante: string | null;
};

type VDSug = { label: string; main: string; sub: string; lat: number; lng: number };

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const _vdCache = new Map<string, VDSug[]>();

async function fetchVDNominatim(q: string): Promise<VDSug[]> {
  const key = q.toLowerCase().trim();
  const hit = _vdCache.get(key);
  if (hit) return hit;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=ar&addressdetails=0&q=${encodeURIComponent(q)}`,
      { headers: { 'Accept-Language': 'es' } }
    );
    const data: { display_name: string; lat: string; lon: string }[] = await res.json();
    const result = data.map(d => {
      const parts = d.display_name.split(', ').filter(p => p !== 'Argentina');
      return { label: d.display_name, main: parts[0] ?? d.display_name, sub: parts.slice(1).join(', '), lat: +d.lat, lng: +d.lon };
    });
    if (_vdCache.size >= 20) { const k = _vdCache.keys().next().value; if (k) _vdCache.delete(k); }
    _vdCache.set(key, result);
    return result;
  } catch { return []; }
}

function fmt(s: string) {
  return new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Header({ hasToken }: { hasToken: boolean }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: '#0D150D', borderBottom: '1px solid rgba(255,255,255,.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px', height: 64,
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
        <img src="/assets/logo-dark.svg" alt="ARREO" height={30} />
      </Link>
      <div style={{ display: 'flex', gap: 10 }}>
        {hasToken ? (
          <Link href="/dashboard" style={{
            padding: '9px 20px', borderRadius: 9999, background: '#8BAF4E',
            color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none',
          }}>
            Ir al dashboard
          </Link>
        ) : (
          <>
            <Link href="/login" style={{
              padding: '9px 20px', borderRadius: 9999,
              border: '1.5px solid rgba(255,255,255,.22)',
              color: '#fff', fontSize: 14, fontWeight: 500, textDecoration: 'none',
            }}>
              Iniciar sesión
            </Link>
            <Link href="/register" style={{
              padding: '9px 20px', borderRadius: 9999, background: '#E07A34',
              color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none',
            }}>
              Registrarse
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

// ─── Viaje card ───────────────────────────────────────────────────────────────

function ViajeCard({ v }: { v: Viaje }) {
  const statusCfg: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    disponible:  { label: 'Disponible',  color: '#5a7a2a', bg: 'rgba(139,175,78,.15)', dot: '#8BAF4E' },
    con_ofertas: { label: 'Con ofertas', color: '#b85e1e', bg: 'rgba(224,122,52,.15)', dot: '#E07A34' },
  };
  const s = statusCfg[v.estado] ?? statusCfg.disponible;

  return (
    <div style={{
      background: '#fff', border: '1px solid rgba(0,0,0,.09)', borderRadius: 16,
      padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14,
      boxShadow: '0 2px 12px rgba(0,0,0,.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#8BAF4E', flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{v.origen}</span>
          </div>
          <div style={{ width: 1, height: 10, background: 'rgba(139,175,78,.3)', marginLeft: 4 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#E07A34', flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{v.destino}</span>
          </div>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: s.bg, color: s.color,
          fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, flexShrink: 0,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
          {s.label}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <Chip><Calendar size={12} /> {fmt(v.fecha_salida)}</Chip>
        <Chip><Beef size={12} /> {v.tipo_hacienda}</Chip>
        <Chip>{v.cantidad_cabezas} cabezas</Chip>
        {v.peso_total_kg != null && <Chip><Scale size={12} /> {v.peso_total_kg.toLocaleString('es-AR')} kg</Chip>}
        {v.tipo_jaula && <Chip><Truck size={12} /> {v.tipo_jaula}</Chip>}
        {v.condicion_camino && <Chip><Route size={12} /> {v.condicion_camino}</Chip>}
        {v.zona_publicante && <Chip color="#3a6e8a" bg="rgba(58,110,138,.09)"><MapPin size={12} /> {v.zona_publicante}</Chip>}
      </div>

      <Link href="/register" style={{
        display: 'block', textAlign: 'center', padding: '12px', borderRadius: 10,
        background: '#E07A34', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none',
      }}>
        Registrate para aplicar →
      </Link>
    </div>
  );
}

function Chip({ children, color = '#555', bg = 'rgba(0,0,0,.05)' }: {
  children: React.ReactNode; color?: string; bg?: string;
}) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: bg, color, fontSize: 12, fontWeight: 500,
      padding: '3px 9px', borderRadius: 5, whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

// ─── Inner page (uses useSearchParams) ───────────────────────────────────────

function ViajesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [hasToken, setHasToken] = useState(false);
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [origen, setOrigen] = useState(searchParams.get('origen') ?? '');
  const [destino, setDestino] = useState(searchParams.get('destino') ?? '');
  const [origenSugs, setOrigenSugs] = useState<VDSug[]>([]);
  const [destinoSugs, setDestinoSugs] = useState<VDSug[]>([]);
  const [origenStatus, setOrigenStatus] = useState<'idle' | 'searching' | 'done'>('idle');
  const [destinoStatus, setDestinoStatus] = useState<'idle' | 'searching' | 'done'>('idle');
  const origenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destinoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origenInputRef = useRef<HTMLInputElement>(null);
  const destinoInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [origenGps, setOrigenGps] = useState(false);
  const [destinoGps, setDestinoGps] = useState(false);

  useEffect(() => {
    setHasToken(!!localStorage.getItem('token'));
  }, []);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setOrigenSugs([]); setDestinoSugs([]);
        setOrigenStatus('idle'); setDestinoStatus('idle');
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  async function fetchViajes(o: string, d: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (o) params.set('origen', o);
      if (d) params.set('destino', d);
      const res = await fetch(`${API}/viajes/publicos?${params}`);
      if (res.ok) {
        const data: { viajes: Viaje[] } = await res.json();
        setViajes(data.viajes ?? []);
      }
    } catch {
      // silently fail — empty state
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchViajes(searchParams.get('origen') ?? '', searchParams.get('destino') ?? '');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleOrigenChange(val: string) {
    setOrigen(val); setOrigenSugs([]);
    if (val.length < 2) { setOrigenStatus('idle'); return; }
    const cached = _vdCache.get(val.toLowerCase().trim());
    if (cached) { setOrigenSugs(cached); setOrigenStatus('done'); return; }
    setOrigenStatus('searching');
    if (origenTimer.current) clearTimeout(origenTimer.current);
    origenTimer.current = setTimeout(async () => {
      const sugs = await fetchVDNominatim(val);
      setOrigenSugs(sugs); setOrigenStatus('done');
    }, 100);
  }

  function handleDestinoChange(val: string) {
    setDestino(val); setDestinoSugs([]);
    if (val.length < 2) { setDestinoStatus('idle'); return; }
    const cached = _vdCache.get(val.toLowerCase().trim());
    if (cached) { setDestinoSugs(cached); setDestinoStatus('done'); return; }
    setDestinoStatus('searching');
    if (destinoTimer.current) clearTimeout(destinoTimer.current);
    destinoTimer.current = setTimeout(async () => {
      const sugs = await fetchVDNominatim(val);
      setDestinoSugs(sugs); setDestinoStatus('done');
    }, 100);
  }

  async function reverseGeocodeVD(lat: number, lng: number): Promise<string> {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { 'Accept-Language': 'es' } });
      const data = await res.json();
      const parts = (data.display_name ?? '').split(', ').filter((p: string) => p !== 'Argentina');
      return parts[0] ?? data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch { return `${lat.toFixed(5)}, ${lng.toFixed(5)}`; }
  }

  function useGPSField(setVal: (v: string) => void, setGpsLoading: (v: boolean) => void) {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const locality = await reverseGeocodeVD(coords.latitude, coords.longitude);
        setVal(locality);
        setGpsLoading(false);
      },
      () => setGpsLoading(false)
    );
  }

  function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    fetchViajes(origen, destino);
    const params = new URLSearchParams();
    if (origen) params.set('origen', origen);
    if (destino) params.set('destino', destino);
    router.replace(`/viajes-disponibles?${params}`);
  }

  function handleLimpiar() {
    setOrigen('');
    setDestino('');
    setOrigenSugs([]); setDestinoSugs([]);
    setOrigenStatus('idle'); setDestinoStatus('idle');
    fetchViajes('', '');
    router.replace('/viajes-disponibles');
  }

  const hasFiltro = origen !== '' || destino !== '';

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: 10,
    border: 'none', background: 'rgba(255,255,255,.1)', color: '#fff',
    fontSize: 14, fontFamily: 'inherit', outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F6F8F5', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .vd-search input { color: #fff !important; }
        .vd-search input::placeholder { color: rgba(255,255,255,.38) !important; }
        .vd-sw { position: relative; flex: 1; min-width: 180px; }
        .vd-sugs { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #182418; border: 1px solid rgba(139,175,78,.22); border-radius: 10px; overflow-y: auto; z-index: 9999; box-shadow: 0 8px 32px rgba(0,0,0,.5); max-height: 260px; }
        .vd-si { padding: 11px 16px; cursor: pointer; transition: background .15s; border-bottom: 1px solid rgba(255,255,255,.04); }
        .vd-si:last-child { border-bottom: none; }
        .vd-si:hover, .vd-si:active { background: rgba(139,175,78,.18); }
        .vd-sm { font-size: 13px; font-weight: 600; color: rgba(255,255,255,.88); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .vd-ss { font-size: 11px; color: rgba(255,255,255,.38); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .vd-se { padding: 12px 16px; font-size: 13px; color: rgba(255,255,255,.4); display: flex; align-items: center; gap: 8px; }
        .vd-spin { display: inline-block; width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.12); border-top-color: #8BAF4E; border-radius: 50%; animation: vdspin .6s linear infinite; flex-shrink: 0; }
        @keyframes vdspin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .vd-hero { padding: 24px 16px 20px !important; }
          .vd-hero h1 { font-size: 22px !important; }
          .vd-search { flex-direction: column !important; }
          .vd-sw { min-width: 0; width: 100%; }
          .vd-sugs { position: absolute; top: calc(100% + 4px); left: 0; right: 0; max-height: 55vh; }
          .vd-si { padding: 16px 20px; }
          .vd-sm { font-size: 15px; }
          .vd-ss { font-size: 13px; margin-top: 3px; }
          .vd-se { padding: 14px 20px; font-size: 14px; }
          .vd-body { padding: 16px 14px 60px !important; }
          .vd-cta { flex-direction: column !important; gap: 10px !important; }
          .vd-cta a { width: 100% !important; text-align: center !important; }
          .vd-grid { grid-template-columns: 1fr !important; }
          .vd-header-inner { padding: 0 14px !important; height: 54px !important; }
        }
      `}</style>
      <Header hasToken={hasToken} />

      {/* Hero + filtros */}
      <div className="vd-hero" style={{ background: '#0D150D', padding: '40px 32px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 800, marginBottom: 6, letterSpacing: '-.02em' }}>
            Viajes disponibles
          </h1>
          <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 15, marginBottom: 28 }}>
            Encontrá viajes de hacienda y aplicá con tu camión.
          </p>
          <form ref={formRef} onSubmit={handleBuscar} className="vd-search" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>

            {/* Origen */}
            <div className="vd-sw">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  ref={origenInputRef}
                  type="text"
                  placeholder="Origen..."
                  value={origen}
                  onChange={e => handleOrigenChange(e.target.value)}
                  autoComplete="off"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button type="button" title="Usar mi ubicación" disabled={origenGps} onClick={() => useGPSField(setOrigen, setOrigenGps)}
                  style={{ flexShrink: 0, minWidth: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'rgba(255,255,255,.12)', borderRadius: 10, cursor: origenGps ? 'not-allowed' : 'pointer', opacity: origenGps ? .5 : 1, fontSize: 18 }}>
                  {origenGps ? <span style={{ width: 14, height: 14, border: '2px solid rgba(139,175,78,.3)', borderTopColor: '#8BAF4E', borderRadius: '50%', display: 'inline-block', animation: 'vdspin .6s linear infinite' }}/> : <MapPin size={18} />}
                </button>
              </div>
              {(origenStatus === 'searching' || origenStatus === 'done') && (
                <div className="vd-sugs">
                  {origenStatus === 'searching' ? (
                    <div className="vd-se"><span className="vd-spin" />Buscando...</div>
                  ) : origenSugs.length > 0 ? origenSugs.map((s, i) => (
                    <div key={i} className="vd-si" onClick={() => {
                      setOrigen(s.main); setOrigenSugs([]); setOrigenStatus('idle');
                      origenInputRef.current?.blur();
                    }}>
                      <div className="vd-sm">{s.main}</div>
                      {s.sub && <div className="vd-ss">{s.sub}</div>}
                    </div>
                  )) : <div className="vd-se">Sin resultados</div>}
                </div>
              )}
            </div>

            {/* Destino */}
            <div className="vd-sw">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  ref={destinoInputRef}
                  type="text"
                  placeholder="Destino..."
                  value={destino}
                  onChange={e => handleDestinoChange(e.target.value)}
                  autoComplete="off"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button type="button" title="Usar mi ubicación" disabled={destinoGps} onClick={() => useGPSField(setDestino, setDestinoGps)}
                  style={{ flexShrink: 0, minWidth: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'rgba(255,255,255,.12)', borderRadius: 10, cursor: destinoGps ? 'not-allowed' : 'pointer', opacity: destinoGps ? .5 : 1, fontSize: 18 }}>
                  {destinoGps ? <span style={{ width: 14, height: 14, border: '2px solid rgba(139,175,78,.3)', borderTopColor: '#8BAF4E', borderRadius: '50%', display: 'inline-block', animation: 'vdspin .6s linear infinite' }}/> : <MapPin size={18} />}
                </button>
              </div>
              {(destinoStatus === 'searching' || destinoStatus === 'done') && (
                <div className="vd-sugs">
                  {destinoStatus === 'searching' ? (
                    <div className="vd-se"><span className="vd-spin" />Buscando...</div>
                  ) : destinoSugs.length > 0 ? destinoSugs.map((s, i) => (
                    <div key={i} className="vd-si" onClick={() => {
                      setDestino(s.main); setDestinoSugs([]); setDestinoStatus('idle');
                      destinoInputRef.current?.blur();
                    }}>
                      <div className="vd-sm">{s.main}</div>
                      {s.sub && <div className="vd-ss">{s.sub}</div>}
                    </div>
                  )) : <div className="vd-se">Sin resultados</div>}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <button type="submit" style={{
                flex: 1, padding: '12px 24px', borderRadius: 10, border: 'none',
                background: '#8BAF4E', color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Filtrar
              </button>
              {hasFiltro && (
                <button type="button" onClick={handleLimpiar} style={{
                  padding: '12px 16px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,.2)', background: 'transparent',
                  color: 'rgba(255,255,255,.6)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Limpiar
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Contenido */}
      <div className="vd-body" style={{ maxWidth: 900, margin: '0 auto', padding: '32px 32px 80px', flex: 1, width: '100%' }}>
        {/* CTA publicar */}
        <div className="vd-cta" style={{
          background: '#fff', border: '1px solid rgba(139,175,78,.25)', borderRadius: 14,
          padding: '20px 24px', marginBottom: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1F2B1F', marginBottom: 3 }}>
              ¿Necesitás trasladar hacienda?
            </div>
            <div style={{ fontSize: 13, color: '#666' }}>
              Creá tu cuenta gratis para publicar tu viaje.
            </div>
          </div>
          <Link href="/register" style={{
            flexShrink: 0, padding: '10px 20px', borderRadius: 9999,
            background: '#8BAF4E', color: '#fff', fontSize: 14, fontWeight: 700,
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            Publicar viaje →
          </Link>
        </div>

        {/* Resultados */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#999', fontSize: 15 }}>
            Cargando viajes...
          </div>
        ) : viajes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ marginBottom: 12, color: '#888' }}><Beef size={40} /></div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#333', marginBottom: 6 }}>
              No hay viajes disponibles
            </div>
            <div style={{ fontSize: 14, color: '#888' }}>
              Intentá con otro origen o destino, o volvé más tarde.
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 16, fontWeight: 500 }}>
              {viajes.length} viaje{viajes.length !== 1 ? 's' : ''} encontrado{viajes.length !== 1 ? 's' : ''}
            </div>
            <div className="vd-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {viajes.map(v => <ViajeCard key={v.id} v={v} />)}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{
        background: '#0D150D', padding: '28px 32px', textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,.06)',
      }}>
        <img src="/assets/logo-dark.svg" alt="ARREO" height={26} style={{ marginBottom: 10 }} />
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.2)' }}>
          © 2026 ARREO · Todos los derechos reservados
        </div>
      </div>
    </div>
  );
}

// ─── Export con Suspense (requerido por useSearchParams en App Router) ────────

export default function ViajesDisponiblesPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#F6F8F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#999' }}>
        Cargando...
      </div>
    }>
      <ViajesContent />
    </Suspense>
  );
}
