'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppSidebar from '@/components/AppSidebar';
import api from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Metricas {
  total_transportistas: number; total_productores: number; total_consignatarias: number;
  pendientes_aprobacion: number; suspendidos: number; nuevos_7_dias: number;
  total_viajes: number; viajes_disponibles: number; viajes_con_ofertas: number;
  viajes_completos: number; viajes_7_dias: number;
  total_aplicaciones: number; total_disponibilidades: number; total_mensajes: number; total_reseñas: number;
}
interface Usuario {
  id: number; nombre: string; email: string; rol: string; estado: string;
  zona: string | null; telefono: string | null; cuit_cuil: string | null;
  patente: string | null; marca_camion: string | null; modelo_camion: string | null;
  año_camion: number | null; tipo_remolque: string | null; capacidad_kg: number | null;
  foto_dni_frente: string | null; foto_dni_dorso: string | null;
  foto_licencia: string | null; foto_camion: string | null;
  motivo_rechazo: string | null;
  puntuacion_promedio: number | null; cantidad_reseñas: number;
  created_at: string; aprobado_en: string | null; aprobado_por_nombre: string | null;
}
interface Viaje {
  id: number; origen: string; destino: string; fecha_salida: string;
  tipo_hacienda: string; estado: string; publicado_por: string;
  total_aplicaciones: number; created_at: string;
}
interface Disponibilidad {
  id: number; origen_direccion: string; destino_direccion: string;
  fecha: string; tipo_jaula: string; estado: string;
  transportista_nombre: string; transportista_email: string; created_at: string;
}
interface Reseña {
  id: number; puntuacion: number; comentario: string | null;
  transportista_nombre: string; productor_nombre: string; created_at: string;
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

const ESTADO_USUARIO_CLS: Record<string, string> = {
  aprobado:  'badge badge-success',
  pendiente: 'badge badge-warning',
  suspendido: 'badge badge-error',
  rechazado: 'badge badge-error',
};
const ESTADO_VIAJE_CLS: Record<string, string> = {
  disponible: 'badge badge-success',
  con_ofertas: 'badge badge-warning',
  completo: 'badge badge-neutral',
};
const ROL_CLS: Record<string, string> = {
  transportista: 'badge badge-info',
  productor: 'badge badge-success',
  consignataria: 'badge badge-warning',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// ─── Info field ───────────────────────────────────────────────────────────────

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--color-texto-principal)', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({ msg, onConfirm, onCancel }: { msg: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="card" style={{ maxWidth: 360, width: '90%' }}>
        <p style={{ marginBottom: 20, color: 'var(--color-texto-principal)', lineHeight: 1.5 }}>{msg}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" style={{ backgroundColor: '#E24B4A', borderColor: '#E24B4A' }} onClick={onConfirm}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = 'usuarios' | 'viajes' | 'disponibilidades' | 'reseñas';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [metricas, setMetricas]               = useState<Metricas | null>(null);
  const [usuarios, setUsuarios]               = useState<Usuario[]>([]);
  const [viajes, setViajes]                   = useState<Viaje[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidad[]>([]);
  const [reseñas, setReseñas]                 = useState<Reseña[]>([]);

  const [tab, setTab]               = useState<Tab>('usuarios');
  const [busqueda, setBusqueda]     = useState('');
  const [filtroRol, setFiltroRol]   = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const [confirm, setConfirm] = useState<{ msg: string; action: () => void } | null>(null);
  const [loadingAction, setLoadingAction] = useState<number | null>(null);
  const [rechazarModal, setRechazarModal] = useState<{ userId: number; nombre: string } | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [lightboxFoto, setLightboxFoto]   = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user?.rol !== 'superadmin') router.replace('/dashboard');
  }, [user, loading, router]);

  const cargarMetricas = useCallback(() => {
    api.get('/admin/metricas').then(({ data }) => setMetricas(data)).catch(() => {});
  }, []);

  const cargarUsuarios = useCallback(() => {
    const params: Record<string, string> = {};
    if (filtroRol) params.rol = filtroRol;
    if (filtroEstado) params.estado = filtroEstado;
    if (busqueda) params.q = busqueda;
    api.get('/admin/usuarios', { params }).then(({ data }) => setUsuarios(data.usuarios)).catch(() => {});
  }, [filtroRol, filtroEstado, busqueda]);

  const cargarContenido = useCallback(() => {
    api.get('/admin/viajes').then(({ data }) => setViajes(data.viajes)).catch(() => {});
    api.get('/admin/disponibilidades').then(({ data }) => setDisponibilidades(data.disponibilidades)).catch(() => {});
    api.get('/admin/reseñas').then(({ data }) => setReseñas(data.reseñas)).catch(() => {});
  }, []);

  useEffect(() => { cargarMetricas(); }, [cargarMetricas]);
  useEffect(() => { cargarUsuarios(); }, [cargarUsuarios]);
  useEffect(() => { cargarContenido(); }, [cargarContenido]);

  if (loading || user?.rol !== 'superadmin') return null;

  const pendientes = usuarios.filter(u => u.estado === 'pendiente');

  function withConfirm(msg: string, action: () => void) {
    setConfirm({ msg, action });
  }

  async function aprobar(id: number) {
    setLoadingAction(id);
    try { await api.put(`/admin/usuarios/${id}/aprobar`); cargarUsuarios(); cargarMetricas(); }
    catch { /* ignore */ } finally { setLoadingAction(null); }
  }

  async function rechazar(id: number, motivo: string) {
    setLoadingAction(id);
    try { await api.put(`/admin/usuarios/${id}/rechazar`, { motivo }); cargarUsuarios(); cargarMetricas(); }
    catch { /* ignore */ } finally { setLoadingAction(null); }
  }

  async function suspender(id: number) {
    setLoadingAction(id);
    try { await api.put(`/admin/usuarios/${id}/suspender`); cargarUsuarios(); cargarMetricas(); }
    catch { /* ignore */ } finally { setLoadingAction(null); }
  }

  async function activar(id: number) {
    setLoadingAction(id);
    try { await api.put(`/admin/usuarios/${id}/activar`); cargarUsuarios(); cargarMetricas(); }
    catch { /* ignore */ } finally { setLoadingAction(null); }
  }

  async function eliminarUsuario(id: number) {
    setLoadingAction(id);
    try { await api.delete(`/admin/usuarios/${id}`); cargarUsuarios(); cargarMetricas(); }
    catch { /* ignore */ } finally { setLoadingAction(null); }
  }

  async function eliminarViaje(id: number) {
    setLoadingAction(id);
    try { await api.delete(`/admin/viajes/${id}`); cargarContenido(); cargarMetricas(); }
    catch { /* ignore */ } finally { setLoadingAction(null); }
  }

  async function eliminarDisponibilidad(id: number) {
    setLoadingAction(id);
    try { await api.delete(`/admin/disponibilidades/${id}`); cargarContenido(); cargarMetricas(); }
    catch { /* ignore */ } finally { setLoadingAction(null); }
  }

  async function eliminarReseña(id: number) {
    setLoadingAction(id);
    try { await api.delete(`/admin/reseñas/${id}`); cargarContenido(); cargarMetricas(); }
    catch { /* ignore */ } finally { setLoadingAction(null); }
  }

  return (
    <div className="app-layout">
      <AppSidebar />
      <div className="app-content">

        {/* ─── Confirm dialog ─── */}
        {confirm && (
          <ConfirmDialog
            msg={confirm.msg}
            onConfirm={() => { confirm.action(); setConfirm(null); }}
            onCancel={() => setConfirm(null)}
          />
        )}

        {/* ─── Reject modal ─── */}
        {rechazarModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div className="card" style={{ maxWidth: 460, width: '90%' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-texto-principal)', marginBottom: 8 }}>Rechazar solicitud</h3>
              <p style={{ fontSize: 13, color: 'var(--color-texto-secundario)', marginBottom: 16, lineHeight: 1.5 }}>
                Indicá el motivo del rechazo para <strong>{rechazarModal.nombre}</strong>. El usuario lo verá en su pantalla de verificación.
              </p>
              <textarea
                className="form-input"
                rows={4}
                placeholder="Ej: La documentación presentada no es legible. Por favor reenvíe fotos con mejor calidad."
                value={motivoRechazo}
                onChange={e => setMotivoRechazo(e.target.value)}
                style={{ resize: 'vertical', fontFamily: 'inherit', width: '100%' }}
              />
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="btn btn-secondary" onClick={() => { setRechazarModal(null); setMotivoRechazo(''); }}>
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  style={{ backgroundColor: '#E24B4A', borderColor: '#E24B4A' }}
                  disabled={loadingAction === rechazarModal.userId}
                  onClick={async () => {
                    await rechazar(rechazarModal.userId, motivoRechazo);
                    setRechazarModal(null);
                    setMotivoRechazo('');
                  }}
                >
                  Confirmar rechazo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Lightbox ─── */}
        {lightboxFoto && (
          <div
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, cursor: 'zoom-out' }}
            onClick={() => setLightboxFoto(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightboxFoto} alt="Documento" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 0 60px rgba(0,0,0,.8)' }} />
            <button
              style={{ position: 'absolute', top: 20, right: 24, background: 'none', border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer', lineHeight: 1 }}
              onClick={() => setLightboxFoto(null)}
            >✕</button>
          </div>
        )}

        <header className="app-header">
          <h2 className="header-title">Panel de Administración</h2>
          <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: '#E07B39', color: '#fff', padding: '3px 10px', borderRadius: 4, letterSpacing: '0.06em' }}>SUPERADMIN</span>
        </header>

        <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* ─── Métricas ─── */}
          {metricas && (
            <section>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-texto-secundario)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Resumen del sistema</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
                {[
                  { label: 'Transportistas',    val: metricas.total_transportistas,   color: '#3B82F6' },
                  { label: 'Productores',        val: metricas.total_productores,      color: '#8BAF4E' },
                  { label: 'Consignatarias',     val: metricas.total_consignatarias,   color: '#A78BFA' },
                  { label: 'Pendientes aprob.',  val: metricas.pendientes_aprobacion,  color: '#F59E0B', highlight: metricas.pendientes_aprobacion > 0 },
                  { label: 'Suspendidos',        val: metricas.suspendidos,            color: '#E24B4A' },
                  { label: 'Nuevos (7 días)',    val: metricas.nuevos_7_dias,          color: '#10B981' },
                  { label: 'Total viajes',       val: metricas.total_viajes,           color: '#6366F1' },
                  { label: 'Disponibles',        val: metricas.viajes_disponibles,     color: '#8BAF4E' },
                  { label: 'Con ofertas',        val: metricas.viajes_con_ofertas,     color: '#F59E0B' },
                  { label: 'Completos',          val: metricas.viajes_completos,       color: '#6B7280' },
                  { label: 'Aplicaciones',       val: metricas.total_aplicaciones,     color: '#3B82F6' },
                  { label: 'Mensajes',           val: metricas.total_mensajes,         color: '#8B5CF6' },
                ].map(({ label, val, color, highlight }) => (
                  <div key={label} className="card" style={{ padding: '16px 20px', borderLeft: `3px solid ${color}`, outline: highlight ? `2px solid ${color}` : 'none' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color }}>{val}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-texto-secundario)', marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ─── Aprobaciones pendientes ─── */}
          {pendientes.length > 0 && (
            <section>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                ⚠ Pendientes de aprobación ({pendientes.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {pendientes.map(u => (
                  <div key={u.id} className="card" style={{ padding: '20px 24px', borderLeft: '3px solid #F59E0B' }}>

                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-texto-principal)' }}>{u.nombre}</span>
                          <span className={ROL_CLS[u.rol] ?? 'badge badge-neutral'}>{u.rol}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--color-texto-secundario)' }}>{u.email}</div>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-texto-secundario)', whiteSpace: 'nowrap', paddingTop: 4 }}>
                        Registrado {fmtDate(u.created_at)}
                      </div>
                    </div>

                    {/* Info general */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
                      {u.telefono  && <InfoField label="Teléfono"  value={u.telefono} />}
                      {u.cuit_cuil && <InfoField label="CUIT/CUIL" value={u.cuit_cuil} />}
                      {u.zona      && <InfoField label="Zona"      value={u.zona} />}
                    </div>

                    {/* Datos de transportista */}
                    {u.rol === 'transportista' && (
                      <>
                        {(u.patente || u.marca_camion || u.modelo_camion || u.año_camion || u.tipo_remolque || u.capacidad_kg) && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, marginBottom: 16, paddingTop: 12, borderTop: '1px solid var(--color-borde)' }}>
                            {u.patente      && <InfoField label="Patente"   value={u.patente} />}
                            {u.marca_camion && <InfoField label="Marca"     value={u.marca_camion} />}
                            {u.modelo_camion && <InfoField label="Modelo"   value={u.modelo_camion} />}
                            {u.año_camion   && <InfoField label="Año"       value={String(u.año_camion)} />}
                            {u.tipo_remolque && <InfoField label="Remolque" value={u.tipo_remolque} />}
                            {u.capacidad_kg  && <InfoField label="Capacidad" value={`${u.capacidad_kg.toLocaleString('es-AR')} kg`} />}
                          </div>
                        )}

                        {/* Fotos 2x2 */}
                        {(u.foto_dni_frente || u.foto_dni_dorso || u.foto_licencia || u.foto_camion) && (
                          <div style={{ marginBottom: 16, paddingTop: 12, borderTop: '1px solid var(--color-borde)' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Documentación</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              {([
                                { label: 'DNI Frente', src: u.foto_dni_frente },
                                { label: 'DNI Dorso',  src: u.foto_dni_dorso },
                                { label: 'Licencia',   src: u.foto_licencia },
                                { label: 'Camión',     src: u.foto_camion },
                              ] as { label: string; src: string | null }[]).map(({ label, src }) => (
                                <div
                                  key={label}
                                  style={{ position: 'relative', aspectRatio: '16/9', background: '#f0f0ed', borderRadius: 8, overflow: 'hidden', cursor: src ? 'zoom-in' : 'default', border: '1px solid var(--color-borde)' }}
                                  onClick={() => src && setLightboxFoto(src)}
                                >
                                  {src ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={src} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 12 }}>Sin foto</div>
                                  )}
                                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,.52)', color: '#fff', fontSize: 11, padding: '4px 8px', fontWeight: 600 }}>{label}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Acciones */}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid var(--color-borde)' }}>
                      <button
                        className="btn btn-sm btn-secondary"
                        style={{ borderColor: '#E24B4A', color: '#E24B4A' }}
                        disabled={loadingAction === u.id}
                        onClick={() => { setRechazarModal({ userId: u.id, nombre: u.nombre }); setMotivoRechazo(''); }}
                      >
                        Rechazar con motivo
                      </button>
                      <button
                        className="btn btn-sm btn-primary"
                        disabled={loadingAction === u.id}
                        onClick={() => aprobar(u.id)}
                      >
                        ✓ Aprobar
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ─── Gestión de usuarios ─── */}
          <section>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-texto-secundario)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Gestión de usuarios</h3>

            {/* Filtros */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <input
                className="form-input"
                style={{ width: 'auto', flex: 1, minWidth: 180 }}
                placeholder="Buscar por nombre o email…"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
              <select className="form-select" style={{ width: 'auto' }} value={filtroRol} onChange={e => setFiltroRol(e.target.value)}>
                <option value="">Todos los roles</option>
                <option value="transportista">Transportista</option>
                <option value="productor">Productor</option>
                <option value="consignataria">Consignataria</option>
              </select>
              <select className="form-select" style={{ width: 'auto' }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="aprobado">Aprobado</option>
                <option value="rechazado">Rechazado</option>
                <option value="suspendido">Suspendido</option>
              </select>
            </div>

            {/* Tabla */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-superficie)', borderBottom: '1px solid var(--color-borde)' }}>
                      {['Usuario', 'Rol', 'Estado', 'Zona', 'Registro', 'Acciones'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-texto-secundario)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.filter(u => u.estado !== 'pendiente').map((u, i) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--color-borde)', backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-texto-principal)' }}>{u.nombre}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-texto-secundario)' }}>{u.email}</div>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span className={ROL_CLS[u.rol] ?? 'badge badge-neutral'}>{u.rol}</span>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span className={ESTADO_USUARIO_CLS[u.estado] ?? 'badge badge-neutral'}>{u.estado}</span>
                        </td>
                        <td style={{ padding: '10px 16px', color: 'var(--color-texto-secundario)' }}>{u.zona ?? '—'}</td>
                        <td style={{ padding: '10px 16px', color: 'var(--color-texto-secundario)', whiteSpace: 'nowrap' }}>{fmtDate(u.created_at)}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {u.estado === 'aprobado' && (
                              <button
                                className="btn btn-sm btn-secondary"
                                style={{ borderColor: '#F59E0B', color: '#F59E0B', fontSize: 11 }}
                                disabled={loadingAction === u.id}
                                onClick={() => withConfirm(`¿Suspender la cuenta de ${u.nombre}?`, () => suspender(u.id))}
                              >
                                Suspender
                              </button>
                            )}
                            {u.estado === 'suspendido' && (
                              <button
                                className="btn btn-sm btn-primary"
                                style={{ fontSize: 11 }}
                                disabled={loadingAction === u.id}
                                onClick={() => activar(u.id)}
                              >
                                Activar
                              </button>
                            )}
                            {u.estado === 'rechazado' && (
                              <button
                                className="btn btn-sm btn-primary"
                                style={{ fontSize: 11 }}
                                disabled={loadingAction === u.id}
                                onClick={() => aprobar(u.id)}
                              >
                                Aprobar
                              </button>
                            )}
                            <button
                              className="btn btn-sm btn-secondary"
                              style={{ borderColor: '#E24B4A', color: '#E24B4A', fontSize: 11 }}
                              disabled={loadingAction === u.id}
                              onClick={() => withConfirm(`¿Eliminar definitivamente la cuenta de ${u.nombre}? Esta acción no se puede deshacer.`, () => eliminarUsuario(u.id))}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {usuarios.filter(u => u.estado !== 'pendiente').length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--color-texto-secundario)' }}>No hay usuarios que coincidan con los filtros</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ─── Moderación de contenido ─── */}
          <section>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-texto-secundario)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Moderación de contenido</h3>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid var(--color-borde)' }}>
              {(['viajes', 'disponibilidades', 'reseñas'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: '8px 20px', fontSize: 13, fontWeight: 600, border: 'none', background: 'none',
                    cursor: 'pointer', textTransform: 'capitalize',
                    color: tab === t ? 'var(--color-verde-arreo)' : 'var(--color-texto-secundario)',
                    borderBottom: tab === t ? '2px solid var(--color-verde-arreo)' : '2px solid transparent',
                    marginBottom: -2,
                  }}
                >
                  {t === 'viajes' ? `Viajes (${viajes.length})` : t === 'disponibilidades' ? `Disponibilidades (${disponibilidades.length})` : `Reseñas (${reseñas.length})`}
                </button>
              ))}
            </div>

            {/* Viajes */}
            {tab === 'viajes' && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--color-superficie)', borderBottom: '1px solid var(--color-borde)' }}>
                        {['Ruta', 'Hacienda', 'Estado', 'Publicado por', 'Aplicaciones', 'Fecha', ''].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-texto-secundario)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {viajes.map((v, i) => (
                        <tr key={v.id} style={{ borderBottom: '1px solid var(--color-borde)', backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ fontWeight: 600 }}>{v.origen}</div>
                            <div style={{ fontSize: 12, color: 'var(--color-texto-secundario)' }}>{v.destino}</div>
                          </td>
                          <td style={{ padding: '10px 16px', color: 'var(--color-texto-secundario)' }}>{v.tipo_hacienda}</td>
                          <td style={{ padding: '10px 16px' }}><span className={ESTADO_VIAJE_CLS[v.estado] ?? 'badge badge-neutral'}>{v.estado}</span></td>
                          <td style={{ padding: '10px 16px', color: 'var(--color-texto-secundario)' }}>{v.publicado_por}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'center', color: 'var(--color-texto-secundario)' }}>{v.total_aplicaciones}</td>
                          <td style={{ padding: '10px 16px', color: 'var(--color-texto-secundario)', whiteSpace: 'nowrap' }}>{fmtDate(v.fecha_salida)}</td>
                          <td style={{ padding: '10px 16px' }}>
                            <button
                              className="btn btn-sm btn-secondary"
                              style={{ borderColor: '#E24B4A', color: '#E24B4A', fontSize: 11 }}
                              disabled={loadingAction === v.id}
                              onClick={() => withConfirm(`¿Eliminar el viaje de ${v.origen} → ${v.destino}?`, () => eliminarViaje(v.id))}
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                      {viajes.length === 0 && (
                        <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--color-texto-secundario)' }}>No hay viajes</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Disponibilidades */}
            {tab === 'disponibilidades' && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--color-superficie)', borderBottom: '1px solid var(--color-borde)' }}>
                        {['Transportista', 'Ruta', 'Tipo jaula', 'Fecha', 'Estado', ''].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-texto-secundario)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {disponibilidades.map((d, i) => (
                        <tr key={d.id} style={{ borderBottom: '1px solid var(--color-borde)', backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ fontWeight: 600 }}>{d.transportista_nombre}</div>
                            <div style={{ fontSize: 12, color: 'var(--color-texto-secundario)' }}>{d.transportista_email}</div>
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <div>{d.origen_direccion}</div>
                            <div style={{ fontSize: 12, color: 'var(--color-texto-secundario)' }}>{d.destino_direccion}</div>
                          </td>
                          <td style={{ padding: '10px 16px', color: 'var(--color-texto-secundario)' }}>{d.tipo_jaula}</td>
                          <td style={{ padding: '10px 16px', color: 'var(--color-texto-secundario)', whiteSpace: 'nowrap' }}>{fmtDate(d.fecha)}</td>
                          <td style={{ padding: '10px 16px' }}><span className="badge badge-success">{d.estado}</span></td>
                          <td style={{ padding: '10px 16px' }}>
                            <button
                              className="btn btn-sm btn-secondary"
                              style={{ borderColor: '#E24B4A', color: '#E24B4A', fontSize: 11 }}
                              disabled={loadingAction === d.id}
                              onClick={() => withConfirm(`¿Eliminar la disponibilidad de ${d.transportista_nombre}?`, () => eliminarDisponibilidad(d.id))}
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                      {disponibilidades.length === 0 && (
                        <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--color-texto-secundario)' }}>No hay disponibilidades</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Reseñas */}
            {tab === 'reseñas' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {reseñas.map(r => (
                  <div key={r.id} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '16px 20px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#F59E0B' }}>{'★'.repeat(r.puntuacion)}{'☆'.repeat(5 - r.puntuacion)}</span>
                        <span style={{ fontSize: 12, color: 'var(--color-texto-secundario)' }}>{fmtDate(r.created_at)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--color-texto-principal)', marginBottom: 8 }}>{r.comentario ?? <em style={{ color: 'var(--color-texto-secundario)' }}>Sin comentario</em>}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-texto-secundario)', display: 'flex', gap: 16 }}>
                        <span>Transportista: <strong>{r.transportista_nombre}</strong></span>
                        <span>Productor: <strong>{r.productor_nombre}</strong></span>
                      </div>
                    </div>
                    <button
                      className="btn btn-sm btn-secondary"
                      style={{ borderColor: '#E24B4A', color: '#E24B4A', fontSize: 11, flexShrink: 0 }}
                      disabled={loadingAction === r.id}
                      onClick={() => withConfirm(`¿Eliminar la reseña de ${r.puntuacion} estrellas de ${r.productor_nombre}?`, () => eliminarReseña(r.id))}
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
                {reseñas.length === 0 && (
                  <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--color-texto-secundario)' }}>No hay reseñas</div>
                )}
              </div>
            )}

          </section>
        </div>
      </div>
    </div>
  );
}
