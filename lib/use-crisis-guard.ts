"use client";
// Shared hook used IDENTICALLY across Journal, EMA free-text, and any other
// free-text surface. It scans text on-device (synchronously) BEFORE any network
// call, raises the crisis interstitial, and logs a crisis_escalation_events row.
// This pathway NEVER depends on the LLM API being reachable.
import { useCallback } from "react";
import { detectCrisis, detectEmaCrisis, type CrisisSeverity } from "@/lib/crisis";
import { useApp } from "@/lib/store";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";

export function useCrisisGuard() {
  const raiseCrisis = useApp((s) => s.raiseCrisis);
  const userId = useApp((s) => s.userId);

  const logEscalation = useCallback(
    async (triggerSource: string, resourceShown: string) => {
      if (!isSupabaseConfigured() || !userId) return;
      try {
        const sb = getSupabaseBrowser();
        // Append-only audit row. Fire-and-forget; never blocks the UI.
        await sb.from("crisis_escalation_events").insert({
          user_id: userId,
          trigger_source: triggerSource,
          resource_shown: resourceShown,
          acknowledged: false,
        });
      } catch {
        /* swallow — the interstitial already showed, that's what matters */
      }
    },
    [userId],
  );

  // Scan free text. Returns the severity so callers can decide whether to
  // still submit the underlying entry (we always allow saving the entry).
  const scanText = useCallback(
    (text: string, source = "journal_keyword"): CrisisSeverity => {
      const { severity } = detectCrisis(text);
      if (severity !== "none") {
        raiseCrisis(severity, source);
        void logEscalation(source, "crisis_lines_interstitial");
      }
      return severity;
    },
    [raiseCrisis, logEscalation],
  );

  const scanEma = useCallback(
    (scores: { mood?: number | null; anxiety?: number | null; social?: number | null }) => {
      const severity = detectEmaCrisis(scores);
      if (severity !== "none") {
        raiseCrisis(severity, "ema_extreme_score");
        void logEscalation("ema_extreme_score", "crisis_lines_interstitial");
      }
      return severity;
    },
    [raiseCrisis, logEscalation],
  );

  const manualEscalate = useCallback(() => {
    raiseCrisis("high", "manual_selfreport");
    void logEscalation("manual_selfreport", "crisis_lines_interstitial");
  }, [raiseCrisis, logEscalation]);

  return { scanText, scanEma, manualEscalate };
}
