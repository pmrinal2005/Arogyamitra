"use client";
// Interactive mutual-aid map (Leaflet + OpenStreetMap, free). Renders coarsened
// neighbour locations with marker clustering. Two-way sync with the list panel:
// clicking a marker calls onSelect; the parent can pan via the `focusUserId`
// prop. Self-contained; loaded with next/dynamic ssr:false by the parent.
import { useEffect, useRef } from "react";
import type { MutualAidDirectoryRow } from "@/lib/types";

export default function CommunityMap({
  rows,
  focusUserId,
  onSelect,
}: {
  rows: MutualAidDirectoryRow[];
  focusUserId: string | null;
  onSelect: (userId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clusterRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerIndex = useRef<Record<string, any>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet.markercluster");
      // CSS (once).
      const styles: [string, string][] = [
        ["leaflet-css", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"],
        ["mc-css", "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"],
        ["mc-default-css", "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"],
      ];
      styles.forEach(([id, href]) => {
        if (!document.getElementById(id)) {
          const link = document.createElement("link");
          link.id = id;
          link.rel = "stylesheet";
          link.href = href;
          document.head.appendChild(link);
        }
      });
      if (cancelled || !containerRef.current) return;

      const pts = rows.filter((r) => r.visible_lat != null && r.visible_lng != null);
      const center: [number, number] = pts.length
        ? [pts[0].visible_lat as number, pts[0].visible_lng as number]
        : [28.61, 77.21];

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, {
          center,
          zoom: 12,
          scrollWheelZoom: true,
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 18,
        }).addTo(mapRef.current);
      }

      // Rebuild cluster group each render for simplicity.
      if (clusterRef.current) {
        mapRef.current.removeLayer(clusterRef.current);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      clusterRef.current = (L as any).markerClusterGroup();
      markerIndex.current = {};

      pts.forEach((r) => {
        const m = L.marker([r.visible_lat as number, r.visible_lng as number]);
        m.bindPopup(
          `<strong>${r.display_name ?? "Neighbour"}</strong><br/>Trust ${Math.round(
            r.composite_trust_score * 100,
          )}%<br/>${r.offers_help_with.join(", ")}`,
        );
        m.on("click", () => onSelect(r.user_id));
        markerIndex.current[r.user_id] = m;
        clusterRef.current.addLayer(m);
      });
      mapRef.current.addLayer(clusterRef.current);
    })();

    return () => {
      cancelled = true;
    };
  }, [rows, onSelect]);

  // Pan to a focused user when the list selection changes.
  useEffect(() => {
    if (!focusUserId || !mapRef.current) return;
    const m = markerIndex.current[focusUserId];
    if (m) {
      mapRef.current.setView(m.getLatLng(), 14, { animate: true });
      m.openPopup();
    }
  }, [focusUserId]);

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
      className="h-[28rem] w-full overflow-hidden rounded-xl border border-slate-200"
      role="application"
      aria-label="Map of nearby mutual-aid members"
    />
  );
}
