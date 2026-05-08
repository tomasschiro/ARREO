'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Beef, Calendar, MapPin, Radio, Truck } from 'lucide-react';

const TrackingMap = dynamic(() => import('@/components/TrackingMapClient'), { ssr: false });

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');

interface ViajePublico {
  id: number;
  origen: string;
  destino: string;
  fecha_salida: string;
  tipo_hacienda: string;
  cantidad_cabezas: number;
  origen_lat: number;
  origen_lng: number;
  destino_lat: number;
  destino_lng: number;
  ubicacion_lat: number | null;
  ubicacion_lng: number | null;
  ubicacion_actualizada_en: string | null;
  estado: string;
}

function calcETA(lat: number, lng: number, destLat: number, destLng: number): string {
  const R = 6371;
  const dLat = (destLat - lat) * Math.PI / 180;
  const dLng = (destLng - lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const hrs = distKm / 80;
  if (hrs < 0.5) return 'Menos de 30 min';
  if (hrs < 1)   return `~${Math.round(hrs * 60)} min`;
  const h = Math.floor(hrs);
  const m = Math.round((hrs - h) * 60);
  return `~${h}h${m > 0 ? ` ${m}min` : ''}`;
}

function timeSince(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60)   return `Hace ${secs}s`;
  if (secs < 3600) return `Hace ${Math.floor(secs / 60)} min`;
  return `Hace ${Math.floor(secs / 3600)}h`;
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function SeguimientoPage() {
  const { token } = useParams<{ token: string }>();
  const [viaje,     setViaje]     = useState<ViajePublico | null>(null);
  const [notFound,  setNotFound]  = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchViaje = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/seguimiento/${token}`);
      if (!res.ok) { setNotFound(true); return; }
      const { viaje: v } = await res.json();
      setViaje(v);
      setLastFetch(new Date());
    } catch { /* mantener última ubicación conocida */ }
  }, [token]);

  useEffect(() => {
    fetchViaje();
    intervalRef.current = setInterval(fetchViaje, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchViaje]);

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: '#1F2B1F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Truck size={24} color="rgba(255,255,255,.4)" />
        </div>
        <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 15, fontWeight: 600 }}>Link de seguimiento inválido o expirado</p>
        <a href="/" style={{ color: '#8BAF4E', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>Ir a ARREO</a>
      </div>
    );
  }

  if (!viaje) {
    return (
      <div style={{ minHeight: '100vh', background: '#1F2B1F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #8BAF4E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'seg-spin 1s linear infinite' }} />
        <style>{`@keyframes seg-spin { to { transform:rotate(360deg); } }`}</style>
      </div>
    );
  }

  const hasMap = viaje.origen_lat && viaje.origen_lng && viaje.destino_lat && viaje.destino_lng;
  const hasLocation = viaje.ubicacion_lat != null && viaje.ubicacion_lng != null;

  return (
    <div style={{ minHeight: '100vh', background: '#1F2B1F', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes seg-spin { to { transform:rotate(360deg); } }
        @keyframes seg-live  { 0%,100% { opacity:1; } 50% { opacity:.15; } }
        @media (max-width: 640px) {
          .seg-info-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ background: '#243024', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,.1)', flexShrink: 0 }}>
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '.1em' }}>ARREO</span>
        </a>
        <span style={{ color: 'rgba(255,255,255,.3)' }}>•</span>
        <span style={{ color: 'rgba(255,255,255,.55)', fontSize: 12 }}>Seguimiento de viaje</span>
        {hasLocation && (
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#EF4444', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.25)', padding: '3px 9px', borderRadius: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', display: 'inline-block', animation: 'seg-live 1.2s ease-in-out infinite' }} />
            En vivo
          </span>
        )}
      </div>

      {/* Mapa — ocupa el espacio disponible */}
      <div style={{ flex: 1, minHeight: 300, position: 'relative' }}>
        {hasMap ? (
          <TrackingMap
            origenLat={viaje.origen_lat}   origenLng={viaje.origen_lng}
            destinoLat={viaje.destino_lat} destinoLng={viaje.destino_lng}
            currentLat={viaje.ubicacion_lat} currentLng={viaje.ubicacion_lng}
            height="100%"
          />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.3)', fontSize: 13 }}>
            <MapPin size={20} style={{ marginRight: 6 }} /> Mapa no disponible
          </div>
        )}
      </div>

      {/* Panel inferior */}
      <div style={{ background: '#243024', borderTop: '1px solid rgba(255,255,255,.08)', padding: '20px', flexShrink: 0 }}>

        {/* Ruta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8BAF4E', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{viaje.origen.split(',')[0]}</span>
            </div>
            <div style={{ width: 1, height: 10, background: 'rgba(255,255,255,.15)', marginLeft: 3 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E07A34', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{viaje.destino.split(',')[0]}</span>
            </div>
          </div>

          {hasLocation && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>ETA estimado</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#8BAF4E' }}>
                {calcETA(viaje.ubicacion_lat as number, viaje.ubicacion_lng as number, viaje.destino_lat, viaje.destino_lng)}
              </div>
            </div>
          )}
        </div>

        {/* Info chips */}
        <div className="seg-info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={10} /> Salida</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{fmtFecha(viaje.fecha_salida)}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}><Beef size={10} /> Hacienda</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{viaje.tipo_hacienda}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginBottom: 3 }}>Cabezas</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{viaje.cantidad_cabezas}</div>
          </div>
        </div>

        {/* Estado de ubicación */}
        {hasLocation && viaje.ubicacion_actualizada_en ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,.4)' }}>
            <Radio size={11} />
            Última actualización: {timeSince(viaje.ubicacion_actualizada_en)}
            {lastFetch && <span style={{ marginLeft: 'auto' }}>Próxima actualización: ~{30 - Math.floor((Date.now() - lastFetch.getTime()) / 1000)}s</span>}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,.3)' }}>
            <Radio size={11} />
            Esperando señal GPS del transportista…
          </div>
        )}
      </div>
    </div>
  );
}
