'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppSidebar from '@/components/AppSidebar';
import api from '@/lib/api';

interface Mensaje {
  id: number;
  asunto: string;
  contenido: string;
  leido: boolean;
  created_at: string;
  remitente_nombre?: string;
  remitente_email?: string;
  destinatario_nombre?: string;
}

function MensajeCard({ m, onRead }: { m: Mensaje; onRead: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const fecha = new Date(m.created_at).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  function handleClick() {
    setExpanded(v => !v);
    if (!m.leido) onRead(m.id);
  }

  return (
    <div
      onClick={handleClick}
      style={{
        backgroundColor: 'var(--color-blanco)',
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer',
        boxShadow: !m.leido ? '0 2px 16px rgba(139,175,78,0.15)' : 'var(--shadow-card)',
        border: !m.leido ? '1px solid rgba(139,175,78,0.35)' : '1px solid #F0F0F0',
      }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0, backgroundColor: !m.leido ? '#8BAF4E' : 'transparent' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
            <p style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: !m.leido ? 700 : 500, color: !m.leido ? 'var(--color-carbon)' : 'var(--color-text-muted)' }}>
              {m.remitente_nombre ?? m.destinatario_nombre}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {!m.leido && (
                <span className="badge badge-success" style={{ fontSize: 10 }}>Nuevo</span>
              )}
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{fecha}</span>
            </div>
          </div>
          <p style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: !m.leido ? 'var(--color-carbon)' : 'var(--color-text-subtle)' }}>
            {m.asunto}
          </p>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', whiteSpace: 'pre-wrap', marginTop: 12 }}>{m.contenido}</p>
          {m.remitente_email && (
            <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginTop: 8 }}>
              Responder a:{' '}
              <a href={`mailto:${m.remitente_email}`} style={{ color: '#8BAF4E', fontWeight: 500, textDecoration: 'none' }}>
                {m.remitente_email}
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function MensajesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tab,      setTab]      = useState<'recibidos' | 'enviados'>('recibidos');
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/mensajes/${tab}`);
      setMensajes(data.mensajes);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { if (user) load(); }, [user, load]);

  async function handleRead(id: number) {
    try {
      await api.put(`/mensajes/${id}/leer`);
      setMensajes(prev => prev.map(m => m.id === id ? { ...m, leido: true } : m));
    } catch { /* silencioso */ }
  }

  const noLeidos = mensajes.filter(m => !m.leido).length;

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
            <h2 className="header-title">Mensajes</h2>
            <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginTop: 2 }}>Comunicaciones internas</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', backgroundColor: 'rgba(139,175,78,0.15)', color: '#4d6b1a' }}>
              {(user.nombre ?? user.name ?? '?')[0]}
            </div>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-carbon)' }}>{user.nombre ?? user.name}</span>
          </div>
        </header>

        <main className="page-content">
          <div style={{ maxWidth: 640, margin: '0 auto' }}>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, backgroundColor: 'white', padding: 4, borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', marginBottom: 24 }}>
              {(['recibidos', 'enviados'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  style={{
                    flex: 1, padding: '8px 0', fontSize: 14, fontWeight: 600, borderRadius: 'var(--radius-md)',
                    border: 'none', cursor: 'pointer', transition: 'all .15s', textTransform: 'capitalize',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    backgroundColor: tab === t ? '#1F2B1F' : 'transparent',
                    color: tab === t ? 'white' : 'var(--color-text-muted)',
                  }}>
                  {t === 'recibidos' ? '📥' : '📤'} {t}
                  {t === 'recibidos' && noLeidos > 0 && tab !== 'recibidos' && (
                    <span style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: '#8BAF4E', color: 'white', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                      {noLeidos}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
                <div className="animate-spin" style={{ width: 32, height: 32, border: '4px solid #8BAF4E', borderTopColor: 'transparent', borderRadius: '50%' }} />
              </div>
            ) : mensajes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--color-text-muted)' }}>
                <p style={{ fontSize: 36, marginBottom: 12 }}>{tab === 'recibidos' ? '📭' : '📤'}</p>
                <p style={{ fontWeight: 500 }}>No tenés mensajes {tab}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {mensajes.map(m => (
                  <MensajeCard key={m.id} m={m} onRead={handleRead} />
                ))}
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
