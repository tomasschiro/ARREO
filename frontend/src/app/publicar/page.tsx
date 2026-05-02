'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import AppSidebar from '@/components/AppSidebar';
import LocationPicker, { LocationValue } from '@/components/LocationPicker';
import { Beef, Ban, AlertTriangle } from 'lucide-react';

const TIPOS_HACIENDA = ['Novillos', 'Vacas', 'Terneros', 'Toros', 'Vaquillonas'];
const CONDICIONES_CAMINO = [
  { value: 'Seco',            label: 'Seco (campo normal)' },
  { value: 'Lluvia reciente', label: 'Lluvia reciente (caminos blandos)' },
  { value: 'Lluvia intensa',  label: 'Lluvia intensa (campo muy blando)' },
  { value: 'Helada',          label: 'Helada' },
];
const JAULA_RANK: Record<string, number> = { 'Jaula simple': 1, 'Acoplado': 2, 'Semirremolque': 3 };
const JAULA_CLS:  Record<string, string> = {
  'Jaula simple': 'badge badge-success',
  'Acoplado':     'badge badge-warning',
  'Semirremolque':'badge badge-info',
};
function jaulaPorPeso(kg: number): string | null {
  if (!kg) return null;
  if (kg <= 6000)  return 'Jaula simple';
  if (kg <= 14000) return 'Acoplado';
  return 'Semirremolque';
}
function jaulaPorCabezas(n: number): string | null {
  if (!n) return null;
  if (n <= 25) return 'Jaula simple';
  if (n <= 60) return 'Acoplado';
  return 'Semirremolque';
}
function maxJaula(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return (JAULA_RANK[a] ?? 0) >= (JAULA_RANK[b] ?? 0) ? a : b;
}

