/**
 * Carer compliance & credential-expiry model. The office must keep each active
 * carer's mandatory credentials in date — Garda vetting, mandatory training,
 * right-to-work, insurance — and be warned *before* they lapse (and blocked
 * from rostering a carer whose safety-critical checks have expired).
 *
 * Pure logic (the clock is passed in) so it's testable and reusable on the
 * server or the client. A stored record existing = the credential is "held";
 * its `expiry` (ISO YYYY-MM-DD, or null for items that don't expire) drives the
 * status against today.
 */

export type ComplianceItem = {
  key: string;
  label: string;
  short: string;
  /** Typical renewal period in months (null = one-off / no expiry). */
  cadenceMonths: number | null;
  /** A lapse here should block rostering the carer (safety-critical). */
  blocking: boolean;
};

/** The mandatory credentials tracked for every active carer. */
export const COMPLIANCE_ITEMS: ComplianceItem[] = [
  { key: "garda_vetting", label: "Garda vetting (NVB)", short: "Garda vetting", cadenceMonths: 36, blocking: true },
  { key: "right_to_work", label: "Right to work", short: "Right to work", cadenceMonths: null, blocking: true },
  { key: "manual_handling", label: "Manual & patient handling", short: "Manual handling", cadenceMonths: 24, blocking: true },
  { key: "safeguarding", label: "Safeguarding (adults & children)", short: "Safeguarding", cadenceMonths: 24, blocking: true },
  { key: "references", label: "References (×2)", short: "References", cadenceMonths: null, blocking: false },
  { key: "infection_control", label: "Infection prevention & control", short: "IPC", cadenceMonths: 12, blocking: false },
  { key: "first_aid", label: "First aid / CPR", short: "First aid", cadenceMonths: 24, blocking: false },
  { key: "medication", label: "Medication management", short: "Medication", cadenceMonths: 24, blocking: false },
  { key: "driving_licence", label: "Driving licence", short: "Licence", cadenceMonths: null, blocking: false },
  { key: "car_insurance", label: "Business car insurance", short: "Insurance", cadenceMonths: 12, blocking: false },
];

export const COMPLIANCE_ITEM = Object.fromEntries(COMPLIANCE_ITEMS.map((i) => [i.key, i])) as Record<string, ComplianceItem>;

/** How far ahead a credential counts as "expiring soon" (amber). */
export const EXPIRING_WINDOW_DAYS = 45;

export type ComplianceStatus = "valid" | "expiring" | "expired" | "missing";

export type ComplianceState = { status: ComplianceStatus; daysLeft: number | null };

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Classify one credential. `held` = a record exists; `expiry` may be null for
 * items that don't expire (held-with-no-expiry reads as valid).
 */
export function complianceStatus(held: boolean, expiry: string | null | undefined, now: Date): ComplianceState {
  if (!held) return { status: "missing", daysLeft: null };
  if (!expiry) return { status: "valid", daysLeft: null };
  const exp = new Date(expiry + "T00:00:00");
  if (isNaN(exp.getTime())) return { status: "valid", daysLeft: null };
  const days = Math.round((exp.getTime() - startOfDay(now)) / 86_400_000);
  if (days < 0) return { status: "expired", daysLeft: days };
  if (days <= EXPIRING_WINDOW_DAYS) return { status: "expiring", daysLeft: days };
  return { status: "valid", daysLeft: days };
}

export function statusTone(s: ComplianceStatus): string {
  return s === "valid" ? "green" : s === "expiring" ? "amber" : s === "expired" ? "red" : "grey";
}

export function statusLabel(s: ComplianceStatus): string {
  return s === "valid" ? "In date" : s === "expiring" ? "Expiring" : s === "expired" ? "Expired" : "Missing";
}

/** A short "in 12 days" / "31 days ago" / "no expiry" phrase for a credential. */
export function daysPhrase(st: ComplianceState): string {
  if (st.status === "missing") return "Not recorded";
  if (st.daysLeft === null) return "No expiry";
  if (st.daysLeft < 0) return `${Math.abs(st.daysLeft)} day${st.daysLeft === -1 ? "" : "s"} ago`;
  if (st.daysLeft === 0) return "Today";
  return `in ${st.daysLeft} day${st.daysLeft === 1 ? "" : "s"}`;
}

export type ComplianceRecord = { itemKey: string; held: boolean; expiry: string | null };

export type CarerComplianceSummary = {
  worst: ComplianceStatus;
  expired: number;
  expiring: number;
  missing: number;
  /** A safety-critical (blocking) credential is expired or missing → don't roster. */
  blockedFromRoster: boolean;
};

const SEVERITY: Record<ComplianceStatus, number> = { valid: 0, expiring: 1, missing: 2, expired: 3 };

/** Roll one carer's credentials into a headline status + counts. */
export function summariseCompliance(records: ComplianceRecord[], now: Date): CarerComplianceSummary {
  const held = new Map(records.map((r) => [r.itemKey, r]));
  let worst: ComplianceStatus = "valid";
  let expired = 0, expiring = 0, missing = 0, blocked = false;
  for (const item of COMPLIANCE_ITEMS) {
    const r = held.get(item.key);
    const st = complianceStatus(!!r, r?.expiry ?? null, now).status;
    if (st === "expired") expired++;
    else if (st === "expiring") expiring++;
    else if (st === "missing") missing++;
    if (SEVERITY[st] > SEVERITY[worst]) worst = st;
    if (item.blocking && (st === "expired" || st === "missing")) blocked = true;
  }
  return { worst, expired, expiring, missing, blockedFromRoster: blocked };
}
