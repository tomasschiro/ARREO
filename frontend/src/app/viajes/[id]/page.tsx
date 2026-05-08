'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AppSidebar from '@/components/AppSidebar';
import StarRating from '@/components/StarRating';
import TransportistaPerfilModal from '@/components/TransportistaPerfilModal';
import api from '@/lib/api';
import { Check, X, Clock, Calendar, Beef, Sun, CloudRain, CloudLightning, Snowflake, Cloud, MapPin, AlertTriangle, Truck, Scale, Lock, Share2, Radio } from 'lucide-react';

const MapView      = dynamic(() => import('@/components/MapViewClient'),    { ssr: false });
const TrackingMap  = dynamic(() => import('@/components/TrackingMapClient'), { ssr: false });

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
  dte_numero?: string;
  guia_provincial_numero?: string;
  documentacion_cargada?: boolean;
}

interface Ubicacion {
  lat: number;
  lng: number;
  actualizada_en: string;
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
  transportista_estado?: string;
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
      {type === 'success' ? <Check size={14} /> : <X size={14} />} {message}
      <button onClick={onClose} style={{ marginLeft: 8, opacity: .7, cursor: 'pointer', background: 'none', border: 'none', color: 'inherit', display: 'flex' }}><X size={14} /></button>
    </div>
  );
}

