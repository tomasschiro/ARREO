'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

interface Props {
  origenLat: number;
  origenLng: number;
  destinoLat: number;
  destinoLng: number;
  currentLat?: number | null;
  currentLng?: number | null;
  height?: string;
}

function dotMarker(color: string, pulse = false): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = [
    `width:16px`, `height:16px`, `background:${color}`,
    `border:3px solid white`, `border-radius:50%`,
    pulse ? `animation:tmc-pulse 2s ease-in-out infinite` : `box-shadow:0 2px 8px ${color}99`,
  ].join(';');
  return el;
}

function truckMarker(): HTMLDivElement {
  const el = document.createElement('div');
  el.innerHTML = `
    <div style="width:38px;height:38px;background:#2563EB;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(37,99,235,.7);animation:tmc-truck 2s ease-in-out infinite">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1"/>
        <path d="M16 8h4l3 3v5h-7V8z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    </div>`;
  return el;
}

function setRouteData(
  map: maplibregl.Map,
  hasCurrent: boolean,
  curLat: number | null | undefined,
  curLng: number | null | undefined,
  oLat: number, oLng: number,
  dLat: number, dLng: number,
) {
  const doneCoords  = hasCurrent ? [[oLng, oLat], [curLng!, curLat!]] : [];
  const restCoords  = hasCurrent
    ? [[curLng!, curLat!], [dLng, dLat]]
    : [[oLng, oLat], [dLng, dLat]];

  (map.getSource('route-done') as maplibregl.GeoJSONSource).setData({
    type: 'Feature', properties: {},
    geometry: { type: 'LineString', coordinates: doneCoords },
  });
  (map.getSource('route-rest') as maplibregl.GeoJSONSource).setData({
    type: 'Feature', properties: {},
    geometry: { type: 'LineString', coordinates: restCoords },
  });
}

export default function TrackingMapClient({
  origenLat, origenLng, destinoLat, destinoLng,
  currentLat, currentLng,
  height = '360px',
}: Props) {
  const containerRef    = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<maplibregl.Map | null>(null);
  const truckMarkerRef  = useRef<maplibregl.Marker | null>(null);
  const mapLoadedRef    = useRef(false);

  const curLatRef = useRef(currentLat);
  const curLngRef = useRef(currentLng);
  curLatRef.current = currentLat;
  curLngRef.current = currentLng;

  useEffect(() => {
    if (!containerRef.current) return;
    const key = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? '';

    const hasCur = currentLat != null && currentLng != null;
    const center: [number, number] = hasCur
      ? [currentLng as number, currentLat as number]
      : [(origenLng + destinoLng) / 2, (origenLat + destinoLat) / 2];

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.maptiler.com/maps/backdrop-dark/style.json?key=${key}`,
      center,
      zoom: 7,
      scrollZoom: false,
    });
    mapRef.current = map;

    map.on('load', () => {
      map.addSource('route-done', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
      });
      map.addLayer({
        id: 'route-done',
        type: 'line',
        source: 'route-done',
        paint: { 'line-color': '#8BAF4E', 'line-width': 3 },
      });

      map.addSource('route-rest', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
      });
      map.addLayer({
        id: 'route-rest',
        type: 'line',
        source: 'route-rest',
        paint: { 'line-color': '#E07A34', 'line-width': 2, 'line-dasharray': [2, 2], 'line-opacity': 0.7 },
      });

      const cLat = curLatRef.current;
      const cLng = curLngRef.current;
      const hasCurrent = cLat != null && cLng != null;

      setRouteData(map, hasCurrent, cLat, cLng, origenLat, origenLng, destinoLat, destinoLng);

      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([origenLng, origenLat]);
      if (hasCurrent) bounds.extend([cLng as number, cLat as number]);
      bounds.extend([destinoLng, destinoLat]);
      map.fitBounds(bounds, { padding: 60 });

      if (hasCurrent) {
        const tm = new maplibregl.Marker({ element: truckMarker() })
          .setLngLat([cLng as number, cLat as number])
          .addTo(map);
        truckMarkerRef.current = tm;
      }

      mapLoadedRef.current = true;
    });

    new maplibregl.Marker({ element: dotMarker('#8BAF4E', true) })
      .setLngLat([origenLng, origenLat])
      .addTo(map);

    new maplibregl.Marker({ element: dotMarker('#E07A34') })
      .setLngLat([destinoLng, destinoLat])
      .addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      truckMarkerRef.current = null;
      mapLoadedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;
    if (currentLat == null || currentLng == null) return;

    const lngLat: [number, number] = [currentLng, currentLat];

    if (truckMarkerRef.current) {
      truckMarkerRef.current.setLngLat(lngLat);
    } else {
      truckMarkerRef.current = new maplibregl.Marker({ element: truckMarker() })
        .setLngLat(lngLat)
        .addTo(map);
    }

    setRouteData(map, true, currentLat, currentLng, origenLat, origenLng, destinoLat, destinoLng);
  }, [currentLat, currentLng, origenLat, origenLng, destinoLat, destinoLng]);

  return (
    <>
      <style>{`
        @keyframes tmc-pulse{0%,100%{box-shadow:0 0 0 0 rgba(139,175,78,.5)}70%{box-shadow:0 0 0 10px rgba(139,175,78,0)}}
        @keyframes tmc-truck{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
      `}</style>
      <div ref={containerRef} style={{ height, width: '100%' }} />
    </>
  );
}
