"use client";
// Persistent, always-visible crisis resources bar. Never hidden behind a click.
import { useMemo } from "react";
import { getCrisisLines } from "@/lib/crisis-resources";
import { useApp } from "@/lib/store";
import { useCrisisGuard } from "@/lib/use-crisis-guard";

export default function CrisisFooter() {
  const lines = useMemo(() => getCrisisLines(), []);
  const primary = lines[0];
  const { manualEscalate } = useCrisisGuard();

  return (
    <footer className="border-t border-slate-200 bg-brand-50 px-5 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-brand-900">
          <i className="bi bi-life-preserver mr-1" aria-hidden /> In crisis?{" "}
          <strong>{primary?.name}</strong> — {primary?.contact}
        </p>
        <button
          onClick={manualEscalate}
          className="rounded-lg bg-brand-700 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-800"
        >
          I need support now
        </button>
      </div>
    </footer>
  );
}
