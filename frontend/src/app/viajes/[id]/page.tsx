'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AppSidebar from '@/components/AppSidebar';
import StarRating from '@/components/StarRating';
import TransportistaPerfilModal from '@/components/TransportistaPerfilModal';
import api from '@/lib/api';

const MapView = dynamic(() => import('@/components/MapViewClient'), { ssr: false });

interface Viaje {
  id: number;
  origen: string; destino: string;
  origen_lat: number; origen_lng: number;
  destino_lat: number; destino_lng: number;
  origen_direccion: string; destino_direccion: string;
  fecha_salida: string;
  tipo_hacienda: string; cantidad_cabezas: number;
  peso_promedio_kg: number; peso_total_kg: number; tipo_jaula: string;
  condicion_camino?: string; observaciones?: string;
  estado: 'disponible' | 'con_ofertas' | 'completo';
  publicado_por: string; zona_publicante: string;
  usuario_id: number;
}

interface Aplicacion {
  id: number;
  estado: 'pendiente' | 'aceptada' | 'rechazada';
  mensaje?: string;
  created_at: string;
  transportista_id: number;
  transportista_nombre: string;
  tipo_remolque?: string;
  capacidad_kg?: number;
  puntuacion_promedio?: number;
  cantidad_reseñas?: number;
}

const ESTADO_CLS: Record<string, string> = {
  disponible:  'badge badge-success',
  con_ofertas: 'badge badge-warning',
  completo:    'badge badge-neutral',
};
const ESTADO_LABEL: Record<string, string> = {
  disponible: 'Disponible', con_ofertas: 'Con ofertas', completo: 'Completo',
};

const APLIC_CLS: Record<string, string> = {
  pendiente: 'badge badge-warning',
  aceptada:  'badge badge-success',
  rechazada: 'badge badge-error',
};
const APLIC_LABEL: Record<string, string> = {
  pendiente: 'Pendiente', aceptada: 'Aceptada', rechazada: 'Rechazada',
};

const TIPO_JAULA_CLS: Record<string, string> = {
  'Jaula simple': 'badge badge-success',
  'Acoplado':     'badge badge-info',
  'Semirremolque':'badge badge-warning',
};

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 50,
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 20px', borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)', color: 'white', fontSize: 14, fontWeight: 500,
      backgroundColor: type === 'success' ? '#8BAF4E' : '#E24B4A',
    }}>
      {type === 'success' ? '✓' : '✕'} {message}
      <button onClick={onClose} style={{ marginLeft: 8, opacity: .7, cursor: 'pointer', background: 'none', border: 'none', color: 'inherit' }}>✕</button>
    </div>
  );
}

