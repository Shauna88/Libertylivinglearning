/**
 * CRM content + helpers.
 *
 * Client (service-user) records hold special-category (health) personal data.
 * Identifiable fields are masked by default in the UI and only revealed through
 * the PII gate (`/api/pii/reveal`), which records who revealed what and why in
 * `pii_access_log`. See PLATFORM.md §4 and the README's GDPR notes.
 */
import raw from "@/data/qms-clients.json";

export type NextOfKin = { name: string; rel: string; phone: string };
export type ScheduleVisit = { time: string; dur: string; type: string; carer: string; tasks: string[] };
export type ScheduleDay = { day: string; visits: ScheduleVisit[] };
export type CarePlanEntry = {
  domain: string;
  icon?: string;
  risk?: string;
  need?: string;
  goals?: string[];
  tasks?: string[];
};

export type Client = {
  id: string;
  su: string;
  name: string;
  pref: string;
  dob: string;
  age?: number;
  sex: string;
  addr: string;
  eircode: string;
  phone: string;
  mobile?: string;
  area: string;
  status: string;
  funding: string;
  pkg: string;
  hoursWk: string;
  startDate: string;
  gp: { name: string; practice: string; phone: string };
  nok: NextOfKin[];
  keysafe: string;
  access: string;
  homeRisk: string[];
  conditions: string[];
  mobility: string;
  allergies: string;
  carer: string;
  carers: string[];
  csm: string;
  lastVisit: string;
  reviewDue: string;
  reviewTone: string;
  reviewNote: string;
  flags: string[];
  notes?: string[];
  chkExpired?: string[];
  chkExpiring?: string[];
  schedule: ScheduleDay[];
  carePlan: CarePlanEntry[];
  requirements?: string[];
};

type Bundle = { clients: Client[]; careDomains: Record<string, CarePlanEntry> };
const bundle = raw as unknown as Bundle;

export const CLIENTS: Client[] = bundle.clients;

/** Client lifecycle status → display label + semantic tone. */
export const CLIENT_STATUS: Record<string, { label: string; tone: string }> = {
  new: { label: "New referral", tone: "amber" },
  active: { label: "Active", tone: "green" },
  hold: { label: "On hold", tone: "grey" },
  hospital: { label: "In hospital", tone: "red" },
  review: { label: "Care plan under review", tone: "amber" },
  discharged: { label: "Discharged", tone: "grey" },
  deceased: { label: "Deceased", tone: "grey" },
};

export function statusMeta(status: string) {
  return CLIENT_STATUS[status] ?? { label: status, tone: "grey" };
}

/** Care-note (diary) categories, each with a default tone. */
export const CARE_NOTE_CATEGORIES: { key: string; tone: string }[] = [
  { key: "Welfare", tone: "green" },
  { key: "Medication", tone: "amber" },
  { key: "Family contact", tone: "blue" },
  { key: "Health change", tone: "red" },
  { key: "Environment", tone: "teal" },
  { key: "General", tone: "grey" },
];

export function noteToneFor(category: string): string {
  return CARE_NOTE_CATEGORIES.find((c) => c.key === category)?.tone ?? "grey";
}

/** Controlled-document statuses. */
export const DOC_STATUS: Record<string, { label: string; tone: string }> = {
  on_file: { label: "On file", tone: "green" },
  expiring: { label: "Expiring", tone: "amber" },
  overdue: { label: "Overdue", tone: "red" },
};

// ---------------- masking (PII gate) ----------------

/** "Agnes Conroy" → "A···· C·····" (first letter of each word kept). */
export function maskName(name: string): string {
  return name
    .split(" ")
    .map((w) => (w ? w[0] + "·".repeat(Math.max(1, w.length - 1)) : w))
    .join(" ");
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 3) return "···";
  return "··· ··· " + digits.slice(-3);
}

export function maskAddr(): string {
  return "······ (address hidden)";
}

export function maskDob(): string {
  return "··/··/····";
}

export function maskEircode(eircode: string): string {
  if (!eircode) return "";
  return eircode.slice(0, 3) + " ····";
}

/** The identifiable fields a reveal returns (and everything else stays visible). */
export type RevealedIdentity = {
  name: string;
  addr: string;
  eircode: string;
  phone: string;
  mobile: string;
  dob: string;
  nok: NextOfKin[];
};

export function identityOf(c: Client): RevealedIdentity {
  return {
    name: c.name,
    addr: c.addr,
    eircode: c.eircode,
    phone: c.phone,
    mobile: c.mobile ?? "",
    dob: c.dob,
    nok: c.nok,
  };
}
