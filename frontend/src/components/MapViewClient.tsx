'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default icon
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

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
});

function FitBounds({ origen, destino }: { origen: [number, number]; destino: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds([origen, destino], { padding: [40, 40] });
  }, [map, origen, destino]);
  return null;
}

interface Props {
  origenLat: number;
  origenLng: number;
  destinoLat: number;
  destinoLng: number;
}

export default function MapViewClient({ origenLat, origenLng, destinoLat, destinoLng }: Props) {
  const origen: [number, number] = [origenLat, origenLng];
  const destino: [number, number] = [destinoLat, destinoLng];
  const center: [number, number] = [
    (origenLat + destinoLat) / 2,
    (origenLng + destinoLng) / 2,
  ];

  return (
    <MapContainer center={center} zoom={6} style={{ height: '320px', width: '100%' }} scrollWheelZoom={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <Marker position={origen} icon={greenIcon} />
      <Marker position={destino} icon={redIcon} />
      <Polyline positions={[origen, destino]} color="#8BAF4E" dashArray="8 6" weight={2} />
      <FitBounds origen={origen} destino={destino} />
    </MapContainer>
  );
}
