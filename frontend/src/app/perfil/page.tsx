'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppSidebar from '@/components/AppSidebar';
import StarRating from '@/components/StarRating';
import api from '@/lib/api';

const TIPOS_REMOLQUE_OPTS = [
  { value: 'Jaula simple',  cap: 'hasta 6.000 kg' },
  { value: 'Acoplado',      cap: 'hasta 14.000 kg' },
  { value: 'Semirremolque', cap: 'más de 14.000 kg' },
] as const;

function TruckIcon({ color = '#aaa' }: { color?: string }) {
  return (
    <svg width="30" height="22" viewBox="0 0 30 22" fill="none">
      <rect x="0.9" y="0.9" width="17.2" height="13.2" rx="1.2" stroke={color} strokeWidth="1.7"/>
      <path d="M18 5h6.5l4.6 6V19H18V5z" stroke={color} strokeWidth="1.7" strokeLinejoin="round"/>
      <circle cx="5.5" cy="18.5" r="2.6" stroke={color} strokeWidth="1.7"/>
      <circle cx="24" cy="18.5" r="2.6" stroke={color} strokeWidth="1.7"/>
    </svg>
  );
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 50,
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 20px', borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)', color: 'white', fontSize: 14, fontWeight: 500,
      backgroundColor: '#8BAF4E',
    }}>
      ✓ {message}
      <button onClick={onClose} style={{ marginLeft: 8, opacity: .7, cursor: 'pointer', background: 'none', border: 'none', color: 'inherit' }}>✕</button>
    </div>
  );
}

interface Reseña {
  id: number;
  puntuacion: number;
  comentario?: string;
  created_at: string;
  productor_nombre: string;
}

