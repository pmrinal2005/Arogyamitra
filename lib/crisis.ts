// ============================================================================
// Client-side, on-device crisis-keyword classifier (VADER-style lexicon).
// Runs SYNCHRONOUSLY in the browser BEFORE any text is sent to any API, so
// crisis detection never depends on the LLM or network. Used identically
// across Journal, EMA free-text, and any other free-text surface.
// ============================================================================

export type CrisisSeverity = "none" | "elevated" | "high";

export interface CrisisResult {
  severity: CrisisSeverity;
  matchedTerms: string[];
}

// High-severity phrases (immediate interstitial + escalation log).
const HIGH_SEVERITY: string[] = [
  "kill myself", "want to die", "end my life", "end it all",
  "suicide", "suicidal", "better off dead", "no reason to live",
  "can't go on", "cant go on", "take my own life", "hurt myself",
  "self harm", "self-harm", "cutting myself", "overdose",
  "don't want to be here", "dont want to be here", "not worth living",
];

// Elevated-severity phrases (supportive check, softer surface).
const ELEVATED_SEVERITY: string[] = [
  "hopeless", "worthless", "unbearable", "give up", "giving up",
  "can't cope", "cant cope", "no way out", "trapped", "burden",
  "everyone would be better without me", "so alone", "empty inside",
  "nothing matters", "pointless",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectCrisis(rawText: string): CrisisResult {
  const text = normalize(rawText || "");
  if (!text) return { severity: "none", matchedTerms: [] };

  const high = HIGH_SEVERITY.filter((p) => text.includes(p));
  if (high.length > 0) return { severity: "high", matchedTerms: high };

  const elevated = ELEVATED_SEVERITY.filter((p) => text.includes(p));
  if (elevated.length > 0) return { severity: "elevated", matchedTerms: elevated };

  return { severity: "none", matchedTerms: [] };
}

// Extreme EMA scores also trigger a crisis pathway independent of any text.
export function detectEmaCrisis(scores: {
  mood?: number | null;
  anxiety?: number | null;
  social?: number | null;
}): CrisisSeverity {
  const mood = scores.mood ?? 10;
  const anxiety = scores.anxiety ?? 0;
  if (mood <= 1 && anxiety >= 9) return "high";
  if (mood <= 2 || anxiety >= 9) return "elevated";
  return "none";
}
