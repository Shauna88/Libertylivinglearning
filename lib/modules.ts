/**
 * Reference-module content (Policy Library, Forms & Templates, KPIs & Performance,
 * Governance). Policy/form/workforce data is migrated from the prototype
 * (data/qms-modules.json); the service KPIs and governance structure are authored
 * from Liberty Living's own QMS source documents (KPI Targets & Baselines,
 * KPI Escalation & Action Plan, Governance Reporting Templates).
 */
import raw from "@/data/qms-modules.json";

export type PolicyCat = {
  label: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
};
export type Policy = {
  code: string;
  title: string;
  cat: string;
  owner: string;
  version: string;
  effective: string;
  reviewDue: string;
  status: string;
  longTitle: string;
};
export type FormCat = { key: string; label: string; icon: string };
export type Form = {
  name: string;
  ref: string;
  cat: string;
  purpose: string;
  owner: string;
  systems: string;
  links: string[];
};
export type WfKpi = {
  name: string;
  target: string;
  value: string;
  prev: string;
  tone: string;
  icon: string;
};
export type SopCat = { key: string; label: string; icon: string; ids: number[] };

type ModulesBundle = {
  policyCats: Record<string, PolicyCat>;
  policies: Policy[];
  formCats: FormCat[];
  forms: Form[];
  wfKpis: WfKpi[];
  readiness: Array<{ label: string; count: number; tone: string; desc: string }>;
  gateways: Array<Record<string, unknown>>;
  trainingCat: Array<Record<string, unknown>>;
  sopCats: SopCat[];
};

const m = raw as unknown as ModulesBundle;

export const POLICY_CATS = m.policyCats;
export const POLICIES = m.policies;
export const FORM_CATS = m.formCats;
export const FORMS = m.forms;
export const WF_KPIS = m.wfKpis;
export const SOP_CATS = m.sopCats;

/** Policy lifecycle status → semantic tone. */
export const POLICY_STATUS_TONE: Record<string, string> = {
  current: "green",
  due: "amber",
  overdue: "red",
};

/** SOP id (e.g. "SOP-004") → its category, for the SOP Library filter. */
export function sopCatFor(id: string): SopCat | undefined {
  const n = parseInt(id.replace(/\D/g, ""), 10);
  return SOP_CATS.find((c) => c.ids.includes(n));
}

// ---------------- Service & clinical KPIs (HSE Authorisation Scheme) ----------------
// Authored from KPI Targets & Baselines and KPI Escalation & Action Plan.
// `current`/`prev` are illustrative sample values pending the live CRM feed —
// the targets and thresholds are Liberty Living's ratified figures.

export type ServiceKpi = {
  group: string;
  name: string;
  target: string;
  current: string;
  prev: string;
  tone: "green" | "amber" | "red";
  owner: string;
  forum: string;
};

export const SERVICE_KPIS: ServiceKpi[] = [
  // Service delivery
  { group: "Service delivery", name: "Visit completion rate", target: "≥ 99%", current: "98.7%", prev: "98.4%", tone: "amber", owner: "Director of Operations", forum: "Monthly EMT · quarterly CGC" },
  { group: "Service delivery", name: "Missed visit rate", target: "≤ 0.5%", current: "0.4%", prev: "0.5%", tone: "green", owner: "Director of Operations", forum: "Monthly EMT · quarterly CGC" },
  { group: "Service delivery", name: "Late visits (> 30 min)", target: "≤ 3%", current: "3.4%", prev: "3.8%", tone: "amber", owner: "Director of Operations", forum: "Monthly EMT" },
  { group: "Service delivery", name: "Care plan reviews on time", target: "≥ 95%", current: "96%", prev: "94%", tone: "green", owner: "Clinical Lead", forum: "Quarterly CGC" },
  // Clinical safety
  { group: "Clinical safety", name: "Medication errors / near misses (per 1,000 prompts)", target: "≤ 2.0", current: "1.6", prev: "1.9", tone: "green", owner: "Clinical Lead", forum: "Quarterly CGC" },
  { group: "Clinical safety", name: "Falls resulting in harm", target: "Downward trend", current: "4", prev: "6", tone: "green", owner: "Clinical Lead", forum: "Quarterly CGC" },
  { group: "Clinical safety", name: "Safeguarding concerns actioned same day", target: "100%", current: "100%", prev: "100%", tone: "green", owner: "Designated Safeguarding Officer", forum: "Quarterly CGC · Board" },
  { group: "Clinical safety", name: "Incident reports filed within 24h", target: "≥ 95%", current: "92%", prev: "90%", tone: "amber", owner: "Director of Quality", forum: "Monthly EMT" },
  // Service user experience
  { group: "Service user experience", name: "Complaints acknowledged ≤ 5 working days", target: "100%", current: "98%", prev: "97%", tone: "amber", owner: "Complaints Officer", forum: "Quarterly CGC" },
  { group: "Service user experience", name: "Complaints resolved ≤ 20 working days", target: "≥ 90%", current: "91%", prev: "88%", tone: "green", owner: "Complaints Officer", forum: "Quarterly CGC" },
  { group: "Service user experience", name: "Service User satisfaction", target: "≥ 90%", current: "93%", prev: "92%", tone: "green", owner: "Director of Care", forum: "Annual Quality Review" },
];

