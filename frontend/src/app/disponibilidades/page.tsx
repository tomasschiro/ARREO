'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppSidebar from '@/components/AppSidebar';
import StarRating from '@/components/StarRating';
import api from '@/lib/api';
import { Check, X, MapPin, Truck } from 'lucide-react';

function Icon({ name, size = 15, color = 'currentColor' }: { name: string; size?: number; color?: string }) {
  const s = { width: size, height: size, stroke: color, fill: 'none', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const p: Record<string, React.ReactNode> = {
    truck:    <><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,
    search:   <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    map:      <><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    weight:   <><path d="M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/><path d="M5 8h14l-1 13H6L5 8z"/></>,
    x:        <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  };
  return <svg viewBox="0 0 24 24" style={s}>{p[name]}</svg>;
}

function RouteInline({ origin, destination }: { origin: string; destination: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8BAF4E', flexShrink: 0, boxShadow: '0 0 4px rgba(139,175,78,.5)' }}/>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{origin}</span>
      </div>
      <div style={{ width: 1, height: 9, background: 'rgba(139,175,78,.3)', marginLeft: 3.5 }}/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E07A34', flexShrink: 0 }}/>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{destination}</span>
      </div>
    </div>
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

interface Disponibilidad {
  id: number;
  transportista_id: number;
  transportista_nombre: string;
  transportista_zona?: string;
  tipo_remolque?: string;
  capacidad_kg?: number;
  puntuacion_promedio?: number;
  cantidad_reseñas?: number;
  origen_direccion: string;
  destino_direccion: string;
  fecha: string;
  tipo_jaula: string;
  estado: string;
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function ContactarModal({ disp, onClose, onSent }: { disp: Disponibilidad; onClose: () => void; onSent: () => void }) {
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 16 }} onClick={onClose}>
      <div className="card" style={{ width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 16 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Enviar consulta</h3>
          <button onClick={onClose} style={{ color: '#999', cursor: 'pointer', background: 'none', border: 'none', display: 'flex' }}><X size={20} /></button>
        </div>
        <p style={{ fontSize: 13, color: '#666' }}>Para <strong>{disp.transportista_nombre}</strong></p>
        <div className="form-group">
          <label className="form-label">Asunto</label>
          <input type="text" value={asunto} onChange={e => { setAsunto(e.target.value); setError(''); }} className="form-input"/>
        </div>
        <div className="form-group">
          <label className="form-label">Mensaje *</label>
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

function TruckCard({ disp, userId, onContact }: { disp: Disponibilidad; userId: number; onContact: (d: Disponibilidad) => void }) {
  const TIPO_CLS: Record<string, string> = {
    'Jaula simple': 'badge badge-success', 'Acoplado': 'badge badge-info', 'Semirremolque': 'badge badge-warning',
  };
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,.05)', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Transportista info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(139,175,78,.15)', color: '#4d6b1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
          {disp.transportista_nombre[0]}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{disp.transportista_nombre}</p>
          {disp.transportista_zona && <p style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {disp.transportista_zona}</p>}
        </div>
        {(disp.cantidad_reseñas ?? 0) > 0 && (
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <StarRating value={Number(disp.puntuacion_promedio ?? 0)} size="sm"/>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{Number(disp.puntuacion_promedio ?? 0).toFixed(1)} ({disp.cantidad_reseñas})</div>
          </div>
        )}
      </div>

      {/* Vehicle badges */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {disp.tipo_remolque && disp.tipo_remolque.split(',').map(t => t.trim()).filter(Boolean).map(t => (
          <span key={t} className={TIPO_CLS[t] ?? 'badge badge-neutral'} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Truck size={11} /> {t}</span>
        ))}
        {disp.capacidad_kg  && <span className="badge badge-neutral"><Icon name="weight" size={11} color="#666"/> {Number(disp.capacidad_kg).toLocaleString('es-AR')} kg</span>}
      </div>

      {/* Route */}
      <RouteInline origin={disp.origen_direccion?.split(',')[0] ?? ''} destination={disp.destino_direccion?.split(',')[0] ?? ''}/>

      {/* Date */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,.05)', color: '#555', fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 5 }}>
        <Icon name="calendar" size={11} color="#555"/>
        {fmtFecha(disp.fecha)}
      </div>

      {/* Action */}
      {disp.transportista_id !== userId && (
        <button onClick={() => onContact(disp)} style={{ width: '100%', background: '#E07A34', color: '#fff', border: 'none', borderRadius: 9, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Enviar consulta
        </button>
      )}
    </div>
  );
}

export default function DisponibilidadesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [disponibilidades, setDisponibilidades] = useState<Disponibilidad[]>([]);
  const [fetching,  setFetching]  = useState(true);
  const [zona,      setZona]      = useState('');
  const [contactar, setContactar] = useState<Disponibilidad | null>(null);
  const [toast,     setToast]     = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [user, loading, router]);
  useEffect(() => {
    if (!loading && user && user.rol === 'transportista') router.replace('/dashboard');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    api.get('/disponibilidades').then(r => setDisponibilidades(r.data.disponibilidades ?? [])).catch(() => {}).finally(() => setFetching(false));
  }, [user]);

  if (loading || !user) return null;

  const ini = (user.nombre ?? user.name ?? '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const filtered = zona.trim()
    ? disponibilidades.filter(d =>
        d.origen_direccion?.toLowerCase().includes(zona.toLowerCase()) ||
        d.destino_direccion?.toLowerCase().includes(zona.toLowerCase()) ||
        d.transportista_zona?.toLowerCase().includes(zona.toLowerCase())
      )
    : disponibilidades;

  return (
    <div className="app-layout">
      <style>{`
        @media (max-width: 768px) {
          .disp-header { padding: 10px 12px !important; }
          .disp-filter { padding: 8px 12px !important; }
          .disp-body   { padding: 12px !important; }
        }
      `}</style>
      <AppSidebar/>
      <div className="app-panel" style={{ height: '100vh', overflow: 'hidden' }}>

        {/* Header */}
        <div className="disp-header" style={{ background: '#fff', padding: '14px 28px', borderBottom: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>Buscar camiones</div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>Camiones disponibles para tu hacienda</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1F2B1F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>{ini}</div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="disp-filter" style={{ background: '#fff', padding: '12px 28px', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <input
              type="text"
              placeholder="Filtrar por zona o ruta…"
              value={zona}
              onChange={e => setZona(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 34px', border: '1.5px solid #E0E0E0', borderRadius: 8, fontSize: 13, outline: 'none', color: '#111', background: '#fff' }}
            />
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
              <Icon name="search" size={14} color="#aaa"/>
            </span>
          </div>
          {zona && (
            <button onClick={() => setZona('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', display: 'flex', alignItems: 'center' }}>
              <Icon name="x" size={15} color="#aaa"/>
            </button>
          )}
          <div style={{ marginLeft: 'auto', fontSize: 13, color: '#888' }}>
            <span style={{ background: '#E07A34', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, marginRight: 6 }}>{filtered.length}</span>
            camión{filtered.length !== 1 ? 'es' : ''} disponible{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Content */}
        <div className="disp-body" style={{ flex: 1, overflowY: 'auto', background: '#F2F2F0', padding: '20px 28px' }}>
          {fetching ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <div style={{ width: 28, height: 28, border: '3px solid #8BAF4E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}/>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, textAlign: 'center' }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#EAEAE8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Icon name="truck" size={26} color="#ccc"/>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#888', marginBottom: 5 }}>
                {zona ? 'Sin camiones en esa zona' : 'Sin camiones disponibles'}
              </div>
              <div style={{ fontSize: 11, color: '#bbb' }}>
                {zona ? 'Probá con otra zona o ruta' : 'Volvé a revisar más tarde'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {filtered.map(d => (
                <TruckCard key={d.id} disp={d} userId={user.id} onContact={setContactar}/>
              ))}
            </div>
          )}
        </div>

        {contactar && (
          <ContactarModal
            disp={contactar}
            onClose={() => setContactar(null)}
            onSent={() => { setContactar(null); setToast({ message: 'Consulta enviada al transportista', type: 'success' }); }}
          />
        )}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)}/>}
      </div>
    </div>
  );
}