export default function PerfilPage() {
  const { user, loading: authLoading, updateUser } = useAuth();
  const router = useRouter();

  const [nombre,       setNombre]       = useState('');
  const [zona,         setZona]         = useState('');
  const [telefono,     setTelefono]     = useState('');
  const [patente,      setPatente]      = useState('');
  const [marca,        setMarca]        = useState('');
  const [modelo,       setModelo]       = useState('');
  const [año,          setAño]          = useState('');
  const [tipoRemolque, setTipoRemolque] = useState<string[]>([]);
  const [capacidadKg,  setCapacidadKg]  = useState('');
  const [reseñas,      setReseñas]      = useState<Reseña[]>([]);

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const [toast,  setToast]  = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user) {
      setNombre(user.nombre ?? user.name ?? '');
      setZona(user.zona ?? '');
      setTelefono(user.telefono ?? '');
      setPatente(user.patente ?? '');
      setMarca(user.marca_camion ?? '');
      setModelo(user.modelo_camion ?? '');
      setAño(user.año_camion?.toString() ?? '');
      setTipoRemolque(user.tipo_remolque ? user.tipo_remolque.split(',').map(t => t.trim()).filter(Boolean) : []);
      setCapacidadKg(user.capacidad_kg?.toString() ?? '');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user?.rol === 'transportista' && user?.id) {
      api.get(`/transportistas/${user.id}`)
        .then(({ data }) => setReseñas(data.reseñas))
        .catch(() => {});
    }
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        nombre,
        zona: zona || undefined,
        telefono: telefono || undefined,
      };
      if (user?.rol === 'transportista') {
        Object.assign(payload, {
          patente: patente || undefined,
          marca_camion: marca || undefined,
          modelo_camion: modelo || undefined,
          año_camion: año ? parseInt(año) : undefined,
          tipo_remolque: tipoRemolque.length ? tipoRemolque.join(',') : undefined,
          capacidad_kg: capacidadKg ? parseInt(capacidadKg) : undefined,
        });
      }
      const { data } = await api.put('/auth/perfil', payload);
      updateUser(data.usuario);
      setToast(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--color-niebla)' }}>
        <div className="animate-spin" style={{ width: 32, height: 32, border: '4px solid #8BAF4E', borderTopColor: 'transparent', borderRadius: '50%' }} />
      </div>
    );
  }

  const isTransportista = user.rol === 'transportista';

  return (
    <div className="app-layout">
      <style>{`
        @media (max-width: 640px) {
          .prf-2col { grid-template-columns: 1fr !important; }
          .prf-3col { grid-template-columns: 1fr !important; }
          .prf-truck-grid { grid-template-columns: 1fr 1fr !important; }
          .prf-header-name { display: none; }
        }
      `}</style>
      <AppSidebar />

      <div className="app-content">
        <header className="app-header">
          <div>
            <h2 className="header-title">Mi perfil</h2>
            <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginTop: 2 }}>
              {isTransportista ? 'Datos personales y de tu camión' : 'Editá tus datos de cuenta'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', backgroundColor: 'rgba(139,175,78,0.15)', color: '#4d6b1a' }}>
              {(user.nombre ?? user.name ?? '?')[0]}
            </div>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-carbon)' }}>{user.nombre ?? user.name}</span>
          </div>
        </header>

        <main className="page-content">
          <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Info fija */}
            <div className="card">
              <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 16 }}>Información de cuenta</h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Email</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{user.email}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Rol</span>
                <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'capitalize', color: '#8BAF4E' }}>{user.rol}</span>
              </div>
              {isTransportista && (user.cantidad_reseñas ?? 0) > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Puntuación</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StarRating value={Number(user.puntuacion_promedio ?? 0)} size="sm" />
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{Number(user.puntuacion_promedio ?? 0).toFixed(1)}</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>({user.cantidad_reseñas})</span>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card">
                <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 20 }}>Datos personales</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div className="form-group">
                    <label className="form-label">Nombre completo *</label>
                    <input type="text" value={nombre}
                      onChange={e => { setNombre(e.target.value); setError(''); }} className="form-input" />
                  </div>
                  <div className="prf-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">Zona / Provincia</label>
                      <input type="text" value={zona} placeholder="Ej: Entre Ríos"
                        onChange={e => setZona(e.target.value)} className="form-input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Teléfono</label>
                      <input type="tel" value={telefono} placeholder="Ej: 343 4123456"
                        onChange={e => setTelefono(e.target.value)} className="form-input" />
                    </div>
                  </div>
                </div>
              </div>

              {isTransportista && (
                <div className="card">
                  <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 20 }}>Datos del camión</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    <div className="prf-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Patente</label>
                        <input type="text" value={patente} placeholder="ABC 123" maxLength={10}
                          onChange={e => setPatente(e.target.value.toUpperCase())} className="form-input" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Capacidad (kg)</label>
                        <input type="number" value={capacidadKg} placeholder="15000" min="1000"
                          onChange={e => setCapacidadKg(e.target.value)} className="form-input" />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Tipo de remolque <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>(podés elegir varios)</span>
                      </label>
                      <div className="prf-truck-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        {TIPOS_REMOLQUE_OPTS.map(({ value, cap }) => {
                          const on = tipoRemolque.includes(value);
                          return (
                            <button key={value} type="button"
                              onClick={() => setTipoRemolque(prev => on ? prev.filter(t => t !== value) : [...prev, value])}
                              style={{
                                position: 'relative', padding: '14px 8px 12px', borderRadius: 10, cursor: 'pointer',
                                border: `2px solid ${on ? '#8BAF4E' : 'var(--color-border)'}`,
                                background: on ? 'rgba(139,175,78,.09)' : 'transparent',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                                transition: 'border-color .15s, background .15s',
                              }}>
                              {on && (
                                <div style={{
                                  position: 'absolute', top: 5, right: 5, width: 17, height: 17, borderRadius: '50%',
                                  background: '#8BAF4E', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 10, color: '#fff', fontWeight: 800,
                                }}>✓</div>
                              )}
                              <TruckIcon color={on ? '#4d6b1a' : '#aaa'} />
                              <div style={{ fontSize: 11, fontWeight: 700, color: on ? '#1F2B1F' : 'var(--color-text-muted)', textAlign: 'center', lineHeight: 1.25 }}>{value}</div>
                              <div style={{ fontSize: 9.5, color: '#aaa', textAlign: 'center' }}>{cap}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="prf-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Marca</label>
                        <input type="text" value={marca} placeholder="Mercedes"
                          onChange={e => setMarca(e.target.value)} className="form-input" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Modelo</label>
                        <input type="text" value={modelo} placeholder="Actros"
                          onChange={e => setModelo(e.target.value)} className="form-input" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Año</label>
                        <input type="number" value={año} placeholder="2018" min="1980"
                          max={new Date().getFullYear()} onChange={e => setAño(e.target.value)} className="form-input" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div style={{ backgroundColor: 'var(--color-error-bg)', border: '1px solid rgba(217,79,79,.2)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--color-error)', fontSize: 13 }}>
                  ⚠ {error}
                </div>
              )}

              <button type="submit" disabled={saving} className="btn btn-primary btn-full btn-lg">
                {saving ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="animate-spin" style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }} />
                    Guardando…
                  </span>
                ) : 'Guardar cambios'}
              </button>
            </form>

            {isTransportista && reseñas.length > 0 && (
              <div className="card">
                <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 16 }}>
                  Reseñas recibidas
                  <span style={{ marginLeft: 8, fontWeight: 400, textTransform: 'none', color: 'var(--color-text-subtle)' }}>({reseñas.length})</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {reseñas.map(r => (
                    <div key={r.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{r.productor_nombre}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <StarRating value={r.puntuacion} size="sm" />
                          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                            {new Date(r.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      {r.comentario && <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{r.comentario}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {toast && <Toast message="Perfil actualizado correctamente" onClose={() => setToast(false)} />}
    </div>
  );
}
