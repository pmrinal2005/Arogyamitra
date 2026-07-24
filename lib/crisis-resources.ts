// Locale-appropriate crisis resources. Country is detected via the Intl locale
// or a manual country selector — NEVER via IP tracking without consent.

export interface CrisisLine {
  name: string;
  contact: string;
  note?: string;
  url?: string;
}

export const CRISIS_LINES: Record<string, CrisisLine[]> = {
  US: [
    { name: "988 Suicide & Crisis Lifeline", contact: "Call or text 988", url: "https://988lifeline.org" },
    { name: "Crisis Text Line", contact: "Text HOME to 741741", url: "https://www.crisistextline.org" },
  ],
  IN: [
    { name: "KIRAN Mental Health Helpline", contact: "1800-599-0019", note: "24/7, toll-free" },
    { name: "iCall (TISS)", contact: "9152987821", url: "https://icallhelpline.org" },
    { name: "AASRA", contact: "+91-9820466726", url: "http://www.aasra.info" },
  ],
  GB: [
    { name: "Samaritans", contact: "Call 116 123", url: "https://www.samaritans.org" },
    { name: "SHOUT", contact: "Text SHOUT to 85258" },
  ],
  CA: [
    { name: "Talk Suicide Canada", contact: "1-833-456-4566", url: "https://talksuicide.ca" },
  ],
  AU: [
    { name: "Lifeline Australia", contact: "13 11 14", url: "https://www.lifeline.org.au" },
  ],
  DEFAULT: [
    {
      name: "Find a Helpline (international)",
      contact: "Visit findahelpline.com",
      url: "https://findahelpline.com",
      note: "Free, confidential support directory for 100+ countries.",
    },
    {
      name: "International Association for Suicide Prevention",
      contact: "Crisis centre directory",
      url: "https://www.iasp.info/resources/Crisis_Centres/",
    },
  ],
};

export function detectCountry(): string {
  try {
    const locale =
      typeof navigator !== "undefined"
        ? navigator.language || (navigator.languages && navigator.languages[0])
        : "en-US";
    const region = new Intl.Locale(locale).region;
    if (region && CRISIS_LINES[region]) return region;
  } catch { /* ignore */ }
  return "DEFAULT";
}

export function getCrisisLines(country?: string): CrisisLine[] {
  const c = country && CRISIS_LINES[country] ? country : detectCountry();
  return CRISIS_LINES[c] ?? CRISIS_LINES.DEFAULT;
}

export const SAFETY_DISCLAIMER =
  "AROGYASETU is a wellness and community support tool. It is not a medical device, diagnostic tool, therapy, or emergency service. If you are in immediate danger, contact your local emergency number.";
