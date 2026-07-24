"use client";
// Environmental exposome view. Location = one-time manual entry OR one-time
// Geolocation (coarsened, never continuous tracking). Shows current conditions
// via Open-Meteo (with static fallback), the Personal Exposure Lag Model, and a
// small Leaflet map. Every widget degrades gracefully.
import dynamic from "next/dynamic";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardBody, Button, Input, Badge } from "@/components/ui";
import EnvSnapshotCard from "@/components/dashboard/widgets/EnvSnapshotCard";
import { useEnv } from "@/lib/use-env";
import { useLagModel, usePersonalEnvNote } from "@/lib/hooks";
import { useApp } from "@/lib/store";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import { coarsen } from "@/lib/utils";
import type { Profile } from "@/lib/types";

const AqiMap = dynamic(() => import("@/components/dashboard/AqiMap"), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-xl bg-slate-100" />,
});

const MIN_DAYS_FOR_LAG = 7; // friendly "still learning" threshold

export default function EnvironmentPage() {
  const profile = useApp((s) => s.profile);
  const setProfile = useApp((s) => s.setProfile);
  const userId = useApp((s) => s.userId);
  const qc = useQueryClient();

  const { data: env } = useEnv();
  const note = usePersonalEnvNote(env);
  const { data: lags } = useLagModel();

  const [label, setLabel] = useState(profile?.home_location_label ?? "");
  const [geoNote, setGeoNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lat = profile?.home_lat ?? 28.61;
  const lng = profile?.home_lng ?? 77.21;

  const persist = async (patch: Partial<Profile>) => {
    setProfile({ ...(profile as Profile), ...patch });
    if (isSupabaseConfigured() && userId) {
      try {
        await getSupabaseBrowser().from("profiles").update(patch).eq("id", userId);
      } catch {
        /* ignore — local state already updated */
      }
    }
    qc.invalidateQueries({ queryKey: ["env"] });
  };

  const saveLabel = async () => {
    setBusy(true);
    await persist({ home_location_label: label || null });
    setBusy(false);
  };

  const useGeoOnce = () => {
    if (!("geolocation" in navigator)) {
      setGeoNote("Geolocation unavailable. Enter a city/ZIP instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const clat = coarsen(pos.coords.latitude, 2);
        const clng = coarsen(pos.coords.longitude, 2);
        void persist({ home_lat: clat, home_lng: clng });
        setGeoNote("Captured once (coarsened ~1km). Never tracked continuously.");
      },
      () => setGeoNote("Permission denied. Enter a city/ZIP instead."),
    );
  };

  const hasEnoughData = false; // no personal history threshold met in demo/new users
  const lagData = (lags ?? []).map((l) => ({
    lag: `${l.lag_days}d`,
    strength: Math.round(l.correlation_strength * 100),
  }));

  return (
    <div className="mx-auto max-w-4xl animate-fade-in space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Environmental exposome</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardBody className="pt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Your location
            </p>
            <p className="mb-3 text-sm text-slate-500">
              We only ever use a coarse location to look up local air quality. It&apos;s set once —
              there is no continuous GPS tracking.
            </p>
            <div className="flex gap-2">
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="City or ZIP (e.g. New Delhi)"
              />
              <Button onClick={saveLabel} disabled={busy}>
                Save
              </Button>
            </div>
            <Button variant="outline" className="mt-3" onClick={useGeoOnce}>
              <i className="bi bi-geo-alt" aria-hidden /> Use my current location once
            </Button>
            {geoNote && <p className="mt-2 text-xs text-slate-400">{geoNote}</p>}
          </CardBody>
        </Card>

        <EnvSnapshotCard note={note ?? undefined} />
      </div>

      <Card>
        <CardBody className="pt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Personal exposure lag model
          </p>
          {hasEnoughData ? (
            <p className="text-sm text-slate-500">
              Correlation between environmental spikes and your own mood/symptom logs at each lag.
            </p>
          ) : (
            <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">
              Still learning your patterns — we need about {MIN_DAYS_FOR_LAG} days of check-ins
              before this is personalised. The chart below is an illustrative preview.
            </div>
          )}
          <div className="h-48 w-full" role="img" aria-label="Correlation strength by lag day">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lagData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="lag" tick={{ fontSize: 12 }} />
                <YAxis unit="%" tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="strength" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Accessible text-table fallback for the chart */}
          <table className="sr-only">
            <caption>Correlation strength by lag day</caption>
            <thead>
              <tr>
                <th>Lag</th>
                <th>Strength</th>
              </tr>
            </thead>
            <tbody>
              {lagData.map((d) => (
                <tr key={d.lag}>
                  <td>{d.lag}</td>
                  <td>{d.strength}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="pt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Local air quality map
            </p>
            {env?.aqi != null && (
              <Badge color={env.aqi <= 100 ? "green" : env.aqi <= 150 ? "amber" : "red"}>
                AQI {Math.round(env.aqi)}
              </Badge>
            )}
          </div>
          <AqiMap lat={lat} lng={lng} aqi={env?.aqi ?? null} />
        </CardBody>
      </Card>
    </div>
  );
}
