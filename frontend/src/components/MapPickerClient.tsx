'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

export interface MapPickerClientProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

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
      style: `https://api.maptiler.com/maps/backdrop-dark/style.json?key=${key}`,
      center: [initLngRef.current, initLatRef.current],
      zoom: 13,
      scrollZoom: false,
    });
    mapRef.current = map;

    const el = document.createElement('div');
    el.style.cssText = [
      'width:22px', 'height:22px', 'background:#8BAF4E', 'border:3px solid white',
      'border-radius:50%', 'cursor:grab',
      'box-shadow:0 0 0 0 rgba(139,175,78,.5)',
      'animation:mbpicker-pulse 2s ease-in-out infinite',
    ].join(';');

    const marker = new maplibregl.Marker({ element: el, draggable: true })
      .setLngLat([initLngRef.current, initLatRef.current])
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
      <style>{`@keyframes mbpicker-pulse{0%,100%{box-shadow:0 0 0 0 rgba(139,175,78,.45)}70%{box-shadow:0 0 0 10px rgba(139,175,78,0)}}`}</style>
      <div ref={containerRef} style={{ height: '250px', width: '100%', borderRadius: '12px' }} />
    </>
  );
}
