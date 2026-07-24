/* eslint-disable no-console */
// ===========================================================================
// AROGYASETU — demo seed script  (run:  npm run seed)
//
// Populates realistic multi-day data for 3 mock users so the app can be demoed
// live on the free tiers:
//
//   1. Aanya  (aanya.demo@arogyasetu.test)  — the "at-risk" user, on a clear
//      WORSENING trajectory so the risk engine visibly flips to "Elevated".
//   2. Maya   (maya.demo@arogyasetu.test)   — a trusted, verified neighbour who
//      receives the Care Ping (open in a 2nd browser/incognito window).
//   3. Sam    (sam.demo@arogyasetu.test)    — a second neighbour for the map.
//
// It is idempotent: re-running it deletes the previous demo users first.
//
// Requirements (in .env / .env.local — NEVER commit these):
//   NEXT_PUBLIC_SUPABASE_URL       = https://<project>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY      = <service role key>   (server-only!)
//
// The service role key bypasses RLS — that's expected for seeding. This script
// only ever runs locally / in CI, never in the browser.
// ===========================================================================
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// --- tiny .env loader (no dotenv dep needed) -------------------------------
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(file: string) {
  if (!existsSync(file)) return;
  const txt = readFileSync(file, "utf8");
  for (const line of txt.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
[".env.local", ".env"].forEach((f) => loadEnvFile(resolve(process.cwd(), f)));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "\n✖ Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY " +
      "in .env.local before running `npm run seed`.\n",
  );
  process.exit(1);
}

const sb: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- helpers ---------------------------------------------------------------
const DAY = 86400000;
const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY).toISOString();
const dateOnly = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY).toISOString().slice(0, 10);
const round2 = (n: number) => Math.round(n * 100) / 100;

function bucket(score: number): "low" | "moderate" | "elevated" {
  if (score >= 70) return "elevated";
  if (score >= 40) return "moderate";
  return "low";
}

interface DemoUser {
  email: string;
  display_name: string;
  password: string;
  home_label: string;
  lat: number;
  lng: number;
  condition_tags: string[];
  worsening: boolean;
  offers: string[];
  verification: "unverified" | "orientation_completed";
  bio: string;
}

const USERS: DemoUser[] = [
  {
    email: "aanya.demo@arogyasetu.test",
    display_name: "Aanya (demo, at-risk)",
    password: "arogya-demo-123!",
    home_label: "New Delhi, IN",
    lat: 28.61,
    lng: 77.21,
    condition_tags: ["student stress", "anxiety", "sleep issues"],
    worsening: true,
    offers: ["companionship_call"],
    verification: "unverified",
    bio: "Grad student. Some tough weeks lately.",
  },
  {
    email: "maya.demo@arogyasetu.test",
    display_name: "Maya R. (demo neighbour)",
    password: "arogya-demo-123!",
    home_label: "New Delhi, IN",
    lat: 28.61,
    lng: 77.21,
    condition_tags: ["new parent", "healthy aging"],
    worsening: false,
    offers: ["companionship_call", "video_chat", "meal_coordination"],
    verification: "orientation_completed",
    bio: "Happy to chat over tea or a video call in the evenings.",
  },
  {
    email: "sam.demo@arogyasetu.test",
    display_name: "Sam T. (demo neighbour)",
    password: "arogya-demo-123!",
    home_label: "New Delhi, IN",
    lat: 28.63,
    lng: 77.22,
    condition_tags: ["healthy aging"],
    worsening: false,
    offers: ["grocery_run", "ride", "skill_share"],
    verification: "orientation_completed",
    bio: "Weekends free for grocery runs and rides.",
  },
];

// Worsening 14-day curve (flips to Elevated near the end) vs. a stable one.
const WORSENING_CURVE = [24, 27, 25, 32, 38, 44, 51, 57, 62, 68, 72, 77, 74, 82];
const STABLE_CURVE = [30, 28, 32, 29, 31, 27, 30, 33, 28, 31, 29, 32, 30, 28];

