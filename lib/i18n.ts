// Lightweight i18n dictionary loader. We keep next-intl as a dependency for
// its formatting utilities, but use a simple provider so the app works without
// locale-routing complexity on Vercel Hobby.
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import hi from "@/messages/hi.json";

export type Locale = "en" | "es" | "hi";

export const MESSAGES: Record<Locale, Record<string, string>> = {
  en: en as Record<string, string>,
  es: es as Record<string, string>,
  hi: hi as Record<string, string>,
};

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
  hi: "हिन्दी",
};

export function t(locale: Locale, key: string): string {
  return MESSAGES[locale]?.[key] ?? MESSAGES.en[key] ?? key;
}
