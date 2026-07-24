"use client";
// Reusable EMA slider form. Used inline on the dashboard (compact) and full on
// the /checkin route. Runs the on-device crisis guard on the free-text note and
// on extreme scores BEFORE writing anything.
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Slider, Textarea } from "@/components/ui";
import { useApp } from "@/lib/store";
import { useCrisisGuard } from "@/lib/use-crisis-guard";
import { submitEma } from "@/lib/actions";

const SYMPTOMS = ["headache", "fatigue", "nausea", "pain", "breathlessness"];

export default function EmaForm({
  compact = false,
  onDone,
}: {
  compact?: boolean;
  onDone?: () => void;
}) {
  const userId = useApp((s) => s.userId);
  const qc = useQueryClient();
  const { scanText, scanEma } = useCrisisGuard();

  const [mood, setMood] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [anxiety, setAnxiety] = useState(3);
  const [sleep, setSleep] = useState(6);
  const [social, setSocial] = useState(5);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [med, setMed] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    // Crisis checks run FIRST, synchronously, on-device.
    scanEma({ mood, anxiety, social });
    if (notes.trim()) scanText(notes, "ema_extreme_score");

    setBusy(true);
    await submitEma(userId, {
      mood_score: mood,
      energy_score: energy,
      anxiety_score: anxiety,
      sleep_quality_last_night: sleep,
      social_connection_score: social,
      pain_symptom_flags: symptoms,
      medication_adherence: med,
      perceived_trigger_notes: notes || null,
    });
    setBusy(false);
    setDone(true);
    qc.invalidateQueries({ queryKey: ["ema-recent"] });
    qc.invalidateQueries({ queryKey: ["bhi-history"] });
    qc.invalidateQueries({ queryKey: ["resilience"] });
    onDone?.();
    setTimeout(() => setDone(false), 2500);
  };

  return (
    <div className="space-y-4">
      <Slider label="Mood" value={mood} onChange={setMood} />
      <Slider label="Energy" value={energy} onChange={setEnergy} />
      <Slider label="Anxiety" value={anxiety} onChange={setAnxiety} />
      <Slider label="Sleep quality (last night)" value={sleep} onChange={setSleep} />
      <Slider label="Social connection" value={social} onChange={setSocial} />

      {!compact && (
        <>
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">Symptom flags</p>
            <div className="flex flex-wrap gap-2">
              {SYMPTOMS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setSymptoms((cur) =>
                      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s],
                    )
                  }
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    symptoms.includes(s)
                      ? "bg-brand-100 text-brand-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">Medication adherence</p>
            <div className="flex gap-2">
              {[
                { l: "Taken", v: true },
                { l: "Missed", v: false },
                { l: "N/A", v: null },
              ].map((o) => (
                <button
                  key={o.l}
                  type="button"
                  onClick={() => setMed(o.v)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium ${
                    med === o.v ? "bg-brand-100 text-brand-800" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Anything triggering this? (optional)
            </label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="A word or two is plenty."
            />
          </div>
        </>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={busy}>
          {busy ? "Saving…" : "Log check-in"}
        </Button>
        {done && <span className="text-sm text-green-600">Saved. Thank you. ✓</span>}
      </div>
    </div>
  );
}
