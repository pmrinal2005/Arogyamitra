// ============================================================================
// Swappable, free-tier LLM abstraction with provider fallback chain.
// Provider is chosen via env LLM_PROVIDER (groq|openrouter|gemini|huggingface).
// If the primary provider fails/rate-limits, we fall through the chain, and
// finally return { ok:false } so callers can use their static fallback library.
// NEVER hardcode keys. All keys come from Edge Function secrets.
// ============================================================================

export interface LLMResult {
  ok: boolean;
  text: string;
  provider: string;
}

const withTimeout = (ms: number) => {
  const c = new AbortController();
  const id = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, clear: () => clearTimeout(id) };
};

async function callGroq(prompt: string, system: string): Promise<string> {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) throw new Error("no groq key");
  const t = withTimeout(12000);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: Deno.env.get("GROQ_MODEL") ?? "llama-3.1-8b-instant",
        temperature: 0.6,
        max_tokens: 400,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
      signal: t.signal,
    });
    if (!res.ok) throw new Error(`groq ${res.status}`);
    const j = await res.json();
    return j.choices?.[0]?.message?.content ?? "";
  } finally {
    t.clear();
  }
}

async function callOpenRouter(prompt: string, system: string): Promise<string> {
  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) throw new Error("no openrouter key");
  const t = withTimeout(12000);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: Deno.env.get("OPENROUTER_MODEL") ?? "meta-llama/llama-3.1-8b-instruct:free",
        temperature: 0.6,
        max_tokens: 400,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
      signal: t.signal,
    });
    if (!res.ok) throw new Error(`openrouter ${res.status}`);
    const j = await res.json();
    return j.choices?.[0]?.message?.content ?? "";
  } finally {
    t.clear();
  }
}

async function callGemini(prompt: string, system: string): Promise<string> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("no gemini key");
  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-1.5-flash";
  const t = withTimeout(12000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 400 },
        }),
        signal: t.signal,
      },
    );
    if (!res.ok) throw new Error(`gemini ${res.status}`);
    const j = await res.json();
    return j.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } finally {
    t.clear();
  }
}

async function callHuggingFace(prompt: string, system: string): Promise<string> {
  const key = Deno.env.get("HUGGINGFACE_API_KEY");
  if (!key) throw new Error("no hf key");
  const model = Deno.env.get("HF_MODEL") ?? "meta-llama/Llama-3.1-8B-Instruct";
  const t = withTimeout(15000);
  try {
    const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        inputs: `<|system|>${system}<|user|>${prompt}<|assistant|>`,
        parameters: { max_new_tokens: 400, temperature: 0.6, return_full_text: false },
      }),
      signal: t.signal,
    });
    if (!res.ok) throw new Error(`hf ${res.status}`);
    const j = await res.json();
    if (Array.isArray(j)) return j[0]?.generated_text ?? "";
    return j.generated_text ?? "";
  } finally {
    t.clear();
  }
}

const PROVIDERS: Record<string, (p: string, s: string) => Promise<string>> = {
  groq: callGroq,
  openrouter: callOpenRouter,
  gemini: callGemini,
  huggingface: callHuggingFace,
};

// Try the configured provider first, then the rest of the chain.
export async function runLLM(prompt: string, system: string): Promise<LLMResult> {
  const primary = (Deno.env.get("LLM_PROVIDER") ?? "groq").toLowerCase();
  const order = [primary, "groq", "openrouter", "gemini", "huggingface"].filter(
    (v, i, a) => a.indexOf(v) === i,
  );
  for (const name of order) {
    const fn = PROVIDERS[name];
    if (!fn) continue;
    try {
      const text = await fn(prompt, system);
      if (text && text.trim().length > 0) {
        return { ok: true, text: text.trim(), provider: name };
      }
    } catch (_e) {
      // fall through to next provider
    }
  }
  return { ok: false, text: "", provider: "none" };
}

// Best-effort JSON extraction from an LLM response.
export function extractJson<T>(text: string): T | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
