/**
 * Configuration for the live Risk & Safety registers
 * (Complaints QA-03, Incidents QA-13, Safeguarding HS-23).
 * Taxonomies authored from Liberty Living's Incident & RCA Toolkit and policies.
 */

export type RegisterKind = "incident" | "complaint" | "safeguarding";

export type RegisterConfig = {
  kind: RegisterKind;
  title: string;
  policy: string;
  refPrefix: string;
  icon: string;
  accent: string; // tone key
  categoryLabel: string;
  categories: string[];
  severityLabel: string;
  severities: { value: string; tone: string }[];
  hasLocation: boolean;
  detailLabel: string;
  detailHint: string;
  intro: string;
};

export const REGISTERS: Record<RegisterKind, RegisterConfig> = {
  incident: {
    kind: "incident",
    title: "Incidents",
    policy: "QA-13",
    refPrefix: "INC",
    icon: "crisis_alert",
    accent: "amber",
    categoryLabel: "Incident category",
    categories: [
      "Fall",
      "Medication error / near miss",
      "Safeguarding concern",
      "Aggression / assault on staff",
      "Slip / trip / collision",
      "Manual handling injury",
      "Pressure ulcer",
      "Choking / aspiration",
      "Missing Service User",
      "Death of Service User (unexpected)",
      "Fire / smoke / electrical",
      "Road traffic incident",
      "Equipment failure",
      "IT / data breach",
      "Property damage / loss",
      "Near miss",
      "Other",
    ],
    severityLabel: "Category (HSE impact)",
    severities: [
      { value: "Category 1 — Major / Extreme", tone: "red" },
      { value: "Category 2 — Moderate", tone: "amber" },
      { value: "Category 3 — Minor / Negligible", tone: "green" },
    ],
    hasLocation: true,
    detailLabel: "Factual narrative (who, what, where, when — no opinion)",
    detailHint: "Describe what happened factually. Category 1 incidents must also be phoned to the CSM/SAO the same shift.",
    intro:
      "Any incident, near-miss or adverse event. File within 24 hours (QA-13). Category 1 incidents trigger an RCA and are reported to the CEO and Board.",
  },
  complaint: {
    kind: "complaint",
    title: "Complaints",
    policy: "QA-03",
    refPrefix: "COM",
    icon: "forum",
    accent: "teal",
    categoryLabel: "Source",
    categories: [
      "Verbal — Service User",
      "Phone — family / representative",
      "Written letter",
      "Email / text",
      "Anonymous",
      "Third party",
    ],
    severityLabel: "Severity level",
    severities: [
      { value: "Level 4 — actual harm", tone: "red" },
      { value: "Level 3 — significant", tone: "amber" },
      { value: "Level 2 — moderate", tone: "amber" },
      { value: "Level 1 — low", tone: "green" },
    ],
    hasLocation: false,
    detailLabel: "Complaint in the person's own words",
    detailHint: "Capture it verbatim. Acknowledge within 5 working days; respond within 20 working days.",
    intro:
      "Every expression of dissatisfaction, however informal — anonymous and third-party included. Acknowledged in 5 working days, resolved within 20 (QA-03).",
  },
  safeguarding: {
    kind: "safeguarding",
    title: "Safeguarding",
    policy: "HS-23",
    refPrefix: "SAF",
    icon: "shield",
    accent: "red",
    categoryLabel: "Concern type",
    categories: [
      "Physical abuse",
      "Psychological / emotional abuse",
      "Financial abuse",
      "Neglect / acts of omission",
      "Self-neglect",
      "Sexual abuse",
      "Discriminatory abuse",
      "Institutional abuse",
    ],
    severityLabel: "Risk level",
    severities: [
      { value: "High — immediate risk", tone: "red" },
      { value: "Medium", tone: "amber" },
      { value: "Low", tone: "green" },
    ],
    hasLocation: false,
    detailLabel: "Concern in the person's exact words",
    detailHint: "Record verbatim. Route to the Designated Safeguarding Officer the same day — every time.",
    intro:
      "Any concern that an adult at risk is being harmed, neglected or exploited. Zero tolerance — reported to the DSO the same day (HS-23).",
  },
};

export const REGISTER_LIST = Object.values(REGISTERS);

export function severityTone(cfg: RegisterConfig, value: string): string {
  return cfg.severities.find((s) => s.value === value)?.tone ?? "grey";
}
