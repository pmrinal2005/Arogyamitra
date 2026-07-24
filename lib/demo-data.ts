// ============================================================================
// Deterministic demo/fallback data. Used when Supabase is not configured
// (so the app builds & renders on Vercel before backend is wired) and as the
// static fallback for any widget whose live data source is unavailable.
// Every value here is fictional. Nothing personal is ever inferred.
// ============================================================================
import type {
  BehavioralHealthIndex,
  CarePing,
  EmaCheckin,
  EnvSnapshot,
  JournalEntry,
  MicroIntervention,
  MutualAidDirectoryRow,
  RiskBucket,
  TimeCredit,
} from "@/lib/types";

const DAY = 86400000;
const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY).toISOString();
const dateOnly = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * DAY).toISOString().slice(0, 10);

export function bucketFromScore(s: number): RiskBucket {
  if (s >= 70) return "elevated";
  if (s >= 40) return "moderate";
  return "low";
}

// A "worsening trajectory" curve so the demo visibly flips to Elevated.
const SCORE_CURVE = [22, 26, 24, 31, 38, 45, 52, 58, 63, 69, 72, 78, 74, 81];

export const demoBHIHistory: BehavioralHealthIndex[] = SCORE_CURVE.map(
  (score, i) => {
    const daysAgo = SCORE_CURVE.length - 1 - i;
    return {
      id: `demo-bhi-${i}`,
      user_id: "demo",
      index_date: dateOnly(daysAgo),
      composite_score: score,
      risk_bucket: bucketFromScore(score),
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
  },
);

export const demoBHILatest = demoBHIHistory[demoBHIHistory.length - 1];

export const demoEnv: EnvSnapshot = {
  pm25: 38.4,
  pm10: 61.2,
  aqi: 104,
  pollen_index: 3.1,
  uv_index: 6.0,
  temperature: 29.5,
  humidity: 58,
};

export const demoEmaRecent: EmaCheckin[] = Array.from({ length: 7 }).map(
  (_, i) => ({
    id: `demo-ema-${i}`,
    user_id: "demo",
    mood_score: [6, 6, 5, 5, 4, 3, 3][i],
    energy_score: [7, 6, 6, 5, 5, 4, 4][i],
    anxiety_score: [3, 4, 4, 5, 6, 7, 7][i],
    sleep_quality_last_night: [7, 6, 6, 5, 4, 4, 3][i],
    social_connection_score: [6, 6, 5, 5, 4, 4, 3][i],
    pain_symptom_flags: [],
    medication_adherence: true,
    perceived_trigger_notes: null,
    submitted_at: iso(6 - i),
  }),
);

export const demoJournal: JournalEntry[] = [
  {
    id: "demo-j1",
    user_id: "demo",
    content:
      "Long week. Work has been overwhelming and I haven't been sleeping well. Trying to stay hopeful.",
    input_method: "typed",
    nlp_sentiment_score: -0.32,
    nlp_themes: ["overwhelm", "sleep", "hope"],
    nlp_risk_flags: [],
    nlp_status: "done",
    created_at: iso(1),
  },
  {
    id: "demo-j2",
    user_id: "demo",
    content: "Went for a walk with a neighbour, felt a little lighter afterwards.",
    input_method: "typed",
    nlp_sentiment_score: 0.41,
    nlp_themes: ["connection", "movement"],
    nlp_risk_flags: [],
    nlp_status: "done",
    created_at: iso(3),
  },
];

export const demoIntervention: MicroIntervention = {
  id: "demo-mi",
  user_id: "demo",
  risk_snapshot_id: demoBHILatest.id,
  intervention_type: "breathing_exercise",
  generated_text:
    "Your sleep and anxiety signals have shifted this week. Try a 4-7-8 breath: inhale for 4, hold for 7, exhale for 8, five times. Small resets count.",
  source: "template_fallback",
  user_response: null,
  created_at: iso(0),
};

export const demoCarePings: CarePing[] = [
  {
    id: "demo-cp1",
    at_risk_user_id: "demo",
    matched_user_id: "neighbor-a",
    risk_snapshot_id: demoBHILatest.id,
    status: "accepted",
    channel: ["in_app", "web_push"],
    outcome_notes: "Had a nice 15-minute call.",
    outcome_rating: 5,
    created_at: iso(1),
    responded_at: iso(1),
  },
  {
    id: "demo-cp2",
    at_risk_user_id: "neighbor-b",
    matched_user_id: "demo",
    risk_snapshot_id: null,
    status: "sent",
    channel: ["in_app"],
    outcome_notes: null,
    outcome_rating: null,
    created_at: iso(0),
    responded_at: null,
  },
];

export const demoTimeCredits: TimeCredit[] = [
  {
    id: "demo-tc1",
    from_user_id: "neighbor-a",
    to_user_id: "demo",
    hours: 1,
    exchange_description: "Companionship call",
    status: "completed",
    rating: 5,
    created_at: iso(4),
    completed_at: iso(4),
  },
  {
    id: "demo-tc2",
    from_user_id: "demo",
    to_user_id: "neighbor-c",
    hours: 0.5,
    exchange_description: "Grocery run coordination",
    status: "completed",
    rating: 4,
    created_at: iso(9),
    completed_at: iso(9),
  },
];

export const demoDirectory: MutualAidDirectoryRow[] = [
  {
    user_id: "neighbor-a",
    display_name: "Maya R.",
    avatar_url: null,
    offers_help_with: ["companionship_call", "video_chat"],
    verification_status: "orientation_completed",
    visible_lat: 28.61,
    visible_lng: 77.21,
    availability_calendar: {},
    composite_trust_score: 0.86,
    condition_tags: ["new parent", "healthy aging"],
    bio: "Happy to chat over tea or a video call in the evenings.",
    public_badges: ["Neighbor", "Consistent Check-in"],
  },
  {
    user_id: "neighbor-c",
    display_name: "Sam T.",
    avatar_url: null,
    offers_help_with: ["grocery_run", "ride", "meal_coordination"],
    verification_status: "orientation_completed",
    visible_lat: 28.63,
    visible_lng: 77.22,
    availability_calendar: {},
    composite_trust_score: 0.72,
    condition_tags: ["student stress"],
    bio: "Weekends free for grocery runs and rides.",
    public_badges: ["Neighbor"],
  },
  {
    user_id: "neighbor-d",
    display_name: "Priya K.",
    avatar_url: null,
    offers_help_with: ["respite", "skill_share", "companionship_call"],
    verification_status: "unverified",
    visible_lat: 28.6,
    visible_lng: 77.19,
    availability_calendar: {},
    composite_trust_score: 0.64,
    condition_tags: ["asthma", "healthy aging"],
    bio: "Learning to help however I can.",
    public_badges: [],
  },
];

export const demoResilience = { points: 245, streak: 6 };
export const demoBadges = [
  { badge_type: "Neighbor", earned_at: iso(20) },
  { badge_type: "Consistent Check-in", earned_at: iso(7) },
];
