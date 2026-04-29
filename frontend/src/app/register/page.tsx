'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

// ─── Logo ─────────────────────────────────────────────────────────────────────

function ToroBull() {
  return (
    <svg width="48" height="48" viewBox="22 40 158 120" fill="none" style={{ color: '#1F2B1F' }}>
      <g transform="translate(0,200) scale(0.1,-0.1)" stroke="currentColor" strokeWidth="20" strokeLinejoin="round" strokeLinecap="round" fill="none">
        <path d="M340 1421 c-19 -36 -11 -101 20 -165 57 -117 110 -153 265 -180 78-13 93 -19 114 -44 22 -27 62 -159 91 -297 28 -134 135 -205 241 -161 73 31 105 78 119 177 6 39 14 78 19 87 5 9 11 37 15 62 7 47 38 109 62 123 8 4 14 17 14 27 0 11 3 20 8 21 4 0 16 2 27 4 11 1 47 5 81 9 75 7 141 34 174 72 89 101 123 207 84 262 -32 46 -73 19 -93 -61 -23 -96 -64 -139 -153 -162 -51 -12-76 -14 -100 -7 -18 6 -52 14 -75 17 -24 4 -46 11 -49 16 -3 5 -27 20 -52 32-37 17 -65 22 -133 22 -78 0 -92 -3 -160 -36 -99 -49 -168 -64 -222 -51 -23 6-58 14 -77 18 -39 8 -90 42 -90 61 0 7 -4 13 -8 13 -9 0 -32 59 -32 84 0 9 -7 30 -15 46 -18 35 -58 41 -75 11z"/>
      </g>
    </svg>
  );
}

// ─── Trailer type selector ────────────────────────────────────────────────────

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

function TipoRemolqueCards({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  function toggle(val: string) {
    onChange(selected.includes(val) ? selected.filter(t => t !== val) : [...selected, val]);
  }
  return (
    <div className="reg-truck-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {TIPOS_REMOLQUE_OPTS.map(({ value, cap }) => {
        const on = selected.includes(value);
        return (
          <button key={value} type="button" onClick={() => toggle(value)} style={{
            position: 'relative', padding: '14px 8px 12px', borderRadius: 10, cursor: 'pointer',
            border: `2px solid ${on ? '#8BAF4E' : '#E0E0E0'}`,
            background: on ? 'rgba(139,175,78,.09)' : '#fff',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
            transition: 'border-color .15s, background .15s',
          }}>
            {on && (
              <div style={{
                position: 'absolute', top: 5, right: 5, width: 17, height: 17, borderRadius: '50%',
                background: '#8BAF4E', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: '#fff', fontWeight: 800, lineHeight: 1,
              }}>✓</div>
            )}
            <TruckIcon color={on ? '#4d6b1a' : '#aaa'} />
            <div style={{ fontSize: 11, fontWeight: 700, color: on ? '#1F2B1F' : '#666', textAlign: 'center', lineHeight: 1.25 }}>{value}</div>
            <div style={{ fontSize: 9.5, color: '#aaa', textAlign: 'center', lineHeight: 1.2 }}>{cap}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validarCuit(v: string) {
  return /^\d{2}-\d{6,8}-\d$/.test(v.trim());
}

function formatCuit(raw: string) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 2)  return digits;
  if (digits.length <= 10) return `${digits.slice(0,2)}-${digits.slice(2)}`;
  return `${digits.slice(0,2)}-${digits.slice(2,10)}-${digits.slice(10,11)}`;
}

async function comprimirImagen(file: File, maxPx = 900, quality = 0.82): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxPx || height > maxPx) {
          if (width > height) { height = Math.round((height * maxPx) / width); width = maxPx; }
          else { width = Math.round((width * maxPx) / height); height = maxPx; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ─── Shared input style ───────────────────────────────────────────────────────

const INP: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1.5px solid #E0E0E0',
  borderRadius: 8, fontSize: 14, outline: 'none', color: '#111', background: '#fff',
  fontFamily: 'inherit',
};
const LBL: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4, display: 'block' };
const GRP: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };

// ─── Photo upload box ─────────────────────────────────────────────────────────

