'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

function ToroBull() {
  return (
    <svg width="52" height="52" viewBox="22 40 158 120" fill="none" style={{ color: '#1F2B1F' }}>
      <g transform="translate(0,200) scale(0.1,-0.1)" stroke="currentColor" strokeWidth="20" strokeLinejoin="round" strokeLinecap="round" fill="none">
        <path d="M340 1421 c-19 -36 -11 -101 20 -165 57 -117 110 -153 265 -180 78-13 93 -19 114 -44 22 -27 62 -159 91 -297 28 -134 135 -205 241 -161 73 31 105 78 119 177 6 39 14 78 19 87 5 9 11 37 15 62 7 47 38 109 62 123 8 4 14 17 14 27 0 11 3 20 8 21 4 0 16 2 27 4 11 1 47 5 81 9 75 7 141 34 174 72 89 101 123 207 84 262 -32 46 -73 19 -93 -61 -23 -96 -64 -139 -153 -162 -51 -12-76 -14 -100 -7 -18 6 -52 14 -75 17 -24 4 -46 11 -49 16 -3 5 -27 20 -52 32-37 17 -65 22 -133 22 -78 0 -92 -3 -160 -36 -99 -49 -168 -64 -222 -51 -23 6-58 14 -77 18 -39 8 -90 42 -90 61 0 7 -4 13 -8 13 -9 0 -32 59 -32 84 0 9 -7 30 -15 46 -18 35 -58 41 -75 11z"/>
      </g>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Completá todos los campos'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);

      const estado = data.usuario?.estado;
      if (estado === 'superadmin' || estado === 'aprobado' || data.usuario?.rol === 'superadmin') {
        router.push('/dashboard');
      } else {
        // pendiente, rechazado, suspendido → pantalla de verificación
        router.push('/verificacion');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Email o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div className="auth-card">

          <div className="auth-logo">
            <ToroBull />
            <div className="auth-logo-name">ARREO</div>
            <div className="auth-logo-tag">Transporte Ganadero Inteligente</div>
          </div>

          <h1 className="auth-title">Iniciar sesión</h1>
          <p className="auth-subtitle">Ingresá a tu cuenta para continuar</p>

          <form className="auth-form" onSubmit={handleSubmit}>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com" className="form-input" />
            </div>

            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" className="form-input" />
            </div>

            {error && (
              <div style={{ backgroundColor: 'var(--color-error-bg)', border: '1px solid rgba(217,79,79,.2)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--color-error)', fontSize: 13 }}>
                ⚠ {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary btn-full btn-lg">
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                  Ingresando...
                </span>
              ) : 'Ingresar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 14, marginTop: 24, color: 'rgba(255,255,255,0.6)' }}>
          ¿No tenés cuenta?{' '}
          <Link href="/register" style={{ color: '#8BAF4E', fontWeight: 600, textDecoration: 'none' }}>
            Registrarse
          </Link>
        </p>
      </div>
    </main>
  );
}
