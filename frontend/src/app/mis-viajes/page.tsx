'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppSidebar from '@/components/AppSidebar';
import api from '@/lib/api';

// ─── Shared UI Kit primitives ─────────────────────────────────────────────────

function Icon({ name, size = 15, color = 'currentColor' }: { name: string; size?: number; color?: string }) {
  const s = { width: size, height: size, stroke: color, fill: 'none', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const p: Record<string, React.ReactNode> = {
    plus:     <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    truck:    <><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,
    map:      <><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    cow:      <><ellipse cx="12" cy="13" rx="6" ry="5"/><path d="M7 10c-.8-1.4-.8-3 0-4"/><path d="M17 10c.8-1.4.8-3 0-4"/><circle cx="10" cy="12" r="1"/><circle cx="14" cy="12" r="1"/></>,
    weight:   <><path d="M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/><path d="M5 8h14l-1 13H6L5 8z"/></>,
    edit:     <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    users:    <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    x:        <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  };
  return <svg viewBox="0 0 24 24" style={s}>{p[name]}</svg>;
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
      {type === 'success' ? '✓' : '✕'} {message}
      <button onClick={onClose} style={{ marginLeft: 8, opacity: .7, cursor: 'pointer', background: 'none', border: 'none', color: 'inherit' }}>✕</button>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Aplicacion {
  id: number;
  estado: 'pendiente' | 'aceptada' | 'rechazada';
  viaje_id: number;
  origen: string; destino: string; fecha_salida: string;
  tipo_hacienda: string; cantidad_cabezas: number;
  peso_total_kg?: number; tipo_jaula?: string;
  estado_viaje: string; publicado_por: string;
  created_at: string;
  dte_numero?: string;
  guia_provincial_numero?: string;
  documentacion_cargada?: boolean;
}

interface MiDisponibilidad {
  id: number;
  origen_direccion: string; destino_direccion: string;
  fecha: string; tipo_jaula: string; estado: string;
  interesados: {
    id: number; leido: boolean;
    remitente_nombre: string; remitente_email: string;
    asunto: string; contenido: string; created_at: string;
  }[];
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ─── EditDisponibilidadModal ──────────────────────────────────────────────────

function EditDisponibilidadModal({ disp, onClose, onSave }: {
  disp: MiDisponibilidad; onClose: () => void;
  onSave: (id: number, fecha: string, tipo_jaula: string) => Promise<void>;
}) {
  const hoy = new Date().toISOString().split('T')[0];
  const [fecha, setFecha]         = useState(disp.fecha.split('T')[0]);
  const [tipoJaula, setTipoJaula] = useState(disp.tipo_jaula);
  const [saving, setSaving]       = useState(false);
  async function handleSave() { setSaving(true); await onSave(disp.id, fecha, tipoJaula); setSaving(false); }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Editar disponibilidad</h3>
          <button onClick={onClose} style={{ fontSize: 20, color: '#999', cursor: 'pointer', background: 'none', border: 'none' }}>✕</button>
        </div>
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

// ─── TripCard (Mis viajes activo / completado) ────────────────────────────────

function TripCard({ aplic, patente, onDetail }: {
  aplic: Aplicacion; patente?: string | null;
  onDetail: (a: Aplicacion) => void;
}) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isActive = new Date(aplic.fecha_salida) >= today;
  const progress = isActive ? 55 : 100;

  const sc = isActive
    ? { bg: 'rgba(139,175,78,.15)', color: '#5a7a2a', dot: '#8BAF4E', glow: true,  label: 'En camino' }
    : { bg: 'rgba(0,0,0,.06)',      color: '#555',    dot: '#aaa',    glow: false, label: 'Completado' };

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 2px 14px rgba(0,0,0,.06)', marginBottom: 12 }}>
      {/* Route + badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <RouteInline origin={aplic.origen.split(',')[0]} destination={aplic.destino.split(',')[0]}/>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot, flexShrink: 0, boxShadow: sc.glow ? `0 0 5px ${sc.dot}` : 'none', display: 'inline-block' }}/>
          {sc.label}
        </span>
      </div>

      {/* Progress bar (active only) */}
      {isActive && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa', marginBottom: 5 }}>
            <span>Progreso del viaje</span>
            <span style={{ fontWeight: 600, color: '#8BAF4E' }}>{progress}%</span>
          </div>
          <div style={{ background: '#F0F0F0', borderRadius: 4, height: 5, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg,#8BAF4E,#BDD18A)', borderRadius: 4 }}/>
          </div>
        </div>
      )}

      {/* Chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        <Chip icon="calendar" label={fmtFecha(aplic.fecha_salida)} color="#555"/>
        <Chip icon="cow"      label={aplic.tipo_hacienda}          color="#555"/>
        <Chip                 label={`${aplic.cantidad_cabezas} cab.`} color="#555"/>
        {aplic.peso_total_kg  && <Chip icon="weight" label={`${Number(aplic.peso_total_kg).toLocaleString('es-AR')} kg`} color="#555"/>}
        {aplic.tipo_jaula     && <Chip icon="truck"  label={aplic.tipo_jaula} color="#8BAF4E" bg="rgba(139,175,78,.1)"/>}
      </div>

      {/* Info grid */}
      <div className="mv-infogrid" style={{ background: '#F8F8F6', borderRadius: 10, padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, color: '#aaa', marginBottom: 2 }}>PRODUCTOR</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{aplic.publicado_por}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#aaa', marginBottom: 2 }}>PATENTE</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#111', letterSpacing: '.05em' }}>{patente ?? '—'}</div>
        </div>
        {isActive ? (
          <div>
            <div style={{ fontSize: 10, color: '#aaa', marginBottom: 2 }}>ETA</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1F2B1F' }}>{fmtFecha(aplic.fecha_salida)}</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 10, color: '#aaa', marginBottom: 2 }}>FECHA</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{fmtFecha(aplic.fecha_salida)}</div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        {isActive && (
          <button style={{ flex: 2, background: '#1F2B1F', color: '#fff', border: 'none', borderRadius: 9, padding: '9px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon name="map" size={13} color="#fff"/> Ver seguimiento
          </button>
        )}
        <button onClick={() => onDetail(aplic)} style={{ flex: 1, background: 'transparent', border: '1.5px solid #E0E0E0', color: '#666', borderRadius: 9, padding: '9px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Ver detalle
        </button>
        {isActive && (
          <button style={{ flex: 1, background: 'transparent', border: '1.5px solid rgba(200,60,60,.3)', color: '#C83C3C', borderRadius: 9, padding: '9px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Reportar
          </button>
        )}
      </div>
    </div>
  );
}

// ─── OfferCard (Mis disponibilidades) ────────────────────────────────────────

function OfferCard({ disp, onEdit, expanded, onToggle }: {
  disp: MiDisponibilidad; onEdit: (d: MiDisponibilidad) => void;
  expanded: boolean; onToggle: () => void;
}) {
  const interested = disp.interesados?.length ?? 0;
  const nuevos     = disp.interesados?.filter(i => !i.leido).length ?? 0;
  return (
    <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,.05)', marginBottom: 10, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <RouteInline origin={disp.origen_direccion?.split(',')[0] ?? ''} destination={disp.destino_direccion?.split(',')[0] ?? ''}/>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(139,175,78,.15)', color: '#5a7a2a', fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8BAF4E', display: 'inline-block' }}/>
            Disponible
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <Chip icon="calendar" label={fmtFecha(disp.fecha)} color="#555"/>
          <Chip icon="truck"    label={disp.tipo_jaula}      color="#555"/>
        </div>
        {interested > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 12, fontSize: 12, color: '#555', fontWeight: 500 }}>
            <Icon name="users" size={13} color="#555"/>
            {interested} productor{interested > 1 ? 'es' : ''} interesado{interested > 1 ? 's' : ''}
            {nuevos > 0 && <span style={{ background: '#E24B4A', color: '#fff', borderRadius: 9999, fontSize: 10, fontWeight: 700, padding: '1px 5px', marginLeft: 4 }}>{nuevos} nuevo{nuevos > 1 ? 's' : ''}</span>}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onEdit(disp)} style={{ flex: 1, background: 'transparent', border: '1.5px solid #E0E0E0', color: '#555', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <Icon name="edit" size={13} color="#555"/> Editar
          </button>
          <button onClick={onToggle} style={{ flex: 2, background: '#8BAF4E', border: 'none', color: '#fff', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <Icon name="users" size={13} color="#fff"/> Interesados ({interested})
          </button>
        </div>
      </div>
      {expanded && interested > 0 && (
        <div style={{ borderTop: '1px solid #F0F0F0', background: '#F8F8F6', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {disp.interesados.map(i => (
            <div key={i.id} style={{ background: '#fff', borderRadius: 10, padding: 14, border: !i.leido ? '1px solid rgba(139,175,78,.35)' : '1px solid #F0F0F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#111' }}>{i.remitente_nombre}</span>
                    {!i.leido && <span style={{ background: '#8BAF4E', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4 }}>Nuevo</span>}
                  </div>
                  <a href={`mailto:${i.remitente_email}`} style={{ fontSize: 12, color: '#8BAF4E' }}>{i.remitente_email}</a>
                </div>
                <span style={{ fontSize: 11, color: '#aaa' }}>{new Date(i.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</span>
              </div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 3 }}>{i.asunto}</p>
              <p style={{ fontSize: 13, color: '#444' }}>{i.contenido}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Detail modal ─────────────────────────────────────────────────────────────

function DetailModal({ aplic, onClose }: { aplic: Aplicacion; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 440, boxShadow: '0 16px 64px rgba(0,0,0,.2)' }}>
        <div style={{ background: '#1F2B1F', padding: '18px 24px', borderRadius: '18px 18px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Detalle del viaje</div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={14} color="#fff"/>
          </button>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <RouteInline origin={aplic.origen.split(',')[0]} destination={aplic.destino.split(',')[0]}/>
          <div style={{ height: 1, background: '#F0F0F0', margin: '16px 0' }}/>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              ['Fecha',     fmtFecha(aplic.fecha_salida)],
              ['Tipo',      aplic.tipo_hacienda],
              ['Cantidad',  `${aplic.cantidad_cabezas} cabezas`],
              ['Peso',      aplic.peso_total_kg ? `${Number(aplic.peso_total_kg).toLocaleString('es-AR')} kg` : '—'],
              ['Vehículo',  aplic.tipo_jaula ?? '—'],
              ['Productor', aplic.publicado_por],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 10, color: '#aaa', fontWeight: 500, marginBottom: 2 }}>{k.toUpperCase()}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{v}</div>
              </div>
            ))}
          </div>
          {/* Documentación de ruta */}
          {aplic.estado === 'aceptada' && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ height: 1, background: '#F0F0F0', marginBottom: 16 }}/>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>Documentación de ruta</div>
              {aplic.documentacion_cargada ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: '#F6F8F5', borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ fontSize: 10, color: '#aaa', marginBottom: 4, fontWeight: 600 }}>NÚMERO DTE</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#1F2B1F', letterSpacing: '.02em' }}>{aplic.dte_numero}</div>
                  </div>
                  <div style={{ background: '#F6F8F5', borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ fontSize: 10, color: '#aaa', marginBottom: 4, fontWeight: 600 }}>GUÍA PROVINCIAL</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#1F2B1F', letterSpacing: '.02em' }}>{aplic.guia_provincial_numero}</div>
                  </div>
                </div>
              ) : (
                <div style={{ background: 'rgba(224,122,52,.07)', border: '1px solid rgba(224,122,52,.2)', borderRadius: 10, padding: '12px 16px' }}>
                  <p style={{ fontSize: 13, color: '#9a5225', fontWeight: 600 }}>⏳ El productor aún no cargó la documentación</p>
                  <p style={{ fontSize: 12, color: '#9a5225', marginTop: 2 }}>El DTE y la Guía Provincial aparecerán aquí una vez que el productor los ingrese.</p>
                </div>
              )}
            </div>
          )}
          <button onClick={onClose} style={{ width: '100%', background: '#1F2B1F', border: 'none', color: '#fff', borderRadius: 8, padding: '11px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MisViajesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [aplicaciones, setAplicaciones] = useState<Aplicacion[]>([]);
  const [misDisps,     setMisDisps]     = useState<MiDisponibilidad[]>([]);
  const [mainTab,      setMainTab]      = useState<'viajes' | 'disponibilidades'>('viajes');
  const [tripFilter,   setTripFilter]   = useState<'activos' | 'completados'>('activos');
  const [editando,     setEditando]     = useState<MiDisponibilidad | null>(null);
  const [expandido,    setExpandido]    = useState<number | null>(null);
  const [detail,       setDetail]       = useState<Aplicacion | null>(null);
  const [toast,        setToast]        = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [user, loading, router]);
  useEffect(() => {
    if (!loading && user && user.rol !== 'transportista') router.replace('/dashboard');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || user.rol !== 'transportista') return;
    Promise.all([api.get('/mis-aplicaciones'), api.get('/mis-disponibilidades')])
      .then(([a, d]) => { setAplicaciones(a.data.aplicaciones); setMisDisps(d.data.disponibilidades); })
      .catch(() => {});
  }, [user]);

  async function handleSaveEdit(id: number, fecha: string, tipo_jaula: string) {
    try {
      await api.put(`/disponibilidades/${id}`, { fecha, tipo_jaula });
      setToast({ message: 'Disponibilidad actualizada', type: 'success' });
      setEditando(null);
      const { data } = await api.get('/mis-disponibilidades');
      setMisDisps(data.disponibilidades);
    } catch { setToast({ message: 'Error al guardar', type: 'error' }); }
  }

  if (loading || !user) return null;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const aceptadas   = aplicaciones.filter(a => a.estado === 'aceptada');
  const activas     = aceptadas.filter(a => new Date(a.fecha_salida) >= today);
  const completadas = aceptadas.filter(a => new Date(a.fecha_salida) < today);
  const current     = tripFilter === 'activos' ? activas : completadas;

  const ini = (user.nombre ?? '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const TAB_BTN = (id: 'viajes' | 'disponibilidades', label: string) => (
    <button key={id} onClick={() => setMainTab(id)} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '11px 20px', border: 'none', background: 'transparent', color: mainTab === id ? '#111' : '#aaa', borderBottom: mainTab === id ? '2.5px solid #1F2B1F' : '2.5px solid transparent', marginBottom: -1, transition: 'all .15s' }}>
      {label}
    </button>
  );

  const SUB_BTN = (id: 'activos' | 'completados', label: string) => (
    <button key={id} onClick={() => setTripFilter(id)} style={{ fontFamily: 'inherit', padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: tripFilter === id ? '#1F2B1F' : '#fff', color: tripFilter === id ? '#fff' : '#666', boxShadow: tripFilter === id ? 'none' : '0 1px 4px rgba(0,0,0,.06)' }}>
      {label}
    </button>
  );

  return (
    <div className="app-layout">
      <style>{`
        @media (max-width: 768px) {
          .mv-header { padding: 10px 12px !important; }
          .mv-btn-label { display: none; }
          .mv-tabs { padding: 0 12px !important; }
          .mv-subtabs { padding: 10px 12px 0 !important; }
          .mv-content { padding: 12px !important; }
          .mv-infogrid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
      <AppSidebar/>
      <div className="app-panel" style={{ height: '100vh', overflow: 'hidden' }}>

        {/* Header */}
        <div className="mv-header" style={{ background: '#fff', padding: '14px 28px', borderBottom: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>Mis viajes</div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>Tus viajes y disponibilidades publicadas</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/disponibilidad" style={{ background: '#E07A34', color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon name="plus" size={13} color="#fff"/><span className="mv-btn-label"> Publicar disponibilidad</span>
            </Link>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1F2B1F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>{ini}</div>
          </div>
        </div>

        {/* Main tabs */}
        <div className="mv-tabs" style={{ background: '#fff', borderBottom: '1px solid #F0F0F0', padding: '0 28px', display: 'flex', gap: 0, flexShrink: 0 }}>
          {TAB_BTN('viajes', 'Mis viajes')}
          {TAB_BTN('disponibilidades', 'Mis disponibilidades')}
        </div>

        {/* ── TAB: Mis viajes ── */}
        {mainTab === 'viajes' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Sub-tabs */}
            <div className="mv-subtabs" style={{ background: '#F2F2F0', padding: '12px 28px 0', display: 'flex', gap: 6, flexShrink: 0 }}>
              {SUB_BTN('activos',    'Activos')}
              {SUB_BTN('completados','Completados')}
            </div>

            {/* Trip list */}
            <div className="mv-content" style={{ flex: 1, overflowY: 'auto', background: '#F2F2F0', padding: '16px 28px', display: 'flex', flexDirection: 'column' }}>
              {current.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, textAlign: 'center' }}>
                  <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#EAEAE8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                    <Icon name="truck" size={26} color="#ccc"/>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#888', marginBottom: 5 }}>No tenés viajes {tripFilter}</div>
                  <div style={{ fontSize: 11, color: '#bbb', marginBottom: 18 }}>Explorá viajes disponibles para tomar</div>
                  <Link href="/viajes" style={{ display: 'inline-block', background: '#E07A34', color: '#fff', borderRadius: 8, padding: '9px 20px', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                    Buscar viajes
                  </Link>
                </div>
              ) : (
                current.map(a => (
                  <TripCard key={a.id} aplic={a} patente={user.patente} onDetail={setDetail}/>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── TAB: Mis disponibilidades ── */}
        {mainTab === 'disponibilidades' && (
          <div className="mv-content" style={{ flex: 1, overflowY: 'auto', background: '#F2F2F0', padding: '20px 28px' }}>
            {misDisps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#ccc' }}>
                <Icon name="truck" size={36} color="#ddd"/>
                <div style={{ marginTop: 12, fontSize: 13 }}>No tenés disponibilidades publicadas</div>
                <Link href="/disponibilidad" style={{ display: 'inline-block', marginTop: 14, background: '#E07A34', color: '#fff', borderRadius: 8, padding: '9px 20px', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                  Publicar disponibilidad
                </Link>
              </div>
            ) : (
              misDisps.map(d => (
                <OfferCard key={d.id} disp={d} onEdit={setEditando} expanded={expandido === d.id} onToggle={() => setExpandido(expandido === d.id ? null : d.id)}/>
              ))
            )}
          </div>
        )}

        {/* Modals */}
        {editando && <EditDisponibilidadModal disp={editando} onClose={() => setEditando(null)} onSave={handleSaveEdit}/>}
        {detail    && <DetailModal aplic={detail} onClose={() => setDetail(null)}/>}
        {toast     && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)}/>}
      </div>
    </div>
  );
}
