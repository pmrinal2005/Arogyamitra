"use client";
// Insights / explainability. The full historical Behavioral Health Index line
// chart (with EMA sub-scores overlaid), an audit-log-style list showing exactly
// which weighted factors drove every risk-bucket change (the transparency
// requirement), and a journal theme-frequency view. Charts have a text-table
// fallback for screen readers.
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardBody, Badge, EmptyState } from "@/components/ui";
import { useBHIHistory, useRecentEma, useJournal } from "@/lib/hooks";
import { fmtDate, riskLabel } from "@/lib/utils";

export default function InsightsPage() {
  const { data: history } = useBHIHistory();
  const { data: ema } = useRecentEma();
  const { data: journal } = useJournal();

  const chartData = useMemo(() => {
    const emaByDate = new Map<string, number>();
    (ema ?? []).forEach((e) => {
      const d = e.submitted_at.slice(0, 10);
      const composite =
        ((e.mood_score ?? 5) + (e.energy_score ?? 5) + (10 - (e.anxiety_score ?? 5)) +
          (e.sleep_quality_last_night ?? 5) + (e.social_connection_score ?? 5)) /
        5;
      emaByDate.set(d, Math.round(composite * 10));
    });
    return (history ?? []).map((h) => ({
      date: fmtDate(h.index_date),
      index: Math.round(h.composite_score),
      emaWellbeing: emaByDate.get(h.index_date) ?? null,
    }));
  }, [history, ema]);

  // Audit log: days where the risk bucket changed from the prior day.
  const changes = useMemo(() => {
    const list = history ?? [];
    const out: { date: string; from: string; to: string; factors: string[] }[] = [];
    for (let i = 1; i < list.length; i++) {
      if (list[i].risk_bucket !== list[i - 1].risk_bucket) {
        out.push({
          date: list[i].index_date,
          from: riskLabel(list[i - 1].risk_bucket),
          to: riskLabel(list[i].risk_bucket),
          factors: (list[i].contributing_factors || []).map(
            (f) => `${f.factor} (weight ${Math.round(f.weight * 100)}%): ${f.delta_description}`,
          ),
        });
      }
    }
    return out.reverse();
  }, [history]);

  const themeFreq = useMemo(() => {
    const counts = new Map<string, number>();
    (journal ?? []).forEach((j) =>
      (j.nlp_themes ?? []).forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)),
    );
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [journal]);
  const maxTheme = themeFreq[0]?.[1] ?? 1;

  return (
    <div className="mx-auto max-w-4xl animate-fade-in space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Insights &amp; explainability</h1>

      <Card>
        <CardBody className="pt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Behavioral Health Index history
          </p>
          <div className="h-64 w-full" role="img" aria-label="Behavioral Health Index over time">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="index"
                  name="Risk index"
                  stroke="#dc2626"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="emaWellbeing"
                  name="EMA wellbeing"
                  stroke="#0d9488"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>Behavioral Health Index over time</caption>
            <thead>
              <tr>
                <th>Date</th>
                <th>Index</th>
                <th>EMA wellbeing</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((d) => (
                <tr key={d.date}>
                  <td>{d.date}</td>
                  <td>{d.index}</td>
                  <td>{d.emaWellbeing ?? "n/a"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-400">
            Every point is computed transparently from your own 14-day baseline — never a black-box
            model and never a population norm.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="pt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Audit log — why the bucket changed
          </p>
          {changes.length ? (
            <ul className="space-y-3">
              {changes.map((c, i) => (
                <li key={i} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">{fmtDate(c.date)}</span>
                    <Badge>{c.from}</Badge>
                    <i className="bi bi-arrow-right text-slate-400" aria-hidden />
                    <Badge color="amber">{c.to}</Badge>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {c.factors.map((f, j) => (
                      <li key={j} className="text-xs text-slate-500">
                        • {f}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No bucket changes yet" hint="As your index shifts, each change and its drivers appear here." />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="pt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Journal themes over time
          </p>
          {themeFreq.length ? (
            <div className="space-y-2">
              {themeFreq.map(([theme, count]) => (
                <div key={theme} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-sm text-slate-600">{theme}</span>
                  <div className="h-3 flex-1 rounded-full bg-slate-100">
                    <div
                      className="h-3 rounded-full bg-brand-500"
                      style={{ width: `${(count / maxTheme) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs text-slate-400">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No themes yet" hint="Journal entries with NLP consent will surface recurring themes here." />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
