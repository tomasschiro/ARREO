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
    filter:   <><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    cow:      <><ellipse cx="12" cy="13" rx="6" ry="5"/><path d="M7 10c-.8-1.4-.8-3 0-4"/><path d="M17 10c.8-1.4.8-3 0-4"/><circle cx="10" cy="12" r="1"/><circle cx="14" cy="12" r="1"/></>,
    truck:    <><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,
    weight:   <><path d="M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/><path d="M5 8h14l-1 13H6L5 8z"/></>,
    pin:      <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
    edit:     <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    users:    <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    chevron:  <><polyline points="9 18 15 12 9 6"/></>,
    x:        <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  };
  return <svg viewBox="0 0 24 24" style={s}>{p[name]}</svg>;
}

function KitBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; dot: string; glow: boolean; label: string }> = {
    available: { bg: 'rgba(139,175,78,.15)', color: '#5a7a2a', dot: '#8BAF4E', glow: false, label: 'Disponible' },
    offers:    { bg: 'rgba(224,122,52,.15)', color: '#b85e1e', dot: '#E07A34', glow: false, label: 'Con ofertas' },
    completed: { bg: 'rgba(0,0,0,.06)',      color: '#555',    dot: '#aaa',    glow: false, label: 'Completado' },
    active:    { bg: 'rgba(139,175,78,.15)', color: '#5a7a2a', dot: '#8BAF4E', glow: true,  label: 'Disponible' },
  };
  const c = cfg[status] ?? cfg.available;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: c.bg, color: c.color, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0, boxShadow: c.glow ? `0 0 5px ${c.dot}` : 'none', display: 'inline-block' }}/>
      {c.label}
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
      {type === 'success' ? '✓' : '✕'} {message}
      <button onClick={onClose} style={{ marginLeft: 8, opacity: .7, cursor: 'pointer', background: 'none', border: 'none', color: 'inherit' }}>✕</button>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Viaje {
  id: number; origen: string; destino: string; fecha_salida: string;
  tipo_hacienda: string; cantidad_cabezas: number; peso_total_kg?: number;
  tipo_jaula?: string; condicion_camino?: string; estado: string; publicado_por: string; zona_publicante?: string;
}