function FotoBox({ label, preview, onChange }: { label: string; preview: string; onChange: (b64: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await comprimirImagen(file);
    onChange(b64);
  }
  return (
    <div
      onClick={() => ref.current?.click()}
      style={{
        border: `2px dashed ${preview ? '#8BAF4E' : '#D0D0D0'}`,
        borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
        aspectRatio: '4/3', position: 'relative', background: preview ? 'transparent' : '#F9F9F8',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        transition: 'border-color .15s',
      }}
    >
      {preview ? (
        <>
          <img src={preview} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}/>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 8px', textAlign: 'center' }}>
            ✓ {label}
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#999', textAlign: 'center', padding: '0 8px' }}>{label}</div>
          <div style={{ fontSize: 10, color: '#bbb', marginTop: 3 }}>Tocá para subir</div>
        </>
      )}
      <input ref={ref} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: 'none' }}/>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function Stepper({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < total - 1 ? 1 : 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700,
            background: i + 1 <= step ? '#1F2B1F' : '#F0F0F0',
            color: i + 1 <= step ? '#fff' : '#aaa',
          }}>
            {i + 1 < step ? '✓' : i + 1}
          </div>
          {i < total - 1 && (
            <div style={{ flex: 1, height: 2, background: i + 1 < step ? '#1F2B1F' : '#F0F0F0', margin: '0 4px' }}/>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Rol = 'transportista' | 'productor' | 'consignataria';
type Phase = 'role' | 'form' | 'done';

export default function RegisterPage() {
  const [phase,    setPhase]    = useState<Phase>('role');
  const [rol,      setRol]      = useState<Rol | null>(null);
  const [step,     setStep]     = useState(1);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  // Step 1 — datos personales (todos los roles)
  const [s1, setS1] = useState({ nombre: '', email: '', password: '', telefono: '', cuit_cuil: '', zona: '' });

  // Step 2 — datos camión (solo transportistas)
  const [s2, setS2] = useState({ patente: '', marca_camion: '', modelo_camion: '', año_camion: '', capacidad_kg: '' });
  const [tiposRemolque, setTiposRemolque] = useState<string[]>([]);

  // Step 3 — fotos (solo transportistas)
  const [fotos, setFotos] = useState({ foto_dni_frente: '', foto_dni_dorso: '', foto_licencia: '', foto_camion: '' });

  function setF1(k: string, v: string) { setS1(p => ({ ...p, [k]: v })); setError(''); }
  function setF2(k: string, v: string) { setS2(p => ({ ...p, [k]: v })); setError(''); }

  function selectRol(r: Rol) { setRol(r); setPhase('form'); setStep(1); }

  // ─── Validations ─────────────────────────────────────────────────────────

  function validateStep1() {
    if (!s1.nombre.trim()) return 'El nombre es obligatorio';
    if (!s1.email.trim() || !s1.email.includes('@')) return 'Ingresá un email válido';
    if (s1.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    if (!s1.telefono.trim()) return 'El teléfono es obligatorio';
    if (!s1.cuit_cuil.trim()) return 'El CUIT/CUIL es obligatorio';
    if (!validarCuit(s1.cuit_cuil)) return 'Formato de CUIT/CUIL inválido (ej: 20-12345678-9)';
    if (!s1.zona.trim()) return 'La zona/provincia es obligatoria';
    return null;
  }

  function validateStep2() {
    if (!s2.patente.trim()) return 'La patente es obligatoria';
    if (!s2.marca_camion.trim()) return 'La marca es obligatoria';
    if (!s2.modelo_camion.trim()) return 'El modelo es obligatorio';
    if (!s2.año_camion || +s2.año_camion < 1980 || +s2.año_camion > new Date().getFullYear()) return 'Ingresá un año válido';
    if (tiposRemolque.length === 0) return 'Seleccioná al menos un tipo de remolque';
    if (!s2.capacidad_kg || +s2.capacidad_kg <= 0) return 'Ingresá la capacidad en kg';
    return null;
  }

  function validateStep3() {
    if (!fotos.foto_dni_frente) return 'Foto DNI frente obligatoria';
    if (!fotos.foto_dni_dorso)  return 'Foto DNI dorso obligatoria';
    if (!fotos.foto_licencia)   return 'Foto licencia de conducir obligatoria';
    if (!fotos.foto_camion)     return 'Foto del camión/jaula obligatoria';
    return null;
  }

  // ─── Step navigation ─────────────────────────────────────────────────────

  function nextStep() {
    setError('');
    if (step === 1) {
      const err = validateStep1(); if (err) { setError(err); return; }
      if (rol === 'transportista') { setStep(2); return; }
      // productor/consignataria → submit directly
      submit();
    } else if (step === 2) {
      const err = validateStep2(); if (err) { setError(err); return; }
      setStep(3);
    } else if (step === 3) {
      const err = validateStep3(); if (err) { setError(err); return; }
      submit();
    }
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  async function submit() {
    setLoading(true); setError('');
    try {
      const payload: Record<string, unknown> = {
        nombre: s1.nombre.trim(),
        email: s1.email.trim().toLowerCase(),
        password: s1.password,
        rol,
        telefono: s1.telefono.trim(),
        cuit_cuil: s1.cuit_cuil.trim(),
        zona: s1.zona.trim(),
      };
      if (rol === 'transportista') {
        Object.assign(payload, {
          patente: s2.patente.trim().toUpperCase(),
          marca_camion: s2.marca_camion.trim(),
          modelo_camion: s2.modelo_camion.trim(),
          año_camion: +s2.año_camion,
          tipo_remolque: tiposRemolque.join(','),
          capacidad_kg: +s2.capacidad_kg,
          ...fotos,
        });
      }
      const { data } = await api.post('/auth/register', payload);
      localStorage.setItem('token', data.token);
      setPhase('done');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Error al crear la cuenta. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  // ─── Render: role selection ───────────────────────────────────────────────

  if (phase === 'role') {
    return (
      <main className="auth-page">
        <style>{`
          @media (max-width: 480px) {
            .reg-2col { grid-template-columns: 1fr !important; }
            .reg-truck-grid { grid-template-columns: 1fr 1fr !important; }
            .reg-photo-grid { grid-template-columns: 1fr 1fr !important; }
          }
        `}</style>
        <div style={{ width: '100%', maxWidth: 500 }}>
          <div className="auth-card">
            <div className="auth-logo"><ToroBull/><div className="auth-logo-name">ARREO</div><div className="auth-logo-tag">Transporte Ganadero Inteligente</div></div>
            <h1 className="auth-title">¿Cómo vas a usar ARREO?</h1>
            <p className="auth-subtitle">Elegí tu rol para comenzar el registro</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              {([
                { value: 'transportista', emoji: '🚛', label: 'Transportista', desc: 'Tengo camiones y ofrezco fletes para hacienda', steps: '3 pasos + documentación' },
                { value: 'productor',     emoji: '🐄', label: 'Productor',     desc: 'Necesito transportar mi hacienda', steps: '1 paso' },
                { value: 'consignataria', emoji: '📋', label: 'Consignataria', desc: 'Gestiono operaciones ganaderas', steps: '1 paso' },
              ] as const).map(r => (
                <button key={r.value} onClick={() => selectRol(r.value)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', border: '2px solid #E0E0E0', borderRadius: 12, cursor: 'pointer', background: '#fff', textAlign: 'left', transition: 'border-color .15s, background .15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#8BAF4E'; (e.currentTarget as HTMLElement).style.background = 'rgba(139,175,78,.04)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E0E0E0'; (e.currentTarget as HTMLElement).style.background = '#fff'; }}
                >
                  <div style={{ fontSize: 32, lineHeight: 1 }}>{r.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{r.label}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{r.desc}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#E07A34', background: 'rgba(224,122,52,.1)', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>{r.steps}</div>
                </button>
              ))}
            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: 14, marginTop: 24, color: 'rgba(255,255,255,.6)' }}>
            ¿Ya tenés cuenta?{' '}
            <Link href="/login" style={{ color: '#8BAF4E', fontWeight: 600, textDecoration: 'none' }}>Iniciar sesión</Link>
          </p>
        </div>
      </main>
    );
  }

  // ─── Render: done ─────────────────────────────────────────────────────────

  if (phase === 'done') {
    return (
      <main className="auth-page">
        <div style={{ width: '100%', maxWidth: 460 }}>
          <div className="auth-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>⏳</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2B1F', marginBottom: 10 }}>
              {rol === 'transportista' ? 'Solicitud enviada' : 'Cuenta creada'}
            </h2>
            <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 20 }}>
              {rol === 'transportista'
                ? 'Tu solicitud fue enviada. El equipo de ARREO verificará tu documentación en las próximas 24–48 horas.'
                : 'Tu cuenta está siendo verificada. Te avisaremos cuando esté activa.'}
            </p>
            <div style={{ background: '#F8F8F6', borderRadius: 10, padding: '14px 18px', fontSize: 13, color: '#888', marginBottom: 20, textAlign: 'left' }}>
              <div style={{ fontWeight: 600, color: '#555', marginBottom: 6 }}>Próximos pasos:</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <li>Revisamos tu información y documentación</li>
                <li>Te notificamos por email cuando sea aprobada</li>
                <li>Una vez aprobado, podés acceder a todas las funciones</li>
              </ul>
            </div>
            <Link href="/verificacion" style={{ display: 'block', background: '#1F2B1F', color: '#fff', borderRadius: 9, padding: '12px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              Ver estado de mi cuenta
            </Link>
            <div style={{ marginTop: 12 }}>
              <a href="https://wa.me/5491100000000?text=Hola%2C%20registré%20mi%20cuenta%20en%20ARREO%20y%20quiero%20consultar%20el%20estado" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#8BAF4E', textDecoration: 'none' }}>
                ¿Tenés dudas? Contactar soporte →
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ─── Render: form ─────────────────────────────────────────────────────────

  const totalSteps = rol === 'transportista' ? 3 : 1;
  const stepLabels = rol === 'transportista'
    ? ['Datos personales', 'Datos del camión', 'Documentación']
    : ['Datos personales'];

  return (
    <main className="auth-page">
      <style>{`
        @media (max-width: 480px) {
          .reg-2col { grid-template-columns: 1fr !important; }
          .reg-truck-grid { grid-template-columns: 1fr 1fr !important; }
          .reg-photo-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
      <div style={{ width: '100%', maxWidth: 520 }}>
        <div className="auth-card">

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <button onClick={() => step > 1 ? setStep(s => s - 1) : setPhase('role')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 20, padding: 0, lineHeight: 1 }}>←</button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>
                {rol === 'transportista' ? '🚛 Transportista' : rol === 'productor' ? '🐄 Productor' : '📋 Consignataria'}
              </div>
              <div style={{ fontSize: 12, color: '#aaa' }}>{stepLabels[step - 1]}</div>
            </div>
          </div>

          {totalSteps > 1 && <Stepper step={step} total={totalSteps}/>}

          {/* ── Step 1: datos personales ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={GRP}><label style={LBL}>Nombre completo *</label><input style={INP} type="text" value={s1.nombre} onChange={e => setF1('nombre', e.target.value)} placeholder="Juan Pérez"/></div>
              <div style={GRP}><label style={LBL}>Email *</label><input style={INP} type="email" value={s1.email} onChange={e => setF1('email', e.target.value)} placeholder="tu@email.com"/></div>
              <div style={GRP}><label style={LBL}>Contraseña * (mín. 6 caracteres)</label><input style={INP} type="password" value={s1.password} onChange={e => setF1('password', e.target.value)} placeholder="••••••••"/></div>
              <div className="reg-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={GRP}><label style={LBL}>Teléfono *</label><input style={INP} type="tel" value={s1.telefono} onChange={e => setF1('telefono', e.target.value)} placeholder="351 4567890"/></div>
                <div style={GRP}>
                  <label style={LBL}>CUIT/CUIL * (XX-XXXXXXXX-X)</label>
                  <input style={INP} type="text" value={s1.cuit_cuil} onChange={e => setF1('cuit_cuil', formatCuit(e.target.value))} placeholder="20-12345678-9" maxLength={13}/>
                </div>
              </div>
              <div style={GRP}><label style={LBL}>Provincia / Zona de operación *</label><input style={INP} type="text" value={s1.zona} onChange={e => setF1('zona', e.target.value)} placeholder="Ej: Córdoba, Corrientes…"/></div>
            </div>
          )}

          {/* ── Step 2: datos camión ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={GRP}><label style={LBL}>Patente *</label><input style={{ ...INP, textTransform: 'uppercase' }} type="text" value={s2.patente} onChange={e => setF2('patente', e.target.value.toUpperCase())} placeholder="AA 123 BB"/></div>
              <div className="reg-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={GRP}><label style={LBL}>Marca *</label><input style={INP} type="text" value={s2.marca_camion} onChange={e => setF2('marca_camion', e.target.value)} placeholder="Mercedes, Iveco…"/></div>
                <div style={GRP}><label style={LBL}>Modelo *</label><input style={INP} type="text" value={s2.modelo_camion} onChange={e => setF2('modelo_camion', e.target.value)} placeholder="Atego, Stralis…"/></div>
              </div>
              <div className="reg-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={GRP}><label style={LBL}>Año *</label><input style={INP} type="number" value={s2.año_camion} onChange={e => setF2('año_camion', e.target.value)} placeholder={String(new Date().getFullYear())} min="1980" max={new Date().getFullYear()}/></div>
                <div style={GRP}><label style={LBL}>Capacidad (kg) *</label><input style={INP} type="number" value={s2.capacidad_kg} onChange={e => setF2('capacidad_kg', e.target.value)} placeholder="25000"/></div>
              </div>
              <div style={GRP}>
                <label style={LBL}>Tipo de remolque * <span style={{ fontSize: 11, color: '#aaa', fontWeight: 400 }}>(podés elegir varios)</span></label>
                <TipoRemolqueCards selected={tiposRemolque} onChange={v => { setTiposRemolque(v); setError(''); }} />
              </div>
            </div>
          )}

          {/* ── Step 3: fotos ── */}
          {step === 3 && (
            <div>
              <p style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.5 }}>
                Subí las fotos requeridas para verificar tu identidad y habilitación. Cada foto debe ser legible.
              </p>
              <div className="reg-photo-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <FotoBox label="DNI frente" preview={fotos.foto_dni_frente} onChange={v => setFotos(p => ({ ...p, foto_dni_frente: v }))}/>
                <FotoBox label="DNI dorso"  preview={fotos.foto_dni_dorso}  onChange={v => setFotos(p => ({ ...p, foto_dni_dorso: v }))}/>
                <FotoBox label="Licencia de conducir" preview={fotos.foto_licencia} onChange={v => setFotos(p => ({ ...p, foto_licencia: v }))}/>
                <FotoBox label="Camión / Jaula" preview={fotos.foto_camion} onChange={v => setFotos(p => ({ ...p, foto_camion: v }))}/>
              </div>
              <p style={{ fontSize: 11, color: '#aaa' }}>* Las 4 fotos son obligatorias. Se comprimen automáticamente.</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ marginTop: 14, background: 'rgba(217,79,79,.08)', border: '1px solid rgba(217,79,79,.2)', borderRadius: 8, padding: '10px 14px', color: '#C03030', fontSize: 13 }}>
              ⚠ {error}
            </div>
          )}

          {/* Button */}
          <button
            onClick={nextStep}
            disabled={loading}
            style={{ marginTop: 18, width: '100%', background: '#E07A34', color: '#fff', border: 'none', borderRadius: 9, padding: '13px', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .7 : 1, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {loading ? (
              <><span style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }}/> Enviando...</>
            ) : step === totalSteps ? (rol === 'transportista' ? 'Enviar solicitud de verificación' : 'Crear cuenta') : 'Continuar →'}
          </button>

        </div>

        <p style={{ textAlign: 'center', fontSize: 14, marginTop: 24, color: 'rgba(255,255,255,.6)' }}>
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" style={{ color: '#8BAF4E', fontWeight: 600, textDecoration: 'none' }}>Iniciar sesión</Link>
        </p>
      </div>
    </main>
  );
}
