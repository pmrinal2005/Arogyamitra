"use client";
import { Card, CardBody, Badge } from "@/components/ui";
import { useEnv } from "@/lib/use-env";
import { aqiLabel } from "@/lib/utils";

function Metric({ label, value, unit }: { label: string; value: number | null; unit?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2 text-center">
      <p className="text-[10px] uppercase text-slate-400">{label}</p>
      <p className="text-lg font-semibold text-slate-800">
        {value == null ? "—" : Math.round(value * 10) / 10}
        {value != null && unit ? <span className="text-xs text-slate-400"> {unit}</span> : null}
      </p>
    </div>
  );
}

export default function EnvSnapshotCard({ note }: { note?: string }) {
  const { data: env, isError } = useEnv();

  return (
    <Card>
      <CardBody className="pt-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Today&apos;s Environment
          </p>
          {env?.aqi != null && (
            <Badge color={env.aqi <= 100 ? "green" : env.aqi <= 150 ? "amber" : "red"}>
              AQI {Math.round(env.aqi)} · {aqiLabel(env.aqi)}
            </Badge>
          )}
        </div>
        {isError && !env ? (
          <p className="text-sm text-slate-500">Data temporarily unavailable</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <Metric label="PM2.5" value={env?.pm25 ?? null} unit="µg" />
            <Metric label="Pollen" value={env?.pollen_index ?? null} />
            <Metric label="UV" value={env?.uv_index ?? null} />
            <Metric label="Temp" value={env?.temperature ?? null} unit="°C" />
            <Metric label="Humidity" value={env?.humidity ?? null} unit="%" />
            <Metric label="PM10" value={env?.pm10 ?? null} unit="µg" />
          </div>
        )}
        {note && (
          <p className="mt-3 rounded-lg bg-brand-50 p-2 text-xs text-brand-800">
            <i className="bi bi-info-circle mr-1" aria-hidden /> {note}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
