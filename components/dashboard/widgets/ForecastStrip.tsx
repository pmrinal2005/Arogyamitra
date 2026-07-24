"use client";
import { Card, CardBody } from "@/components/ui";
import { useBHIHistory } from "@/lib/hooks";
import { riskColor, riskLabel, fmtDate } from "@/lib/utils";

export default function ForecastStrip() {
  const { data } = useBHIHistory();
  const last7 = (data ?? []).slice(-7);

  return (
    <Card>
      <CardBody className="pt-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          7-Day Vulnerability Forecast
        </p>
        <div className="flex items-end justify-between gap-2">
          {last7.map((d) => (
            <button
              key={d.id}
              title={`${fmtDate(d.index_date)} — ${riskLabel(d.risk_bucket)} (${Math.round(
                d.composite_score,
              )})`}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div
                className="w-full rounded-t-md"
                style={{
                  height: `${Math.max(12, d.composite_score)}px`,
                  background: riskColor(d.risk_bucket),
                }}
              />
              <span className="text-[10px] text-slate-400">{fmtDate(d.index_date)}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Predicted from your own 14-day baseline — never a population norm.
        </p>
      </CardBody>
    </Card>
  );
}
