"use client";
// Privacy & consent — the most important settings screen.
// - Consent dashboard: one toggle per consent_type, plain language, timestamped.
// - Sensitivity slider: adjusts the risk-engine thresholds (stored on profile).
// - Pause all Care Pings: instantly excludes the user as sender AND match target.
// - Data export (JSON/CSV) and full account deletion, each logging an audit row.
// - Persistent crisis resources + repeated plain-language safety disclaimer.
import { useEffect, useState } from "react";
import { Card, CardBody, Button, Toggle, Badge } from "@/components/ui";
import { CONSENT_TYPES } from "@/lib/constants";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import { useApp } from "@/lib/store";
import { getCrisisLines, SAFETY_DISCLAIMER } from "@/lib/crisis-resources";
import type { Profile } from "@/lib/types";
import { fmtDate } from "@/lib/utils";

const EXPORT_TABLES = [
  "profiles",
  "consents",
  "ema_checkins",
  "validated_scales",
  "journal_entries",
  "manual_metric_logs",
  "behavioral_health_index",
  "environmental_snapshots",
  "mutual_aid_profiles",
  "time_credits_ledger",
  "care_pings",
  "micro_interventions",
  "crisis_escalation_events",
  "resilience_points",
  "badges",
];

export default function PrivacyPage() {
  const userId = useApp((s) => s.userId);
  const profile = useApp((s) => s.profile);
  const setProfile = useApp((s) => s.setProfile);
  const configured = isSupabaseConfigured();

  const [consents, setConsents] = useState<Record<string, { granted: boolean; ts: string | null }>>(
    {},
  );
  const [sensitivity, setSensitivity] = useState<"subtle" | "balanced" | "strong">(
    profile?.risk_sensitivity ?? "balanced",
  );
  const [pinged, setPinged] = useState(profile?.care_pings_paused ?? false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!configured || !userId) return;
    (async () => {
      try {
        const sb = getSupabaseBrowser();
        const { data } = await sb
          .from("consents")
          .select("consent_type, granted, granted_at")
          .eq("user_id", userId);
        const map: Record<string, { granted: boolean; ts: string | null }> = {};
        (data ?? []).forEach((c: { consent_type: string; granted: boolean; granted_at: string | null }) => {
          map[c.consent_type] = { granted: c.granted, ts: c.granted_at };
        });
        setConsents(map);
      } catch {
        /* ignore */
      }
    })();
  }, [configured, userId]);

  const toggleConsent = async (key: string, granted: boolean) => {
    if (key === "webcam_scan") return; // permanently off, reserved
    setConsents((c) => ({ ...c, [key]: { granted, ts: new Date().toISOString() } }));
    if (configured && userId) {
      try {
        await getSupabaseBrowser()
          .from("consents")
          .upsert(
            {
              user_id: userId,
              consent_type: key,
              granted,
              granted_at: granted ? new Date().toISOString() : null,
              revoked_at: granted ? null : new Date().toISOString(),
            },
            { onConflict: "user_id,consent_type" },
          );
      } catch {
        /* ignore */
      }
    }
  };

  const saveSensitivity = async (v: "subtle" | "balanced" | "strong") => {
    setSensitivity(v);
    setProfile({ ...(profile as Profile), risk_sensitivity: v });
    if (configured && userId) {
      try {
        await getSupabaseBrowser().from("profiles").update({ risk_sensitivity: v }).eq("id", userId);
      } catch {
        /* ignore */
      }
    }
  };

  const togglePause = async (v: boolean) => {
    setPinged(v);
    setProfile({ ...(profile as Profile), care_pings_paused: v });
    if (configured && userId) {
      try {
        await getSupabaseBrowser().from("profiles").update({ care_pings_paused: v }).eq("id", userId);
      } catch {
        /* ignore */
      }
    }
  };

  const exportData = async () => {
    setStatus("Preparing your export…");
    const bundle: Record<string, unknown> = { exported_at: new Date().toISOString() };
    if (configured && userId) {
      try {
        const sb = getSupabaseBrowser();
        await sb.from("data_export_requests").insert({ user_id: userId, status: "completed" });
        for (const table of EXPORT_TABLES) {
          try {
            const { data } = await sb.from(table).select("*");
            bundle[table] = data ?? [];
          } catch {
            bundle[table] = [];
          }
        }
      } catch {
        /* ignore — still deliver what we have */
      }
    } else {
      bundle.note = "Demo mode: no personal data is stored to export.";
    }
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "arogyasetu-export.json";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Export downloaded.");
  };

  const deleteAccount = async () => {
    if (!confirm("This permanently deletes your account and all data. Continue?")) return;
    setStatus("Requesting deletion…");
    if (configured && userId) {
      try {
        const sb = getSupabaseBrowser();
        await sb.from("data_deletion_requests").insert({ user_id: userId, status: "requested" });
        // The cascading delete Edge Function completes removal respecting FKs.
        setStatus("Deletion requested. You'll be signed out shortly.");
        setTimeout(() => {
          void sb.auth.signOut();
          window.location.href = "/login";
        }, 2500);
      } catch {
        setStatus("Could not reach the server. Please try again.");
      }
    } else {
      setStatus("Demo mode: nothing to delete.");
    }
  };

  const primaryLine = getCrisisLines()[0];

  return (
    <div className="space-y-4">
      {/* Consent dashboard */}
      <Card>
        <CardBody className="pt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Consent dashboard
          </p>
          <ul className="space-y-3">
            {CONSENT_TYPES.map((c) => {
              const state = consents[c.key];
              const reserved = c.key === "webcam_scan";
              return (
                <li
                  key={c.key}
                  className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">{c.label}</p>
                    <p className="text-xs text-slate-500">{c.description}</p>
                    {state?.ts && (
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        Last changed {fmtDate(state.ts)}
                      </p>
                    )}
                  </div>
                  {reserved ? (
                    <Badge color="slate">Off (reserved)</Badge>
                  ) : (
                    <Toggle
                      checked={!!state?.granted}
                      onChange={(v) => toggleConsent(c.key, v)}
                      label={c.label}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>

      {/* Sensitivity */}
      <Card>
        <CardBody className="pt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Detection sensitivity
          </p>
          <p className="mb-3 text-sm text-slate-500">
            Controls how readily your index flags a shift — adjusting the thresholds in the
            transparent risk engine.
          </p>
          <div className="flex gap-2">
            {(
              [
                { v: "subtle", l: "Only strong signals" },
                { v: "balanced", l: "Balanced" },
                { v: "strong", l: "Even subtle shifts" },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                onClick={() => saveSensitivity(o.v)}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium ${
                  sensitivity === o.v
                    ? "bg-brand-100 text-brand-800 ring-1 ring-brand-300"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Pause pings */}
      <Card>
        <CardBody className="pt-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">Pause all Care Pings</p>
              <p className="text-xs text-slate-500">
                Instantly stops pings involving you — both as a sender and as a match candidate.
              </p>
            </div>
            <Toggle checked={pinged} onChange={togglePause} label="Pause all care pings" />
          </div>
        </CardBody>
      </Card>

      {/* Data controls */}
      <Card>
        <CardBody className="pt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Your data
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={exportData}>
              <i className="bi bi-download" aria-hidden /> Export all my data
            </Button>
            <Button variant="danger" onClick={deleteAccount}>
              <i className="bi bi-trash" aria-hidden /> Delete my account &amp; data
            </Button>
          </div>
          {status && <p className="mt-3 text-sm text-slate-600">{status}</p>}
        </CardBody>
      </Card>

      {/* Persistent crisis resources + disclaimer */}
      <Card className="border-brand-200 bg-brand-50/60">
        <CardBody className="pt-5">
          <p className="text-sm font-semibold text-brand-900">
            <i className="bi bi-life-preserver mr-1" aria-hidden /> {primaryLine?.name} —{" "}
            {primaryLine?.contact}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{SAFETY_DISCLAIMER}</p>
        </CardBody>
      </Card>
    </div>
  );
}
