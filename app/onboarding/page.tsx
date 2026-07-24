"use client";
// Multi-step onboarding. Privacy-by-default: every consent starts OFF; the user
// opts in explicitly. Location is a one-time manual entry OR one-time geolocation.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import { useApp } from "@/lib/store";
import { Button, Card, CardBody, Input, Toggle, Badge } from "@/components/ui";
import { CONDITION_TAGS, CONSENT_TYPES } from "@/lib/constants";
import { LOCALE_NAMES, type Locale } from "@/lib/i18n";
import { coarsen } from "@/lib/utils";

export default function OnboardingPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const userId = useApp((s) => s.userId);

  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [language, setLanguage] = useState<Locale>("en");
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [geoNote, setGeoNote] = useState<string | null>(null);

  const toggleTag = (tag: string) =>
    setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));

  const useGeolocationOnce = () => {
    if (!("geolocation" in navigator)) {
      setGeoNote("Geolocation not available. Enter a city/ZIP instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Coarsen immediately for privacy — never store precise coordinates.
        setLat(coarsen(pos.coords.latitude, 2));
        setLng(coarsen(pos.coords.longitude, 2));
        setGeoNote("Captured once (coarsened ~1km). Not tracked continuously.");
      },
      () => setGeoNote("Permission denied. Enter a city/ZIP instead."),
    );
  };

  const finish = async () => {
    setBusy(true);
    try {
      if (configured && userId) {
        const sb = getSupabaseBrowser();
        await sb
          .from("profiles")
          .update({
            display_name: displayName || null,
            home_location_label: locationLabel || null,
            home_lat: lat,
            home_lng: lng,
            condition_tags: tags,
            preferred_language: language,
            onboarding_completed: true,
          })
          .eq("id", userId);

        // Persist consents (privacy-by-default: only granted ones set true).
        const rows = CONSENT_TYPES.map((c) => ({
          user_id: userId,
          consent_type: c.key,
          granted: !!consents[c.key],
          granted_at: consents[c.key] ? new Date().toISOString() : null,
        }));
        await sb.from("consents").upsert(rows, { onConflict: "user_id,consent_type" });
      }
      router.push("/dashboard");
    } finally {
      setBusy(false);
    }
  };

  const steps = ["Welcome", "About you", "Location", "Consent"];

  return (
    <main className="app-shell font-scale-md flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardBody className="pt-6">
          <div className="mb-4 flex items-center gap-2">
            {steps.map((s, i) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full ${
                  i <= step ? "bg-brand-600" : "bg-slate-200"
                }`}
              />
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-brand-800">Welcome to AROGYASETU</h1>
              <p className="text-slate-600">
                A privacy-first companion that helps you notice patterns early and
                stay connected to your community. Everything here is opt-in, and
                your data never leaves your control. This is a wellness tool — not
                a medical device, diagnosis, or emergency service.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Tell us a little about you</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Display name
                </label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="How should we greet you?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Preferred language
                </label>
                <select
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Locale)}
                >
                  {Object.entries(LOCALE_NAMES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Condition tags (optional, opt-in, non-clinical)
                </label>
                <div className="flex flex-wrap gap-2">
                  {CONDITION_TAGS.map((tag) => (
                    <button key={tag} type="button" onClick={() => toggleTag(tag)}>
                      <Badge color={tags.includes(tag) ? "brand" : "slate"}>{tag}</Badge>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Your area (for local environment)</h2>
              <p className="text-sm text-slate-500">
                Used only to fetch local air quality/pollen/UV. Stored coarsely
                (~1km). Never continuously tracked.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  City or ZIP/postal code
                </label>
                <Input value={locationLabel} onChange={(e) => setLocationLabel(e.target.value)} placeholder="e.g. New Delhi, 110001" />
              </div>
              <Button variant="outline" onClick={useGeolocationOnce}>
                Use my current location once
              </Button>
              {geoNote && <p className="text-xs text-slate-500">{geoNote}</p>}
              {lat != null && (
                <p className="text-xs text-slate-400">
                  Coarsened coordinates: {lat}, {lng}
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Your privacy choices</h2>
              <p className="text-sm text-slate-500">
                Everything is off by default. Turn on only what you want. You can
                change any of these anytime in Settings.
              </p>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {CONSENT_TYPES.map((c) => {
                  const disabled = c.key === "webcam_scan";
                  return (
                    <div key={c.key} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{c.label}</p>
                        <p className="text-xs text-slate-500">{c.description}</p>
                      </div>
                      <Toggle
                        checked={!!consents[c.key] && !disabled}
                        onChange={(v) => !disabled && setConsents((s) => ({ ...s, [c.key]: v }))}
                        label={c.label}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              Back
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>
            ) : (
              <Button onClick={finish} disabled={busy}>
                {busy ? "Saving…" : "Enter dashboard"}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    </main>
  );
}
