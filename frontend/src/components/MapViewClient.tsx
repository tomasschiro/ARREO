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

function dotMarker(color: string): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = `width:16px;height:16px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px ${color}99`;
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
      style: `https://api.maptiler.com/maps/backdrop-dark/style.json?key=${key}`,
      center,
      zoom: hasDestino ? 6 : 12,
      scrollZoom: false,
    });

    map.on('load', () => {
      if (hasDestino) {
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [
                [origenLng, origenLat],
                [destinoLng!, destinoLat!],
              ],
            },
          },
        });
        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          paint: { 'line-color': '#8BAF4E', 'line-width': 2, 'line-dasharray': [2, 2] },
        });

        const bounds = new maplibregl.LngLatBounds();
        bounds.extend([origenLng, origenLat]);
        bounds.extend([destinoLng!, destinoLat!]);
        map.fitBounds(bounds, { padding: 60 });
      }
    });

    new maplibregl.Marker({ element: dotMarker('#8BAF4E') })
      .setLngLat([origenLng, origenLat])
      .addTo(map);

    if (hasDestino) {
      new maplibregl.Marker({ element: dotMarker('#E07A34') })
        .setLngLat([destinoLng!, destinoLat!])
        .addTo(map);
    }

    return () => { map.remove(); };
  }, [origenLat, origenLng, destinoLat, destinoLng, hasDestino]);

  return <div ref={containerRef} style={{ height, width: '100%' }} />;
}
