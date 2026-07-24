"use client";
// Profile settings: display name, condition tags, language, and accessibility
// preferences. Accessibility prefs are stored in `profiles.accessibility_prefs`
// and applied globally via the A11yApplier context in Providers.
import { useState } from "react";
import { Card, CardBody, Button, Input, Badge } from "@/components/ui";
import { CONDITION_TAGS } from "@/lib/constants";
import { LOCALE_NAMES, type Locale } from "@/lib/i18n";
import { useApp } from "@/lib/store";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import type { AccessibilityPrefs, Profile } from "@/lib/types";

export default function ProfileSettingsPage() {
  const profile = useApp((s) => s.profile);
  const setProfile = useApp((s) => s.setProfile);
  const setLocale = useApp((s) => s.setLocale);
  const setA11y = useApp((s) => s.setA11y);
  const userId = useApp((s) => s.userId);

  const [name, setName] = useState(profile?.display_name ?? "");
  const [tags, setTags] = useState<string[]>(profile?.condition_tags ?? []);
  const [lang, setLang] = useState<Locale>((profile?.preferred_language as Locale) ?? "en");
  const [a11y, setLocalA11y] = useState<AccessibilityPrefs>(profile?.accessibility_prefs ?? {});
  const [saved, setSaved] = useState(false);

  const toggleTag = (t: string) =>
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const applyA11y = (patch: AccessibilityPrefs) => {
    const next = { ...a11y, ...patch };
    setLocalA11y(next);
    setA11y(next); // apply globally immediately
  };

  const save = async () => {
    const patch: Partial<Profile> = {
      display_name: name || null,
      condition_tags: tags,
      preferred_language: lang,
      accessibility_prefs: a11y,
    };
    setProfile({ ...(profile as Profile), ...patch });
    setLocale(lang);
    setA11y(a11y);
    if (isSupabaseConfigured() && userId) {
      try {
        await getSupabaseBrowser().from("profiles").update(patch).eq("id", userId);
      } catch {
        /* local state already updated */
      }
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="pt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            About you
          </p>
          <label className="mb-1 block text-sm font-medium text-slate-700">Display name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />

          <label className="mb-1 mt-4 block text-sm font-medium text-slate-700">
            Preferred language
          </label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Locale)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            {Object.entries(LOCALE_NAMES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <label className="mb-1 mt-4 block text-sm font-medium text-slate-700">
            Condition tags (opt-in, self-selected)
          </label>
          <div className="flex flex-wrap gap-2">
            {CONDITION_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  tags.includes(t)
                    ? "bg-brand-100 text-brand-800 ring-1 ring-brand-300"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="pt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Accessibility
          </p>
          <Row label="High contrast">
            <Choice
              active={a11y.contrast === "high"}
              onOn={() => applyA11y({ contrast: "high" })}
              onOff={() => applyA11y({ contrast: "normal" })}
            />
          </Row>
          <Row label="Reduced motion">
            <Choice
              active={a11y.motion === "reduced"}
              onOn={() => applyA11y({ motion: "reduced" })}
              onOff={() => applyA11y({ motion: "normal" })}
            />
          </Row>
          <Row label="Text size">
            <div className="flex gap-1">
              {(["sm", "md", "lg", "xl"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => applyA11y({ fontScale: s })}
                  className={`rounded-lg px-3 py-1 text-xs font-medium ${
                    (a11y.fontScale ?? "md") === s
                      ? "bg-brand-100 text-brand-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
          </Row>
        </CardBody>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save}>Save changes</Button>
        {saved && <span className="text-sm text-green-600">Saved ✓</span>}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0">
      <span className="text-sm text-slate-700">{label}</span>
      {children}
    </div>
  );
}

function Choice({
  active,
  onOn,
  onOff,
}: {
  active: boolean;
  onOn: () => void;
  onOff: () => void;
}) {
  return (
    <div className="flex gap-1">
      <button
        onClick={onOn}
        className={`rounded-lg px-3 py-1 text-xs font-medium ${
          active ? "bg-brand-100 text-brand-800" : "bg-slate-100 text-slate-600"
        }`}
      >
        On
      </button>
      <button
        onClick={onOff}
        className={`rounded-lg px-3 py-1 text-xs font-medium ${
          !active ? "bg-brand-100 text-brand-800" : "bg-slate-100 text-slate-600"
        }`}
      >
        Off
      </button>
    </div>
  );
}
