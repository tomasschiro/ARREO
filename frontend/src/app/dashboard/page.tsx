'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppSidebar from '@/components/AppSidebar';
import StarRating from '@/components/StarRating';
import TransportistaPerfilModal from '@/components/TransportistaPerfilModal';
import api from '@/lib/api';
import { Check, X, Users, FileText, Truck, MapPin, Scale, Calendar } from 'lucide-react';

// ─── Shared primitives (UI Kit style) ────────────────────────────────────────

function Icon({ name, size = 15, color = 'currentColor' }: { name: string; size?: number; color?: string }) {
  const s = { width: size, height: size, stroke: color, fill: 'none', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const p: Record<string, React.ReactNode> = {
    plus:      <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    map:       <><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></>,
    truck:     <><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,
    check:     <><polyline points="20 6 9 17 4 12"/></>,
    users:     <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    cow:       <><ellipse cx="12" cy="13" rx="6" ry="5"/><path d="M7 10c-.8-1.4-.8-3 0-4"/><path d="M17 10c.8-1.4.8-3 0-4"/><circle cx="10" cy="12" r="1"/><circle cx="14" cy="12" r="1"/></>,
    chevron:   <><polyline points="9 18 15 12 9 6"/></>,
    edit:      <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    star:      <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>,
  };
  return <svg viewBox="0 0 24 24" style={s}>{p[name]}</svg>;
}

function KitBadge({ status, label }: { status: string; label?: string }) {
  const cfg: Record<string, { bg: string; color: string; dot: string; glow: boolean; label: string }> = {
    active:    { bg: 'rgba(139,175,78,.15)', color: '#5a7a2a', dot: '#8BAF4E', glow: true,  label: 'En camino' },
    confirmed: { bg: 'rgba(139,175,78,.15)', color: '#5a7a2a', dot: '#8BAF4E', glow: false, label: 'Confirmado' },
    pending:   { bg: 'rgba(224,122,52,.15)', color: '#b85e1e', dot: '#E07A34', glow: false, label: 'Pendiente' },
    completed: { bg: 'rgba(0,0,0,.06)',      color: '#555',    dot: '#aaa',    glow: false, label: 'Completado' },
    available: { bg: 'rgba(139,175,78,.15)', color: '#5a7a2a', dot: '#8BAF4E', glow: false, label: 'Disponible' },
    offers:    { bg: 'rgba(224,122,52,.15)', color: '#b85e1e', dot: '#E07A34', glow: false, label: 'Con ofertas' },
  };
  const c = cfg[status] ?? cfg.pending;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: c.bg, color: c.color, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0, boxShadow: c.glow ? `0 0 5px ${c.dot}` : 'none', display: 'inline-block' }}/>
      {label ?? c.label}
    </span>
  );
}

function RouteInline({ origin, destination }: { origin: string; destination: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#8BAF4E', flexShrink: 0, boxShadow: '0 0 4px rgba(139,175,78,.5)' }}/>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{origin}</span>
      </div>
      <div style={{ width: 1, height: 10, background: 'rgba(139,175,78,.3)', marginLeft: 4 }}/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#E07A34', flexShrink: 0 }}/>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{destination}</span>
      </div>
    </div>
  );
}

function Chip({ icon, label, color = '#666', bg = 'rgba(0,0,0,.06)' }: { icon?: string; label: string; color?: string; bg?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: bg, color, fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 5, whiteSpace: 'nowrap' }}>
      {icon && <Icon name={icon} size={12} color={color}/>}
      {label}
    </span>
  );
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,.15)', color: 'white', fontSize: 14, fontWeight: 500, backgroundColor: type === 'success' ? '#8BAF4E' : '#E24B4A' }}>
      {type === 'success' ? <Check size={14} /> : <X size={14} />} {message}
      <button onClick={onClose} style={{ marginLeft: 8, opacity: .7, cursor: 'pointer', background: 'none', border: 'none', color: 'inherit', display: 'flex' }}><X size={14} /></button>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Viaje {
  id: number; origen: string; destino: string; fecha_salida: string;
  tipo_hacienda: string; cantidad_cabezas: number; peso_total_kg?: number;
  tipo_jaula?: string; estado: string; publicado_por: string; zona_publicante?: string;
  usuario_id: number; total_aplicaciones?: number;
}

