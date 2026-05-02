'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AppSidebar from '@/components/AppSidebar';
import LocationPicker, { LocationValue } from '@/components/LocationPicker';
import api from '@/lib/api';
import { Truck, AlertTriangle } from 'lucide-react';

const TIPOS_JAULA = ['Jaula simple', 'Acoplado', 'Semirremolque'];

export default function DisponibilidadPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [origen,    setOrigen]    = useState<LocationValue | null>(null);
  const [destino,   setDestino]   = useState<LocationValue | null>(null);
  const [fecha,     setFecha]     = useState('');
  const [tipoJaula, setTipoJaula] = useState('');

  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [submitting,  setSubmitting]  = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (user.rol !== 'transportista') router.push('/dashboard');
  }, [authLoading, user, router]);

  const hoy = new Date().toISOString().split('T')[0];

  function validate() {
    const e: Record<string, string> = {};
    if (!origen)  e.origen  = 'Seleccioná el punto de origen';
    if (!destino) e.destino = 'Seleccioná el punto de destino';
    if (origen && destino) {
      const d = Math.abs(origen.lat - destino.lat) + Math.abs(origen.lng - destino.lng);
      if (d < 0.001) e.destino = 'El destino no puede ser igual al origen';
    }
    if (!fecha)     e.fecha     = 'Seleccioná la fecha';
    if (!tipoJaula) e.tipoJaula = 'Seleccioná el tipo de jaula';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setServerError('');
    try {
      await api.post('/disponibilidades', {
        origen_lat:        origen!.lat,
        origen_lng:        origen!.lng,
        origen_direccion:  origen!.address,
        destino_lat:       destino!.lat,
        destino_lng:       destino!.lng,
        destino_direccion: destino!.address,
        fecha,
        tipo_jaula: tipoJaula,
      });
      router.push('/dashboard?toast=Disponibilidad+publicada');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setServerError(msg || 'Error al publicar la disponibilidad');
    } finally {
      setSubmitting(false);
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
      <style>{`
        @media (max-width: 640px) {
          .disp-grid { grid-template-columns: 1fr !important; }
          .disp-actions { flex-direction: column !important; }
          .disp-actions a, .disp-actions button { width: 100% !important; flex: none !important; min-height: 48px; }
        }
      `}</style>
      <AppSidebar />

      <div className="app-content">
        <header className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/dashboard" style={{ color: 'var(--color-text-muted)', fontSize: 18, textDecoration: 'none' }}>←</Link>
            <div>
              <h2 className="header-title">Publicar disponibilidad</h2>
              <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginTop: 2 }}>Indicá tu ruta y el tipo de camión disponible</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', backgroundColor: 'rgba(139,175,78,0.15)', color: '#4d6b1a' }}>
              {(user.nombre ?? user.name ?? '?')[0]}
            </div>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-carbon)' }}>{user.nombre ?? user.name}</span>
          </div>
        </header>

        <main className="page-content">
          <div style={{ maxWidth: 768, margin: '0 auto' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              <section className="card">
                <h3 style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#8BAF4E', color: 'white', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>A</span>
                  Punto de origen
                </h3>
                <LocationPicker label="Origen" value={origen} onChange={setOrigen} error={errors.origen} />
              </section>

              <section className="card">
                <h3 style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#E07A34', color: 'white', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>B</span>
                  Punto de destino
                </h3>
                <LocationPicker label="Destino" value={destino} onChange={setDestino} error={errors.destino} />
              </section>

              <section className="card">
                <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Detalles del camión</h3>
                <div className="disp-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                  <div className="form-group">
                    <label className="form-label">
                      Fecha disponible <span style={{ color: 'var(--color-verde-arreo)' }}>*</span>
                    </label>
                    <input type="date" min={hoy} value={fecha}
                      onChange={e => { setFecha(e.target.value); setErrors(p => ({ ...p, fecha: '' })); }}
                      className="form-input" />
                    {errors.fecha && <p className="form-error">{errors.fecha}</p>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Tipo de jaula <span style={{ color: 'var(--color-verde-arreo)' }}>*</span>
                    </label>
                    <select value={tipoJaula}
                      onChange={e => { setTipoJaula(e.target.value); setErrors(p => ({ ...p, tipoJaula: '' })); }}
                      className="form-select">
                      <option value="">Seleccioná tipo</option>
                      {TIPOS_JAULA.map(t => <option key={t}>{t}</option>)}
                    </select>
                    {errors.tipoJaula && <p className="form-error">{errors.tipoJaula}</p>}
                  </div>

                </div>
              </section>

              {serverError && (
                <div style={{ backgroundColor: 'var(--color-error-bg)', border: '1px solid rgba(217,79,79,.2)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--color-error)', fontSize: 13 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={13} /> {serverError}</span>
                </div>
              )}

              <div className="disp-actions" style={{ display: 'flex', gap: 12, paddingBottom: 32 }}>
                <Link href="/dashboard" className="btn btn-secondary" style={{ flex: 1, textAlign: 'center' }}>
                  Cancelar
                </Link>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 2 }}>
                  {submitting ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="animate-spin" style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }} />
                      Publicando…
                    </span>
                  ) : <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}><Truck size={16} /> Publicar disponibilidad</span>}
                </button>
              </div>

            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
