'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix webpack default icon
const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Centra el mapa cuando cambian las coords externamente
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center, 13); }, [center, map]);
  return null;
}

// Mueve el marcador al hacer click en el mapa
function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

// Marcador arrastrable
function DraggableMarker({
  position,
  onDragEnd,
}: {
  position: L.LatLng;
  onDragEnd: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  const handlers = useMemo(() => ({
    dragend() {
      const m = markerRef.current;
      if (m) { const ll = m.getLatLng(); onDragEnd(ll.lat, ll.lng); }
    },
  }), [onDragEnd]);

  return (
    <Marker draggable position={position} ref={markerRef} eventHandlers={handlers} icon={markerIcon} />
  );
}

export interface MapPickerClientProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

export default function MapPickerClient({ lat, lng, onChange }: MapPickerClientProps) {
  const position = useMemo(() => new L.LatLng(lat, lng), [lat, lng]);

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={13}
      style={{ height: '250px', width: '100%', borderRadius: '12px', zIndex: 0 }}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <MapController center={[lat, lng]} />
      <ClickHandler onClick={onChange} />
      <DraggableMarker position={position} onDragEnd={onChange} />
    </MapContainer>
  );
}
