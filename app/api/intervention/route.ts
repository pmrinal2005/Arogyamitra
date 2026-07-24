// ---------------------------------------------------------------------------
// Lightweight LLM proxy for micro-interventions (Vercel-native fallback path).
//
// Why this exists:
//   - Keeps the LLM API key 100% server-side — the browser NEVER holds it.
//   - Uses the same swappable free-tier provider chain as the Supabase Edge
//     Function (lib/llm-server.ts: Groq → OpenRouter → Gemini → HuggingFace).
//   - If every provider is rate-limited/down (or no key is configured), it
//     degrades gracefully to the static, pre-written template library so the
//     dashboard's "gentle nudge" panel never fails.
//
// The LLM ONLY narrates already-computed numeric contributing factors into
// warm, plain-language text — it NEVER computes the risk score or bucket.
//
// This is deliberately stateless & lightweight (Node runtime, tiny payload) to
// respect Vercel Hobby function limits; the heavy/DB-writing path lives in the
// Supabase Edge Function `generate-micro-intervention`.
// ---------------------------------------------------------------------------
import { NextResponse } from "next/server";
import { runLLM } from "@/lib/llm-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InterventionType =
  | "breathing_exercise"
  | "grounding_prompt"
  | "journaling_prompt"
  | "hydration_med_reminder"
  | "telehealth_nudge"
  | "educational_snippet";

// Mirrors public/intervention-library.json and the edge function fallbacks.
const TEMPLATES: Record<InterventionType, string[]> = {
  breathing_exercise: [
    "Let's take one slow minute together. Breathe in for 4 counts, hold for 4, out for 6. Repeat four times. Notice your shoulders soften a little each time.",
    "Box breathing: in for 4, hold 4, out 4, hold 4. Do this for five rounds. There's nothing else to get right — just the next breath.",
  ],
  grounding_prompt: [
    "Try the 5-4-3-2-1 grounding practice: name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste. It gently brings you back to the present.",
    "Press your feet into the floor and name where you are, the date, and one thing you can see. You're here, and this moment is safe.",
  ],
  journaling_prompt: [
    "When you have a moment, you might write about one small thing that felt heavy today — and one thing, however tiny, that felt okay. No pressure to share it with anyone.",
    "If words are hard, try finishing this line: 'Right now I notice…' — just one honest sentence is enough.",
  ],
  hydration_med_reminder: [
    "A gentle nudge: a glass of water and, if you take any, your usual medication can help steady both body and mood. Small steps count.",
    "Bodies get thirsty before minds notice. A glass of water now might take the edge off the next hour.",
  ],
  telehealth_nudge: [
    "If today feels like a lot, talking to someone can help. Many communities offer free tele-health or warm-line support — the Resources tab lists options near you.",
    "Reaching out isn't a last resort — it's a skill. A free warm-line or community counselor can be a good next step; see the Resources tab.",
  ],
  educational_snippet: [
    "Dips in sleep and connection often ripple into mood a day or two later. Noticing the pattern is the first step — and you're already doing that by checking in.",
    "Your forecast learns from your own baseline, not a population average. That's why small, honest check-ins make it more useful over time.",
  ],
};

const DISCLAIMER =
  "These are supportive wellbeing suggestions, not medical advice, diagnosis, therapy, or emergency care.";

const SYSTEM =
  "You are AROGYASETU's warm, non-clinical wellbeing companion. Given a list of numeric wellbeing factors (already computed by a transparent rule-based engine), write ONE short (2-4 sentence) supportive micro-intervention. Be gentle, concrete, and empowering. Do NOT diagnose, do NOT mention scores or numbers, do NOT use alarming language. Offer one tiny doable step (a breath, a sip of water, a short note, reaching out).";

function pickTemplate(type: InterventionType): string {
  const arr = TEMPLATES[type] ?? TEMPLATES.grounding_prompt;
  return arr[Math.floor(Math.random() * arr.length)];
}

interface Factor {
  factor?: string;
  score?: number;
  weight?: number;
  delta_description?: string;
}

// Choose an intervention style from the top contributing factor (same heuristic
// as the edge function, so both paths stay consistent).
function chooseType(factors: Factor[]): InterventionType {
  try {
    const top = [...factors].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
    const f = (top?.factor ?? "").toLowerCase();
    if (f.includes("sleep") || f.includes("check-in") || f.includes("ema")) return "breathing_exercise";
    if (f.includes("journal")) return "journaling_prompt";
    if (f.includes("environment") || f.includes("pm2") || f.includes("air")) return "hydration_med_reminder";
    if (f.includes("scale") || f.includes("gad") || f.includes("phq") || f.includes("ucla")) return "telehealth_nudge";
    if (f.includes("engagement") || f.includes("late")) return "grounding_prompt";
  } catch {
    /* fall through to default */
  }
  return "grounding_prompt";
}

export async function POST(req: Request) {
  let factors: Factor[] = [];
  let preferredType: InterventionType | undefined;

  try {
    const body = await req.json().catch(() => ({}));
    if (Array.isArray(body?.contributing_factors)) factors = body.contributing_factors as Factor[];
    if (typeof body?.intervention_type === "string" && body.intervention_type in TEMPLATES) {
      preferredType = body.intervention_type as InterventionType;
    }
  } catch {
    /* tolerate empty/invalid body — we still return a safe fallback */
  }

  const type = preferredType ?? chooseType(factors);

  const prompt =
    `Wellbeing factors (JSON): ${JSON.stringify(factors).slice(0, 2000)}. ` +
    `Preferred intervention style: ${type.replace(/_/g, " ")}. Write the micro-intervention now.`;

  try {
    const llm = await runLLM(prompt, SYSTEM);
    if (llm.ok && llm.text) {
      return NextResponse.json(
        {
          ok: true,
          intervention_type: type,
          generated_text: llm.text,
          source: "llm",
          provider: llm.provider,
          disclaimer: DISCLAIMER,
        },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }
  } catch {
    /* fall through to static fallback below */
  }

  // Graceful degradation: static, pre-written template. Never crashes.
  return NextResponse.json(
    {
      ok: true,
      intervention_type: type,
      generated_text: pickTemplate(type),
      source: "template_fallback",
      provider: "none",
      disclaimer: DISCLAIMER,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

// Convenience GET for health-checking the route + returning a generic template.
export async function GET() {
  const type: InterventionType = "grounding_prompt";
  return NextResponse.json(
    {
      ok: true,
      intervention_type: type,
      generated_text: pickTemplate(type),
      source: "template_fallback",
      provider: "none",
      disclaimer: DISCLAIMER,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
