"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";

const NAIROBI: [number, number] = [36.8219, -1.2921];

export default function Map() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: NAIROBI,
      zoom: 12,
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Blue dot element
    const el = document.createElement("div");
    el.style.cssText = `
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #2563eb;
      border: 3px solid #fff;
      box-shadow: 0 0 0 3px rgba(37,99,235,0.35);
    `;

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat(NAIROBI)
      .addTo(map);
    markerRef.current = marker;

    // Subscribe to Firebase rider location
    const locationRef = ref(db, "riders/test-rider/location");
    const unsubscribe = onValue(locationRef, (snapshot) => {
      const data = snapshot.val();
      if (!data?.lat || !data?.lng) return;
      const lngLat: [number, number] = [data.lng, data.lat];
      markerRef.current?.setLngLat(lngLat);
      mapRef.current?.easeTo({ center: lngLat, duration: 800 });
    });

    return () => {
      unsubscribe();
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
