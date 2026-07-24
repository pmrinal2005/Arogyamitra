// Static, pre-written content library. Guarantees graceful degradation when
// every free LLM provider is rate-limited or down. Also used for offline PWA.

export type InterventionType =
  | "breathing_exercise"
  | "grounding_prompt"
  | "journaling_prompt"
  | "hydration_med_reminder"
  | "telehealth_nudge"
  | "educational_snippet";

export const INTERVENTION_TEMPLATES: Record<InterventionType, string[]> = {
  breathing_exercise: [
    "Let's take one slow minute together. Breathe in for 4 counts, hold for 4, out for 6. Repeat four times. Notice your shoulders soften a little each time.",
  ],
  grounding_prompt: [
    "Try the 5-4-3-2-1 grounding practice: name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste. It gently brings you back to the present.",
  ],
  journaling_prompt: [
    "When you have a moment, you might write about one small thing that felt heavy today — and one thing, however tiny, that felt okay. No pressure to share it with anyone.",
  ],
  hydration_med_reminder: [
    "A gentle nudge: a glass of water and, if you take any, your usual medication can help steady both body and mood. Small steps count.",
  ],
  telehealth_nudge: [
    "If today feels like a lot, talking to someone can help. Many communities offer free tele-health or warm-line support — the Resources tab lists options near you.",
  ],
  educational_snippet: [
    "Dips in sleep and connection often ripple into mood a day or two later. Noticing the pattern is the first step — and you're already doing that by checking in.",
  ],
};

export function pickTemplate(type: InterventionType): string {
  const arr = INTERVENTION_TEMPLATES[type] ?? INTERVENTION_TEMPLATES.grounding_prompt;
  return arr[Math.floor(Math.random() * arr.length)];
}

// Fallback for journal NLP when the LLM is unavailable: neutral, non-clinical.
export const NEUTRAL_JOURNAL_ANALYSIS = {
  sentiment: 0,
  themes: [] as string[],
  risk_flags: [] as string[],
};

// Fallback environmental snapshot (last-known-good placeholder).
export const FALLBACK_ENV = {
  pm25: null,
  pm10: null,
  aqi: null,
  pollen_index: null,
  uv_index: null,
  temperature: null,
  humidity: null,
};
