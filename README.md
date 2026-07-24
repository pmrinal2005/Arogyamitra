# AROGYASETU — Predictive Community Health OS

A **free, privacy-first, desktop-web Predictive Community Health Operating System.**
AROGYASETU fuses web-based self-report (EMA micro check-ins, validated scales,
journaling + NLP), real-time environmental exposure, and a trust-scored mutual-aid
network into one **closed predictive loop** — delivering transparent AI
micro-interventions and discreet **Care Pings** *before* crisis.

> ⚠️ **AROGYASETU is a wellness and community support tool. It is not a medical
> device, diagnostic tool, therapy, or emergency service.**

---

## ✨ Design values (non-negotiable)

- **100% free / free-tier only** — Next.js on **Vercel Hobby**, **Supabase free tier**
  (Postgres, Auth, Realtime, Storage, Edge Functions), keyless **Open-Meteo**, and a
  **swappable free-tier LLM** (Groq / OpenRouter / Gemini / Hugging Face).
- **Transparent, not black-box** — the risk score is a **rule-based weighted Postgres
  function**. The LLM *only* narrates already-computed numbers into plain language and
  *never* decides the risk bucket.
- **Graceful degradation** — every external call has a static fallback and caching, so
  a rate-limit or outage never crashes the dashboard. The app even runs in a full
  **demo mode** with no backend configured.
- **Privacy by default** — Row Level Security on every table, restricted views for
  matching, coarsened map coordinates, differential-privacy aggregates, one-time (never
  continuous) location, and a client-side crisis path that works even if the LLM is down.

---

## 🧱 Tech stack

| Layer | Technology |
|------|------------|
| Framework | Next.js 14 (App Router) + React 18 + TypeScript |
| UI | Tailwind CSS + Radix-style primitives (`components/ui`) |
| State | Zustand (client) + TanStack Query (server-state cache) |
| Charts | Recharts |
| Map | React-Leaflet + OpenStreetMap tiles + marker clustering |
| Forms | React Hook Form + Zod |
| i18n | Lightweight dictionary (`lib/i18n.ts`) — en / es / hi |
| Voice | Native Web Speech API |
| PWA | Hand-rolled service worker (`public/sw.js`) + `manifest.json` + IndexedDB offline queue |
| Backend | Supabase — Postgres, Auth (magic link + OAuth), Realtime, Storage, Edge Functions (Deno) |
| AI | Free-tier LLM via a swappable abstraction (`lib/llm-server.ts`, `supabase/functions/_shared/llm.ts`) |
| Env data | Open-Meteo (keyless, free) |

---

## 📁 Project structure

```
app/                      Next.js routes (App Router)
  api/env/                Open-Meteo proxy (edge, cached) 
  api/health/             Service-status endpoint (degraded-mode detection)
  api/intervention/       LLM micro-intervention proxy (key stays server-side) + static fallback
  auth/callback/          Supabase magic-link / OAuth callback
  dashboard/              Authenticated multi-panel app (overview, checkin, journal,
                          scales, environment, community, care-pings, insights,
                          resources, settings/*)
  login/  onboarding/     Auth + first-run flow
components/
  dashboard/              Widgets, sidebar, maps, realtime Care Pings
  crisis/                 Full-screen crisis interstitial
  pwa/PwaManager.tsx      SW registration, offline banner, queue flush, install prompt
  ui/                     Shared primitives
lib/
  supabase/               Browser/server/middleware clients
  hooks.ts                TanStack Query hooks (live → demo fallback)
  actions.ts              Client write helpers (+ near-real-time index recompute)
  crisis.ts               Client-side VADER-style crisis keyword classifier
  use-crisis-guard.ts     Shared hook used on EVERY free-text surface
  llm-server.ts           Server-only swappable LLM chain (Node)
  offline-queue.ts        IndexedDB write queue for offline EMA/journal
  demo-data.ts            Deterministic fallback data (worsening-trajectory demo)
messages/                 en.json / es.json / hi.json (identical key sets)
public/
  manifest.json  sw.js  offline.html  intervention-library.json  icons/
scripts/
  seed-demo.ts            Demo seeding script (npm run seed)
supabase/
  migrations/             0001 schema · 0002 RLS · 0003 views+triggers ·
                          0004 risk & trust functions · 0005 cron + storage
  functions/              8 Edge Functions (see below)
  config.toml             Edge function JWT config
```

---

## 🔑 Environment variables

Copy `.env.example` → `.env.local`. **Nothing is required** to run in demo mode; add
Supabase + an LLM key to go live.

