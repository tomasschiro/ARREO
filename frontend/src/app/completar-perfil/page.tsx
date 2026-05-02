'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Check, AlertTriangle } from 'lucide-react';

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

function ToroBull() {
  return (
    <svg width="52" height="52" viewBox="22 40 158 120" fill="none" style={{ color: '#1F2B1F' }}>
      <g transform="translate(0,200) scale(0.1,-0.1)"
         stroke="currentColor" strokeWidth="20"
         strokeLinejoin="round" strokeLinecap="round" fill="none">
        <path d="M340 1421 c-19 -36 -11 -101 20 -165 57 -117 110 -153 265 -180 78-13 93 -19 114 -44 22 -27 62 -159 91 -297 28 -134 135 -205 241 -161 73 31 105 78 119 177 6 39 14 78 19 87 5 9 11 37 15 62 7 47 38 109 62 123 8 4 14 17 14 27 0 11 3 20 8 21 4 0 16 2 27 4 11 1 47 5 81 9 75 7 141 34 174 72 89 101 123 207 84 262 -32 46 -73 19 -93 -61 -23 -96 -64 -139 -153 -162 -51 -12-76 -14 -100 -7 -18 6 -52 14 -75 17 -24 4 -46 11 -49 16 -3 5 -27 20 -52 32-37 17 -65 22 -133 22 -78 0 -92 -3 -160 -36 -99 -49 -168 -64 -222 -51 -23 6-58 14 -77 18 -39 8 -90 42 -90 61 0 7 -4 13 -8 13 -9 0 -32 59 -32 84 0 9 -7 30 -15 46 -18 35 -58 41 -75 11z"/>
      </g>
    </svg>
  );
}

export default function CompletarPerfilPage() {
  const { user, loading: authLoading, updateUser } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    patente: '', marca_camion: '', modelo_camion: '',
    año_camion: '', capacidad_kg: '',
  });
  const [tiposRemolque, setTiposRemolque] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (user.rol !== 'transportista') { router.push('/dashboard'); return; }
    if (user.patente) { router.push('/dashboard'); return; }
  }, [authLoading, user, router]);

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.patente || tiposRemolque.length === 0 || !form.capacidad_kg) {
      setError('Patente, tipo de remolque y capacidad son obligatorios');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put('/auth/perfil', {
        nombre: user?.nombre ?? user?.name ?? '',
        patente: form.patente.toUpperCase(),
        marca_camion: form.marca_camion || undefined,
        modelo_camion: form.modelo_camion || undefined,
        año_camion: form.año_camion ? parseInt(form.año_camion) : undefined,
        tipo_remolque: tiposRemolque.join(','),
        capacidad_kg: parseInt(form.capacidad_kg),
      });
      updateUser(data.usuario);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--color-verde-bosque)' }}>
        <div className="animate-spin" style={{ width: 32, height: 32, border: '4px solid #8BAF4E', borderTopColor: 'transparent', borderRadius: '50%' }} />
      </div>
    );
  }

  return (
    <main className="auth-page">
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div className="auth-card">

          <div className="auth-logo">
            <ToroBull />
            <div className="auth-logo-name">ARREO</div>
            <div className="auth-logo-tag">Transporte Ganadero Inteligente</div>
          </div>

          <h1 className="auth-title">Datos de tu camión</h1>
          <p className="auth-subtitle">Completá tu perfil para empezar a recibir viajes</p>

          <form className="auth-form" onSubmit={handleSubmit}>

            <div className="form-group">
              <label className="form-label">
                Patente <span style={{ color: 'var(--color-verde-arreo)' }}>*</span>
              </label>
              <input type="text" value={form.patente} onChange={e => set('patente', e.target.value)}
                placeholder="Ej: ABC 123" maxLength={10} className="form-input" />
            </div>

            {/* Tipo de remolque */}
            <div className="form-group">
              <label className="form-label">
                Tipo de remolque <span style={{ color: 'var(--color-verde-arreo)' }}>*</span>{' '}
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>(podés elegir varios)</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {TIPOS_REMOLQUE_OPTS.map(({ value, cap }) => {
                  const on = tiposRemolque.includes(value);
                  return (
                    <button key={value} type="button"
                      onClick={() => setTiposRemolque(prev => on ? prev.filter(t => t !== value) : [...prev, value])}
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
                          color: '#fff',
                        }}><Check size={11} strokeWidth={3} /></div>
                      )}
                      <TruckIcon color={on ? '#4d6b1a' : '#aaa'} />
                      <div style={{ fontSize: 11, fontWeight: 700, color: on ? '#1F2B1F' : 'var(--color-text-muted)', textAlign: 'center', lineHeight: 1.25 }}>{value}</div>
                      <div style={{ fontSize: 9.5, color: '#aaa', textAlign: 'center' }}>{cap}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Capacidad de carga (kg) <span style={{ color: 'var(--color-verde-arreo)' }}>*</span>
              </label>
              <input type="number" value={form.capacidad_kg} onChange={e => set('capacidad_kg', e.target.value)}
                placeholder="Ej: 15000" min="1000" className="form-input" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Marca</label>
                <input type="text" value={form.marca_camion} onChange={e => set('marca_camion', e.target.value)}
                  placeholder="Ej: Mercedes" className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Modelo</label>
                <input type="text" value={form.modelo_camion} onChange={e => set('modelo_camion', e.target.value)}
                  placeholder="Ej: Actros" className="form-input" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Año del vehículo</label>
              <input type="number" value={form.año_camion} onChange={e => set('año_camion', e.target.value)}
                placeholder="Ej: 2018" min="1980" max={new Date().getFullYear()} className="form-input" />
            </div>

            {error && (
              <div style={{ backgroundColor: 'var(--color-error-bg)', border: '1px solid rgba(217,79,79,.2)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--color-error)', fontSize: 13 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={13} /> {error}</span>
              </div>
            )}

            <button type="submit" disabled={saving} className="btn btn-primary btn-full btn-lg">
              {saving ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="animate-spin" style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }} />
                  Guardando…
                </span>
              ) : 'Guardar y continuar →'}
            </button>

            <p style={{ fontSize: 11, color: 'var(--color-text-subtle)', textAlign: 'center' }}>
              Podés editar estos datos luego desde tu perfil
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