export default function ViajeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading, updateUser } = useAuth();
  const router = useRouter();

  const [viaje,        setViaje]        = useState<Viaje | null>(null);
  const [aplicaciones, setAplicaciones] = useState<Aplicacion[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [aplicando,    setAplicando]    = useState(false);
  const [yaAplico,     setYaAplico]     = useState(false);
  const [gestionando,  setGestionando]  = useState<number | null>(null);
  const [perfilModal,  setPerfilModal]  = useState<number | null>(null);
  const [toast,        setToast]        = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [docModal,     setDocModal]     = useState(false);
  const [dteNum,       setDteNum]       = useState('');
  const [guiaNum,      setGuiaNum]      = useState('');
  const [savingDoc,    setSavingDoc]    = useState(false);
  const [djModal,      setDjModal]      = useState(false);
  const [firmandoDJ,   setFirmandoDJ]   = useState(false);

  // Seguimiento en tiempo real
  const [ubicacion,      setUbicacion]      = useState<Ubicacion | null>(null);
  const [linkUrl,        setLinkUrl]        = useState<string | null>(null);
  const [generandoLink,  setGenerandoLink]  = useState(false);
  const socketRef = useRef<import('socket.io-client').Socket | null>(null);

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

  // Socket.io: suscribirse al room del viaje cuando está activo
  useEffect(() => {
    if (!viaje || viaje.estado !== 'completo') return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (new Date(viaje.fecha_salida) < today) return;

    let socket: import('socket.io-client').Socket;
    import('socket.io-client').then(({ io }) => {
      const socketUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api$/, '');
      socket = io(socketUrl, { transports: ['websocket', 'polling'] });
      socketRef.current = socket;
      socket.emit('join_viaje', viaje.id);
      socket.on('ubicacion_actualizada', (data: { lat: number; lng: number; timestamp: string }) => {
        setUbicacion({ lat: data.lat, lng: data.lng, actualizada_en: data.timestamp });
      });
    });
    return () => {
      if (socket) { socket.emit('leave_viaje', viaje.id); socket.disconnect(); }
      socketRef.current = null;
    };
  }, [viaje?.id, viaje?.estado, viaje?.fecha_salida]);

  // Cargar la última ubicación conocida cuando el viaje está activo
  useEffect(() => {
    if (!viaje || viaje.estado !== 'completo') return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (new Date(viaje.fecha_salida) < today) return;
    api.get(`/viajes/${viaje.id}/ubicacion`)
      .then(({ data }) => {
        if (data.lat != null && data.lng != null) {
          setUbicacion({ lat: data.lat, lng: data.lng, actualizada_en: data.actualizada_en });
        }
      })
      .catch(() => {});
  }, [viaje?.id, viaje?.estado, viaje?.fecha_salida]);

  async function handleGuardarDoc() {
    if (!dteNum.trim() || !guiaNum.trim()) return;
    setSavingDoc(true);
    try {
      const { data } = await api.put(`/viajes/${id}/documentacion`, { dte_numero: dteNum.trim(), guia_provincial_numero: guiaNum.trim() });
      setViaje(prev => prev ? { ...prev, ...data.viaje } : prev);
      setDocModal(false);
      setToast({ message: 'Documentación guardada', type: 'success' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setToast({ message: msg || 'Error al guardar', type: 'error' });
    } finally {
      setSavingDoc(false);
    }
  }

  async function handleFirmarDJ() {
    setFirmandoDJ(true);
    try {
      const { data } = await api.put('/auth/declaracion-jurada');
      updateUser(data.usuario);
      setDjModal(false);
      setToast({ message: 'Declaración jurada firmada correctamente', type: 'success' });
    } catch {
      setToast({ message: 'Error al firmar la declaración jurada', type: 'error' });
    } finally {
      setFirmandoDJ(false);
    }
  }

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

  async function handleGenerarLink() {
    if (!viaje) return;
    setGenerandoLink(true);
    try {
      const { data } = await api.post(`/viajes/${viaje.id}/generar-link`);
      setLinkUrl(data.url);
      await navigator.clipboard.writeText(data.url);
      setToast({ message: 'Link copiado al portapapeles', type: 'success' });
    } catch {
      setToast({ message: 'Error al generar el link', type: 'error' });
    } finally {
      setGenerandoLink(false);
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

  const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
  const isActive  = new Date(viaje.fecha_salida) >= todayMidnight;
  const hasTracking = viaje.estado === 'completo' && isActive && Boolean(hasMap);
  const msUntilSalida = new Date(viaje.fecha_salida).getTime() - Date.now();
  const isUrgent24h = msUntilSalida > 0 && msUntilSalida < 24 * 60 * 60 * 1000;

  function timeSince(iso: string): string {
    const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (secs < 60) return `Hace ${secs}s`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `Hace ${mins} min`;
    return `Hace ${Math.floor(mins / 60)}h`;
  }

  function calcETA(lat: number, lng: number): string {
    if (!viaje) return '';
    const R = 6371;
    const dLat = (viaje.destino_lat - lat) * Math.PI / 180;
    const dLng = (viaje.destino_lng - lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat * Math.PI / 180) * Math.cos(viaje.destino_lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const hrs = distKm / 80;
    if (hrs < 0.5) return 'Menos de 30 min';
    if (hrs < 1)   return `~${Math.round(hrs * 60)} min`;
    const h = Math.floor(hrs);
    const m = Math.round((hrs - h) * 60);
    return `~${h}h${m > 0 ? ` ${m}min` : ''}`;
  }

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
        @keyframes vjd-live {
          0%,100% { opacity:1; } 50% { opacity:.15; }
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

            {/* ── Banners de alerta ── */}

            {/* Transportista: DJ no firmada */}
            {user.rol === 'transportista' && !isOwner && viaje.estado === 'completo' && !user.declaracion_jurada && (
              <div style={{ background: 'rgba(194,48,48,.07)', border: '1.5px solid rgba(194,48,48,.3)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <AlertTriangle size={17} color="#b83030" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#8a1c1c' }}>No podés iniciar este viaje sin firmar la declaración jurada de documentación</div>
                  <div style={{ fontSize: 12, color: '#b83030', marginTop: 2 }}>Confirmá que tenés toda la documentación en regla antes de salir.</div>
                </div>
                <button
                  onClick={() => setDjModal(true)}
                  style={{ background: '#C83030', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit' }}>
                  Firmar declaración jurada
                </button>
              </div>
            )}

            {/* Transportista: doc del productor pendiente */}
            {user.rol === 'transportista' && !isOwner && viaje.estado === 'completo' && !viaje.documentacion_cargada && (
              <div style={{ background: 'rgba(224,180,52,.08)', border: '1px solid rgba(224,180,52,.35)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Clock size={16} color="#9a7a00" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#6b5200' }}>El productor aún no cargó el DTE y la Guía Provincial</div>
                  <div style={{ fontSize: 12, color: '#9a7a00', marginTop: 2 }}>Recordáselo antes de salir. Sin esa documentación no podés circular.</div>
                </div>
              </div>
            )}

            {/* Productor: doc pendiente (urgente si <24h) */}
            {isOwner && viaje.estado === 'completo' && !viaje.documentacion_cargada && (
              <div style={{
                background: isUrgent24h ? 'rgba(194,48,48,.09)' : 'rgba(194,48,48,.07)',
                border: isUrgent24h ? '1.5px solid rgba(194,48,48,.4)' : '1.5px solid rgba(194,48,48,.25)',
                borderRadius: 12, padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                animation: isUrgent24h ? 'vjd-live 2s ease-in-out infinite' : 'none',
              }}>
                <AlertTriangle size={17} color="#b83030" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {isUrgent24h ? (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#8a1c1c' }}>El viaje sale en menos de 24hs y falta documentación — Subila urgente</div>
                      <div style={{ fontSize: 12, color: '#b83030', marginTop: 2 }}>El transportista no puede circular sin el DTE y la Guía Provincial.</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#8a1c1c' }}>Falta documentación obligatoria</div>
                      <div style={{ fontSize: 12, color: '#b83030', marginTop: 2 }}>El transportista no puede circular sin el DTE y la Guía Provincial.</div>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setDocModal(true)}
                  style={{ background: '#C83030', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit' }}>
                  Subir documentación ahora
                </button>
              </div>
            )}

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
                <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {fecha}</span>
                <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Beef size={12} /> {viaje.tipo_hacienda}</span>
                {viaje.tipo_jaula && (
                  <span className={TIPO_JAULA_CLS[viaje.tipo_jaula] ?? 'badge badge-neutral'}>{viaje.tipo_jaula}</span>
                )}
                {viaje.condicion_camino && (
                  <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{
                    viaje.condicion_camino === 'Seco'            ? <Sun size={12} /> :
                    viaje.condicion_camino === 'Lluvia reciente' ? <CloudRain size={12} /> :
                    viaje.condicion_camino === 'Lluvia intensa'  ? <CloudLightning size={12} /> :
                    viaje.condicion_camino === 'Helada'          ? <Snowflake size={12} /> : <Cloud size={12} />
                  } {viaje.condicion_camino}</span>
                )}
              </div>
            </section>

            {/* Mapa / Seguimiento en vivo */}
            {hasMap && (
              <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)' }}>
                      {hasTracking ? 'Seguimiento en vivo' : 'Ruta'}
                    </h3>
                    {hasTracking && ubicacion && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#c23030', background: 'rgba(194,48,48,.08)', border: '1px solid rgba(194,48,48,.2)', padding: '2px 8px', borderRadius: 5 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#c23030', animation: 'vjd-live 1.2s ease-in-out infinite', display: 'inline-block' }} />
                        En vivo
                      </span>
                    )}
                  </div>
                  {hasTracking && isOwner && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {ubicacion && (
                        <span style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
                          {timeSince(ubicacion.actualizada_en)}
                        </span>
                      )}
                      <button
                        onClick={handleGenerarLink}
                        disabled={generandoLink}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#1F2B1F', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: generandoLink ? .6 : 1 }}>
                        <Share2 size={12} /> {generandoLink ? 'Generando…' : 'Compartir'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="vjd-map">
                  {hasTracking ? (
                    <TrackingMap
                      origenLat={viaje.origen_lat}   origenLng={viaje.origen_lng}
                      destinoLat={viaje.destino_lat} destinoLng={viaje.destino_lng}
                      currentLat={ubicacion?.lat}    currentLng={ubicacion?.lng}
                      height="320px"
                    />
                  ) : (
                    <MapView
                      origenLat={viaje.origen_lat} origenLng={viaje.origen_lng}
                      destinoLat={viaje.destino_lat} destinoLng={viaje.destino_lng}
                    />
                  )}
                </div>

                <div style={{ padding: '12px 24px', display: 'flex', gap: 16, flexWrap: 'wrap', borderTop: '1px solid var(--color-border)', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#8BAF4E', display: 'inline-block' }} /> Origen
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#E07A34', display: 'inline-block' }} /> Destino
                  </span>
                  {hasTracking && ubicacion && (
                    <>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
                        <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#2563EB', display: 'inline-block' }} /> Posición actual
                      </span>
                      <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: '#1F2B1F', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Radio size={12} /> ETA: {calcETA(ubicacion.lat, ubicacion.lng)}
                      </span>
                    </>
                  )}
                </div>

                {linkUrl && isOwner && (
                  <div style={{ padding: '12px 24px', borderTop: '1px solid var(--color-border)', background: 'rgba(139,175,78,.05)' }}>
                    <p style={{ fontSize: 11, color: '#4d6b1a', fontWeight: 600, marginBottom: 4 }}>Link de seguimiento copiado:</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code style={{ fontSize: 11, color: '#555', background: '#F0F0F0', padding: '4px 8px', borderRadius: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{linkUrl}</code>
                      <button onClick={() => { navigator.clipboard.writeText(linkUrl); setToast({ message: 'Link copiado', type: 'success' }); }}
                        style={{ fontSize: 11, fontWeight: 600, color: '#8BAF4E', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        Copiar de nuevo
                      </button>
                    </div>
                  </div>
                )}
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
                  {viaje.zona_publicante && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {viaje.zona_publicante}</p>}
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
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <p style={{ fontSize: 14, fontWeight: 700 }}>{a.transportista_nombre}</p>
                                {a.transportista_estado === 'aprobado' ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#4d6b1a', background: 'rgba(139,175,78,.15)', padding: '2px 8px', borderRadius: 5 }}><Check size={11} /> Verificado</span>
                                ) : (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#7a5a00', background: 'rgba(224,180,52,.15)', padding: '2px 8px', borderRadius: 5 }}><Clock size={11} /> Verificación pendiente</span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                                {a.tipo_remolque && a.tipo_remolque.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                                  <span key={t} className={TIPO_JAULA_CLS[t] ?? 'badge badge-neutral'} style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Truck size={11} /> {t}</span>
                                ))}
                                {a.capacidad_kg && (
                                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Scale size={12} /> {Number(a.capacidad_kg).toLocaleString('es-AR')} kg</span>
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

            {/* Documentación — solo el dueño cuando está completo */}
            {isOwner && viaje.estado === 'completo' && (
              <section className="card">
                <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
                  Documentación del viaje
                </h3>
                {viaje.documentacion_cargada ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ background: '#F6F8F5', borderRadius: 10, padding: '12px 16px' }}>
                        <div style={{ fontSize: 10, color: '#aaa', marginBottom: 4, fontWeight: 600 }}>NÚMERO DTE</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#1F2B1F', letterSpacing: '.02em' }}>{viaje.dte_numero}</div>
                      </div>
                      <div style={{ background: '#F6F8F5', borderRadius: 10, padding: '12px 16px' }}>
                        <div style={{ fontSize: 10, color: '#aaa', marginBottom: 4, fontWeight: 600 }}>GUÍA PROVINCIAL</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#1F2B1F', letterSpacing: '.02em' }}>{viaje.guia_provincial_numero}</div>
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: '#8BAF4E', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Check size={12} /> Documentación cargada</p>
                  </div>
                ) : (
                  <div>
                    <div style={{ background: 'rgba(224,122,52,.08)', border: '1px solid rgba(224,122,52,.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 12 }}>
                      <p style={{ fontSize: 13, color: '#b05a1e', fontWeight: 600, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={13} /> Documentación pendiente</p>
                      <p style={{ fontSize: 12, color: '#b05a1e' }}>Cargá el DTE y la Guía Provincial antes de que salga el camión.</p>
                    </div>
                    <button onClick={() => setDocModal(true)} style={{ background: '#E07A34', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Cargar documentación
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* Botón aplicar — transportista */}
            {user.rol === 'transportista' && !isOwner && (
              <section className="card">
                {viaje.estado === 'completo' ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--color-text-muted)', fontSize: 14, padding: '8px 0' }}>
                    <Lock size={14} /> Este viaje ya tiene transportista asignado
                  </div>
                ) : yaAplico ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 600, backgroundColor: 'rgba(139,175,78,0.12)', color: '#4d6b1a' }}>
                    <Check size={14} /> Ya aplicaste a este viaje
                  </div>
                ) : (
                  <button onClick={handleAplicar} disabled={aplicando} className="btn btn-primary btn-full btn-lg">
                    {aplicando ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="animate-spin" style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }} />
                        Enviando…
                      </span>
                    ) : <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}><Truck size={16} /> Aplicar al viaje</span>}
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

      {docModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.5)', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>Documentación requerida antes del viaje</h3>
              <button onClick={() => setDocModal(false)} style={{ color: '#999', cursor: 'pointer', background: 'none', border: 'none', display: 'flex' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
                Número de DTE{' '}
                <span title="Generalo en senasa.gob.ar/dte" style={{ fontSize: 11, color: '#8BAF4E', cursor: 'help', fontWeight: 400 }}>ℹ Generalo en senasa.gob.ar/dte</span>
              </label>
              <input
                type="text"
                value={dteNum}
                onChange={e => setDteNum(e.target.value)}
                placeholder="Ej: DTE-2024-00123456"
                style={{ padding: '10px 14px', border: '1.5px solid #E0E0E0', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>Número de Guía Provincial</label>
              <input
                type="text"
                value={guiaNum}
                onChange={e => setGuiaNum(e.target.value)}
                placeholder="Ej: GP-CBA-2024-00456"
                style={{ padding: '10px 14px', border: '1.5px solid #E0E0E0', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDocModal(false)} style={{ flex: 1, padding: '11px', border: '1.5px solid #E0E0E0', borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
              <button
                onClick={handleGuardarDoc}
                disabled={savingDoc || !dteNum.trim() || !guiaNum.trim()}
                style={{ flex: 2, padding: '11px', border: 'none', borderRadius: 8, background: '#E07A34', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: (savingDoc || !dteNum.trim() || !guiaNum.trim()) ? .6 : 1 }}
              >
                {savingDoc ? 'Guardando…' : 'Guardar documentación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {djModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.5)', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>Declaración jurada de documentación</h3>
              <button onClick={() => setDjModal(false)} style={{ color: '#999', cursor: 'pointer', background: 'none', border: 'none', display: 'flex' }}><X size={20} /></button>
            </div>
            <div style={{ background: '#F8F8F6', borderRadius: 10, padding: '14px 16px' }}>
              <p style={{ fontSize: 13, color: '#444', lineHeight: 1.65 }}>
                Al firmar, declarás bajo fe de juramento que contás con toda la documentación habilitante para el traslado de hacienda:
              </p>
              <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 13, color: '#444', lineHeight: 1.8 }}>
                <li>LINTI vigente</li>
                <li>Seguro de carga al día</li>
                <li>Habilitación SENASA</li>
                <li>VTV al día</li>
              </ul>
              <p style={{ fontSize: 12, color: '#888', marginTop: 10 }}>
                Declaro también que el vehículo está en condiciones aptas y seguras para realizar el traslado.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDjModal(false)} style={{ flex: 1, padding: '11px', border: '1.5px solid #E0E0E0', borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancelar
              </button>
              <button
                onClick={handleFirmarDJ}
                disabled={firmandoDJ}
                style={{ flex: 2, padding: '11px', border: 'none', borderRadius: 8, background: '#1F2B1F', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: firmandoDJ ? .6 : 1 }}>
                {firmandoDJ ? 'Firmando…' : 'Acepto y firmo la declaración'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
