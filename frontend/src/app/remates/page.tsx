'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppSidebar from '@/components/AppSidebar';
import api from '@/lib/api';
import { Check, X, MapPin, Calendar, Users, Package, Plus } from 'lucide-react';
import type { Remate, RemateTransportista } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtPlazo(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
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

// ─── Estado badge ─────────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: string }) {
  const cfg: Record<string, { bg: string; color: string; dot: string; pulse: boolean; label: string }> = {
    borrador:  { bg: 'rgba(0,0,0,.06)',       color: '#888',    dot: '#ccc',    pulse: false, label: 'Borrador' },
    publicado: { bg: 'rgba(139,175,78,.15)',   color: '#5a7a2a', dot: '#8BAF4E', pulse: false, label: 'Publicado' },
    en_curso:  { bg: 'rgba(224,122,52,.15)',   color: '#b85e1e', dot: '#E07A34', pulse: true,  label: 'En curso' },
    cerrado:   { bg: 'rgba(50,50,50,.1)',      color: '#444',    dot: '#888',    pulse: false, label: 'Cerrado' },
    cancelado: { bg: 'rgba(200,48,48,.1)',     color: '#C83030', dot: '#C83030', pulse: false, label: 'Cancelado' },
  };
  const c = cfg[estado] ?? cfg.borrador;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: c.bg, color: c.color, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0, boxShadow: c.pulse ? `0 0 5px ${c.dot}` : 'none', display: 'inline-block', animation: c.pulse ? 'rm-blink 1.4s ease-in-out infinite' : 'none' }}/>
      {c.label}
    </span>
  );
}

// ─── AnotarseModal ────────────────────────────────────────────────────────────

