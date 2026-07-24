"use client";
import { useState } from "react";
import { Card, CardBody, Badge } from "@/components/ui";
import { useLatestBHI } from "@/lib/hooks";
import { riskColor, riskLabel } from "@/lib/utils";

export default function RiskCard() {
  const { data: bhi, isError } = useLatestBHI();
  const [showWhy, setShowWhy] = useState(false);

  if (isError || !bhi) {
    return (
      <Card>
        <CardBody className="pt-5">
          <p className="text-sm text-slate-500">Data temporarily unavailable</p>
        </CardBody>
      </Card>
    );
  }

  const color = riskColor(bhi.risk_bucket);
  const badgeColor =
    bhi.risk_bucket === "low" ? "green" : bhi.risk_bucket === "moderate" ? "amber" : "red";

  return (
    <Card>
      <CardBody className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Behavioral Health Index
            </p>
            <div className="mt-2 flex items-end gap-3">
              <span className="text-4xl font-bold" style={{ color }}>
                {Math.round(bhi.composite_score)}
              </span>
              <Badge color={badgeColor as any}>{riskLabel(bhi.risk_bucket)}</Badge>
            </div>
          </div>
          <button
            onClick={() => setShowWhy((v) => !v)}
            aria-expanded={showWhy}
            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Why?
          </button>
        </div>

        {showWhy && (
          <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 animate-fade-in">
            <p className="text-xs font-semibold text-slate-500">
              Top contributing factors (transparent & rule-based)
            </p>
            {(bhi.contributing_factors || []).slice(0, 3).map((f, i) => (
              <div key={i} className="rounded-lg bg-slate-50 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{f.factor}</span>
                  <span className="text-xs font-mono text-slate-400">
                    weight {Math.round(f.weight * 100)}%
                  </span>
                </div>
                <p className="text-xs text-slate-500">{f.delta_description}</p>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
