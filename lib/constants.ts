// Shared option lists used across onboarding, community & settings.

export const CONDITION_TAGS = [
  "asthma",
  "new parent",
  "student stress",
  "healthy aging",
  "chronic pain",
  "caregiver",
  "anxiety",
  "low mood",
  "social isolation",
  "sleep issues",
];

export const OFFER_TYPES = [
  "grocery_run",
  "companionship_call",
  "ride",
  "respite",
  "video_chat",
  "meal_coordination",
  "skill_share",
];

export const OFFER_LABELS: Record<string, string> = {
  grocery_run: "Grocery run",
  companionship_call: "Companionship call",
  ride: "Ride",
  respite: "Respite",
  video_chat: "Video chat",
  meal_coordination: "Meal coordination",
  skill_share: "Skill share",
};

export const CONSENT_TYPES: { key: string; label: string; description: string }[] = [
  {
    key: "ema_checkins",
    label: "Micro check-ins (EMA)",
    description: "Store your short daily mood/energy/sleep check-ins to power your index.",
  },
  {
    key: "journaling_nlp",
    label: "Journal NLP analysis",
    description: "Let AI analyze your journal text for sentiment/themes (supportive reflection only).",
  },
  {
    key: "environmental_location",
    label: "Environmental location",
    description: "Use a coarse location to fetch local air quality, pollen and UV.",
  },
  {
    key: "mutual_aid_matching",
    label: "Mutual-aid matching",
    description: "Appear (coarsened) on the neighbour map and be matched for support.",
  },
  {
    key: "webcam_scan",
    label: "Webcam scan (reserved / off)",
    description: "Reserved feature — permanently off in this build. Never used.",
  },
  {
    key: "care_ping_receiving",
    label: "Receive Care Pings",
    description: "Allow trusted neighbours to be discreetly notified if you may need support.",
  },
  {
    key: "aggregate_research_sharing",
    label: "Aggregate research sharing",
    description: "Contribute to privacy-protected (differentially private) community stats.",
  },
];

export const SCALE_META: Record<
  string,
  { name: string; questions: string[]; options: { label: string; value: number }[]; maxNote: string }
> = {
  PHQ4: {
    name: "PHQ-4 (anxiety & depression)",
    questions: [
      "Feeling nervous, anxious, or on edge",
      "Not being able to stop or control worrying",
      "Feeling down, depressed, or hopeless",
      "Little interest or pleasure in doing things",
    ],
    options: [
      { label: "Not at all", value: 0 },
      { label: "Several days", value: 1 },
      { label: "More than half the days", value: 2 },
      { label: "Nearly every day", value: 3 },
    ],
    maxNote: "0–12. Higher = more symptoms. Screening only, not a diagnosis.",
  },
  GAD2: {
    name: "GAD-2 (anxiety)",
    questions: [
      "Feeling nervous, anxious, or on edge",
      "Not being able to stop or control worrying",
    ],
    options: [
      { label: "Not at all", value: 0 },
      { label: "Several days", value: 1 },
      { label: "More than half the days", value: 2 },
      { label: "Nearly every day", value: 3 },
    ],
    maxNote: "0–6. A score ≥3 suggests further check-in may help.",
  },
  UCLA3: {
    name: "UCLA-3 (loneliness)",
    questions: [
      "How often do you feel that you lack companionship?",
      "How often do you feel left out?",
      "How often do you feel isolated from others?",
    ],
    options: [
      { label: "Hardly ever", value: 1 },
      { label: "Some of the time", value: 2 },
      { label: "Often", value: 3 },
    ],
    maxNote: "3–9. Higher = more loneliness.",
  },
};

export const JOURNAL_PROMPTS = [
  "What's one thing that felt heavy today?",
  "Name one small moment that felt okay.",
  "What is your body telling you right now?",
  "Who did you connect with today, even briefly?",
  "What would you tell a friend feeling the way you do?",
  "What is one thing within your control tomorrow?",
];
