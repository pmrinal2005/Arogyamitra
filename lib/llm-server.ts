// ---------------------------------------------------------------------------
// Server-only, swappable free-tier LLM abstraction (Node/Edge runtime version
// of supabase/functions/_shared/llm.ts). Provider chosen via LLM_PROVIDER env;
// on failure it falls through the chain and finally returns { ok:false } so the
// caller uses its static fallback. NEVER import this from client code — it reads
// server-only secrets. Keys are never returned to the browser.
// ---------------------------------------------------------------------------

export interface LLMResult {
  ok: boolean;
  text: string;
  provider: string;
}

const TIMEOUT_MS = 12000;

async function withTimeout<T>(p: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const c = new AbortController();
  const id = setTimeout(() => c.abort(), TIMEOUT_MS);
  try {
    return await p(c.signal);
  } finally {
    clearTimeout(id);
  }
}

async function callGroq(prompt: string, system: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("no groq key");
  return withTimeout(async (signal) => {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL ?? "llama-3.1-8b-instant",
        temperature: 0.6,
        max_tokens: 400,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
      signal,
    });
    if (!res.ok) throw new Error(`groq ${res.status}`);
    const j = await res.json();
    return j.choices?.[0]?.message?.content ?? "";
  });
}

async function callOpenRouter(prompt: string, system: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("no openrouter key");
  return withTimeout(async (signal) => {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.1-8b-instruct:free",
        temperature: 0.6,
        max_tokens: 400,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
      signal,
    });
    if (!res.ok) throw new Error(`openrouter ${res.status}`);
    const j = await res.json();
    return j.choices?.[0]?.message?.content ?? "";
  });
}

async function callGemini(prompt: string, system: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("no gemini key");
  const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
  return withTimeout(async (signal) => {
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
        signal,
      },
    );
    if (!res.ok) throw new Error(`gemini ${res.status}`);
    const j = await res.json();
    return j.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  });
}

async function callHuggingFace(prompt: string, system: string): Promise<string> {
  const key = process.env.HUGGINGFACE_API_KEY;
  if (!key) throw new Error("no hf key");
  const model = process.env.HF_MODEL ?? "meta-llama/Llama-3.1-8B-Instruct";
  return withTimeout(async (signal) => {
    const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        inputs: `<|system|>${system}<|user|>${prompt}<|assistant|>`,
        parameters: { max_new_tokens: 400, temperature: 0.6, return_full_text: false },
      }),
      signal,
    });
    if (!res.ok) throw new Error(`hf ${res.status}`);
    const j = await res.json();
    if (Array.isArray(j)) return j[0]?.generated_text ?? "";
    return j.generated_text ?? "";
  });
}

const PROVIDERS: Record<string, (p: string, s: string) => Promise<string>> = {
  groq: callGroq,
  openrouter: callOpenRouter,
  gemini: callGemini,
  huggingface: callHuggingFace,
};

export async function runLLM(prompt: string, system: string): Promise<LLMResult> {
  const primary = (process.env.LLM_PROVIDER ?? "groq").toLowerCase();
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
    } catch {
      // fall through to next provider
    }
  }
  return { ok: false, text: "", provider: "none" };
}