| Variable | Where | Required | Notes |
|----------|-------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | for live backend | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | for live backend | Safe to expose (RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | for seeding + edge fns | Never expose / never `NEXT_PUBLIC_` |
| `LLM_PROVIDER` | server | optional | `groq` \| `openrouter` \| `gemini` \| `huggingface` |
| `GROQ_API_KEY` / `GROQ_MODEL` | server | optional | https://console.groq.com |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | server | optional | has `:free` models |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | server | optional | Google AI Studio |
| `HUGGINGFACE_API_KEY` / `HF_MODEL` | server | optional | HF Inference |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | client/server | optional | Web Push (`npx web-push generate-vapid-keys`) |

> Open-Meteo (environmental data) is **keyless** — no variable needed.

---

## 🚀 Local setup

```bash
# 1. install
npm install

# 2. configure (optional — skip to run in demo mode)
cp .env.example .env.local     # fill in Supabase + one LLM key

# 3. run
npm run dev                    # http://localhost:3000

# 4. type-check / build
npm run typecheck
npm run build
```

On the landing page, **"Get Started" / "Launch AROGYASETU" open `/dashboard`.**
With no Supabase configured, the dashboard runs in a fully-interactive **demo
mode** (deterministic sample data across every widget), so you can explore the
entire authenticated app before wiring a backend. Configure Supabase to switch
seamlessly to live, RLS-protected data.

---

## 🗄️ Supabase setup (free tier)

1. Create a project at [supabase.com](https://supabase.com).
2. **Run the migrations in order** (SQL Editor → paste each file, or via CLI):
   ```
   supabase/migrations/0001_schema.sql
   supabase/migrations/0002_rls_policies.sql
   supabase/migrations/0003_views_triggers.sql
   supabase/migrations/0004_risk_and_trust_functions.sql
   supabase/migrations/0005_cron_and_storage.sql
   ```
   Or with the CLI: `supabase link --project-ref <ref>` then `supabase db push`.
3. **Auth**: enable **Email (magic link)**; optionally enable **Google / GitHub** OAuth
   (all free). Set the redirect URL to `<your-domain>/auth/callback`.
4. **Deploy the Edge Functions** (Deno):
   ```bash
   supabase functions deploy compute-behavioral-health-index
   supabase functions deploy analyze-journal-entry
   supabase functions deploy fetch-environmental-snapshot
   supabase functions deploy generate-micro-intervention
   supabase functions deploy compute-trust-scores
   supabase functions deploy match-and-send-care-ping
   supabase functions deploy differential-privacy-aggregate
   supabase functions deploy purge-stale-engagement-data
   ```
5. **Set Edge Function secrets** (same LLM values as `.env.local`):
   ```bash
   supabase secrets set LLM_PROVIDER=groq GROQ_API_KEY=xxx
   # SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.
   ```
6. **Database Webhook**: point `journal_entries` INSERT → `analyze-journal-entry`
   (Database → Webhooks).
7. **Realtime**: enable Realtime on the `care_pings` and `time_credits_ledger` tables.
8. **Storage**: buckets `avatars`, `exports` are created in `0005_cron_and_storage.sql`
   with owner-only RLS.
9. **Scheduling** (`pg_cron`, included in `0005`): daily index recompute, trust
   recompute, and the 30-day engagement purge. (Alternatively use Vercel Cron hitting
   the edge endpoints.)

### Seed demo data

```bash
# needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
npm run seed
```
Creates 3 mock users — including **Aanya**, on a worsening trajectory that flips the
risk engine to **Elevated**, plus **Maya** (verified neighbour who receives the Care
Ping) and **Sam**.

---

## ☁️ One-click deploy (Vercel + Supabase)

1. Push this repo to GitHub.
2. Import it into **Vercel** → framework auto-detected as **Next.js**.
3. Add the env vars from the table above (at minimum the two `NEXT_PUBLIC_SUPABASE_*`
   and one LLM key). Deploy.
4. Complete the **Supabase setup** above and add `<your-vercel-domain>/auth/callback`
   to Supabase Auth redirect URLs.

Everything stays within **Vercel Hobby** (functions are tiny/stateless — the env proxy
and health check are `edge`; the intervention proxy is a lightweight `nodejs` route;
all heavy/DB work lives in Supabase Edge Functions / Postgres).

---

## 🧭 Functional entry URIs

| Route | Purpose |
|-------|---------|
| `/` | Landing / marketing |
| `/login` · `/onboarding` | Auth + first-run |
| `/dashboard` | Multi-panel overview (index, forecast, env, quick check-in, streaks, pings, resilience, crisis footer) |
| `/dashboard/checkin` | 15-second EMA slider flow (adaptive frequency) |
| `/dashboard/journal` | Journaling Studio (voice input, AI Reflection, export) |
| `/dashboard/scales` | PHQ-4 / GAD-2 / UCLA-3 validated instruments |
| `/dashboard/environment` | Exposome + personal exposure lag model + AQI map |
| `/dashboard/community` | Mutual-aid Leaflet map, directory, timebank ledger, Jitsi launch |
| `/dashboard/care-pings` | Realtime inbox (received / sent) + outcome ratings |
| `/dashboard/insights` | Full BHI history + "why the risk changed" audit log + journal themes |
| `/dashboard/resources` | Community + always-visible crisis resources |
| `/dashboard/settings/privacy` | Consent dashboard, sensitivity sliders, pause pings, export, delete |
| `/dashboard/settings/profile` | Profile, condition tags, accessibility, language |
| `/dashboard/settings/family` | Permissioned care-circle management |

### API routes (Vercel-native, lightweight)

| Method · Route | Purpose |
|---|---|
| `GET /api/health` | Which services are configured; drives degraded-mode UI |
| `GET /api/env?lat&lng` | Cached Open-Meteo proxy (coarsened grid, 1h SWR) |
| `POST /api/intervention` | LLM micro-intervention (key stays server-side) → static fallback. Body: `{ contributing_factors[], intervention_type? }` |

---

## 🧮 The prediction algorithm (transparent)

Implemented as `public.compute_behavioral_health_index()` (Postgres,
`0004_risk_and_trust_functions.sql`). All inputs are **deltas vs. the user's own 14-day
rolling baseline**, not a population norm:

```
composite_score = clamp(
    0.30 * validated_scale_delta +
    0.25 * ema_composite_delta +
    0.20 * journal_nlp_delta +
    0.10 * engagement_rhythm_delta +
    0.15 * environmental_risk_weighted_delta,
  0, 100)
```
Buckets: `0–39 Low · 40–69 Moderate · 70–100 Elevated`. Weights are scaled by the
user's sensitivity setting. Individual weighted contributions are written to
`contributing_factors` (jsonb) so the **"Why?"** card renders plain-language
explanations. The LLM is called *only after* this score exists.

## 🤝 Trust score (transparent)

`public.compute_trust_score()`:
```
composite_trust_score =
    0.35 * proximity + 0.25 * shared_condition_overlap
  + 0.20 * historical_reliability + 0.20 * response_latency
```
Users see their own full breakdown; others see only the composite (via a restricted
view) — the **"Why was I matched?"** transparency requirement without over-exposing
personal history.

---

## ⚡ Supabase Edge Functions

| Function | Trigger | Role |
|----------|---------|------|
| `compute-behavioral-health-index` | schedule / on submit | runs the Postgres risk function |
| `analyze-journal-entry` | DB webhook on insert | LLM sentiment/theme/risk-flag extraction (client crisis check runs first, synchronously) |
| `fetch-environmental-snapshot` | on demand | Open-Meteo w/ coarse-grid cache (1h TTL) |
| `generate-micro-intervention` | on `elevated` | LLM → static template fallback chain |
| `compute-trust-scores` | schedule | recompute trust for active aid profiles |
| `match-and-send-care-ping` | on flip to `elevated` | top matches → `care_pings` + Realtime + push |
| `differential-privacy-aggregate` | B2B query | Laplace-noised aggregates only |
| `purge-stale-engagement-data` | schedule | roll up + delete raw engagement > 30 days |

---

## 🛡️ Safety & crisis path

`lib/crisis.ts` + `lib/use-crisis-guard.ts` run a **client-side, on-device** keyword /
sentiment classifier on journal and EMA free text **before anything leaves the browser**.
A high-severity flag shows a calm full-screen interstitial with **locale-appropriate
crisis lines** (`lib/crisis-resources.ts`, country via `Intl` — never IP), logs a
`crisis_escalation_events` row, and **does not depend on the LLM being reachable**.

---

## 🎬 Live demo flow

1. `npm run seed`.
2. **Window A** — sign in as *Aanya*: `/dashboard` shows the forecast at **Elevated**
   with a "Why?" breakdown and a micro-intervention.
3. **Window B / incognito** — sign in as *Maya*: a **Care Ping** arrives in real time on
   `/dashboard/care-pings` (Supabase Realtime + optional Web Push).
4. Every external API has a static fallback, so a live rate-limit never breaks the demo.

---

## 📦 Scripts

```bash
npm run dev         # Next dev server (localhost:3000)
npm run build       # production build
npm run start       # serve the production build
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run seed        # populate demo data (needs service role key)
```

## ✅ Status

- **Platform**: Vercel (Next.js) + Supabase (free tier)
- **Backend**: full schema, RLS, restricted views, triggers, risk/trust functions,
  8 Edge Functions, cron + storage — all migrations included.
- **Frontend**: complete authenticated dashboard, PWA (installable + offline queue),
  i18n (en/es/hi), accessibility prefs, crisis layer, gamification.
- **Demo mode**: fully functional with zero backend configured.
