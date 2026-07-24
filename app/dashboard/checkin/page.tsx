"use client";
// EMA micro-check-in. Full slider form (10–30s). Frequency guidance is adaptive:
// a simple rule reads the latest risk bucket to suggest cadence. Also surfaces a
// rotating validated-scale nudge (PHQ-4 / GAD-2 / UCLA-3) on a 3–7 day schedule.
import Link from "next/link";
import { Card, CardBody, Badge, Button } from "@/components/ui";
import EmaForm from "@/components/dashboard/EmaForm";
import { useLatestBHI, useRecentEma } from "@/lib/hooks";
import { riskLabel } from "@/lib/utils";

function cadenceFor(bucket: "low" | "moderate" | "elevated"): string {
  if (bucket === "elevated") return "twice a day while things feel intense";
  if (bucket === "moderate") return "once a day";
  return "every couple of days is plenty";
}

// Rotate the suggested scale based on days since last EMA, deterministically.
const SCALES = ["PHQ4", "GAD2", "UCLA3"] as const;

export default function CheckinPage() {
  const { data: bhi } = useLatestBHI();
  const { data: ema } = useRecentEma();

  const bucket = bhi?.risk_bucket ?? "low";
  const lastEma = (ema ?? [])[0];
  const daysSince = lastEma
    ? Math.floor((Date.now() - new Date(lastEma.submitted_at).getTime()) / 86400000)
    : 99;
  const suggestScale = daysSince >= 3;
  const scale = SCALES[((ema ?? []).length) % SCALES.length];

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Daily check-in</h1>
        <Badge color={bucket === "low" ? "green" : bucket === "moderate" ? "amber" : "red"}>
          {riskLabel(bucket)}
        </Badge>
      </div>

      <Card>
        <CardBody className="pt-5">
          <p className="mb-3 text-sm text-slate-500">
            Takes about 15–30 seconds. Based on your recent signals, checking in{" "}
            <strong>{cadenceFor(bucket)}</strong> is a good rhythm right now.
          </p>
          <EmaForm />
        </CardBody>
      </Card>

      {suggestScale && (
        <Card className="border-brand-200 bg-brand-50/40">
          <CardBody className="pt-5">
            <p className="text-sm font-semibold text-brand-800">
              A short, evidence-based questionnaire is due
            </p>
            <p className="mt-1 text-sm text-slate-600">
              It&apos;s been {daysSince} days since your last check-in. A brief validated scale
              ({scale}) helps calibrate your index more accurately. It&apos;s clearly labeled and
              separate from the quick sliders above.
            </p>
            <Link href={`/dashboard/scales?scale=${scale}`}>
              <Button className="mt-3">Take the {scale} ({"~1 min"})</Button>
            </Link>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
