"use client";
// A small, self-contained Leaflet map (OpenStreetMap tiles — free, no key).
// Loaded via next/dynamic with ssr:false. Uses the Leaflet JS API directly to
// avoid react-leaflet SSR pitfalls. Shows a coarse AQI-coloured marker.
import { useEffect, useRef } from "react";
import { aqiLabel } from "@/lib/utils";

function aqiColor(aqi: number | null): string {
  if (aqi == null) return "#64748b";
  if (aqi <= 50) return "#16a34a";
  if (aqi <= 100) return "#65a30d";
  if (aqi <= 150) return "#d97706";
  if (aqi <= 200) return "#dc2626";
  if (aqi <= 300) return "#9333ea";
  return "#7f1d1d";
}

export default function AqiMap({
  lat,
  lng,
  aqi,
}: {
  lat: number;
  lng: number;
  aqi: number | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      // Load Leaflet CSS once.
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, {
          center: [lat, lng],
          zoom: 11,
          scrollWheelZoom: false,
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 18,
        }).addTo(mapRef.current);
      } else {
        mapRef.current.setView([lat, lng], 11);
      }

      // Clear previous overlays.
      mapRef.current.eachLayer((layer: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((layer as any) instanceof (L as any).CircleMarker) {
          mapRef.current.removeLayer(layer);
        }
      });

      const circle = L.circleMarker([lat, lng], {
        radius: 18,
        color: aqiColor(aqi),
        fillColor: aqiColor(aqi),
        fillOpacity: 0.35,
        weight: 2,
      }).addTo(mapRef.current);
      circle.bindPopup(
        `Air quality here: ${aqi == null ? "—" : Math.round(aqi)} (${aqiLabel(aqi)})`,
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [lat, lng, aqi]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-64 w-full overflow-hidden rounded-xl border border-slate-200"
      role="application"
      aria-label="Map of local air quality"
    />
  );
}
