'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

interface Props {
  origenLat: number;
  origenLng: number;
  destinoLat?: number;
  destinoLng?: number;
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

export default function MapViewClient({
  origenLat, origenLng,
  destinoLat, destinoLng,
  height = '320px',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasDestino   = destinoLat != null && destinoLng != null;

  useEffect(() => {
    if (!containerRef.current) return;
    const key = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? '';

    const center: [number, number] = hasDestino
      ? [(origenLng + destinoLng!) / 2, (origenLat + destinoLat!) / 2]
      : [origenLng, origenLat];

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.maptiler.com/maps/hybrid/style.json?key=${key}`,
      center,
      zoom: hasDestino ? 6 : 12,
      scrollZoom: false,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('load', () => {
      if (hasDestino) {
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [[origenLng, origenLat], [destinoLng!, destinoLat!]],
            },
          },
        });
        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          paint: {
            'line-color': '#8BAF4E',
            'line-width': 3,
            'line-opacity': 0.7,
            'line-dasharray': [2, 2],
          },
        });

        const bounds = new maplibregl.LngLatBounds();
        bounds.extend([origenLng, origenLat]);
        bounds.extend([destinoLng!, destinoLat!]);
        map.fitBounds(bounds, { padding: 60 });
      }
    });

    new maplibregl.Marker({ element: originMarker() })
      .setLngLat([origenLng, origenLat])
      .setPopup(new maplibregl.Popup({ closeButton: false, offset: 18, className: 'arreo-popup' })
        .setHTML('<strong style="color:#8BAF4E">Punto de origen</strong>'))
      .addTo(map);

    if (hasDestino) {
      new maplibregl.Marker({ element: destinoMarker() })
        .setLngLat([destinoLng!, destinoLat!])
        .setPopup(new maplibregl.Popup({ closeButton: false, offset: 18, className: 'arreo-popup' })
          .setHTML('<strong style="color:#E07A34">Punto de destino</strong>'))
        .addTo(map);
    }

    return () => { map.remove(); };
  }, [origenLat, origenLng, destinoLat, destinoLng, hasDestino]);

  return (
    <>
      <style>{`
        @keyframes arreo-pulse{0%,100%{box-shadow:0 0 12px rgba(139,175,78,.6),0 0 0 0 rgba(139,175,78,.4)}70%{box-shadow:0 0 12px rgba(139,175,78,.6),0 0 0 10px rgba(139,175,78,0)}}
        ${POPUP_CSS}
      `}</style>
      <div ref={containerRef} style={{ height, width: '100%' }} />
    </>
  );
}