async function deleteExistingDemoUsers() {
  console.log("• Cleaning up any previous demo users…");
  // page through users; delete matching demo emails (cascades via FKs).
  let page = 1;
  const emails = new Set(USERS.map((u) => u.email));
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const users = (data.users ?? []) as Array<{ id: string; email?: string }>;
    const found = users.filter((u) => !!u.email && emails.has(u.email));
    for (const u of found) {
      await sb.auth.admin.deleteUser(u.id);
      console.log(`  – removed ${u.email}`);
    }
    if (users.length < 200) break;
    page += 1;
  }
}

async function createUser(u: DemoUser): Promise<string> {
  const { data, error } = await sb.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { display_name: u.display_name },
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  const id = data.user.id;

  // The handle_new_user trigger creates a profiles row; upsert to enrich it.
  await sb.from("profiles").upsert({
    id,
    display_name: u.display_name,
    home_location_label: u.home_label,
    home_lat: u.lat,
    home_lng: u.lng,
    condition_tags: u.condition_tags,
    preferred_language: "en",
    risk_sensitivity: "balanced",
    care_pings_paused: false,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  });

  // Consents (all the ones a demo needs granted).
  const consentTypes = [
    "ema_checkins",
    "journaling_nlp",
    "environmental_location",
    "mutual_aid_matching",
    "care_ping_receiving",
    "aggregate_research_sharing",
  ];
  await sb.from("consents").upsert(
    consentTypes.map((c) => ({
      user_id: id,
      consent_type: c,
      granted: true,
      granted_at: iso(20),
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "user_id,consent_type" },
  );

  // Mutual-aid profile (coarsened coords for map privacy).
  await sb.from("mutual_aid_profiles").upsert(
    {
      user_id: id,
      offers_help_with: u.offers,
      availability_calendar: {},
      verification_status: u.verification,
      bio: u.bio,
      visible_lat: round2(u.lat),
      visible_lng: round2(u.lng),
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  console.log(`  ✓ created ${u.email}  (${id})`);
  return id;
}

async function seedTimeSeries(id: string, u: DemoUser) {
  const curve = u.worsening ? WORSENING_CURVE : STABLE_CURVE;

  // --- EMA check-ins (one per day, 14 days) ---
  const emaRows = curve.map((score, i) => {
    const daysAgo = curve.length - 1 - i;
    // Higher score = worse: map inversely to positive metrics.
    const inv = (base: number) => Math.max(0, Math.min(10, Math.round(base - (score - 40) / 12)));
    return {
      user_id: id,
      mood_score: inv(7),
      energy_score: inv(7),
      anxiety_score: Math.max(0, Math.min(10, Math.round(3 + (score - 40) / 12))),
      sleep_quality_last_night: inv(7),
      social_connection_score: inv(6),
      pain_symptom_flags: [],
      medication_adherence: true,
      perceived_trigger_notes: null,
      submitted_at: iso(daysAgo),
    };
  });
  await sb.from("ema_checkins").insert(emaRows);

  // --- Validated scales (a few over the window) ---
  const scaleRows = [
    { scale_type: "PHQ4", raw: { q1: 1, q2: 1, q3: 1, q4: 0 }, days: 12 },
    { scale_type: "GAD2", raw: { q1: 2, q2: 2 }, days: 6 },
    { scale_type: "UCLA3", raw: { q1: 2, q2: 3, q3: 2 }, days: 3 },
  ].map((s) => ({
    user_id: id,
    scale_type: s.scale_type,
    raw_answers: s.raw,
    computed_score: Object.values(s.raw).reduce((a, b) => a + (b as number), 0),
    administered_at: iso(s.days),
  }));
  // Worsening user gets heavier recent scales.
  if (u.worsening) {
    scaleRows.push({
      user_id: id,
      scale_type: "GAD2",
      raw_answers: { q1: 3, q2: 3 },
      computed_score: 6,
      administered_at: iso(1),
    });
  }
  await sb.from("validated_scales").insert(scaleRows);

  // --- Journal entries ---
  const journals = u.worsening
    ? [
        {
          content:
            "Long week. Everything feels like too much and I haven't been sleeping. I'm trying to hold on and stay hopeful but it's hard.",
          sentiment: -0.42,
          themes: ["overwhelm", "sleep", "isolation", "hope"],
          days: 1,
        },
        {
          content: "Skipped the study group again. Didn't have the energy to talk to anyone.",
          sentiment: -0.31,
          themes: ["isolation", "low energy"],
          days: 4,
        },
      ]
    : [
        {
          content: "Went for a walk with a neighbour, felt a little lighter afterwards.",
          sentiment: 0.44,
          themes: ["connection", "movement"],
          days: 2,
        },
      ];
  await sb.from("journal_entries").insert(
    journals.map((j) => ({
      user_id: id,
      content: j.content,
      input_method: "typed",
      nlp_sentiment_score: j.sentiment,
      nlp_themes: j.themes,
      nlp_risk_flags: [],
      nlp_status: "done",
      created_at: iso(j.days),
    })),
  );

  // --- Environmental snapshots (a couple, showing a PM2.5 spike) ---
  await sb.from("environmental_snapshots").insert([
    {
      user_id: id,
      location_label: u.home_label,
      lat: u.lat,
      lng: u.lng,
      pm25: 38.4,
      pm10: 61.2,
      aqi: 104,
      pollen_index: 3.1,
      uv_index: 6,
      temperature: 29.5,
      humidity: 58,
      fetched_at: iso(2),
    },
  ]);

  // --- Personal exposure lag model (only meaningful for the at-risk user) ---
  if (u.worsening) {
    await sb.from("personal_exposure_lag_model").upsert(
      [
        { user_id: id, lag_days: 0, correlation_strength: 0.18 },
        { user_id: id, lag_days: 1, correlation_strength: 0.34 },
        { user_id: id, lag_days: 2, correlation_strength: 0.61 },
        { user_id: id, lag_days: 3, correlation_strength: 0.29 },
      ].map((r) => ({ ...r, last_computed_at: new Date().toISOString() })),
      { onConflict: "user_id,lag_days" },
    );
  }

  // --- Behavioral Health Index history (mirrors the curve) ---
  const bhiRows = curve.map((score, i) => {
    const daysAgo = curve.length - 1 - i;
    return {
      user_id: id,
      index_date: dateOnly(daysAgo),
      composite_score: score,
      risk_bucket: bucket(score),
      contributing_factors: [
        {
          factor: "Sleep quality",
          weight: 0.25,
          score: Math.round(score * 0.9),
          delta_description: "Sleep quality down ~28% vs your 2-week average",
        },
        {
          factor: "Validated scale trend (GAD-2)",
          weight: 0.3,
          score: Math.round(score * 1.05),
          delta_description: "Anxiety scale trending upward over the past 5 days",
        },
        {
          factor: "Environmental exposure",
          weight: 0.15,
          score: Math.round(score * 0.7),
          delta_description: "PM2.5 elevated; your history shows a 2-day mood lag",
        },
      ],
      computed_at: iso(daysAgo),
    };
  });
  await sb.from("behavioral_health_index").upsert(bhiRows, { onConflict: "user_id,index_date" });

  // --- Gamification: resilience points + badges ---
  await sb.from("resilience_points").insert([
    { user_id: id, points: 120, reason: "checkin_streak", created_at: iso(7) },
    { user_id: id, points: 75, reason: "journal_logged", created_at: iso(3) },
    { user_id: id, points: 50, reason: "care_ping_answered", created_at: iso(1) },
  ]);
  await sb.from("badges").upsert(
    [
      { user_id: id, badge_type: "Neighbor", is_public: true, earned_at: iso(20) },
      { user_id: id, badge_type: "Consistent Check-in", is_public: true, earned_at: iso(7) },
    ],
    { onConflict: "user_id,badge_type" },
  );
}

async function seedRelationships(ids: Record<string, string>) {
  const aanya = ids["aanya.demo@arogyasetu.test"];
  const maya = ids["maya.demo@arogyasetu.test"];
  const sam = ids["sam.demo@arogyasetu.test"];

  // Trust scores (computed cache). Maya is the strongest match for Aanya.
  await sb.from("trust_scores").upsert(
    [
      {
        user_id: maya,
        proximity_component: 0.95,
        shared_condition_component: 0.4,
        reliability_component: 0.9,
        response_latency_component: 0.85,
        composite_trust_score: round2(0.35 * 0.95 + 0.25 * 0.4 + 0.2 * 0.9 + 0.2 * 0.85),
      },
      {
        user_id: sam,
        proximity_component: 0.7,
        shared_condition_component: 0.2,
        reliability_component: 0.8,
        response_latency_component: 0.6,
        composite_trust_score: round2(0.35 * 0.7 + 0.25 * 0.2 + 0.2 * 0.8 + 0.2 * 0.6),
      },
      {
        user_id: aanya,
        proximity_component: 0.5,
        shared_condition_component: 0.3,
        reliability_component: 0.5,
        response_latency_component: 0.5,
        composite_trust_score: round2(0.35 * 0.5 + 0.25 * 0.3 + 0.2 * 0.5 + 0.2 * 0.5),
      },
    ].map((r) => ({ ...r, last_computed_at: new Date().toISOString() })),
    { onConflict: "user_id" },
  );

  // Time credits ledger (a completed exchange between Maya and Aanya).
  await sb.from("time_credits_ledger").insert([
    {
      from_user_id: maya,
      to_user_id: aanya,
      hours: 1,
      exchange_description: "Companionship call",
      status: "completed",
      rating: 5,
      created_at: iso(4),
      completed_at: iso(4),
    },
    {
      from_user_id: sam,
      to_user_id: aanya,
      hours: 0.5,
      exchange_description: "Grocery run coordination",
      status: "completed",
      rating: 4,
      created_at: iso(9),
      completed_at: iso(9),
    },
  ]);

  // Latest BHI snapshot for Aanya (elevated) → intervention + care ping.
  const { data: latestBhi } = await sb
    .from("behavioral_health_index")
    .select("id")
    .eq("user_id", aanya)
    .order("index_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  const snapshotId = latestBhi?.id ?? null;

  await sb.from("micro_interventions").insert({
    user_id: aanya,
    risk_snapshot_id: snapshotId,
    intervention_type: "breathing_exercise",
    generated_text:
      "Your sleep and anxiety signals have shifted this week. Try a 4-7-8 breath: inhale for 4, hold for 7, exhale for 8, five times. Small resets count.",
    source: "template_fallback",
  });

  // A live Care Ping: Aanya at-risk → Maya matched (arrives in Maya's window).
  await sb.from("care_pings").insert({
    at_risk_user_id: aanya,
    matched_user_id: maya,
    risk_snapshot_id: snapshotId,
    status: "sent",
    channel: ["in_app", "web_push"],
    created_at: iso(0),
  });

  console.log("  ✓ trust scores, ledger, intervention & Care Ping seeded");
}

async function seedCommunityResources() {
  console.log("• Seeding public community resources…");
  await sb.from("community_resources").insert([
    {
      name: "988 Suicide & Crisis Lifeline",
      category: "crisis",
      description: "24/7 free, confidential support in the US.",
      phone: "988",
      url: "https://988lifeline.org",
      is_crisis_resource: true,
      country_code: "US",
      approved: true,
    },
    {
      name: "KIRAN Mental Health Helpline",
      category: "crisis",
      description: "24/7 toll-free mental health helpline (India).",
      phone: "1800-599-0019",
      is_crisis_resource: true,
      country_code: "IN",
      approved: true,
    },
    {
      name: "Community Warm Line",
      category: "support",
      description: "Non-emergency peer support line.",
      phone: "1-800-000-0000",
      is_crisis_resource: false,
      country_code: "US",
      approved: true,
    },
  ]);
}

async function main() {
  console.log("\n=== AROGYASETU demo seed ===\n");
  await deleteExistingDemoUsers();

  const ids: Record<string, string> = {};
  for (const u of USERS) {
    console.log(`• Creating ${u.display_name}…`);
    const id = await createUser(u);
    ids[u.email] = id;
    await seedTimeSeries(id, u);
  }

  console.log("• Seeding relationships (trust, ledger, care ping)…");
  await seedRelationships(ids);
  await seedCommunityResources();

  console.log("\n✔ Demo seed complete.\n");
  console.log("Demo logins (magic link disabled for these — use password sign-in or");
  console.log("impersonate via Supabase dashboard):");
  for (const u of USERS) console.log(`   ${u.email}  /  ${u.password}`);
  console.log(
    "\nDemo flow: open Aanya in one window (watch the forecast at 'Elevated' +\n" +
      "micro-intervention), and Maya in a second/incognito window (watch the Care\n" +
      "Ping arrive in real time on /dashboard/care-pings).\n",
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("\n✖ Seed failed:", e);
  process.exit(1);
});
