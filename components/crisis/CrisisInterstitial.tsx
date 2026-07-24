"use client";
// Global, calm, non-alarming crisis interstitial. Rendered once at the app root
// and triggered via the Zustand store from the shared useCrisisGuard hook. It is
// entirely self-contained: it needs NO network and NO LLM to show resources.
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { getCrisisLines, detectCountry, SAFETY_DISCLAIMER, CRISIS_LINES } from "@/lib/crisis-resources";
import { useI18n } from "@/lib/use-i18n";

export default function CrisisInterstitial() {
  const { crisis, clearCrisis } = useApp((s) => ({ crisis: s.crisis, clearCrisis: s.clearCrisis }));
  const { t } = useI18n();
  const [country, setCountry] = useState("DEFAULT");

  useEffect(() => {
    if (crisis.open) setCountry(detectCountry());
  }, [crisis.open]);

  const lines = useMemo(() => getCrisisLines(country), [country]);

  useEffect(() => {
    if (crisis.open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [crisis.open]);

  if (!crisis.open) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="crisis-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
        <div className="bg-brand-700 px-6 py-5 text-white">
          <h2 id="crisis-title" className="text-xl font-semibold">
            {t("crisis.title")}
          </h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-slate-700">{t("crisis.body")}</p>

          <div className="space-y-3">
            {lines.map((l) => (
              <div key={l.name} className="rounded-xl border border-slate-200 p-3">
                <p className="font-semibold text-slate-900">{l.name}</p>
                <p className="text-brand-700 font-medium">{l.contact}</p>
                {l.note && <p className="text-sm text-slate-500">{l.note}</p>}
                {l.url && (
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-brand-600 underline"
                  >
                    {l.url}
                  </a>
                )}
              </div>
            ))}
          </div>

          <label className="block text-sm text-slate-600">
            Not in this region?{" "}
            <select
              className="mt-1 rounded-lg border border-slate-300 px-2 py-1"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              {Object.keys(CRISIS_LINES).map((c) => (
                <option key={c} value={c}>
                  {c === "DEFAULT" ? "International" : c}
                </option>
              ))}
            </select>
          </label>

          <p className="text-xs text-slate-400 leading-relaxed">{SAFETY_DISCLAIMER}</p>

          <button
            onClick={clearCrisis}
            className="w-full rounded-xl bg-brand-700 py-3 font-semibold text-white hover:bg-brand-800 transition"
          >
            {t("crisis.acknowledge")}
          </button>
        </div>
      </div>
    </div>
  );
}