export default function ViajeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [viaje,        setViaje]        = useState<Viaje | null>(null);
  const [aplicaciones, setAplicaciones] = useState<Aplicacion[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [aplicando,    setAplicando]    = useState(false);
  const [yaAplico,     setYaAplico]     = useState(false);
  const [gestionando,  setGestionando]  = useState<number | null>(null);
  const [perfilModal,  setPerfilModal]  = useState<number | null>(null);
  const [toast,        setToast]        = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/viajes/${id}`);
      setViaje(data.viaje);
      setAplicaciones(data.aplicaciones ?? []);
      if (user) {
        setYaAplico((data.aplicaciones ?? []).some((a: Aplicacion) => a.transportista_id === user.id));
      }
    } catch {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, user, router]);

  useEffect(() => { if (user) load(); }, [user, load]);

  async function handleAplicar() {
    setAplicando(true);
    try {
      await api.post(`/viajes/${id}/aplicar`);
      setYaAplico(true);
      setToast({ message: '¡Aplicación enviada!', type: 'success' });
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setToast({ message: msg || 'Error al aplicar', type: 'error' });
    } finally {
      setAplicando(false);
    }
  }

  async function handleGestionar(aplicacionId: number, estado: 'aceptada' | 'rechazada') {
    setGestionando(aplicacionId);
    try {
      await api.put(`/viajes/${id}/aplicaciones/${aplicacionId}`, { estado });
      setToast({ message: estado === 'aceptada' ? 'Transportista aceptado' : 'Aplicación rechazada', type: 'success' });
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setToast({ message: msg || 'Error al gestionar', type: 'error' });
    } finally {
      setGestionando(null);
    }
  }

  if (authLoading || loading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--color-niebla)' }}>
        <div className="animate-spin" style={{ width: 32, height: 32, border: '4px solid #8BAF4E', borderTopColor: 'transparent', borderRadius: '50%' }} />
      </div>
    );
  }

  if (!viaje) return null;

  const isOwner = user.id === viaje.usuario_id;
  const fecha = new Date(viaje.fecha_salida).toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const hasMap = viaje.origen_lat && viaje.origen_lng && viaje.destino_lat && viaje.destino_lng;

  return (
    <div className="app-layout">
      <style>{`
        @media (max-width: 640px) {
          .vjd-3col { grid-template-columns: 1fr 1fr !important; }
          .vjd-apply-actions { flex-wrap: wrap !important; }
          .vjd-apply-actions button, .vjd-apply-actions a { flex: 1 !important; min-width: 0 !important; }
          .vjd-map { max-height: 220px !important; }
        }
        @media (max-width: 420px) {
          .vjd-3col { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <AppSidebar />

      <div className="app-content">
        <header className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/dashboard" style={{ color: 'var(--color-text-muted)', fontSize: 18, textDecoration: 'none' }}>←</Link>
            <div>
              <h2 className="header-title">Detalle del viaje</h2>
              <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginTop: 2 }}>
                {viaje.origen.split(',')[0]} → {viaje.destino.split(',')[0]}
              </p>
            </div>
          </div>
          <span className={ESTADO_CLS[viaje.estado]}>{ESTADO_LABEL[viaje.estado]}</span>
        </header>

        <main className="page-content">
          <div style={{ maxWidth: 768, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Encabezado */}
            <section className="card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#8BAF4E', flexShrink: 0 }} />
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>{viaje.origen.split(',')[0]}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 6 }}>
                  <div style={{ width: 1, height: 16, borderLeft: '2px dashed #E0E0E0' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#E07A34', flexShrink: 0 }} />
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>{viaje.destino.split(',')[0]}</h3>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <span className="badge badge-neutral">📅 {fecha}</span>
                <span className="badge badge-neutral">🐄 {viaje.tipo_hacienda}</span>
                {viaje.tipo_jaula && (
                  <span className={TIPO_JAULA_CLS[viaje.tipo_jaula] ?? 'badge badge-neutral'}>{viaje.tipo_jaula}</span>
                )}
                {viaje.condicion_camino && (
                  <span className="badge badge-neutral">{
                    viaje.condicion_camino === 'Seco'            ? '☀️' :
                    viaje.condicion_camino === 'Lluvia reciente' ? '🌧️' :
                    viaje.condicion_camino === 'Lluvia intensa'  ? '⛈️' :
                    viaje.condicion_camino === 'Helada'          ? '❄️' : '🌦️'
                  } {viaje.condicion_camino}</span>
                )}
              </div>
            </section>

            {/* Mapa */}
            {hasMap && (
              <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)' }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)' }}>Ruta</h3>
                </div>
                <div className="vjd-map">
                  <MapView
                    origenLat={viaje.origen_lat} origenLng={viaje.origen_lng}
                    destinoLat={viaje.destino_lat} destinoLng={viaje.destino_lng}
                  />
                </div>
                <div style={{ padding: '12px 24px', display: 'flex', gap: 24, borderTop: '1px solid var(--color-border)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#8BAF4E', display: 'inline-block' }} /> Origen
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#E07A34', display: 'inline-block' }} /> Destino
                  </span>
                </div>
              </section>
            )}

            {/* Detalles */}
            <section className="card">
              <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 16 }}>Detalles de la carga</h3>
              <div className="vjd-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[
                  { label: 'Cabezas',       value: `${viaje.cantidad_cabezas} cab.` },
                  { label: 'Peso promedio', value: viaje.peso_promedio_kg ? `${viaje.peso_promedio_kg} kg` : '—' },
                  { label: 'Peso total',    value: viaje.peso_total_kg ? `${Number(viaje.peso_total_kg).toLocaleString('es-AR')} kg` : '—' },
                  { label: 'Jaula recom.',      value: viaje.tipo_jaula || '—' },
                  { label: 'Condic. camino',   value: viaje.condicion_camino || '—' },
                  { label: 'Estado',           value: ESTADO_LABEL[viaje.estado] },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>{label}</span>
                    <p style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{value}</p>
                  </div>
                ))}
              </div>
              {viaje.observaciones && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
                  <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginBottom: 4 }}>Observaciones</p>
                  <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{viaje.observaciones}</p>
                </div>
              )}
            </section>

            {/* Publicado por */}
            <section className="card">
              <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Publicado por</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, textTransform: 'uppercase', backgroundColor: 'rgba(139,175,78,0.15)', color: '#4d6b1a' }}>
                  {(viaje.publicado_por ?? '?')[0]}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700 }}>{viaje.publicado_por}</p>
                  {viaje.zona_publicante && <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>📍 {viaje.zona_publicante}</p>}
                </div>
              </div>
            </section>

            {/* Aplicaciones — solo el dueño */}
            {isOwner && (
              <section className="card">
                <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 16 }}>
                  Aplicaciones recibidas
                  <span style={{ marginLeft: 8, fontWeight: 400, textTransform: 'none' }}>({aplicaciones.length})</span>
                </h3>
                {aplicaciones.length === 0 ? (
                  <p style={{ fontSize: 14, color: 'var(--color-text-subtle)', textAlign: 'center', padding: '16px 0' }}>Ningún transportista aplicó todavía.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {aplicaciones.map(a => (
                      <div key={a.id} style={{ borderRadius: 'var(--radius-lg)', padding: 16, backgroundColor: 'var(--color-niebla)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', flexShrink: 0, backgroundColor: 'rgba(139,175,78,0.15)', color: '#4d6b1a' }}>
                              {a.transportista_nombre[0]}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 14, fontWeight: 700 }}>{a.transportista_nombre}</p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                                {a.tipo_remolque && a.tipo_remolque.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                                  <span key={t} className={TIPO_JAULA_CLS[t] ?? 'badge badge-neutral'} style={{ fontSize: 11 }}>🚛 {t}</span>
                                ))}
                                {a.capacidad_kg && (
                                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>⚖️ {Number(a.capacidad_kg).toLocaleString('es-AR')} kg</span>
                                )}
                                {(a.cantidad_reseñas ?? 0) > 0 && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <StarRating value={Number(a.puntuacion_promedio ?? 0)} size="sm" />
                                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{Number(a.puntuacion_promedio ?? 0).toFixed(1)} ({a.cantidad_reseñas})</span>
                                  </div>
                                )}
                              </div>
                              {a.mensaje && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: 4 }}>"{a.mensaje}"</p>}
                            </div>
                          </div>
                          <span className={APLIC_CLS[a.estado]}>{APLIC_LABEL[a.estado]}</span>
                        </div>
                        <div className="vjd-apply-actions" style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.6)' }}>
                          <button onClick={() => setPerfilModal(a.transportista_id)}
                            className="btn btn-sm"
                            style={{ border: '2px solid #8BAF4E', color: '#4d6b1a', backgroundColor: 'transparent' }}>
                            Ver perfil
                          </button>
                          {a.estado === 'pendiente' && (
                            <>
                              <button
                                onClick={() => handleGestionar(a.id, 'aceptada')}
                                disabled={gestionando === a.id}
                                className="btn btn-sm"
                                style={{ backgroundColor: '#8BAF4E', color: 'white', border: 'none' }}>
                                Aceptar
                              </button>
                              <button
                                onClick={() => handleGestionar(a.id, 'rechazada')}
                                disabled={gestionando === a.id}
                                className="btn btn-sm"
                                style={{ backgroundColor: '#E24B4A', color: 'white', border: 'none' }}>
                                Rechazar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Botón aplicar — transportista */}
            {user.rol === 'transportista' && !isOwner && (
              <section className="card">
                {viaje.estado === 'completo' ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--color-text-muted)', fontSize: 14, padding: '8px 0' }}>
                    🔒 Este viaje ya tiene transportista asignado
                  </div>
                ) : yaAplico ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 600, backgroundColor: 'rgba(139,175,78,0.12)', color: '#4d6b1a' }}>
                    ✓ Ya aplicaste a este viaje
                  </div>
                ) : (
                  <button onClick={handleAplicar} disabled={aplicando} className="btn btn-primary btn-full btn-lg">
                    {aplicando ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="animate-spin" style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }} />
                        Enviando…
                      </span>
                    ) : '🚛 Aplicar al viaje'}
                  </button>
                )}
              </section>
            )}

          </div>
        </main>
      </div>

      {perfilModal && (
        <TransportistaPerfilModal
          transportistaId={perfilModal}
          onClose={() => setPerfilModal(null)}
          canReview={isOwner}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