function AnotarseModal({ remate, onClose, onDone }: { remate: Remate; onClose: () => void; onDone: () => void }) {
  const { user } = useAuth();
  const [tipo_remolque, setTipoRemolque] = useState(user?.tipo_remolque ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function handleAnotarse() {
    setSaving(true);
    try {
      await api.post(`/remates/${remate.id}/anotarse`, { tipo_remolque });
      onDone();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setErr(msg || 'Error al anotarse');
    } finally { setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 400, boxShadow: '0 16px 64px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: '#1F2B1F', padding: '18px 24px', borderRadius: '18px 18px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Anotarme al remate</div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><X size={14} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 4 }}>{remate.nombre}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{fmtFecha(remate.fecha)} — {remate.lugar_direccion || remate.zona || '—'}</div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Equipo que llevás</label>
            <select
              value={tipo_remolque}
              onChange={e => setTipoRemolque(e.target.value)}
              style={{ width: '100%', border: '1px solid #E0E0E0', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#111', background: '#fff' }}
            >
              <option value="">Seleccioná el tipo de equipo</option>
              <option value="jaula_simple">Jaula simple</option>
              <option value="acoplado">Acoplado</option>
              <option value="semirremolque">Semirremolque</option>
            </select>
          </div>
          {err && <p style={{ fontSize: 12, color: '#C83030' }}>{err}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px', border: '1.5px solid #E0E0E0', borderRadius: 9, background: 'transparent', color: '#666', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleAnotarse} disabled={saving} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 9, background: '#E07A34', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? .7 : 1 }}>
              {saving ? 'Anotando…' : 'Confirmar anotación'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── RemateCard ───────────────────────────────────────────────────────────────

function RemateCard({
  remate, userRol, inscripciones, onAnotarse, onDesanotarse,
}: {
  remate: Remate;
  userRol: string;
  inscripciones: Set<number>;
  onAnotarse: (r: Remate) => void;
  onDesanotarse: (id: number) => void;
}) {
  const esConsignataria = userRol === 'consignataria';
  const esTransportista = userRol === 'transportista';
  const anotado = inscripciones.has(remate.id);
  const activo = ['publicado', 'en_curso'].includes(remate.estado);

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,.05)', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{remate.nombre}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#888' }}>
            <span style={{ fontSize: 10, fontWeight: 700, background: remate.tipo === 'feria' ? 'rgba(139,175,78,.15)' : 'rgba(224,122,52,.12)', color: remate.tipo === 'feria' ? '#5a7a2a' : '#b85e1e', padding: '2px 7px', borderRadius: 4 }}>
              {remate.tipo === 'feria' ? 'Feria' : 'En campo'}
            </span>
          </div>
        </div>
        <EstadoBadge estado={remate.estado} />
      </div>

      {/* Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555' }}>
          <Calendar size={13} color="#8BAF4E" />
          <span>{fmtFecha(remate.fecha)}</span>
        </div>
        {(remate.lugar_direccion || remate.zona) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555' }}>
            <MapPin size={13} color="#E07A34" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {remate.lugar_direccion?.split(',').slice(0, 2).join(', ') || remate.zona}
            </span>
          </div>
        )}
        <div style={{ fontSize: 11, color: '#aaa' }}>
          Plazo: {fmtPlazo(remate.plazo_coordinacion)}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#F2F2F0', color: '#555', fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 5 }}>
          <Package size={11} /> {remate.total_lotes ?? 0} lote{(remate.total_lotes ?? 0) !== 1 ? 's' : ''}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#F2F2F0', color: '#555', fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 5 }}>
          <Users size={11} /> {remate.total_transportistas ?? 0} transportista{(remate.total_transportistas ?? 0) !== 1 ? 's' : ''}
        </span>
        {(remate.lotes_con_viaje ?? 0) > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(139,175,78,.15)', color: '#5a7a2a', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5 }}>
            {remate.lotes_con_viaje} viaje{(remate.lotes_con_viaje ?? 0) !== 1 ? 's' : ''} creado{(remate.lotes_con_viaje ?? 0) !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <Link
          href={`/remates/${remate.id}`}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '9px', border: '1.5px solid #E0E0E0', borderRadius: 9, color: '#555', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}
        >
          Ver detalle
        </Link>
        {esTransportista && activo && (
          anotado ? (
            <button
              onClick={() => onDesanotarse(remate.id)}
              style={{ flex: 1, padding: '9px', border: '1.5px solid rgba(224,122,52,.4)', borderRadius: 9, background: 'transparent', color: '#b05a1e', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Desanotarme
            </button>
          ) : (
            <button
              onClick={() => onAnotarse(remate)}
              style={{ flex: 1, padding: '9px', border: 'none', borderRadius: 9, background: '#E07A34', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              Anotarme
            </button>
          )
        )}
        {esConsignataria && (
          <Link
            href={`/remates/${remate.id}`}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '9px', border: 'none', borderRadius: 9, background: '#1F2B1F', color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}
          >
            Gestionar
          </Link>
        )}
      </div>

      {/* Badge pre-anotado */}
      {esTransportista && anotado && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#5a7a2a', fontWeight: 600 }}>
          <Check size={12} color="#8BAF4E" /> Pre-anotado
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RematesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [remates,      setRemates]      = useState<Remate[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [inscripciones, setInscripciones] = useState<Set<number>>(new Set());
  const [anotarseModal, setAnotarseModal] = useState<Remate | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const cargarRemates = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (user.rol === 'consignataria') {
        const { data } = await api.get('/remates/mis-remates');
        setRemates(data.remates);
      } else {
        const params = user.zona ? `?zona=${encodeURIComponent(user.zona)}` : '';
        const { data } = await api.get(`/remates${params}`);
        setRemates(data.remates);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [user]);

  // Cargar inscripciones del transportista
  const cargarInscripciones = useCallback(async () => {
    if (user?.rol !== 'transportista') return;
    try {
      const { data } = await api.get('/remates');
      // We check inscripciones by fetching each remate detail — simplified: keep a set
      // from the remates list we detect if user is anotado via a separate endpoint or
      // from local state after anotarse/desanotarse
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => { cargarRemates(); }, [cargarRemates]);
  useEffect(() => { cargarInscripciones(); }, [cargarInscripciones]);

  async function handleDesanotarse(remateId: number) {
    try {
      await api.delete(`/remates/${remateId}/anotarse`);
      setInscripciones(prev => { const s = new Set(prev); s.delete(remateId); return s; });
      setToast({ message: 'Te desanotaste del remate', type: 'success' });
    } catch { setToast({ message: 'Error al desanotarse', type: 'error' }); }
  }

  function handleAnotadoExitoso() {
    if (!anotarseModal) return;
    setInscripciones(prev => new Set([...prev, anotarseModal.id]));
    setAnotarseModal(null);
    setToast({ message: 'Te anotaste al remate', type: 'success' });
  }

  if (authLoading || !user) return null;

  const esConsignataria = user.rol === 'consignataria';
  const titulo = esConsignataria ? 'Mis remates' : user.rol === 'transportista' ? 'Remates disponibles' : 'Remates en mi zona';

  return (
    <div className="app-layout">
      <style>{`
        @keyframes rm-blink { 0%,100%{opacity:1} 50%{opacity:.25} }
        @media(max-width:768px){
          .rm-header { padding: 10px 12px !important; }
          .rm-grid { grid-template-columns: 1fr !important; }
          .rm-content { padding: 12px !important; }
        }
      `}</style>
      <AppSidebar />
      <div className="app-panel" style={{ height: '100vh', overflow: 'hidden' }}>

        {/* Header */}
        <div className="rm-header" style={{ background: '#fff', padding: '14px 28px', borderBottom: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>{titulo}</div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
              {esConsignataria ? 'Gestioná tus remates y lotes' : 'Remates ganaderos cerca de tu zona'}
            </div>
          </div>
          {esConsignataria && (
            <Link
              href="/remates/crear"
              style={{ background: '#E07A34', color: '#fff', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={15} /> Crear remate
            </Link>
          )}
        </div>

        {/* Content */}
        <div className="rm-content" style={{ flex: 1, overflowY: 'auto', background: '#F2F2F0', padding: '24px 28px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <div style={{ width: 32, height: 32, border: '4px solid #8BAF4E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : remates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#EAEAE8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={28} color="#ccc" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#888', marginBottom: 4 }}>
                  {esConsignataria ? 'Todavía no creaste ningún remate' : 'No hay remates disponibles en tu zona'}
                </div>
                <div style={{ fontSize: 12, color: '#bbb' }}>
                  {esConsignataria ? 'Creá tu primer remate para coordinar el traslado de hacienda' : 'Los remates publicados en tu zona aparecerán aquí'}
                </div>
              </div>
              {esConsignataria && (
                <Link href="/remates/crear" style={{ background: '#E07A34', color: '#fff', borderRadius: 9, padding: '10px 20px', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={14} /> Crear primer remate
                </Link>
              )}
            </div>
          ) : (
            <div className="rm-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {remates.map(r => (
                <RemateCard
                  key={r.id}
                  remate={r}
                  userRol={user.rol}
                  inscripciones={inscripciones}
                  onAnotarse={setAnotarseModal}
                  onDesanotarse={handleDesanotarse}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {anotarseModal && (
        <AnotarseModal
          remate={anotarseModal}
          onClose={() => setAnotarseModal(null)}
          onDone={handleAnotadoExitoso}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
