// ---------------------------------------------------------------------------
// Status endpoint. Reports which external services are configured (without ever
// leaking key values), so the UI can decide between live and demo/fallback
// behavior and the demo operator can sanity-check the deploy.
// ---------------------------------------------------------------------------
import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  const has = (v?: string) => typeof v === "string" && v.length > 0;

  const llmProvider = (process.env.LLM_PROVIDER ?? "groq").toLowerCase();
  const llmConfigured =
    has(process.env.GROQ_API_KEY) ||
    has(process.env.OPENROUTER_API_KEY) ||
    has(process.env.GEMINI_API_KEY) ||
    has(process.env.HUGGINGFACE_API_KEY);

  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        supabase: has(process.env.NEXT_PUBLIC_SUPABASE_URL) && has(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        llm: { configured: llmConfigured, provider: llmProvider },
        environmental: "open-meteo (keyless, free)",
      },
      degraded_mode: !(
        has(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
        has(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      ),
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
