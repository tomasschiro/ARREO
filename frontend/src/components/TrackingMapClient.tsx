'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
});

const orangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
});

function makeTruckIcon() {
  return new L.DivIcon({
    html: `
      <div style="
        width:38px;height:38px;
        background:#2563EB;
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 12px rgba(37,99,235,.7);
        animation:arreo-truck-pulse 2s ease-in-out infinite;
      ">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
             stroke="white" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="3" width="15" height="13" rx="1"/>
          <path d="M16 8h4l3 3v5h-7V8z"/>
          <circle cx="5.5" cy="18.5" r="2.5"/>
          <circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
      </div>`,
    className: '',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(points as L.LatLngBoundsExpression, { padding: [48, 48] });
    }
  }, [map, points]);
  return null;
}

interface Props {
  origenLat: number;
  origenLng: number;
  destinoLat: number;
  destinoLng: number;
  currentLat?: number | null;
  currentLng?: number | null;
  height?: string;
}

export default function TrackingMapClient({
  origenLat, origenLng, destinoLat, destinoLng,
  currentLat, currentLng,
  height = '360px',
}: Props) {
  const origen: [number, number]  = [origenLat, origenLng];
  const destino: [number, number] = [destinoLat, destinoLng];
  const hasCurrent = currentLat != null && currentLng != null;
  const current: [number, number] | null = hasCurrent
    ? [currentLat as number, currentLng as number]
    : null;

  const center: [number, number] = current ?? [
    (origenLat + destinoLat) / 2,
    (origenLng + destinoLng) / 2,
  ];

  const boundsPoints: [number, number][] = current
    ? [origen, current, destino]
    : [origen, destino];

  return (
    <>
      <style>{`
        @keyframes arreo-truck-pulse {
          0%,100% { transform:scale(1); box-shadow:0 2px 12px rgba(37,99,235,.7); }
          50%      { transform:scale(1.18); box-shadow:0 4px 22px rgba(37,99,235,.9); }
        }
      `}</style>
      <MapContainer
        center={center}
        zoom={7}
        style={{ height, width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Origen y destino */}
        <Marker position={origen}  icon={greenIcon} />
        <Marker position={destino} icon={orangeIcon} />

        {current ? (
          <>
            {/* Camión en posición actual */}
            <Marker position={current} icon={makeTruckIcon()} />
            {/* Recorrido ya hecho: sólido verde */}
            <Polyline positions={[origen, current]} color="#8BAF4E" weight={3} />
            {/* Resto del recorrido: punteado naranja */}
            <Polyline positions={[current, destino]} color="#E07A34" dashArray="8 5" weight={2} opacity={0.7} />
          </>
        ) : (
          /* Sin ubicación activa: ruta completa punteada */
          <Polyline positions={[origen, destino]} color="#8BAF4E" dashArray="8 6" weight={2} />
        )}

        <FitBounds points={boundsPoints} />
      </MapContainer>
    </>
  );
}
