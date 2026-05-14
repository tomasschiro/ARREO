'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

export interface MapPickerClientProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
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

export default function MapPickerClient({ lat, lng, onChange }: MapPickerClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);
  const markerRef    = useRef<maplibregl.Marker | null>(null);
  const onChangeRef  = useRef(onChange);
  onChangeRef.current = onChange;

  const initLatRef = useRef(lat);
  const initLngRef = useRef(lng);

  useEffect(() => {
    if (!containerRef.current) return;
    const key = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? '';

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.maptiler.com/maps/hybrid/style.json?key=${key}`,
      center: [initLngRef.current, initLatRef.current],
      zoom: 13,
      scrollZoom: false,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    const el = document.createElement('div');
    el.style.cssText = 'width:20px;height:20px;border-radius:50%;border:3px solid #8BAF4E;background:rgba(139,175,78,0.15);box-shadow:0 0 12px rgba(139,175,78,0.6);display:flex;align-items:center;justify-content:center;cursor:grab;animation:arreo-pulse 2s ease-in-out infinite';
    const inner = document.createElement('div');
    inner.style.cssText = 'width:10px;height:10px;border-radius:50%;background:#8BAF4E;pointer-events:none';
    el.appendChild(inner);

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: true,
      offset: 18,
      className: 'arreo-popup',
    }).setHTML('<strong style="color:#8BAF4E">Ubicación seleccionada</strong><br><small style="color:#aaa">Arrastrá para ajustar</small>');

    const marker = new maplibregl.Marker({ element: el, draggable: true })
      .setLngLat([initLngRef.current, initLatRef.current])
      .setPopup(popup)
      .addTo(map);
    markerRef.current = marker;

    marker.on('dragend', () => {
      const ll = marker.getLngLat();
      onChangeRef.current(ll.lat, ll.lng);
    });

    map.on('click', (e) => {
      marker.setLngLat(e.lngLat);
      onChangeRef.current(e.lngLat.lat, e.lngLat.lng);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const marker = markerRef.current;
    const map    = mapRef.current;
    if (!marker || !map) return;
    const cur = marker.getLngLat();
    if (Math.abs(cur.lat - lat) < 1e-5 && Math.abs(cur.lng - lng) < 1e-5) return;
    marker.setLngLat([lng, lat]);
    map.easeTo({ center: [lng, lat] });
  }, [lat, lng]);

  return (
    <>
      <style>{`
        @keyframes arreo-pulse{0%,100%{box-shadow:0 0 12px rgba(139,175,78,.6),0 0 0 0 rgba(139,175,78,.4)}70%{box-shadow:0 0 12px rgba(139,175,78,.6),0 0 0 10px rgba(139,175,78,0)}}
        ${POPUP_CSS}
      `}</style>
      <div ref={containerRef} style={{ height: '250px', width: '100%', borderRadius: '12px' }} />
    </>
  );
}
