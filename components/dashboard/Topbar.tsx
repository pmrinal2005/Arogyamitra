"use client";
import { useI18n } from "@/lib/use-i18n";
import { useApp } from "@/lib/store";
import { LOCALE_NAMES, type Locale } from "@/lib/i18n";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";

export default function Topbar() {
  const { locale, setLocale } = useI18n();
  const { profile, userId, email } = useApp((s) => ({
    profile: s.profile,
    userId: s.userId,
    email: s.email,
  }));

  const onLocale = async (l: Locale) => {
    setLocale(l);
    if (isSupabaseConfigured() && userId) {
      try {
        await getSupabaseBrowser()
          .from("profiles")
          .update({ preferred_language: l })
          .eq("id", userId);
      } catch {
        /* ignore */
      }
    }
  };

  const name = profile?.display_name || email?.split("@")[0] || "friend";

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
      <div>
        <p className="text-sm text-slate-400">Welcome back,</p>
        <p className="font-semibold text-slate-800">{name}</p>
      </div>
      <div className="flex items-center gap-3">
        <label className="sr-only" htmlFor="locale">
          Language
        </label>
        <select
          id="locale"
          value={locale}
          onChange={(e) => onLocale(e.target.value as Locale)}
          className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
        >
          {Object.entries(LOCALE_NAMES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