function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label}{required && <span style={{ marginLeft: 2, color: 'var(--color-verde-arreo)' }}>*</span>}
      </label>
      {children}
      {hint  && <p className="form-hint">{hint}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

interface FormErrors {
  origen?: string; destino?: string; fecha_salida?: string;
  tipo_hacienda?: string; cantidad_cabezas?: string;
  peso_promedio_kg?: string;
}

export default function PublicarPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [origen,       setOrigen]    = useState<LocationValue | null>(null);
  const [destino,      setDestino]   = useState<LocationValue | null>(null);
  const [fecha,        setFecha]     = useState('');
  const [tipoHacienda, setTipo]      = useState('');
  const [cabezas,      setCabezas]   = useState('');
  const [pesoPromedio, setPeso]      = useState('');
  const [condicionCamino, setCondicion] = useState('');
  const [observaciones,   setObs]      = useState('');

  const [errors,      setErrors]     = useState<FormErrors>({});
  const [submitting,  setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const pesoTotal  = (parseFloat(cabezas) || 0) * (parseFloat(pesoPromedio) || 0);
  const cabezasNum = parseInt(cabezas) || 0;
  const jaulaPeso  = jaulaPorPeso(pesoTotal);
  const jaulaCab   = jaulaPorCabezas(cabezasNum);
  const jaulaFinal = maxJaula(jaulaPeso, jaulaCab);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
  }, [authLoading, user, router]);

  const hoy = new Date().toISOString().split('T')[0];

  function validate(): boolean {
    const e: FormErrors = {};
    if (!origen)  e.origen  = 'Seleccioná el punto de origen en el mapa';
    if (!destino) e.destino = 'Seleccioná el punto de destino en el mapa';
    if (origen && destino) {
      const dist = Math.abs(origen.lat - destino.lat) + Math.abs(origen.lng - destino.lng);
      if (dist < 0.001) e.destino = 'El destino no puede ser igual al origen';
    }
    if (!fecha) e.fecha_salida = 'Seleccioná la fecha de salida';
    if (!tipoHacienda) e.tipo_hacienda = 'Seleccioná el tipo de hacienda';
    if (!cabezas || parseInt(cabezas) < 1) e.cantidad_cabezas = 'Ingresá una cantidad válida';
    if (!pesoPromedio || parseFloat(pesoPromedio) < 1) e.peso_promedio_kg = 'Ingresá el peso promedio';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setServerError('');
    try {
      await api.post('/viajes', {
        origen:           origen!.address,
        destino:          destino!.address,
        origen_lat:       origen!.lat,
        origen_lng:       origen!.lng,
        origen_direccion: origen!.address,
        destino_lat:      destino!.lat,
        destino_lng:      destino!.lng,
        destino_direccion: destino!.address,
        fecha_salida:     fecha,
        tipo_hacienda:    tipoHacienda,
        cantidad_cabezas: parseInt(cabezas),
        peso_promedio_kg: parseFloat(pesoPromedio),
        peso_total_kg:    pesoTotal,
        tipo_jaula:       jaulaFinal ?? null,
        condicion_camino: condicionCamino || null,
        observaciones:    observaciones || undefined,
      });
      router.push('/dashboard?toast=Viaje+publicado+exitosamente');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setServerError(msg || 'Error al publicar el viaje');
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

  if (user.rol === 'transportista') {
    return (
      <div className="app-layout">
        <AppSidebar />
        <div className="app-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ textAlign: 'center', maxWidth: 360 }}>
            <p style={{ marginBottom: 16, color: '#aaa', display: 'flex', justifyContent: 'center' }}><Ban size={36} /></p>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Acceso restringido</h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20 }}>
              Solo productores y consignatarias pueden publicar viajes.
            </p>
            <Link href="/dashboard" style={{ color: '#8BAF4E', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
              ← Volver al dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <style>{`
        @media (max-width: 640px) {
          .pub-header-name { display: none; }
          .pub-detail-grid { grid-template-columns: 1fr !important; }
          .pub-weight-grid { grid-template-columns: 1fr !important; }
          .pub-actions { flex-direction: column !important; }
          .pub-actions a, .pub-actions button { width: 100% !important; flex: none !important; min-height: 48px; font-size: 15px !important; }
        }
      `}</style>
      <AppSidebar />

      <div className="app-content">
        <header className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/dashboard" style={{ color: 'var(--color-text-muted)', fontSize: 18, textDecoration: 'none' }}>←</Link>
            <div>
              <h2 className="header-title">Publicar viaje</h2>
              <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginTop: 2 }}>Completá los datos del traslado</p>
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
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

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
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Detalles del viaje</h3>
                <div className="pub-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
                  <Field label="Fecha de salida" required error={errors.fecha_salida}>
                    <input type="date" min={hoy} value={fecha}
                      onChange={e => { setFecha(e.target.value); setErrors(p => ({ ...p, fecha_salida: undefined })); }}
                      className="form-input" />
                  </Field>
                  <Field label="Tipo de hacienda" required error={errors.tipo_hacienda}>
                    <select value={tipoHacienda}
                      onChange={e => { setTipo(e.target.value); setErrors(p => ({ ...p, tipo_hacienda: undefined })); }}
                      className="form-select">
                      <option value="">Seleccioná tipo</option>
                      {TIPOS_HACIENDA.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Condición del camino">
                    <select value={condicionCamino}
                      onChange={e => setCondicion(e.target.value)}
                      className="form-select">
                      <option value="">Sin especificar</option>
                      {CONDICIONES_CAMINO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </Field>
                </div>
                {(condicionCamino === 'Lluvia reciente' || condicionCamino === 'Lluvia intensa') && (
                  <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(224,170,52,.12)', border: '1px solid rgba(224,170,52,.4)', color: '#7a5a00', fontSize: 13 }}>
                    <span style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}><AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> Algunos transportistas pueden no tener acceso al campo en estas condiciones. Aclaralo en las observaciones.</span>
                  </div>
                )}
              </section>

              <section className="card">
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Carga y peso</h3>
                <div className="pub-weight-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <Field label="Cantidad de cabezas" required error={errors.cantidad_cabezas}>
                    <div style={{ position: 'relative' }}>
                      <input type="number" min={1} value={cabezas} placeholder="Ej: 120"
                        onChange={e => { setCabezas(e.target.value); setErrors(p => ({ ...p, cantidad_cabezas: undefined })); }}
                        className="form-input" />
                      <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--color-text-subtle)', pointerEvents: 'none' }}>cab.</span>
                    </div>
                  </Field>
                  <Field label="Peso promedio por animal" required error={errors.peso_promedio_kg}>
                    <div style={{ position: 'relative' }}>
                      <input type="number" min={1} value={pesoPromedio} placeholder="Ej: 380"
                        onChange={e => { setPeso(e.target.value); setErrors(p => ({ ...p, peso_promedio_kg: undefined })); }}
                        className="form-input" />
                      <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--color-text-subtle)', pointerEvents: 'none' }}>kg</span>
                    </div>
                  </Field>
                </div>
                {(pesoTotal > 0 || cabezasNum > 0) && (
                  <div style={{ marginTop: 20, padding: 16, borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-niebla)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {pesoTotal > 0 && (
                      <div>
                        <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Peso total estimado</p>
                        <p style={{ fontSize: 20, fontWeight: 700 }}>
                          {pesoTotal.toLocaleString('es-AR')} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-muted)' }}>kg</span>
                        </p>
                      </div>
                    )}
                    {(jaulaPeso || jaulaCab) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: pesoTotal > 0 ? 12 : 0, borderTop: pesoTotal > 0 ? '1px solid rgba(0,0,0,.07)' : 'none' }}>
                        {jaulaPeso && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', minWidth: 160 }}>Recomendado por peso:</span>
                            <span className={JAULA_CLS[jaulaPeso]}>{jaulaPeso}</span>
                          </div>
                        )}
                        {jaulaCab && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', minWidth: 160 }}>Recomendado por cabezas:</span>
                            <span className={JAULA_CLS[jaulaCab]}>{jaulaCab}</span>
                          </div>
                        )}
                        {jaulaFinal && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,.07)' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#111', minWidth: 160 }}>Recomendación final:</span>
                            <span className={JAULA_CLS[jaulaFinal]} style={{ fontWeight: 700 }}>{jaulaFinal}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>

              <section className="card">
                <Field label="Observaciones" hint="Opcional — condiciones de acceso, horario preferido de carga…">
                  <textarea value={observaciones} onChange={e => setObs(e.target.value)}
                    placeholder="Ej: Portón sobre ruta 14, acceso de tierra 2 km, mejor en la mañana."
                    rows={3} className="form-textarea" style={{ resize: 'none' }} />
                </Field>
              </section>

              {serverError && (
                <div style={{ backgroundColor: 'var(--color-error-bg)', border: '1px solid rgba(217,79,79,.2)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--color-error)', fontSize: 13 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={13} /> {serverError}</span>
                </div>
              )}

              <div className="pub-actions" style={{ display: 'flex', gap: 12, paddingBottom: 32 }}>
                <Link href="/dashboard" className="btn btn-secondary" style={{ flex: 1, textAlign: 'center' }}>
                  Cancelar
                </Link>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 2 }}>
                  {submitting ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="animate-spin" style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }} />
                      Publicando…
                    </span>
                  ) : <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}><Beef size={16} /> Publicar viaje</span>}
                </button>
              </div>

            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
