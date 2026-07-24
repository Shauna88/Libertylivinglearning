/**
 * Schema-driven "regulatory record" fields for each register kind — the mandated
 * detail an inspector expects on complaints (QA-03), incidents (QA-13 / NIMS) and
 * safeguarding (HS-23) records. Transcribed from the prototype's record schema.
 */
import type { RegisterKind } from "./registers";

export type RecordFieldType = "date" | "text" | "textarea" | "select" | "bool";
export type RecordField = {
  key: string;
  label: string;
  type: RecordFieldType;
  group: string;
  options?: string[];
  hint?: string;
};

const YNNA = ["", "Yes", "No", "N/A"];

const INCIDENT: RecordField[] = [
  { group: "Event", key: "date_of_event", label: "Date of event", type: "date" },
  { group: "Event", key: "persons_affected", label: "Persons affected", type: "select", options: ["", "Service user", "Staff", "Visitor", "Property", "Other"] },
  { group: "Event", key: "classification", label: "Classification", type: "select", options: ["", "Actual", "Near miss"] },
  { group: "Grading & NIMS", key: "proportionate_category", label: "Proportionate category", type: "select", options: ["", "Category 1", "Category 2", "Category 3", "Category 4"], hint: "HSE impact grading" },
  { group: "Grading & NIMS", key: "reported_24h", label: "Reported within 24 hours", type: "bool" },
  { group: "Grading & NIMS", key: "nims_entered", label: "Entered on NIMS", type: "select", options: YNNA },
  { group: "Grading & NIMS", key: "nims_reference", label: "NIMS reference", type: "text" },
  { group: "Disclosure & notification", key: "open_disclosure", label: "Open disclosure", type: "select", options: ["", "Not required", "Initiated", "Completed"] },
  { group: "Disclosure & notification", key: "family_informed", label: "Family / NOK informed", type: "select", options: YNNA },
  { group: "Disclosure & notification", key: "external_notification", label: "External notification", type: "select", options: ["", "None", "HSE", "HIQA", "HSA", "Gardaí", "Coroner", "DPC"] },
  { group: "Review", key: "review_level", label: "Review level", type: "select", options: ["", "Local review", "Desktop review", "Concise review", "Comprehensive review"] },
  { group: "Review", key: "recommendations_capa", label: "Recommendations / corrective actions", type: "textarea" },
];

const COMPLAINT: RecordField[] = [
  { group: "Dates", key: "date_received", label: "Date received", type: "date" },
  { group: "Dates", key: "date_of_event", label: "Date of event", type: "date" },
  { group: "Dates", key: "first_contact_date", label: "First contact with complainant", type: "date" },
  { group: "Handling", key: "how_received", label: "How received", type: "select", options: ["", "Phone", "Email", "Letter", "In person", "Via advocate / representative", "Other"] },
  { group: "Handling", key: "severity_grade", label: "Severity grade", type: "select", options: ["", "Level 1 — low", "Level 2 — moderate", "Level 3 — high", "Level 4 — extreme"] },
  { group: "Handling", key: "acknowledged_5day", label: "Acknowledged within 5 working days", type: "bool" },
  { group: "Handling", key: "safeguarding_linked", label: "Linked to a safeguarding concern", type: "bool" },
  { group: "Handling", key: "reported_escalated_to", label: "Reported / escalated to", type: "text" },
  { group: "Outcome", key: "investigation_stage", label: "Investigation stage", type: "select", options: ["", "Not started", "In progress", "Complete"] },
  { group: "Outcome", key: "outcome", label: "Outcome", type: "select", options: ["", "Upheld", "Partially upheld", "Not upheld", "Withdrawn"] },
  { group: "Outcome", key: "ombudsman", label: "Ombudsman", type: "select", options: ["", "N/A", "Referred", "Under review"] },
  { group: "Outcome", key: "learning_qip", label: "Learning / QIP action", type: "textarea" },
];

const SAFEGUARDING: RecordField[] = [
  { group: "Concern", key: "date_of_event", label: "Date of concern", type: "date" },
  { group: "Concern", key: "category_of_abuse", label: "Category of abuse", type: "select", options: ["", "Physical", "Psychological", "Financial or material", "Sexual", "Neglect / acts of omission", "Discriminatory", "Institutional", "Self-neglect"], hint: "8 HSE categories" },
  { group: "Concern", key: "alleged_person", label: "Alleged person responsible", type: "select", options: ["", "Staff member", "Family member", "Another service user", "Visitor", "Unknown", "Other"] },
  { group: "Screening & risk", key: "preliminary_screening", label: "Preliminary screening", type: "select", options: ["", "Not started", "In progress", "Completed"] },
  { group: "Screening & risk", key: "risk_level", label: "Risk level", type: "select", options: ["", "Low", "Medium", "High"] },
  { group: "Screening & risk", key: "consent_capacity", label: "Consent & capacity", type: "select", options: ["", "Has capacity", "Lacks capacity", "Assessment pending"] },
  { group: "Referrals & notification", key: "designated_officer", label: "Designated Safeguarding Officer", type: "text" },
  { group: "Referrals & notification", key: "hse_spt_referral", label: "Referred to HSE Safeguarding & Protection Team", type: "select", options: YNNA },
  { group: "Referrals & notification", key: "spt_referral_date", label: "SPT referral date", type: "date" },
  { group: "Referrals & notification", key: "garda_notification", label: "Gardaí notified", type: "select", options: YNNA },
  { group: "Referrals & notification", key: "hiqa_notification", label: "HIQA notified", type: "select", options: YNNA },
  { group: "Plan", key: "safeguarding_plan", label: "Safeguarding plan", type: "select", options: ["", "Not required", "In place", "Under review"] },
  { group: "Plan", key: "review_date", label: "Review date", type: "date" },
];

export const RECORD_FIELDS: Record<RegisterKind, RecordField[]> = {
  incident: INCIDENT,
  complaint: COMPLAINT,
  safeguarding: SAFEGUARDING,
};

/** Distinct group names for a kind, in first-seen order. */
export function recordGroups(kind: RegisterKind): string[] {
  const seen: string[] = [];
  for (const f of RECORD_FIELDS[kind]) if (!seen.includes(f.group)) seen.push(f.group);
  return seen;
}

/** How many fields carry a value — for the "N of M complete" summary. */
export function recordComplete(kind: RegisterKind, record: Record<string, string>): { done: number; total: number } {
  const fields = RECORD_FIELDS[kind];
  const done = fields.filter((f) => (record[f.key] ?? "").toString().trim() !== "").length;
  return { done, total: fields.length };
}
