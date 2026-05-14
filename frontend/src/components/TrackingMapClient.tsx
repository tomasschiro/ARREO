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

const POPUP_CSS = `
  .arreo-popup .maplibregl-popup-content{background:#1F2B1F;border:1px solid #8BAF4E;border-radius:8px;padding:8px 12px;color:#fff;font-size:12px;font-weight:500;box-shadow:0 4px 24px rgba(0,0,0,.5);font-family:inherit}
  .arreo-popup.maplibregl-popup-anchor-bottom .maplibregl-popup-tip{border-top-color:#1F2B1F}
  .arreo-popup.maplibregl-popup-anchor-top .maplibregl-popup-tip{border-bottom-color:#1F2B1F}
  .arreo-popup.maplibregl-popup-anchor-left .maplibregl-popup-tip{border-right-color:#1F2B1F}
  .arreo-popup.maplibregl-popup-anchor-right .maplibregl-popup-tip{border-left-color:#1F2B1F}
  .arreo-popup.maplibregl-popup-anchor-bottom-left .maplibregl-popup-tip,.arreo-popup.maplibregl-popup-anchor-bottom-right .maplibregl-popup-tip{border-top-color:#1F2B1F}
  .arreo-popup.maplibregl-popup-anchor-top-left .maplibregl-popup-tip,.arreo-popup.maplibregl-popup-anchor-top-right .maplibregl-popup-tip{border-bottom-color:#1F2B1F}
`;

function originMarker(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = 'width:20px;height:20px;border-radius:50%;border:3px solid #8BAF4E;background:rgba(139,175,78,0.15);box-shadow:0 0 12px rgba(139,175,78,0.6);display:flex;align-items:center;justify-content:center;cursor:pointer;animation:arreo-pulse 2s ease-in-out infinite';
  const inner = document.createElement('div');
  inner.style.cssText = 'width:10px;height:10px;border-radius:50%;background:#8BAF4E;pointer-events:none';
  el.appendChild(inner);
  return el;
}

function destinoMarker(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = 'width:20px;height:20px;border-radius:50%;border:3px solid #E07A34;background:rgba(224,122,52,0.15);box-shadow:0 0 12px rgba(224,122,52,0.6);display:flex;align-items:center;justify-content:center;cursor:pointer';
  const inner = document.createElement('div');
  inner.style.cssText = 'width:10px;height:10px;border-radius:50%;background:#E07A34;pointer-events:none';
  el.appendChild(inner);
  return el;
}

function truckMarker(): HTMLDivElement {
  const el = document.createElement('div');
  el.innerHTML = `<div style="width:38px;height:38px;background:#3B82F6;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px rgba(59,130,246,.6);animation:arreo-pulse-truck 2s ease-in-out infinite;cursor:pointer"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div>`;
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
  const doneCoords = hasCurrent ? [[oLng, oLat], [curLng!, curLat!]] : [];
  const restCoords = hasCurrent
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
  const containerRef   = useRef<HTMLDivElement>(null);
  const mapRef         = useRef<maplibregl.Map | null>(null);
  const truckMarkerRef = useRef<maplibregl.Marker | null>(null);
  const mapLoadedRef   = useRef(false);

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
      style: `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${key}`,
      center,
      zoom: 7,
      scrollZoom: false,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

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
        paint: { 'line-color': '#8BAF4E', 'line-width': 3, 'line-dasharray': [2, 2], 'line-opacity': 0.7 },
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
          .setPopup(new maplibregl.Popup({ closeButton: false, offset: 22, className: 'arreo-popup' })
            .setHTML('<strong style="color:#3B82F6">Camión en ruta</strong>'))
          .addTo(map);
        truckMarkerRef.current = tm;
      }

      mapLoadedRef.current = true;
    });

    new maplibregl.Marker({ element: originMarker() })
      .setLngLat([origenLng, origenLat])
      .setPopup(new maplibregl.Popup({ closeButton: false, offset: 18, className: 'arreo-popup' })
        .setHTML('<strong style="color:#8BAF4E">Origen del viaje</strong>'))
      .addTo(map);

    new maplibregl.Marker({ element: destinoMarker() })
      .setLngLat([destinoLng, destinoLat])
      .setPopup(new maplibregl.Popup({ closeButton: false, offset: 18, className: 'arreo-popup' })
        .setHTML('<strong style="color:#E07A34">Destino</strong>'))
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
        .setPopup(new maplibregl.Popup({ closeButton: false, offset: 22, className: 'arreo-popup' })
          .setHTML('<strong style="color:#3B82F6">Camión en ruta</strong>'))
        .addTo(map);
    }

    setRouteData(map, true, currentLat, currentLng, origenLat, origenLng, destinoLat, destinoLng);
  }, [currentLat, currentLng, origenLat, origenLng, destinoLat, destinoLng]);

  return (
    <>
      <style>{`
        @keyframes arreo-pulse{0%,100%{box-shadow:0 0 12px rgba(139,175,78,.6),0 0 0 0 rgba(139,175,78,.4)}70%{box-shadow:0 0 12px rgba(139,175,78,.6),0 0 0 10px rgba(139,175,78,0)}}
        @keyframes arreo-pulse-truck{0%,100%{box-shadow:0 0 12px rgba(59,130,246,.6),0 0 0 0 rgba(59,130,246,.4);transform:scale(1)}50%{transform:scale(1.08)}70%{box-shadow:0 0 12px rgba(59,130,246,.6),0 0 0 10px rgba(59,130,246,0)}}
        ${POPUP_CSS}
      `}</style>
      <div ref={containerRef} style={{ height, width: '100%' }} />
    </>
  );
}
