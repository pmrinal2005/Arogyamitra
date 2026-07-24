"use client";
// Validated scale administration (PHQ-4, GAD-2, UCLA-3). These are rendered as
// their own short, clearly-labeled, evidence-based instruments — never disguised
// as EMA. Scoring is transparent; results feed the risk engine, weighted higher
// than raw EMA. An extreme score raises the on-device crisis guard.
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, Button, Tabs, Badge } from "@/components/ui";
import { SCALE_META } from "@/lib/constants";
import { submitScale } from "@/lib/actions";
import { useApp } from "@/lib/store";
import { useCrisisGuard } from "@/lib/use-crisis-guard";

function ScalesInner() {
  const params = useSearchParams();
  const initial = (params.get("scale") || "PHQ4").toUpperCase();
  const [active, setActive] = useState(SCALE_META[initial] ? initial : "PHQ4");
  const userId = useApp((s) => s.userId);
  const qc = useQueryClient();
  const { manualEscalate } = useCrisisGuard();

  const meta = SCALE_META[active];
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [done, setDone] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const total = useMemo(
    () => Object.values(answers).reduce((a, b) => a + b, 0),
    [answers],
  );
  const allAnswered = Object.keys(answers).length === meta.questions.length;

  const switchScale = (id: string) => {
    setActive(id);
    setAnswers({});
    setDone(null);
  };

  const submit = async () => {
    setBusy(true);
    // Extreme validated scores are a crisis pathway too (independent of LLM).
    if (
      (active === "PHQ4" && total >= 9) ||
      (active === "GAD2" && total >= 5) ||
      (active === "UCLA3" && total >= 8)
    ) {
      manualEscalate();
    }
    const raw: Record<string, number> = {};
    meta.questions.forEach((_, i) => (raw[`q${i + 1}`] = answers[i] ?? 0));
    await submitScale(userId, active, raw, total);
    setBusy(false);
    setDone(total);
    qc.invalidateQueries({ queryKey: ["bhi-history"] });
  };

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Validated check-in scales</h1>
      <p className="text-sm text-slate-500">
        These are established screening questionnaires. They are for reflection and to calibrate
        your index — they are not a diagnosis.
      </p>

      <Tabs
        tabs={Object.keys(SCALE_META).map((k) => ({ id: k, label: k }))}
        active={active}
        onChange={switchScale}
      />

      <Card>
        <CardBody className="pt-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold text-slate-800">{meta.name}</p>
            <Badge>{meta.maxNote.split(".")[0]}</Badge>
          </div>

          {done !== null ? (
            <div className="rounded-xl bg-brand-50 border border-brand-200 p-4">
              <p className="text-sm text-brand-900">
                Thank you. Your score: <strong>{done}</strong>. {meta.maxNote}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                This is a screening reflection, not a clinical assessment. If anything feels heavy,
                the support resources below are always available.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {meta.questions.map((q, i) => (
                <fieldset key={i}>
                  <legend className="mb-2 text-sm font-medium text-slate-700">
                    {i + 1}. {q}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {meta.options.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        aria-pressed={answers[i] === o.value}
                        onClick={() => setAnswers((a) => ({ ...a, [i]: o.value }))}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          answers[i] === o.value
                            ? "bg-brand-100 text-brand-800 ring-1 ring-brand-300"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ))}
              <div className="flex items-center gap-3">
                <Button onClick={submit} disabled={!allAnswered || busy}>
                  {busy ? "Saving…" : "Submit"}
                </Button>
                <span className="text-sm text-slate-400">
                  Running total: <strong>{total}</strong>
                </span>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export default function ScalesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-400">Loading…</p>}>
      <ScalesInner />
    </Suspense>
  );
}
