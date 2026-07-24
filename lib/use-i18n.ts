"use client";
import { useApp } from "@/lib/store";
import { t as translate, type Locale } from "@/lib/i18n";

export function useI18n() {
  const locale = useApp((s) => s.locale) as Locale;
  const setLocale = useApp((s) => s.setLocale);
  const t = (key: string) => translate(locale, key);
  return { locale, setLocale, t };
}
