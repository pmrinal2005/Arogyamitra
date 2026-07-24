"use client";
// ---------------------------------------------------------------------------
// PWA lifecycle manager (client-only). Mounted globally from Providers.
//   - Registers /sw.js in production.
//   - Shows an "offline" banner + flushes the IndexedDB write queue when the
//     connection returns (also on SW "FLUSH_QUEUE" message / background sync).
//   - Exposes a lightweight "Install app" affordance via beforeinstallprompt.
// All behavior degrades silently where APIs are unavailable.
// ---------------------------------------------------------------------------
import { useCallback, useEffect, useState } from "react";
import { flushQueue, listQueue } from "@/lib/offline-queue";
import { submitEma, submitJournal, submitScale, logManualMetric } from "@/lib/actions";
import { useI18n } from "@/lib/use-i18n";

// Adapters that map queued payloads back onto the concrete action writers.
const writers = {
  ema: (userId: string | null, payload: Record<string, unknown>) =>
    submitEma(userId, payload as never),
  journal: (userId: string | null, payload: Record<string, unknown>) =>
    submitJournal(
      userId,
      String(payload.content ?? ""),
      (payload.input_method as "typed" | "voice") ?? "typed",
    ),
  scale: (userId: string | null, payload: Record<string, unknown>) =>
    submitScale(
      userId,
      String(payload.scale_type ?? ""),
      (payload.raw_answers as Record<string, number>) ?? {},
      Number(payload.computed_score ?? 0),
    ),
  manual_metric: (userId: string | null, payload: Record<string, unknown>) =>
    logManualMetric(
      userId,
      String(payload.metric_type ?? ""),
      payload.value,
      (payload.source as "manual" | "csv_import" | "json_import") ?? "manual",
    ),
};

export default function PwaManager() {
  const { t } = useI18n();
  const [online, setOnline] = useState(true);
  const [queued, setQueued] = useState(0);
  const [installEvt, setInstallEvt] = useState<Event | null>(null);

  const doFlush = useCallback(async () => {
    const { remaining } = await flushQueue(writers);
    setQueued(remaining);
  }, []);

  // Register the service worker (production only; skip in dev to avoid caching churn).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
      const onMsg = (e: MessageEvent) => {
        if (e.data?.type === "FLUSH_QUEUE") void doFlush();
      };
      navigator.serviceWorker.addEventListener("message", onMsg);
      return () => navigator.serviceWorker.removeEventListener("message", onMsg);
    }
  }, [doFlush]);

  // Online/offline tracking + queue flush on reconnect.
  useEffect(() => {
    if (typeof window === "undefined") return;
    setOnline(navigator.onLine);
    void listQueue().then((q) => setQueued(q.length));

    const onOnline = () => {
      setOnline(true);
      void doFlush();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [doFlush]);

  // Install prompt capture.
  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const install = async () => {
    if (!installEvt) return;
    // @ts-expect-error prompt() exists on BeforeInstallPromptEvent
    await installEvt.prompt?.();
    setInstallEvt(null);
  };

  return (
    <>
      {!online && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 60,
            background: "#160b0b",
            color: "#ffd9d9",
            borderTop: "1px solid #3a1f1f",
            padding: "10px 16px",
            fontSize: "0.85rem",
            textAlign: "center",
          }}
        >
          <i className="bi bi-wifi-off" aria-hidden="true" />{" "}
          {t("offline.banner")}
          {queued > 0 ? ` (${queued})` : ""}
        </div>
      )}

      {installEvt && (
        <button
          type="button"
          onClick={install}
          aria-label={t("pwa.install")}
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 55,
            background: "#D6FF3F",
            color: "#000",
            border: "none",
            borderRadius: 999,
            padding: "10px 18px",
            fontWeight: 700,
            fontSize: "0.85rem",
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          }}
        >
          <i className="bi bi-download" aria-hidden="true" /> {t("pwa.install")}
        </button>
      )}
    </>
  );
}