// ---------------- Governance ----------------
// Authored from the Governance Reporting Templates and Statement of Purpose.

export type Leader = { name: string; role: string; detail?: string };
export const LEADERSHIP: Leader[] = [
  { name: "Shauna Delaney", role: "Chief Executive Officer", detail: "Senior Accountable Officer for Open Disclosure" },
  { name: "Director of Operations", role: "Operations", detail: "Service delivery, rostering, business continuity" },
  { name: "Director of Quality & Compliance", role: "Quality & Risk", detail: "QMS, audit, incidents, KPIs" },
  { name: "Director of Care", role: "Care", detail: "Care standards and Service User experience" },
  { name: "Ana Lyons", role: "Clinical Lead (Registered Nurse, NMBI)", detail: "Clinical governance · 085 723 4679" },
  { name: "Laura Souza", role: "Director of HR", detail: "Workforce, recruitment, training compliance" },
  { name: "Designated Safeguarding Officer", role: "Safeguarding", detail: "Adults-at-risk concerns — same-day" },
  { name: "Complaints Officer", role: "Complaints", detail: "QA-03 complaints handling" },
  { name: "Data Protection Officer", role: "Information governance", detail: "dpo@libertyhomecare.ie" },
];

export type Committee = { name: string; cadence: string; audience: string; purpose: string };
export const ASSURANCE_CYCLE: Committee[] = [
  { name: "Executive Management Team (EMT)", cadence: "Monthly — first Tuesday", audience: "CEO & Directors", purpose: "Operational quality, safety, risk and compliance oversight." },
  { name: "Clinical Governance Committee (CGC)", cadence: "Quarterly", audience: "Clinical & quality leadership", purpose: "Clinical safety, incidents, audit findings and KPI review." },
  { name: "Board Quality & Risk Committee", cadence: "Quarterly", audience: "Board", purpose: "Board-level assurance on quality, risk and Category 1 incidents." },
  { name: "Annual Quality & Safety Review", cadence: "Annual", audience: "Board & HSE/HIQA", purpose: "Whole-year review of quality and safety performance." },
];

export type Contact = { label: string; detail: string; tone: string; when: string };
export const KEY_CONTACTS: Contact[] = [
  { label: "Emergency services", detail: "999 / 112", tone: "red", when: "Anyone in immediate danger" },
  { label: "On-Call Manager", detail: "Out-of-hours line", tone: "amber", when: "Out of hours, if it can't wait" },
  { label: "Designated Safeguarding Officer", detail: "Same-day", tone: "red", when: "Adult safeguarding concern" },
  { label: "Designated Liaison Person", detail: "Reports to Tusla", tone: "red", when: "Child protection concern" },
  { label: "Data Protection Officer", detail: "dpo@libertyhomecare.ie", tone: "teal", when: "Data breach — within 72h" },
  { label: "HSE / HIQA", detail: "Via Director of Quality", tone: "blue", when: "Notifiable / regulatory" },
];
