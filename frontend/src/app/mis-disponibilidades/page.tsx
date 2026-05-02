'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppSidebar from '@/components/AppSidebar';
import api from '@/lib/api';
import { Check, X, Truck, Calendar, Users } from 'lucide-react';

interface Interesado {
  id: number;
  asunto: string;
  contenido: string;
  leido: boolean;
  created_at: string;
  remitente_nombre: string;
  remitente_email: string;
}

interface Disponibilidad {
  id: number;
  origen_direccion: string;
  destino_direccion: string;
  fecha: string;
  tipo_jaula: string;
  estado: string;
  created_at: string;
  interesados: Interesado[];
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
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

function EditModal({ disp, onClose, onSave }: {
  disp: Disponibilidad;
  onClose: () => void;
  onSave: (id: number, fecha: string, tipoJaula: string) => Promise<void>;
}) {
  const hoy = new Date().toISOString().split('T')[0];
  const [fecha,     setFecha]     = useState(disp.fecha.split('T')[0]);
  const [tipoJaula, setTipoJaula] = useState(disp.tipo_jaula);
  const [saving,    setSaving]    = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(disp.id, fecha, tipoJaula);
    setSaving(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>Editar disponibilidad</h3>
        <div className="form-group">
          <label className="form-label">Fecha disponible</label>
          <input type="date" min={hoy} value={fecha} onChange={e => setFecha(e.target.value)}
            className="form-input" />
        </div>
        <div className="form-group">
          <label className="form-label">Tipo de jaula</label>
          <select value={tipoJaula} onChange={e => setTipoJaula(e.target.value)}
            className="form-select">
            {['Jaula simple', 'Acoplado', 'Semirremolque'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

const TIPO_JAULA_CLS: Record<string, string> = {
  'Jaula simple': 'badge badge-success',
  'Acoplado':     'badge badge-info',
  'Semirremolque':'badge badge-warning',
};

export default function MisDisponibilidadesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [disponibilidades, setDisponibilidades] = useState<Disponibilidad[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [editando,  setEditando]  = useState<Disponibilidad | null>(null);
  const [expandido, setExpandido] = useState<number | null>(null);
  const [toast,     setToast]     = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (!authLoading && user && user.rol !== 'transportista') router.push('/dashboard');
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/mis-disponibilidades');
      setDisponibilidades(data.disponibilidades);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  async function handleSaveEdit(id: number, fecha: string, tipoJaula: string) {
    try {
      await api.put(`/disponibilidades/${id}`, { fecha, tipo_jaula: tipoJaula });
      setToast({ message: 'Disponibilidad actualizada', type: 'success' });
      setEditando(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setToast({ message: msg || 'Error al guardar', type: 'error' });
    }
  }

  if (authLoading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--color-niebla)' }}>
        <div className="animate-spin" style={{ width: 32, height: 32, border: '4px solid #8BAF4E', borderTopColor: 'transparent', borderRadius: '50%' }} />
      </div>
    );
  }

  return (
    <div className="app-layout">
      <AppSidebar />

      <div className="app-content">
        <header className="app-header">
          <div>
            <h2 className="header-title">Mis disponibilidades</h2>
            <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginTop: 2 }}>Tus camiones publicados</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', backgroundColor: 'rgba(139,175,78,0.15)', color: '#4d6b1a' }}>
              {(user.nombre ?? user.name ?? '?')[0]}
            </div>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-carbon)' }}>{user.nombre ?? user.name}</span>
          </div>
        </header>

        <main className="page-content">
          <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
                <div className="animate-spin" style={{ width: 32, height: 32, border: '4px solid #8BAF4E', borderTopColor: 'transparent', borderRadius: '50%' }} />
              </div>
            ) : disponibilidades.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--color-text-muted)' }}>
                <p style={{ marginBottom: 12, color: '#bbb', display: 'flex', justifyContent: 'center' }}><Truck size={36} /></p>
                <p style={{ fontWeight: 500 }}>No publicaste disponibilidades todavía</p>
              </div>
            ) : disponibilidades.map(d => {
              const fecha = new Date(d.fecha).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
              const nuevos = d.interesados.filter(i => !i.leido).length;
              const open = expandido === d.id;

              return (
                <div key={d.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, backgroundColor: '#8BAF4E' }} />
                          <p style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.origen_direccion?.split(',')[0]}
                          </p>
                        </div>
                        <div style={{ marginLeft: 4, marginBottom: 4 }}>
                          <div style={{ width: 1, height: 16, borderLeft: '2px dashed #E0E0E0', marginLeft: 4 }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, backgroundColor: '#E07A34' }} />
                          <p style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.destino_direccion?.split(',')[0]}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Calendar size={11} /> {fecha}</span>
                          <span className={TIPO_JAULA_CLS[d.tipo_jaula] ?? 'badge badge-neutral'}>{d.tipo_jaula}</span>
                        </div>
                      </div>
                      <span className={d.estado === 'disponible' ? 'badge badge-success' : 'badge badge-neutral'} style={{ flexShrink: 0 }}>
                        {d.estado === 'disponible' ? 'Disponible' : 'Tomado'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setEditando(d)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                        ✏️ Editar
                      </button>
                      <button onClick={() => setExpandido(open ? null : d.id)}
                        className="btn btn-sm"
                        style={{ flex: 2, backgroundColor: open ? '#1F2B1F' : '#8BAF4E', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <Users size={13} /> Interesados
                        {nuevos > 0 && (
                          <span style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: '#E24B4A', color: 'white', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                            {nuevos}
                          </span>
                        )}
                        {d.interesados.length > 0 && nuevos === 0 && (
                          <span style={{ fontSize: 12, opacity: .8 }}>({d.interesados.length})</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {open && (
                    <div style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-niebla)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {d.interesados.length === 0 ? (
                        <p style={{ fontSize: 14, color: 'var(--color-text-subtle)', textAlign: 'center', padding: '8px 0' }}>Sin interesados todavía</p>
                      ) : d.interesados.map(i => (
                        <div key={i.id} className="card" style={{ padding: 12, border: !i.leido ? '1px solid rgba(139,175,78,0.35)' : '1px solid #F0F0F0' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                            <div>
                              <p style={{ fontSize: 14, fontWeight: 600 }}>
                                {i.remitente_nombre}
                                {!i.leido && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: '#8BAF4E' }}>Nuevo</span>}
                              </p>
                              <a href={`mailto:${i.remitente_email}`} style={{ fontSize: 12, color: '#8BAF4E', textDecoration: 'none' }}>{i.remitente_email}</a>
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                              {new Date(i.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                            </span>
                          </div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 2 }}>{i.asunto}</p>
                          <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{i.contenido}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

          </div>
        </main>
      </div>

      {editando && (
        <EditModal disp={editando} onClose={() => setEditando(null)} onSave={handleSaveEdit} />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