interface MiDisponibilidad {
  id: number; transportista_id: number; origen_direccion: string; destino_direccion: string;
  fecha: string; tipo_jaula: string; estado: string;
  interesados: { id: number; leido: boolean; remitente_nombre: string; remitente_email: string; asunto: string; contenido: string; created_at: string }[];
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ─── EditModal ────────────────────────────────────────────────────────────────

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

// ─── OfferCard (Mis disponibilidades) ────────────────────────────────────────

function OfferCard({ disp, onEdit, expanded, onToggle }: {
  disp: MiDisponibilidad; onEdit: (d: MiDisponibilidad) => void;
  expanded: boolean; onToggle: () => void;
}) {
  const interested = disp.interesados?.length ?? 0;
  const nuevos = disp.interesados?.filter(i => !i.leido).length ?? 0;
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
          <Chip icon="truck" label={disp.tipo_jaula} color="#555"/>
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
      {expanded && disp.interesados?.length > 0 && (
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

// ─── TripSearchCard ───────────────────────────────────────────────────────────

function TripSearchCard({ viaje }: { viaje: Viaje }) {
  const statusMap: Record<string, string> = { disponible: 'available', con_ofertas: 'offers', completo: 'completed' };
  const ini = viaje.publicado_por.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', boxShadow: '0 2px 12px rgba(0,0,0,.05)', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <RouteInline origin={viaje.origen.split(',')[0]} destination={viaje.destino.split(',')[0]}/>
        <KitBadge status={statusMap[viaje.estado] ?? 'available'}/>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <Chip icon="calendar" label={fmtFecha(viaje.fecha_salida)} color="#555"/>
        <Chip icon="cow"      label={viaje.tipo_hacienda}          color="#555"/>
        <Chip                 label={`${viaje.cantidad_cabezas} cab.`} color="#555"/>
        {viaje.peso_total_kg    && <Chip icon="weight" label={`${Number(viaje.peso_total_kg).toLocaleString('es-AR')} kg`} color="#555"/>}
        {viaje.tipo_jaula       && <Chip icon="truck"  label={viaje.tipo_jaula} color="#8BAF4E" bg="rgba(139,175,78,.1)"/>}
        {viaje.condicion_camino && <Chip label={`${viaje.condicion_camino === 'Seco' ? '☀️' : viaje.condicion_camino === 'Lluvia reciente' ? '🌧️' : viaje.condicion_camino === 'Lluvia intensa' ? '⛈️' : '❄️'} ${viaje.condicion_camino}`} color="#666"/>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1F2B1F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{ini}</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#333' }}>{viaje.publicado_por}</div>
            {viaje.zona_publicante && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#999' }}>
                <Icon name="pin" size={10} color="#999"/>
                {viaje.zona_publicante}
              </div>
            )}
          </div>
        </div>
        <Link href={`/viajes/${viaje.id}`} style={{ background: '#E07A34', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
          Ver detalle <Icon name="chevron" size={12} color="#fff"/>
        </Link>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TIPOS = ['all', 'Novillos', 'Vacas', 'Terneros', 'Toros', 'Vaquillonas'];

export default function ViajesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [viajes,     setViajes]     = useState<Viaje[]>([]);
  const [misDisps,   setMisDisps]   = useState<MiDisponibilidad[]>([]);
  const [filterType, setFilterType] = useState('all');
  const [filterZona, setFilterZona] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [editando,   setEditando]   = useState<MiDisponibilidad | null>(null);
  const [expandido,  setExpandido]  = useState<number | null>(null);
  const [toast,      setToast]      = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const reqs: Promise<unknown>[] = [api.get('/viajes')];
    if (user.rol === 'transportista') reqs.push(api.get('/mis-disponibilidades'));
    Promise.all(reqs).then(([v, d]) => {
      setViajes((v as { data: { viajes: Viaje[] } }).data.viajes);
      if (d) setMisDisps((d as { data: { disponibilidades: MiDisponibilidad[] } }).data.disponibilidades);
    }).catch(() => {});
  }, [user]);

  const filtered = viajes.filter(v => {
    if (filterType !== 'all' && v.tipo_hacienda !== filterType) return false;
    if (filterZona && !v.zona_publicante?.toLowerCase().includes(filterZona.toLowerCase()) && !v.origen?.toLowerCase().includes(filterZona.toLowerCase())) return false;
    if (filterDate && v.fecha_salida.split('T')[0] !== filterDate) return false;
    return true;
  });

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

  const ini = (user.nombre ?? '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="app-layout">
      <AppSidebar/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', marginLeft: 'var(--sidebar-width)' }}>

        {/* Header */}
        <div style={{ background: '#fff', padding: '14px 28px', borderBottom: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>Viajes disponibles</div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>Viajes disponibles y tus ofertas publicadas</div>
          </div>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1F2B1F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>{ini}</div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#F2F2F0', padding: '20px 28px' }}>

          {/* Filter bar */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,.04)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TIPOS.map(t => (
                <button key={t} onClick={() => setFilterType(t)} style={{ fontFamily: 'inherit', padding: '5px 11px', borderRadius: 6, border: '1.5px solid', cursor: 'pointer', fontSize: 11, fontWeight: 600, borderColor: filterType === t ? '#1F2B1F' : '#E0E0E0', background: filterType === t ? '#1F2B1F' : 'transparent', color: filterType === t ? '#fff' : '#666', transition: 'all .15s' }}>
                  {t === 'all' ? 'Todos los tipos' : t}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #E0E0E0', borderRadius: 7, padding: '5px 11px', flex: 1, minWidth: 160 }}>
              <Icon name="filter" size={12} color="#E07A34"/>
              <input value={filterZona} onChange={e => setFilterZona(e.target.value)} placeholder="Filtrar por zona..." style={{ border: 'none', outline: 'none', fontSize: 12, color: '#555', background: 'transparent', width: '100%', fontFamily: 'inherit' }}/>
            </div>
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ border: '1.5px solid #E0E0E0', borderRadius: 7, padding: '5px 10px', fontSize: 12, color: '#555', outline: 'none', fontFamily: 'inherit' }}/>
            {(filterType !== 'all' || filterZona || filterDate) && (
              <button onClick={() => { setFilterType('all'); setFilterZona(''); setFilterDate(''); }} style={{ fontSize: 11, color: '#999', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap' }}>Limpiar</button>
            )}
          </div>

          {/* Available trips */}
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            Viajes disponibles
            <span style={{ background: '#E07A34', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: '50%', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{filtered.length}</span>
          </div>

          {filtered.map(v => <TripSearchCard key={v.id} viaje={v}/>)}

          {filtered.length === 0 && (
            <div style={{ background: '#fff', borderRadius: 14, padding: '48px', textAlign: 'center', color: '#ccc', marginBottom: 10, boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🗺️</div>
              <div style={{ fontSize: 13 }}>No hay viajes disponibles{filterType !== 'all' || filterZona || filterDate ? ' con esos filtros' : ''}</div>
            </div>
          )}

          {/* My offers (transportistas only) */}
          {user.rol === 'transportista' && (<>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 10, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              Mis ofertas publicadas <Icon name="chevron" size={14} color="#888"/>
            </div>
            {misDisps.map(d => (
              <OfferCard key={d.id} disp={d} onEdit={setEditando} expanded={expandido === d.id} onToggle={() => setExpandido(expandido === d.id ? null : d.id)}/>
            ))}
            {misDisps.length === 0 && (
              <div style={{ background: '#fff', borderRadius: 14, padding: '32px', textAlign: 'center', color: '#ccc', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🚛</div>
                <div style={{ fontSize: 13 }}>No publicaste disponibilidades todavía</div>
              </div>
            )}
          </>)}

          {/* bottom padding for FAB */}
          <div style={{ height: 80 }}/>
        </div>

        {/* FAB */}
        <Link href="/disponibilidad" style={{ position: 'fixed', bottom: 28, right: 28, background: '#E07A34', color: '#fff', borderRadius: 50, padding: '13px 22px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 6px 24px rgba(224,122,52,.5)', zIndex: 10, textDecoration: 'none' }}>
          <Icon name="plus" size={16} color="#fff"/>
          Publicar disponibilidad
        </Link>

        {editando && <EditDisponibilidadModal disp={editando} onClose={() => setEditando(null)} onSave={handleSaveEdit}/>}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)}/>}
      </div>
    </div>
  );
}