interface Aplicacion {
  id: number; estado: 'pendiente' | 'aceptada' | 'rechazada';
  viaje_id: number; origen: string; destino: string; fecha_salida: string;
  tipo_hacienda: string; cantidad_cabezas: number; peso_total_kg?: number;
  tipo_jaula?: string; estado_viaje: string; publicado_por: string;
  transportista_id?: number; transportista_nombre?: string;
  tipo_remolque?: string; capacidad_kg?: number;
  puntuacion_promedio?: number; cantidad_reseñas?: number;
  mensaje?: string; created_at: string;
}

interface MiDisponibilidad {
  id: number; transportista_id: number; transportista_nombre: string;
  transportista_zona?: string; tipo_remolque?: string; capacidad_kg?: number;
  puntuacion_promedio?: number; cantidad_reseñas?: number;
  origen_direccion: string; destino_direccion: string;
  fecha: string; tipo_jaula: string; estado: string;
  interesados: { id: number; leido: boolean; remitente_nombre: string; remitente_email: string; asunto: string; contenido: string; created_at: string }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

// ─── EditDisponibilidadModal ──────────────────────────────────────────────────

function EditDisponibilidadModal({ disp, onClose, onSave }: {
  disp: MiDisponibilidad;
  onClose: () => void;
  onSave: (id: number, fecha: string, tipo_jaula: string) => Promise<void>;
}) {
  const hoy = new Date().toISOString().split('T')[0];
  const [fecha, setFecha]         = useState(disp.fecha.split('T')[0]);
  const [tipoJaula, setTipoJaula] = useState(disp.tipo_jaula);
  const [saving, setSaving]       = useState(false);
  async function handleSave() { setSaving(true); await onSave(disp.id, fecha, tipoJaula); setSaving(false); }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>Editar disponibilidad</h3>
        <div className="form-group"><label className="form-label">Fecha</label>
          <input type="date" min={hoy} value={fecha} onChange={e => setFecha(e.target.value)} className="form-input"/>
        </div>
        <div className="form-group"><label className="form-label">Tipo de jaula</label>
          <select value={tipoJaula} onChange={e => setTipoJaula(e.target.value)} className="form-select">
            {['Jaula simple', 'Acoplado', 'Semirremolque'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── ContactarModal ───────────────────────────────────────────────────────────

function ContactarModal({ disp, onClose, onSent }: { disp: MiDisponibilidad; onClose: () => void; onSent: () => void }) {
  const [asunto, setAsunto]   = useState(`Consulta por camión ${disp.origen_direccion?.split(',')[0]} → ${disp.destino_direccion?.split(',')[0]}`);
  const [mensaje, setMensaje] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState('');
  async function handleSend() {
    if (!mensaje.trim()) { setError('Escribí un mensaje'); return; }
    setSending(true);
    try {
      await api.post('/mensajes', { destinatario_id: disp.transportista_id, disponibilidad_id: disp.id, asunto, contenido: mensaje });
      onSent();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Error al enviar');
    } finally { setSending(false); }
  }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 16 }} onClick={onClose}>
      <div className="card" style={{ width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 16 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Enviar consulta</h3>
          <button onClick={onClose} style={{ color: '#999', cursor: 'pointer', background: 'none', border: 'none', display: 'flex' }}><X size={20} /></button>
        </div>
        <p style={{ fontSize: 13, color: '#666' }}>Para <strong>{disp.transportista_nombre}</strong></p>
        <div className="form-group"><label className="form-label">Asunto</label>
          <input type="text" value={asunto} onChange={e => { setAsunto(e.target.value); setError(''); }} className="form-input"/>
        </div>
        <div className="form-group"><label className="form-label">Mensaje *</label>
          <textarea rows={4} value={mensaje} onChange={e => { setMensaje(e.target.value); setError(''); }} placeholder="Contá lo que necesitás transportar…" className="form-textarea"/>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
          <button onClick={handleSend} disabled={sending} className="btn btn-primary" style={{ flex: 1 }}>{sending ? 'Enviando…' : 'Enviar consulta'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD TRANSPORTISTA ──────────────────────────────────────────────────

function TransportistaDashboard({ userName, patente }: { userName: string; patente?: string | null }) {
  const [aplicaciones, setAplicaciones] = useState<Aplicacion[]>([]);
  const [viajes,       setViajes]       = useState<Viaje[]>([]);
  const [misDisps,     setMisDisps]     = useState<MiDisponibilidad[]>([]);

  useEffect(() => {
    Promise.all([api.get('/mis-aplicaciones'), api.get('/viajes'), api.get('/mis-disponibilidades')])
      .then(([a, v, d]) => { setAplicaciones(a.data.aplicaciones); setViajes(v.data.viajes); setMisDisps(d.data.disponibilidades); })
      .catch(() => {});
  }, []);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const aceptadas   = aplicaciones.filter(a => a.estado === 'aceptada');
  const activas     = aceptadas.filter(a => new Date(a.fecha_salida) >= today);
  const completadas = aceptadas.filter(a => new Date(a.fecha_salida) < today);
  const mes = today.getMonth(); const año = today.getFullYear();
  const viajesMes = aceptadas.filter(a => { const d = new Date(a.fecha_salida); return d.getMonth() === mes && d.getFullYear() === año; });
  const totalInteresados = misDisps.reduce((s, d) => s + (d.interesados?.length ?? 0), 0);
  const activeTrip  = activas[0];

  const mesLabel = today.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
  const metrics = [
    { label: 'Viajes este mes', value: viajesMes.length,    sub: '+2 vs. mes anterior',    color: '#8BAF4E', icon: 'truck' },
    { label: 'En camino',       value: activas.length,      sub: 'Seguimiento activo',     color: '#E07A34', icon: 'map'   },
    { label: 'Completados',     value: completadas.length,  sub: mesLabel,                 color: '#1F2B1F', icon: 'check' },
    { label: 'Interesados',     value: totalInteresados,    sub: 'En mis disponibilidades',color: '#8BAF4E', icon: 'users' },
  ];

  const ini = initials(userName);

  return (
    <div className="app-panel" style={{ height: '100vh', overflow: 'hidden' }}>

      {/* Header */}
      <div className="dash-header" style={{ background: '#fff', padding: '14px 28px', borderBottom: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>Dashboard</div>
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>Bienvenido de vuelta, {userName.split(' ')[0]}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/disponibilidad" style={{ background: '#E07A34', color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon name="plus" size={13} color="#fff"/><span className="dash-btn-label"> Publicar disponibilidad</span>
          </Link>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1F2B1F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>{ini}</div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="dash-scroll" style={{ flex: 1, overflowY: 'auto', background: '#F2F2F0', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Metrics grid */}
        <div className="dash-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {metrics.map((m, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,.05)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: '#999', fontWeight: 500, letterSpacing: '.08em', textTransform: 'uppercase' }}>{m.label}</div>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: `${m.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={m.icon} size={14} color={m.color}/>
                </div>
              </div>
              <div style={{ fontSize: 34, fontWeight: 800, color: '#1F2B1F', lineHeight: 1, marginBottom: 6 }}>{m.value}</div>
              <div style={{ fontSize: 11, color: m.color, fontWeight: 500 }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* 2-column grid */}
        <div className="dash-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Active trip card */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,.05)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>Viaje activo</div>
              {activeTrip && <KitBadge status="active"/>}
            </div>

            {activeTrip ? (<>
              <RouteInline origin={activeTrip.origen.split(',')[0]} destination={activeTrip.destino.split(',')[0]}/>
              <div style={{ margin: '14px 0 6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa', marginBottom: 5 }}>
                  <span>Progreso</span>
                  <span style={{ fontWeight: 600, color: '#8BAF4E' }}>55%</span>
                </div>
                <div style={{ background: '#F0F0F0', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                  <div style={{ width: '55%', height: '100%', background: 'linear-gradient(90deg,#8BAF4E,#BDD18A)', borderRadius: 4 }}/>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                {patente && <Chip icon="truck" label={patente} color="#555"/>}
                <Chip label={`ETA ${fmtFecha(activeTrip.fecha_salida)}`} color="#E07A34" bg="rgba(224,122,52,.1)"/>
              </div>
              <Link href="/mis-viajes" style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', background: '#1F2B1F', color: '#fff', border: 'none', borderRadius: 9, padding: '9px', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
                <Icon name="map" size={13} color="#fff"/> Ver seguimiento
              </Link>
            </>) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', textAlign: 'center' }}>
                <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#F4F4F2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <Icon name="truck" size={26} color="#ccc"/>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#888', marginBottom: 5 }}>Sin viajes activos</div>
                <div style={{ fontSize: 11, color: '#bbb', marginBottom: 18, lineHeight: 1.5 }}>Buscá viajes disponibles para tomar</div>
                <Link href="/viajes" style={{ background: '#E07A34', color: '#fff', borderRadius: 8, padding: '9px 18px', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                  Ver viajes disponibles
                </Link>
              </div>
            )}
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Viajes disponibles mini */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>Viajes disponibles</div>
                <Link href="/viajes" style={{ color: '#E07A34', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>Ver todos →</Link>
              </div>
              {viajes.slice(0, 2).map(v => (
                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F5F5F5' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{v.origen.split(',')[0]} → {v.destino.split(',')[0]}</div>
                    <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                      <Chip label={fmtFecha(v.fecha_salida)} color="#aaa" bg="transparent"/>
                      <Chip icon="cow" label={v.tipo_hacienda} color="#666"/>
                    </div>
                  </div>
                  <Link href={`/viajes/${v.id}`} style={{ background: '#E07A34', color: '#fff', borderRadius: 7, padding: '6px 12px', fontSize: 11, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>Ver</Link>
                </div>
              ))}
              {viajes.length === 0 && <div style={{ textAlign: 'center', padding: '16px 0', color: '#ccc', fontSize: 12 }}>Sin viajes disponibles</div>}
            </div>

            {/* Mis disponibilidades mini (dark) */}
            <div style={{ background: '#1F2B1F', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Mis disponibilidades</div>
                <Link href="/mis-viajes" style={{ color: 'rgba(189,209,138,.8)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>Ver →</Link>
              </div>
              {misDisps.length === 0
                ? <div style={{ textAlign: 'center', padding: '16px 0', color: 'rgba(255,255,255,.3)', fontSize: 12 }}>Sin disponibilidades publicadas</div>
                : misDisps.map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{d.destino_direccion?.split(',')[0]}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>{fmtFecha(d.fecha)}</div>
                    </div>
                    {(d.interesados?.length ?? 0) > 0 && (
                      <span style={{ background: 'rgba(139,175,78,.2)', color: '#BDD18A', fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 5 }}>
                        {d.interesados.length} interesado{d.interesados.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD PRODUCTOR ──────────────────────────────────────────────────────

const ESTADO_VIAJE_STATUS: Record<string, string> = {
  disponible: 'available', con_ofertas: 'offers', completo: 'completed',
};
const TIPO_JAULA_CLS: Record<string, string> = {
  'Jaula simple': 'badge badge-success', 'Acoplado': 'badge badge-info', 'Semirremolque': 'badge badge-warning',
};
const APLIC: Record<string, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente', cls: 'badge badge-warning' },
  aceptada:  { label: 'Aceptada',  cls: 'badge badge-success' },
  rechazada: { label: 'Rechazada', cls: 'badge badge-error' },
};

function ProductorDashboard({ userId, userName }: { userId: number; userName: string }) {
  const [misViajes,        setMisViajes]        = useState<Viaje[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<MiDisponibilidad[]>([]);
  const [viajeExpandido,   setViajeExpandido]   = useState<number | null>(null);
  const [viajeDetalle,     setViajeDetalle]     = useState<Record<number, Aplicacion[]>>({});
  const [loadingDetalle,   setLoadingDetalle]   = useState<number | null>(null);
  const [gestionando,      setGestionando]      = useState<number | null>(null);
  const [perfilModal,      setPerfilModal]      = useState<number | null>(null);
  const [contactarModal,   setContactarModal]   = useState<MiDisponibilidad | null>(null);
  const [toast,            setToast]            = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadData = useCallback(async () => {
    const [v, d] = await Promise.all([api.get('/mis-viajes'), api.get('/disponibilidades')]);
    setMisViajes(v.data.viajes);
    setDisponibilidades(d.data.disponibilidades);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const ini = initials(userName);

  async function toggleViaje(id: number) {
    if (viajeExpandido === id) { setViajeExpandido(null); return; }
    setViajeExpandido(id);
    if (!viajeDetalle[id]) {
      setLoadingDetalle(id);
      try { const { data } = await api.get(`/viajes/${id}`); setViajeDetalle(prev => ({ ...prev, [id]: data.aplicaciones })); }
      finally { setLoadingDetalle(null); }
    }
  }

  async function handleGestionar(viajeId: number, aplId: number, estado: 'aceptada' | 'rechazada') {
    setGestionando(aplId);
    try {
      await api.put(`/viajes/${viajeId}/aplicaciones/${aplId}`, { estado });
      setToast({ message: estado === 'aceptada' ? 'Transportista aceptado' : 'Aplicación rechazada', type: 'success' });
      const [det, mv] = await Promise.all([api.get(`/viajes/${viajeId}`), api.get('/mis-viajes')]);
      setViajeDetalle(prev => ({ ...prev, [viajeId]: det.data.aplicaciones }));
      setMisViajes(mv.data.viajes);
    } catch { setToast({ message: 'Error al gestionar', type: 'error' }); }
    finally { setGestionando(null); }
  }

  return (
    <div className="app-panel" style={{ height: '100vh', overflow: 'hidden' }}>

      {/* Header */}
      <div className="dash-header" style={{ background: '#fff', padding: '14px 28px', borderBottom: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>Dashboard</div>
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>Bienvenido de vuelta, {userName.split(' ')[0]}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/publicar" style={{ background: '#E07A34', color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon name="plus" size={13} color="#fff"/><span className="dash-btn-label"> Publicar nuevo viaje</span>
          </Link>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1F2B1F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>{ini}</div>
        </div>
      </div>

      <div className="dash-scroll" style={{ flex: 1, overflowY: 'auto', background: '#F2F2F0', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Mis viajes publicados */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>Mis viajes publicados</h3>
            <span style={{ background: '#E07A34', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: '50%', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{misViajes.length}</span>
          </div>
          {misViajes.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 14, padding: '48px', textAlign: 'center' }}>
              <div style={{ marginBottom: 12, color: '#bbb', display: 'flex', justifyContent: 'center' }}><FileText size={36} /></div>
              <p style={{ fontWeight: 600, color: '#111', marginBottom: 4 }}>Todavía no publicaste viajes</p>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>Publicá tu primer viaje y empezá a recibir ofertas</p>
              <Link href="/publicar" style={{ background: '#E07A34', color: '#fff', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>+ Publicar primer viaje</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {misViajes.map(v => {
                const isOpen = viajeExpandido === v.id;
                const aplicaciones = viajeDetalle[v.id];
                const total = v.total_aplicaciones ?? 0;
                return (
                  <div key={v.id} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
                    <div style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <RouteInline origin={v.origen.split(',')[0]} destination={v.destino.split(',')[0]}/>
                        <KitBadge status={ESTADO_VIAJE_STATUS[v.estado] ?? 'available'}/>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                        <Chip label={fmtFecha(v.fecha_salida)} color="#555"/>
                        <Chip icon="cow" label={v.tipo_hacienda} color="#555"/>
                        <Chip label={`${v.cantidad_cabezas} cab.`} color="#555"/>
                        {v.peso_total_kg && <Chip label={`${Number(v.peso_total_kg).toLocaleString('es-AR')} kg`} color="#555"/>}
                      </div>
                      <button onClick={() => toggleViaje(v.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: isOpen ? '#1F2B1F' : total > 0 ? 'rgba(139,175,78,.12)' : '#F2F2F0', color: isOpen ? '#fff' : total > 0 ? '#4d6b1a' : '#888' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users size={13} /> {total > 0 ? `${total} transportista${total === 1 ? '' : 's'} interesado${total === 1 ? '' : 's'}` : 'Sin transportistas todavía'}</span>
                        <span style={{ fontSize: 11 }}>{isOpen ? '▲' : '▼'}</span>
                      </button>
                    </div>
                    {isOpen && (
                      <div style={{ borderTop: '1px solid #F0F0F0', background: '#F8F8F6', padding: 16 }}>
                        {loadingDetalle === v.id ? (
                          <div style={{ textAlign: 'center', padding: '24px 0', color: '#ccc' }}>Cargando…</div>
                        ) : !aplicaciones?.length ? (
                          <p style={{ fontSize: 13, color: '#aaa', textAlign: 'center', padding: '16px 0' }}>Ningún transportista aplicó todavía</p>
                        ) : aplicaciones.map(a => {
                          const aplic = APLIC[a.estado];
                          return (
                            <div key={a.id} style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(139,175,78,.15)', color: '#4d6b1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                                    {a.transportista_nombre?.[0] ?? '?'}
                                  </div>
                                  <div>
                                    <p style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>{a.transportista_nombre}</p>
                                    {(a.cantidad_reseñas ?? 0) > 0
                                      ? <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                          <StarRating value={Number(a.puntuacion_promedio ?? 0)} size="sm"/>
                                          <span style={{ fontSize: 12 }}>{Number(a.puntuacion_promedio ?? 0).toFixed(1)} ({a.cantidad_reseñas})</span>
                                        </div>
                                      : <p style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>Sin reseñas</p>
                                    }
                                  </div>
                                </div>
                                <span className={aplic.cls}>{aplic.label}</span>
                              </div>
                              {a.mensaje && <p style={{ fontSize: 12, color: '#888', fontStyle: 'italic', background: '#F9F9F8', borderRadius: 8, padding: '8px 12px', marginBottom: 10, borderLeft: '2px solid #8BAF4E' }}>"{a.mensaje}"</p>}
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => setPerfilModal(a.transportista_id!)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>Ver perfil</button>
                                {a.estado === 'pendiente' && <>
                                  <button onClick={() => handleGestionar(v.id, a.id, 'aceptada')} disabled={gestionando === a.id} className="btn btn-sm" style={{ flex: 1, background: '#8BAF4E', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Check size={13} /> Aceptar</button>
                                  <button onClick={() => handleGestionar(v.id, a.id, 'rechazada')} disabled={gestionando === a.id} className="btn btn-sm" style={{ flex: 1, background: '#E24B4A', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><X size={13} /> Rechazar</button>
                                </>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Camiones disponibles */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>Camiones disponibles</h3>
            <span style={{ background: '#E07A34', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: '50%', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{disponibilidades.length}</span>
          </div>
          {disponibilidades.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 14, padding: '48px', textAlign: 'center' }}>
              <div style={{ marginBottom: 8, color: '#bbb', display: 'flex', justifyContent: 'center' }}><Truck size={36} /></div>
              <p style={{ fontSize: 13, color: '#aaa' }}>No hay camiones disponibles en este momento</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {disponibilidades.map(d => (
                <div key={d.id} style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', boxShadow: '0 2px 12px rgba(0,0,0,.05)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(139,175,78,.15)', color: '#4d6b1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                      {d.transportista_nombre[0]}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.transportista_nombre}</p>
                      {d.transportista_zona && <p style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {d.transportista_zona}</p>}
                    </div>
                    {(d.cantidad_reseñas ?? 0) > 0 && (
                      <div style={{ marginLeft: 'auto', flexShrink: 0, textAlign: 'right' }}>
                        <StarRating value={Number(d.puntuacion_promedio ?? 0)} size="sm"/>
                        <span style={{ fontSize: 11, color: '#aaa' }}>{Number(d.puntuacion_promedio ?? 0).toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {d.tipo_remolque && d.tipo_remolque.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                      <span key={t} className={TIPO_JAULA_CLS[t] ?? 'badge badge-neutral'} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Truck size={11} /> {t}</span>
                    ))}
                    {d.capacidad_kg && <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Scale size={11} /> {Number(d.capacidad_kg).toLocaleString('es-AR')} kg</span>}
                  </div>
                  <RouteInline origin={d.origen_direccion?.split(',')[0] ?? ''} destination={d.destino_direccion?.split(',')[0] ?? ''}/>
                  <Chip icon="calendar" label={fmtFecha(d.fecha)} color="#555"/>
                  {d.transportista_id !== userId && (
                    <button onClick={() => setContactarModal(d)} style={{ width: '100%', background: '#E07A34', color: '#fff', border: 'none', borderRadius: 8, padding: '9px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Enviar consulta
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {perfilModal && <TransportistaPerfilModal transportistaId={perfilModal} onClose={() => setPerfilModal(null)} canReview/>}
      {contactarModal && <ContactarModal disp={contactarModal} onClose={() => setContactarModal(null)} onSent={() => { setContactarModal(null); setToast({ message: 'Consulta enviada', type: 'success' }); }}/>}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)}/>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    if (user.rol === 'transportista' && !user.patente) router.push('/completar-perfil');
  }, [loading, user, router]);

  if (loading || !user) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F2F2F0' }}>
      <div style={{ width: 32, height: 32, border: '4px solid #8BAF4E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}/>
    </div>
  );

  return (
    <div className="app-layout">
      <style>{`
        @media (max-width: 768px) {
          .dash-header { padding: 10px 12px !important; }
          .dash-btn-label { display: none; }
          .dash-metrics-grid { grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
          .dash-2col { grid-template-columns: 1fr !important; }
          .dash-scroll { padding: 12px !important; gap: 12px !important; }
        }
        @media (max-width: 480px) {
          .dash-metrics-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
      <AppSidebar/>
      {user.rol === 'transportista'
        ? <TransportistaDashboard userName={user.nombre ?? user.name ?? ''} patente={user.patente}/>
        : <ProductorDashboard userId={user.id} userName={user.nombre ?? user.name ?? ''}/>
      }
    </div>
  );
}
