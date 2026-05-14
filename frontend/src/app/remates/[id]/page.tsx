'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';

const MapView = dynamic(() => import('@/components/MapViewClient'), { ssr: false });
import AppSidebar from '@/components/AppSidebar';
import StarRating from '@/components/StarRating';
import api from '@/lib/api';
import {
  Check, X, MapPin, Calendar, Users, Package,
  ChevronLeft, Plus, AlertTriangle, Clock, Zap, Layers,
} from 'lucide-react';
import type { Remate, RemateLote, RemateTransportista } from '@/types';

function jaulaBadge(pesoTotal: number | null | undefined): { label: string; color: string } | null {
  if (!pesoTotal) return null;
  if (pesoTotal <= 6000)  return { label: 'Jaula simple',  color: '#5a7a2a' };
  if (pesoTotal <= 14000) return { label: 'Acoplado',      color: '#b85e1e' };
  return                         { label: 'Semirremolque', color: '#7a2a2a' };
}

function filtrarAgrupables(pendientes: RemateLote[], lotePrincipal: RemateLote, tipoRemate: 'feria' | 'en_campo'): RemateLote[] {
  if (pendientes.length === 0) return [];
  if (tipoRemate === 'feria') return pendientes;
  const refOrigen = lotePrincipal.origen_direccion?.split(',')[0]?.toLowerCase().trim() || '';
  if (!refOrigen) return pendientes;
  return pendientes.filter(l => {
    const o = l.origen_direccion?.split(',')[0]?.toLowerCase().trim() || '';
    return !o || o === refOrigen;
  });
}

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false });

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface LocationValue { lat: number; lng: number; address: string }

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtDatetime(iso: string) {
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

// ─── Countdown ────────────────────────────────────────────────────────────────

function Countdown({ plazo }: { plazo: string }) {
  const [diff, setDiff] = useState(new Date(plazo).getTime() - Date.now());

  useEffect(() => {
    const t = setInterval(() => setDiff(new Date(plazo).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [plazo]);

  if (diff <= 0) return <span style={{ color: '#C83030', fontWeight: 700, fontSize: 13 }}>Plazo vencido</span>;

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const urgent = diff < 3600000;

  return (
    <span style={{ fontWeight: 700, fontSize: 13, color: urgent ? '#C83030' : '#1F2B1F', display: 'flex', alignItems: 'center', gap: 5 }}>
      {urgent && <AlertTriangle size={13} color="#C83030" />}
      {h > 0 && `${h}h `}{m}m {s}s
    </span>
  );
}

// ─── Estado badge ─────────────────────────────────────────────────────────────

function EstadoBadge({ estado, size = 'md' }: { estado: string; size?: 'sm' | 'md' }) {
  const cfg: Record<string, { bg: string; color: string; dot: string; pulse: boolean; label: string }> = {
    borrador:  { bg: 'rgba(0,0,0,.06)',     color: '#888',    dot: '#ccc',    pulse: false, label: 'Borrador' },
    publicado: { bg: 'rgba(139,175,78,.15)',color: '#5a7a2a', dot: '#8BAF4E', pulse: false, label: 'Publicado' },
    en_curso:  { bg: 'rgba(224,122,52,.15)',color: '#b85e1e', dot: '#E07A34', pulse: true,  label: 'En curso' },
    cerrado:   { bg: 'rgba(50,50,50,.1)',   color: '#444',    dot: '#888',    pulse: false, label: 'Cerrado' },
    cancelado: { bg: 'rgba(200,48,48,.1)',  color: '#C83030', dot: '#C83030', pulse: false, label: 'Cancelado' },
    pendiente: { bg: 'rgba(0,0,0,.06)',     color: '#888',    dot: '#ccc',    pulse: false, label: 'Pendiente' },
    vendido:   { bg: 'rgba(139,175,78,.15)',color: '#5a7a2a', dot: '#8BAF4E', pulse: false, label: 'Vendido' },
  };
  const c = cfg[estado] ?? cfg.borrador;
  const fs = size === 'sm' ? 10 : 11;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: c.bg, color: c.color, fontSize: fs, fontWeight: 600, padding: '3px 9px', borderRadius: 6 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0, boxShadow: c.pulse ? `0 0 5px ${c.dot}` : 'none', display: 'inline-block', animation: c.pulse ? 'rm-blink 1.4s ease-in-out infinite' : 'none' }} />
      {c.label}
    </span>
  );
}

// ─── AgregarLoteModal ─────────────────────────────────────────────────────────

function AgregarLoteModal({ remateId, onClose, onCreated }: {
  remateId: number; onClose: () => void; onCreated: (l: RemateLote) => void;
}) {
  const TIPOS = ['Novillos', 'Vacas', 'Terneros', 'Toros', 'Vaquillonas', 'Hacienda mixta'];
  const [tipo_hacienda, setTipoHacienda] = useState('');
  const [cantidad, setCantidad]           = useState('');
  const [pesoProm, setPesoProm]           = useState('');
  const [descripcion, setDescripcion]     = useState('');
  const [origenLoc, setOrigenLoc]         = useState<LocationValue | null>(null);
  const [saving, setSaving]               = useState(false);
  const [err, setErr]                     = useState('');

  const pesoTotal = cantidad && pesoProm ? Math.round(Number(cantidad) * Number(pesoProm)) : null;
  const badge = jaulaBadge(pesoTotal);

  async function handleAdd() {
    if (!tipo_hacienda) { setErr('Seleccioná el tipo de hacienda'); return; }
    setSaving(true);
    try {
      const { data } = await api.post(`/remates/${remateId}/lotes`, {
        tipo_hacienda,
        cantidad_cabezas_estimada: cantidad ? parseInt(cantidad) : null,
        descripcion: descripcion || null,
        origen_direccion: origenLoc?.address || null,
        origen_lat: origenLoc?.lat || null,
        origen_lng: origenLoc?.lng || null,
        peso_promedio_kg: pesoProm ? parseFloat(pesoProm) : null,
        peso_total_kg: pesoTotal || null,
      });
      onCreated(data.lote);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setErr(msg || 'Error al agregar lote');
    } finally { setSaving(false); }
  }

  const inp: React.CSSProperties = { width: '100%', border: '1px solid #E0E0E0', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#111', background: '#fff' };
  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 16px 64px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: '#1F2B1F', padding: '18px 24px', borderRadius: '18px 18px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Agregar lote</div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><X size={14} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={lbl}>Tipo de hacienda *</label>
            <select value={tipo_hacienda} onChange={e => setTipoHacienda(e.target.value)} style={inp}>
              <option value="">Seleccioná…</option>
              {TIPOS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Cantidad estimada (cab.)</label>
              <input type="number" min="1" value={cantidad} onChange={e => setCantidad(e.target.value)} placeholder="Ej: 120" style={inp} />
            </div>
            <div>
              <label style={lbl}>Peso promedio (kg/cab.)</label>
              <input type="number" min="1" value={pesoProm} onChange={e => setPesoProm(e.target.value)} placeholder="Ej: 380" style={inp} />
            </div>
          </div>
          {pesoTotal !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F8F8F6', borderRadius: 8, padding: '10px 14px' }}>
              <span style={{ fontSize: 13, color: '#555' }}>Peso total: <strong>{pesoTotal.toLocaleString('es-AR')} kg</strong></span>
              {badge && <span style={{ fontSize: 11, fontWeight: 700, background: `${badge.color}18`, color: badge.color, padding: '2px 8px', borderRadius: 5 }}>{badge.label}</span>}
            </div>
          )}
          <div>
            <label style={lbl}>Descripción</label>
            <textarea rows={2} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Detalles del lote…" style={{ ...inp, resize: 'vertical' as const }} />
          </div>
          <div>
            <label style={lbl}>Origen del lote</label>
            <LocationPicker label="" value={origenLoc} onChange={setOrigenLoc} />
          </div>
          {err && <p style={{ fontSize: 12, color: '#C83030' }}>{err}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px', border: '1.5px solid #E0E0E0', borderRadius: 9, background: 'transparent', color: '#666', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleAdd} disabled={saving} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 9, background: '#1F2B1F', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? .7 : 1 }}>
              {saving ? 'Agregando…' : 'Agregar lote'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VendidoModal ─────────────────────────────────────────────────────────────

function VendidoModal({ remateId, lote, tipoRemate, onClose, onDone }: {
  remateId: number; lote: RemateLote; tipoRemate: 'feria' | 'en_campo';
  onClose: () => void; onDone: () => void;
}) {
  const [comprador, setComprador]         = useState('');
  const [destinoLoc, setDestinoLoc]       = useState<LocationValue | null>(null);
  const [saving, setSaving]               = useState(false);
  const [err, setErr]                     = useState('');
  const [phase, setPhase]                 = useState<'form' | 'agrupar'>('form');
  const [viajeId, setViajeId]             = useState<number | null>(null);
  const [agrupables, setAgrupables]       = useState<RemateLote[]>([]);
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [agrupando, setAgrupando]         = useState(false);

  async function handleVendido() {
    if (!destinoLoc) { setErr('El destino del lote es obligatorio'); return; }
    setSaving(true);
    try {
      const { data } = await api.put(`/remates/${remateId}/lotes/${lote.id}/vendido`, {
        comprador_nombre: comprador.trim() || null,
        destino_direccion: destinoLoc.address,
        destino_lat: destinoLoc.lat,
        destino_lng: destinoLoc.lng,
      });
      setViajeId(data.viaje.id);
      const otros: RemateLote[] = data.otros_lotes_pendientes || [];
      const grupables = filtrarAgrupables(otros, lote, tipoRemate);
      if (grupables.length > 0 && comprador.trim()) {
        setAgrupables(grupables);
        setSeleccionados(new Set(grupables.map(l => l.id)));
        setPhase('agrupar');
      } else {
        onDone();
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setErr(msg || 'Error al marcar como vendido');
    } finally { setSaving(false); }
  }

  async function handleAgrupar() {
    if (!viajeId || !destinoLoc || seleccionados.size === 0) { onDone(); return; }
    setAgrupando(true);
    try {
      await api.post(`/remates/${remateId}/agrupar`, {
        viaje_id: viajeId,
        lote_ids: Array.from(seleccionados),
        comprador_nombre: comprador.trim() || null,
        destino_direccion: destinoLoc.address,
        destino_lat: destinoLoc.lat,
        destino_lng: destinoLoc.lng,
      });
      onDone();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setErr(msg || 'Error al agrupar lotes');
    } finally { setAgrupando(false); }
  }

  function toggleLote(id: number) {
    setSeleccionados(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  const inp: React.CSSProperties = { width: '100%', border: '1px solid #E0E0E0', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#111', background: '#fff' };
  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 16 }} onClick={phase === 'form' ? onClose : undefined}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 16px 64px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background: '#1F2B1F', padding: '18px 24px', borderRadius: '18px 18px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
            {phase === 'form' ? 'Lote vendido' : 'Agrupar en un solo viaje'}
          </div>
          {phase === 'form' && (
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><X size={14} /></button>
          )}
        </div>

        {/* Phase: form */}
        {phase === 'form' && (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#F8F8F6', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#555' }}>
              <strong>{lote.tipo_hacienda}</strong>
              {lote.cantidad_cabezas_estimada && ` · ${lote.cantidad_cabezas_estimada} cab. est.`}
              {lote.peso_total_kg && ` · ${lote.peso_total_kg.toLocaleString('es-AR')} kg`}
            </div>
            <div>
              <label style={lbl}>Nombre del comprador (opcional)</label>
              <input type="text" value={comprador} onChange={e => setComprador(e.target.value)} placeholder="Ej: Juan Rodríguez" style={inp} />
            </div>
            <div>
              <label style={lbl}>Destino del traslado *</label>
              <LocationPicker label="" value={destinoLoc} onChange={setDestinoLoc} error={err.includes('destino') ? err : undefined} />
            </div>
            <div style={{ background: 'rgba(224,122,52,.08)', border: '1px solid rgba(224,122,52,.2)', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Zap size={13} color="#E07A34" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#b85e1e' }}>Se crea un viaje automáticamente</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#b85e1e' }}>Al confirmar, los transportistas pre-anotados tienen 30 minutos para confirmar.</p>
            </div>
            {err && !err.includes('destino') && <p style={{ fontSize: 12, color: '#C83030' }}>{err}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '10px', border: '1.5px solid #E0E0E0', borderRadius: 9, background: 'transparent', color: '#666', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleVendido} disabled={saving} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 9, background: '#8BAF4E', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? .7 : 1 }}>
                {saving ? 'Procesando…' : 'Confirmar venta y crear viaje'}
              </button>
            </div>
          </div>
        )}

        {/* Phase: agrupar */}
        {phase === 'agrupar' && (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(139,175,78,.08)', border: '1px solid rgba(139,175,78,.25)', borderRadius: 10, padding: '12px 16px' }}>
              <Layers size={16} color="#5a7a2a" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#3a5a1a', marginBottom: 3 }}>
                  {comprador} tiene {agrupables.length} lote{agrupables.length !== 1 ? 's' : ''} más disponible{agrupables.length !== 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: 12, color: '#5a7a2a' }}>
                  ¿Querés agruparlos en un solo viaje con el mismo destino?
                  {tipoRemate === 'en_campo' && ' (mismo origen)'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {agrupables.map(l => (
                <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: `1.5px solid ${seleccionados.has(l.id) ? '#8BAF4E' : '#E0E0E0'}`, borderRadius: 10, cursor: 'pointer', background: seleccionados.has(l.id) ? 'rgba(139,175,78,.06)' : '#fff' }}>
                  <input type="checkbox" checked={seleccionados.has(l.id)} onChange={() => toggleLote(l.id)} style={{ accentColor: '#8BAF4E', width: 16, height: 16, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>
                      {l.tipo_hacienda || 'Hacienda'}
                      {l.cantidad_cabezas_estimada && ` · ${l.cantidad_cabezas_estimada} cab.`}
                    </div>
                    {l.peso_total_kg && <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{l.peso_total_kg.toLocaleString('es-AR')} kg</div>}
                    {l.origen_direccion && <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>{l.origen_direccion.split(',')[0]}</div>}
                  </div>
                </label>
              ))}
            </div>
            {err && <p style={{ fontSize: 12, color: '#C83030' }}>{err}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onDone} style={{ flex: 1, padding: '10px', border: '1.5px solid #E0E0E0', borderRadius: 9, background: 'transparent', color: '#666', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Viajes separados
              </button>
              <button onClick={handleAgrupar} disabled={agrupando || seleccionados.size === 0} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 9, background: '#8BAF4E', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (agrupando || seleccionados.size === 0) ? .6 : 1 }}>
                {agrupando ? 'Agrupando…' : `Agrupar ${seleccionados.size} lote${seleccionados.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AsignarModal ─────────────────────────────────────────────────────────────

function AsignarModal({ remateId, lote, transportistas, onClose, onDone }: {
  remateId: number; lote: RemateLote; transportistas: RemateTransportista[];
  onClose: () => void; onDone: () => void;
}) {
  const [selected, setSelected] = useState<number | 'auto'>('auto');
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');

  async function handleAsignar() {
    setSaving(true);
    try {
      await api.post(`/remates/${remateId}/lotes/${lote.id}/asignar`, {
        transportista_id: selected === 'auto' ? undefined : selected,
      });
      onDone();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setErr(msg || 'Error al asignar');
    } finally { setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 16px 64px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: '#1F2B1F', padding: '18px 24px', borderRadius: '18px 18px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Asignar transportista</div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><X size={14} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, color: '#555' }}>Lote: <strong>{lote.tipo_hacienda}</strong></div>

          {/* Auto-asignar */}
          <div
            onClick={() => setSelected('auto')}
            style={{ border: `2px solid ${selected === 'auto' ? '#1F2B1F' : '#E0E0E0'}`, borderRadius: 10, padding: '12px 16px', cursor: 'pointer', background: selected === 'auto' ? 'rgba(31,43,31,.04)' : '#fff' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={14} color="#E07A34" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>Asignación automática</span>
            </div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>Selecciona al transportista con mejor ranking y capacidad</div>
          </div>

          {/* Lista de transportistas */}
          {transportistas.map(t => (
            <div
              key={t.transportista_id}
              onClick={() => setSelected(t.transportista_id)}
              style={{ border: `2px solid ${selected === t.transportista_id ? '#1F2B1F' : '#E0E0E0'}`, borderRadius: 10, padding: '12px 16px', cursor: 'pointer', background: selected === t.transportista_id ? 'rgba(31,43,31,.04)' : '#fff', display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(139,175,78,.15)', color: '#4d6b1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                {t.nombre[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.nombre}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                  {(t.cantidad_reseñas ?? 0) > 0 && <StarRating value={Number(t.puntuacion_promedio ?? 0)} size="sm" />}
                  {t.zona && <span style={{ fontSize: 11, color: '#888' }}>{t.zona}</span>}
                  {t.tipo_remolque && <span style={{ fontSize: 10, fontWeight: 600, background: '#F2F2F0', color: '#555', padding: '1px 6px', borderRadius: 4 }}>{t.tipo_remolque}</span>}
                </div>
              </div>
            </div>
          ))}

          {transportistas.length === 0 && (
            <div style={{ fontSize: 13, color: '#aaa', textAlign: 'center', padding: '12px 0' }}>
              No hay transportistas pre-anotados. La asignación automática no está disponible.
            </div>
          )}

          {err && <p style={{ fontSize: 12, color: '#C83030' }}>{err}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px', border: '1.5px solid #E0E0E0', borderRadius: 9, background: 'transparent', color: '#666', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleAsignar} disabled={saving || (selected === 'auto' && transportistas.length === 0)} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 9, background: '#E07A34', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (saving || (selected === 'auto' && transportistas.length === 0)) ? .6 : 1 }}>
              {saving ? 'Asignando…' : 'Asignar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RemateDetallePage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const remateId = Number(params.id);

  const [remate,        setRemate]        = useState<Remate | null>(null);
  const [lotes,         setLotes]         = useState<RemateLote[]>([]);
  const [transportistas, setTransportistas] = useState<RemateTransportista[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [publishing,    setPublishing]    = useState(false);
  const [closing,       setClosing]       = useState(false);
  const [loteModal,     setLoteModal]     = useState(false);
  const [vendidoLote,   setVendidoLote]   = useState<RemateLote | null>(null);
  const [asignarLote,   setAsignarLote]   = useState<RemateLote | null>(null);
  const [toast,         setToast]         = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get(`/remates/${remateId}`);
      setRemate(data.remate);
      setLotes(data.lotes);
      setTransportistas(data.transportistas);
    } catch { setToast({ message: 'Error al cargar el remate', type: 'error' }); }
    finally { setLoading(false); }
  }, [remateId]);

  useEffect(() => { if (!authLoading && user) cargar(); }, [authLoading, user, cargar]);

  async function handlePublicar() {
    setPublishing(true);
    try {
      await api.put(`/remates/${remateId}/publicar`);
      setToast({ message: 'Remate publicado y transportistas notificados', type: 'success' });
      cargar();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setToast({ message: msg || 'Error al publicar', type: 'error' });
    } finally { setPublishing(false); }
  }

  async function handleCerrar() {
    if (!confirm('¿Cerrás el remate? Esta acción notificará a todos los involucrados.')) return;
    setClosing(true);
    try {
      await api.put(`/remates/${remateId}/cerrar`);
      setToast({ message: 'Remate cerrado', type: 'success' });
      cargar();
    } catch { setToast({ message: 'Error al cerrar', type: 'error' }); }
    finally { setClosing(false); }
  }

  if (authLoading || !user || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F2F2F0' }}>
        <div style={{ width: 32, height: 32, border: '4px solid #8BAF4E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!remate) return null;

  const isOwner = user.id === remate.consignataria_id;
  const esTransportista = user.rol === 'transportista';
  const anotado = transportistas.some(t => t.transportista_id === user.id);
  const activo = ['publicado', 'en_curso'].includes(remate.estado);
  const lotesPendientes = lotes.filter(l => l.estado === 'pendiente');
  const lotesVendidos   = lotes.filter(l => l.estado === 'vendido');
  const diaDelRemate    = new Date(remate.fecha).toDateString() === new Date().toDateString();
  const totalCapKg      = transportistas.reduce((s, t) => s + (t.capacidad_kg ?? 0), 0);

  return (
    <div className="app-layout">
      <style>{`
        @keyframes rm-blink { 0%,100%{opacity:1} 50%{opacity:.25} }
        @media(max-width:900px){
          .rm-panels { flex-direction: column !important; }
          .rm-panel-left { max-width: none !important; }
        }
        @media(max-width:600px){
          .rm-header { padding: 10px 12px !important; }
          .rm-body { padding: 12px !important; }
        }
      `}</style>
      <AppSidebar />
      <div className="app-panel" style={{ height: '100vh', overflow: 'hidden' }}>

        {/* Header */}
        <div className="rm-header" style={{ background: '#fff', padding: '14px 28px', borderBottom: '1px solid #F0F0F0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <Link href="/remates" style={{ display: 'flex', alignItems: 'center', color: '#888', textDecoration: 'none', flexShrink: 0 }}>
                <ChevronLeft size={20} />
              </Link>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{remate.nombre}</div>
                  <EstadoBadge estado={remate.estado} />
                  <span style={{ fontSize: 10, fontWeight: 700, background: remate.tipo === 'feria' ? 'rgba(139,175,78,.15)' : 'rgba(224,122,52,.12)', color: remate.tipo === 'feria' ? '#5a7a2a' : '#b85e1e', padding: '2px 7px', borderRadius: 4 }}>
                    {remate.tipo === 'feria' ? 'Feria' : 'En campo'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#888' }}>
                    <Calendar size={12} /> {fmtFecha(remate.fecha)}
                  </span>
                  {remate.lugar_direccion && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#888' }}>
                      <MapPin size={12} /> {remate.lugar_direccion.split(',').slice(0, 2).join(', ')}
                    </span>
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#888' }}>
                    <Clock size={12} /> Plazo: <Countdown plazo={remate.plazo_coordinacion} />
                  </span>
                </div>
              </div>
            </div>

            {/* Acciones owner */}
            {isOwner && (
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {remate.estado === 'borrador' && (
                  <button onClick={handlePublicar} disabled={publishing}
                    style={{ padding: '8px 16px', border: 'none', borderRadius: 9, background: '#8BAF4E', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: publishing ? .7 : 1 }}>
                    {publishing ? 'Publicando…' : 'Publicar remate'}
                  </button>
                )}
                {activo && (
                  <>
                    <button onClick={() => setLoteModal(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', border: '1.5px solid #E0E0E0', borderRadius: 9, background: '#fff', color: '#555', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      <Plus size={14} /> Lote
                    </button>
                    <button onClick={handleCerrar} disabled={closing}
                      style={{ padding: '8px 14px', border: '1.5px solid rgba(200,48,48,.3)', borderRadius: 9, background: 'transparent', color: '#C83030', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      Cerrar
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Transportista: anotarse */}
            {esTransportista && activo && (
              anotado ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#5a7a2a' }}>
                  <Check size={14} color="#8BAF4E" /> Pre-anotado
                </div>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      await api.post(`/remates/${remateId}/anotarse`, { tipo_remolque: user.tipo_remolque });
                      setToast({ message: 'Te anotaste al remate', type: 'success' });
                      cargar();
                    } catch { setToast({ message: 'Error al anotarse', type: 'error' }); }
                  }}
                  style={{ padding: '8px 16px', border: 'none', borderRadius: 9, background: '#E07A34', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Anotarme
                </button>
              )
            )}
          </div>
        </div>

        {/* Body */}
        <div className="rm-body" style={{ flex: 1, overflowY: 'auto', background: '#F2F2F0', padding: '20px 24px' }}>

          {/* Modo urgente — día del remate */}
          {diaDelRemate && lotesPendientes.length > 0 && isOwner && (
            <div style={{ background: 'rgba(224,122,52,.1)', border: '1px solid rgba(224,122,52,.35)', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Zap size={17} color="#E07A34" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#7a3c10' }}>Modo remate activo — {lotesPendientes.length} lote{lotesPendientes.length !== 1 ? 's' : ''} sin vender</div>
                <div style={{ fontSize: 12, color: '#b05a1e', marginTop: 1 }}>Marcá los lotes como vendidos para crear viajes y notificar a los transportistas.</div>
              </div>
            </div>
          )}

          <div className="rm-panels" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

            {/* Panel izquierdo — Mapa + Transportistas */}
            <div className="rm-panel-left" style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Mapa del lugar */}
              {remate.lugar_lat && remate.lugar_lng && (
                <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
                  <div style={{ background: '#1F2B1F', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <MapPin size={14} color="#BDD18A" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Ubicación del remate</span>
                  </div>
                  <MapView origenLat={remate.lugar_lat} origenLng={remate.lugar_lng} height="180px" />
                  {remate.lugar_direccion && (
                    <div style={{ padding: '10px 16px', fontSize: 11, color: '#888', borderTop: '1px solid #F0F0F0' }}>
                      {remate.lugar_direccion.split(',').slice(0, 3).join(', ')}
                    </div>
                  )}
                </div>
              )}

              <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
                <div style={{ background: '#1F2B1F', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Users size={15} color="#BDD18A" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Transportistas pre-anotados</span>
                  </div>
                  <span style={{ background: 'rgba(189,209,138,.2)', color: '#BDD18A', fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 5 }}>
                    {transportistas.length}
                  </span>
                </div>

                {totalCapKg > 0 && (
                  <div style={{ background: '#F8F8F6', padding: '10px 18px', borderBottom: '1px solid #F0F0F0' }}>
                    <span style={{ fontSize: 11, color: '#888' }}>Capacidad total disponible: </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1F2B1F' }}>{totalCapKg.toLocaleString('es-AR')} kg</span>
                  </div>
                )}

                <div style={{ padding: transportistas.length ? 0 : 20, maxHeight: 420, overflowY: 'auto' }}>
                  {transportistas.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#ccc', fontSize: 13 }}>
                      Sin transportistas pre-anotados todavía
                    </div>
                  ) : transportistas.map(t => {
                    const mismaZona = remate.zona && t.zona && (
                      t.zona.toLowerCase().includes(remate.zona.toLowerCase()) ||
                      remate.zona.toLowerCase().includes(t.zona.toLowerCase())
                    );
                    return (
                      <div key={t.id} style={{ padding: '12px 18px', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(139,175,78,.15)', color: '#4d6b1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                          {t.nombre[0]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.nombre}</span>
                            {mismaZona
                              ? <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(139,175,78,.2)', color: '#5a7a2a', padding: '1px 5px', borderRadius: 3, flexShrink: 0 }}>ZONA</span>
                              : <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(255,200,0,.2)', color: '#7a6000', padding: '1px 5px', borderRadius: 3, flexShrink: 0 }}>ADY</span>
                            }
                          </div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                            {(t.cantidad_reseñas ?? 0) > 0 && <StarRating value={Number(t.puntuacion_promedio ?? 0)} size="sm" />}
                            {t.tipo_remolque && <span style={{ fontSize: 10, fontWeight: 600, background: '#F2F2F0', color: '#555', padding: '1px 6px', borderRadius: 4 }}>{t.tipo_remolque}</span>}
                            {t.capacidad_kg && <span style={{ fontSize: 10, color: '#aaa' }}>{(t.capacidad_kg / 1000).toFixed(0)}t</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Panel derecho — Lotes */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>
                  Lotes ({lotes.length})
                </div>
                {isOwner && activo && (
                  <button onClick={() => setLoteModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', border: 'none', borderRadius: 8, background: '#1F2B1F', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    <Plus size={13} /> Agregar lote
                  </button>
                )}
              </div>

              {lotes.length === 0 && (
                <div style={{ background: '#fff', borderRadius: 14, padding: '40px', textAlign: 'center', color: '#ccc', fontSize: 13 }}>
                  <Package size={28} style={{ marginBottom: 10, opacity: .4 }} />
                  <div>Sin lotes registrados todavía</div>
                </div>
              )}

              {/* Lotes pendientes primero en modo urgente */}
              {[...lotesPendientes, ...lotesVendidos, ...lotes.filter(l => l.estado === 'cancelado')].map((lote, i) => (
                <div key={lote.id} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#aaa' }}>LOTE {i + 1}</span>
                          <EstadoBadge estado={lote.estado} size="sm" />
                          {lote.viaje_id && (
                            <Link href={`/viajes/${lote.viaje_id}`} style={{ fontSize: 10, fontWeight: 700, color: '#8BAF4E', textDecoration: 'none', background: 'rgba(139,175,78,.1)', padding: '1px 6px', borderRadius: 3 }}>
                              Ver viaje →
                            </Link>
                          )}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginTop: 4 }}>
                          {lote.tipo_hacienda || 'Hacienda'}
                          {lote.cantidad_cabezas_estimada && ` · ${lote.cantidad_cabezas_estimada} cab. est.`}
                        </div>
                        {lote.descripcion && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{lote.descripcion}</div>}
                        {lote.peso_total_kg && (() => { const b = jaulaBadge(lote.peso_total_kg); return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <span style={{ fontSize: 12, color: '#555' }}>{lote.peso_total_kg.toLocaleString('es-AR')} kg</span>
                            {b && <span style={{ fontSize: 10, fontWeight: 700, background: `${b.color}18`, color: b.color, padding: '2px 7px', borderRadius: 4 }}>{b.label}</span>}
                          </div>
                        ); })()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                      {lote.origen_direccion && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#555', background: '#F2F2F0', padding: '3px 8px', borderRadius: 5 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#8BAF4E', display: 'inline-block' }} />
                          {lote.origen_direccion.split(',')[0]}
                        </span>
                      )}
                      {lote.destino_direccion && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#555', background: '#F2F2F0', padding: '3px 8px', borderRadius: 5 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#E07A34', display: 'inline-block' }} />
                          {lote.destino_direccion.split(',')[0]}
                        </span>
                      )}
                      {lote.comprador_nombre && (
                        <span style={{ fontSize: 11, color: '#5a7a2a', background: 'rgba(139,175,78,.12)', padding: '3px 8px', borderRadius: 5 }}>
                          Comprador: {lote.comprador_nombre}
                        </span>
                      )}
                    </div>

                    {/* Transportista asignado */}
                    {lote.transportista_asignado_nombre && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#5a7a2a', fontWeight: 600, marginBottom: 10 }}>
                        <Check size={13} color="#8BAF4E" /> Asignado: {lote.transportista_asignado_nombre}
                      </div>
                    )}

                    {/* Acciones */}
                    {isOwner && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        {lote.estado === 'pendiente' && activo && (
                          <button onClick={() => setVendidoLote(lote)}
                            style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 8, background: diaDelRemate ? '#E07A34' : '#1F2B1F', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                            {diaDelRemate ? <Zap size={13} /> : <Check size={13} />}
                            {diaDelRemate ? 'Lote vendido' : 'Marcar como vendido'}
                          </button>
                        )}
                        {lote.estado === 'vendido' && !lote.transportista_asignado_id && (
                          <button onClick={() => setAsignarLote(lote)}
                            style={{ flex: 1, padding: '8px', border: '1.5px solid #E0E0E0', borderRadius: 8, background: '#fff', color: '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            Asignar transportista
                          </button>
                        )}
                        {lote.transportista_asignado_id && (
                          <button onClick={() => setAsignarLote(lote)}
                            style={{ padding: '8px 14px', border: '1.5px solid #E0E0E0', borderRadius: 8, background: '#fff', color: '#888', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            Cambiar transportista
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loteModal && (
        <AgregarLoteModal
          remateId={remateId}
          onClose={() => setLoteModal(false)}
          onCreated={l => { setLotes(prev => [...prev, l]); setLoteModal(false); setToast({ message: 'Lote agregado', type: 'success' }); }}
        />
      )}
      {vendidoLote && (
        <VendidoModal
          remateId={remateId}
          lote={vendidoLote}
          tipoRemate={remate.tipo}
          onClose={() => setVendidoLote(null)}
          onDone={() => { setVendidoLote(null); setToast({ message: 'Lote vendido — viaje creado y transportistas notificados', type: 'success' }); cargar(); }}
        />
      )}
      {asignarLote && (
        <AsignarModal
          remateId={remateId}
          lote={asignarLote}
          transportistas={transportistas}
          onClose={() => setAsignarLote(null)}
          onDone={() => { setAsignarLote(null); setToast({ message: 'Transportista asignado', type: 'success' }); cargar(); }}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
