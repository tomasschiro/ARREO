'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

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

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

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
      {/* Route + status */}
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

      {/* Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <Chip>📅 {fmt(v.fecha_salida)}</Chip>
        <Chip>🐄 {v.tipo_hacienda}</Chip>
        <Chip>{v.cantidad_cabezas} cabezas</Chip>
        {v.peso_total_kg != null && <Chip>⚖️ {v.peso_total_kg.toLocaleString('es-AR')} kg</Chip>}
        {v.tipo_jaula && <Chip>🚛 {v.tipo_jaula}</Chip>}
        {v.condicion_camino && <Chip>🛣️ {v.condicion_camino}</Chip>}
        {v.zona_publicante && <Chip color="#3a6e8a" bg="rgba(58,110,138,.09)">📍 {v.zona_publicante}</Chip>}
      </div>

      {/* CTA */}
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

  useEffect(() => {
    setHasToken(!!localStorage.getItem('token'));
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
    fetchViajes('', '');
    router.replace('/viajes-disponibles');
  }

  const hasFiltro = origen !== '' || destino !== '';

  return (
    <div style={{ minHeight: '100vh', background: '#F6F8F5', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .vd-search input { color: #fff !important; }
        .vd-search input::placeholder { color: rgba(255,255,255,.38) !important; }
        @media (max-width: 640px) {
          .vd-hero { padding: 24px 16px 20px !important; }
          .vd-hero h1 { font-size: 22px !important; }
          .vd-search { flex-direction: column !important; }
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
          <form onSubmit={handleBuscar} className="vd-search" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Origen..."
              value={origen}
              onChange={e => setOrigen(e.target.value)}
              style={{
                flex: 1, minWidth: 180, padding: '12px 16px', borderRadius: 10,
                border: 'none', background: 'rgba(255,255,255,.1)', color: '#fff',
                fontSize: 14, fontFamily: 'inherit', outline: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Destino..."
              value={destino}
              onChange={e => setDestino(e.target.value)}
              style={{
                flex: 1, minWidth: 180, padding: '12px 16px', borderRadius: 10,
                border: 'none', background: 'rgba(255,255,255,.1)', color: '#fff',
                fontSize: 14, fontFamily: 'inherit', outline: 'none',
              }}
            />
            <button type="submit" style={{
              padding: '12px 24px', borderRadius: 10, border: 'none',
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
            <div style={{ fontSize: 40, marginBottom: 12 }}>🐄</div>
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
