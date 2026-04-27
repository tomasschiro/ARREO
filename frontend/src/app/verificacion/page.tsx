'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

function ToroBull() {
  return (
    <svg width="40" height="40" viewBox="22 40 158 120" fill="none" style={{ color: '#BDD18A' }}>
      <g transform="translate(0,200) scale(0.1,-0.1)" stroke="currentColor" strokeWidth="20" strokeLinejoin="round" strokeLinecap="round" fill="none">
        <path d="M340 1421 c-19 -36 -11 -101 20 -165 57 -117 110 -153 265 -180 78-13 93 -19 114 -44 22 -27 62 -159 91 -297 28 -134 135 -205 241 -161 73 31 105 78 119 177 6 39 14 78 19 87 5 9 11 37 15 62 7 47 38 109 62 123 8 4 14 17 14 27 0 11 3 20 8 21 4 0 16 2 27 4 11 1 47 5 81 9 75 7 141 34 174 72 89 101 123 207 84 262 -32 46 -73 19 -93 -61 -23 -96 -64 -139 -153 -162 -51 -12-76 -14 -100 -7 -18 6 -52 14 -75 17 -24 4 -46 11 -49 16 -3 5 -27 20 -52 32-37 17 -65 22 -133 22 -78 0 -92 -3 -160 -36 -99 -49 -168 -64 -222 -51 -23 6-58 14 -77 18 -39 8 -90 42 -90 61 0 7 -4 13 -8 13 -9 0 -32 59 -32 84 0 9 -7 30 -15 46 -18 35 -58 41 -75 11z"/>
      </g>
    </svg>
  );
}

export default function VerificacionPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<string | null>(null);
  const [motivo, setMotivo] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    api.get('/auth/estado')
      .then(({ data }) => { setEstado(data.estado); setMotivo(data.motivo_rechazo); })
      .catch(() => router.push('/login'));
  }, [router]);

  function handleLogout() {
    localStorage.removeItem('token');
    router.push('/login');
  }

  if (!estado) {
    return (
      <div style={{ minHeight: '100vh', background: '#1F2B1F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '3px solid #BDD18A', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}/>
      </div>
    );
  }

  if (estado === 'aprobado') {
    router.push('/dashboard');
    return null;
  }

  const isRechazado = estado === 'rechazado';

  return (
    <div style={{ minHeight: '100vh', background: '#1F2B1F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <ToroBull/>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '.1em' }}>ARREO</div>
          <div style={{ fontSize: 9, color: '#BDD18A', letterSpacing: '.16em', textTransform: 'uppercase' }}>Transporte Ganadero Inteligente</div>
        </div>
      </div>

      {/* Card */}
      <div style={{ background: '#fff', borderRadius: 20, padding: '36px 32px', maxWidth: 460, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.3)', textAlign: 'center' }}>

        {isRechazado ? (
          <>
            <div style={{ fontSize: 52, marginBottom: 14 }}>❌</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#C83030', marginBottom: 10 }}>Solicitud rechazada</h2>
            <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: motivo ? 16 : 24 }}>
              Tu solicitud de verificación no fue aprobada.
            </p>
            {motivo && (
              <div style={{ background: 'rgba(200,48,48,.06)', border: '1px solid rgba(200,48,48,.15)', borderRadius: 10, padding: '14px 16px', marginBottom: 24, textAlign: 'left' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#C83030', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>Motivo del rechazo:</div>
                <p style={{ fontSize: 13, color: '#555', margin: 0, lineHeight: 1.5 }}>{motivo}</p>
              </div>
            )}
            <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
              Podés volver a registrarte con la documentación correcta o contactar a soporte.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link href="/register" style={{ background: '#E07A34', color: '#fff', borderRadius: 9, padding: '12px', fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'block' }}>
                Volver a registrarme
              </Link>
              <a href="https://wa.me/5491100000000?text=Hola%2C%20mi%20solicitud%20fue%20rechazada%20en%20ARREO%20y%20quiero%20consultar" target="_blank" rel="noopener noreferrer"
                style={{ background: '#25D366', color: '#fff', borderRadius: 9, padding: '12px', fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'block' }}>
                💬 Contactar soporte por WhatsApp
              </a>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 52, marginBottom: 14 }}>⏳</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2B1F', marginBottom: 10 }}>Cuenta en verificación</h2>
            <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 20 }}>
              El equipo de ARREO está revisando tu información{estado === 'pendiente' && ' y documentación'}.
              Recibirás acceso completo dentro de las próximas <strong>24–48 horas</strong>.
            </p>
            <div style={{ background: '#F8F8F6', borderRadius: 10, padding: '14px 18px', marginBottom: 24, textAlign: 'left' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Estado del proceso</div>
              {[
                { label: 'Registro completado', done: true },
                { label: 'Revisión de documentación', done: false, active: true },
                { label: 'Cuenta habilitada', done: false },
              ].map(it => (
                <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, background: it.done ? '#8BAF4E' : it.active ? 'rgba(224,122,52,.2)' : '#F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
                    {it.done ? '✓' : it.active ? '⋯' : ''}
                  </div>
                  <span style={{ fontSize: 13, color: it.done ? '#4d6b1a' : it.active ? '#E07A34' : '#aaa', fontWeight: it.active ? 600 : 400 }}>{it.label}</span>
                </div>
              ))}
            </div>
            <a href="https://wa.me/5491100000000?text=Hola%2C%20registré%20mi%20cuenta%20en%20ARREO%20y%20quiero%20consultar%20el%20estado" target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', background: '#25D366', color: '#fff', borderRadius: 9, padding: '11px', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginBottom: 10 }}>
              💬 Contactar soporte por WhatsApp
            </a>
          </>
        )}

        <button onClick={handleLogout} style={{ marginTop: 4, background: 'none', border: 'none', color: '#aaa', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
