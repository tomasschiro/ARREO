'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import AppSidebar from '@/components/AppSidebar';
import api from '@/lib/api';
import { X, Plus, Trash2, ChevronLeft } from 'lucide-react';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoteForm {
  id: string;
  tipo_hacienda: string;
  cantidad_cabezas_estimada: string;
  descripcion: string;
  origen_direccion: string;
  origen_lat: number | null;
  origen_lng: number | null;
}

interface LocationValue { lat: number; lng: number; address: string }

const TIPOS_HACIENDA = ['Novillos', 'Vacas', 'Terneros', 'Toros', 'Vaquillonas', 'Hacienda mixta'];

// ─── AgregarLoteModal ─────────────────────────────────────────────────────────

function AgregarLoteModal({ onClose, onAdd }: { onClose: () => void; onAdd: (l: LoteForm) => void }) {
  const [tipo_hacienda, setTipoHacienda]     = useState('');
  const [cantidad, setCantidad]               = useState('');
  const [descripcion, setDescripcion]         = useState('');
  const [origenLoc, setOrigenLoc]             = useState<LocationValue | null>(null);
  const [err, setErr]                         = useState('');

  function handleAdd() {
    if (!tipo_hacienda) { setErr('Seleccioná el tipo de hacienda'); return; }
    onAdd({
      id: Math.random().toString(36).slice(2),
      tipo_hacienda,
      cantidad_cabezas_estimada: cantidad,
      descripcion,
      origen_direccion: origenLoc?.address ?? '',
      origen_lat: origenLoc?.lat ?? null,
      origen_lng: origenLoc?.lng ?? null,
    });
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 16px 64px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: '#1F2B1F', padding: '18px 24px', borderRadius: '18px 18px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Agregar lote</div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><X size={14} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Tipo de hacienda *</label>
            <select value={tipo_hacienda} onChange={e => setTipoHacienda(e.target.value)} style={{ width: '100%', border: '1px solid #E0E0E0', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#111', background: '#fff' }}>
              <option value="">Seleccioná…</option>
              {TIPOS_HACIENDA.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Cantidad estimada de cabezas</label>
            <input type="number" min="1" value={cantidad} onChange={e => setCantidad(e.target.value)} placeholder="Ej: 120" style={{ width: '100%', border: '1px solid #E0E0E0', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#111', background: '#fff' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Descripción (opcional)</label>
            <textarea rows={2} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Ej: Novillos de invernada, 380 kg promedio" style={{ width: '100%', border: '1px solid #E0E0E0', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#111', background: '#fff', resize: 'vertical' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Origen del lote (opcional)</label>
            <LocationPicker label="" value={origenLoc} onChange={setOrigenLoc} />
          </div>
          {err && <p style={{ fontSize: 12, color: '#C83030' }}>{err}</p>}
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px', border: '1.5px solid #E0E0E0', borderRadius: 9, background: 'transparent', color: '#666', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleAdd} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 9, background: '#1F2B1F', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Agregar lote
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CrearRematePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [nombre, setNombre]           = useState('');
  const [tipo, setTipo]               = useState<'feria' | 'en_campo'>('feria');
  const [fecha, setFecha]             = useState('');
  const [lugarLoc, setLugarLoc]       = useState<LocationValue | null>(null);
  const [zona, setZona]               = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [plazoFecha, setPlazoFecha]   = useState('');
  const [plazoHora, setPlazoHora]     = useState('12:00');
  const [lotes, setLotes]             = useState<LoteForm[]>([]);
  const [loteModal, setLoteModal]     = useState(false);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [submitting, setSubmitting]   = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (!authLoading && user && user.rol !== 'consignataria') router.push('/dashboard');
  }, [authLoading, user, router]);

  // Auto-detectar zona desde el mapa
  useEffect(() => {
    if (lugarLoc && !zona) {
      const parts = lugarLoc.address.split(', ').filter(p => p !== 'Argentina');
      if (parts.length >= 2) setZona(parts[parts.length - 2]);
    }
  }, [lugarLoc, zona]);

  // Default plazo
  useEffect(() => {
    if (fecha && !plazoFecha) {
      const d = new Date(fecha);
      d.setDate(d.getDate() + 1);
      setPlazoFecha(d.toISOString().split('T')[0]);
    }
  }, [fecha, plazoFecha]);

  const hoy = new Date().toISOString().split('T')[0];

  function validate() {
    const e: Record<string, string> = {};
    if (!nombre.trim()) e.nombre = 'El nombre es obligatorio';
    if (!fecha) e.fecha = 'La fecha es obligatoria';
    if (!lugarLoc) e.lugar = 'Seleccioná el lugar del remate';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const plazoStr = plazoFecha
      ? `${plazoFecha}T${plazoHora}:00`
      : null;

    setSubmitting(true);
    try {
      const { data } = await api.post('/remates', {
        nombre: nombre.trim(),
        tipo,
        fecha,
        lugar_direccion: lugarLoc?.address,
        lugar_lat: lugarLoc?.lat,
        lugar_lng: lugarLoc?.lng,
        zona: zona.trim() || null,
        descripcion: descripcion.trim() || null,
        plazo_coordinacion: plazoStr,
      });

      const remateId = data.remate.id;

      // Crear lotes en paralelo
      if (lotes.length > 0) {
        await Promise.all(
          lotes.map(l =>
            api.post(`/remates/${remateId}/lotes`, {
              tipo_hacienda: l.tipo_hacienda,
              cantidad_cabezas_estimada: l.cantidad_cabezas_estimada ? parseInt(l.cantidad_cabezas_estimada) : null,
              descripcion: l.descripcion || null,
              origen_direccion: l.origen_direccion || null,
              origen_lat: l.origen_lat,
              origen_lng: l.origen_lng,
            })
          )
        );
      }

      router.push(`/remates/${remateId}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setServerError(msg || 'Error al crear el remate');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !user) return null;

  const inputSt: React.CSSProperties = { width: '100%', border: '1px solid #E0E0E0', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#111', background: '#fff', boxSizing: 'border-box' as const };
  const labelSt: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 };

  return (
    <div className="app-layout">
      <AppSidebar />
      <div className="app-panel" style={{ height: '100vh', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: '#fff', padding: '14px 28px', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <Link href="/remates" style={{ display: 'flex', alignItems: 'center', color: '#888', textDecoration: 'none' }}>
            <ChevronLeft size={20} />
          </Link>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>Crear remate</div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>Completá los datos del remate ganadero</div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', background: '#F2F2F0', padding: '24px 28px' }}>
          <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Datos básicos */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,.05)', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2B1F', borderBottom: '1px solid #F0F0F0', paddingBottom: 12 }}>Datos del remate</div>

              {/* Nombre */}
              <div>
                <label style={labelSt}>Nombre del remate *</label>
                <input
                  type="text" value={nombre} onChange={e => { setNombre(e.target.value); setErrors(p => ({ ...p, nombre: '' })); }}
                  placeholder="Ej: Remate Chacabuco — Mayo 2025"
                  style={{ ...inputSt, borderColor: errors.nombre ? '#C83030' : '#E0E0E0' }}
                />
                {errors.nombre && <p style={{ fontSize: 11, color: '#C83030', marginTop: 4 }}>{errors.nombre}</p>}
              </div>

              {/* Tipo */}
              <div>
                <label style={labelSt}>Tipo de remate</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {([['feria', '🏟️ Feria'], ['en_campo', '🌾 En campo']] as const).map(([val, label]) => (
                    <button key={val} type="button" onClick={() => setTipo(val)}
                      style={{ flex: 1, padding: '12px', border: `2px solid ${tipo === val ? '#1F2B1F' : '#E0E0E0'}`, borderRadius: 10, background: tipo === val ? '#1F2B1F' : '#fff', color: tipo === val ? '#fff' : '#555', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fecha */}
              <div>
                <label style={labelSt}>Fecha del remate *</label>
                <input
                  type="date" min={hoy} value={fecha} onChange={e => { setFecha(e.target.value); setErrors(p => ({ ...p, fecha: '' })); }}
                  style={{ ...inputSt, borderColor: errors.fecha ? '#C83030' : '#E0E0E0' }}
                />
                {errors.fecha && <p style={{ fontSize: 11, color: '#C83030', marginTop: 4 }}>{errors.fecha}</p>}
              </div>

              {/* Descripción */}
              <div>
                <label style={labelSt}>Descripción (opcional)</label>
                <textarea rows={3} value={descripcion} onChange={e => setDescripcion(e.target.value)}
                  placeholder="Información adicional del remate…"
                  style={{ ...inputSt, resize: 'vertical' }} />
              </div>
            </div>

            {/* Lugar */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,.05)', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2B1F', borderBottom: '1px solid #F0F0F0', paddingBottom: 12 }}>Lugar</div>
              <LocationPicker label="Lugar del remate *" value={lugarLoc} onChange={setLugarLoc} error={errors.lugar} />
              <div>
                <label style={labelSt}>Zona / Departamento</label>
                <input type="text" value={zona} onChange={e => setZona(e.target.value)}
                  placeholder="Ej: Gualeguaychú, Entre Ríos"
                  style={inputSt} />
                <p style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>Se autodetecta del mapa. Usamos esta zona para notificar transportistas.</p>
              </div>
            </div>

            {/* Plazo de coordinación */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,.05)', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2B1F', borderBottom: '1px solid #F0F0F0', paddingBottom: 12 }}>Plazo de coordinación</div>
              <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
                Hasta cuándo los transportistas pueden confirmar sus viajes. Por defecto: mediodía del día siguiente al remate.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
                <div>
                  <label style={labelSt}>Fecha</label>
                  <input type="date" value={plazoFecha} onChange={e => setPlazoFecha(e.target.value)} style={inputSt} />
                </div>
                <div style={{ width: 110 }}>
                  <label style={labelSt}>Hora</label>
                  <input type="time" value={plazoHora} onChange={e => setPlazoHora(e.target.value)} style={inputSt} />
                </div>
              </div>
            </div>

            {/* Lotes */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,.05)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F0F0F0', paddingBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2B1F' }}>Lotes estimados</div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>Opcional. Podés agregarlos después.</div>
                </div>
                <button type="button" onClick={() => setLoteModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', border: 'none', borderRadius: 8, background: '#1F2B1F', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <Plus size={14} /> Agregar lote
                </button>
              </div>

              {lotes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#ccc', fontSize: 13 }}>
                  Sin lotes agregados todavía
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {lotes.map((l, i) => (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8F8F6', borderRadius: 10, padding: '12px 16px' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>
                          Lote {i + 1} — {l.tipo_hacienda}
                          {l.cantidad_cabezas_estimada && ` · ${l.cantidad_cabezas_estimada} cab. est.`}
                        </div>
                        {l.origen_direccion && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Origen: {l.origen_direccion.split(',')[0]}</div>}
                        {l.descripcion && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{l.descripcion}</div>}
                      </div>
                      <button type="button" onClick={() => setLotes(prev => prev.filter(x => x.id !== l.id))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C83030', display: 'flex', padding: 4 }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            {serverError && (
              <div style={{ background: 'rgba(200,48,48,.08)', border: '1px solid rgba(200,48,48,.2)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#C83030' }}>
                {serverError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, paddingBottom: 24 }}>
              <Link href="/remates" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', border: '1.5px solid #E0E0E0', borderRadius: 10, color: '#666', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                Cancelar
              </Link>
              <button type="submit" disabled={submitting}
                style={{ flex: 2, padding: '12px', border: 'none', borderRadius: 10, background: '#E07A34', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: submitting ? .7 : 1 }}>
                {submitting ? 'Creando remate…' : 'Crear remate'}
              </button>
            </div>

          </div>
        </form>
      </div>

      {loteModal && (
        <AgregarLoteModal
          onClose={() => setLoteModal(false)}
          onAdd={l => { setLotes(prev => [...prev, l]); }}
        />
      )}
    </div>
  );
}
