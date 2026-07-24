/**
 * Call-monitor event model (missed / cancelled / extra / hospital / respite),
 * migrated from the prototype. Each type carries its follow-up behaviour and the
 * default billing/pay treatment used by the finance call review.
 */
export type Billing = { bill: "none" | "half" | "full"; pay: "yes" | "no" };

export type CallEventType = {
  key: string;
  label: string;
  tone: string;
  followUp: boolean; // needs a coordinator to action (re-cover, HR referral)
  pause: boolean; // pauses the roster over a date range (hospital / respite)
  hint: string;
  billing: Billing;
};

export const CALL_EVENT_TYPES: CallEventType[] = [
  { key: "missed", label: "Missed call", tone: "red", followUp: true, pause: false, hint: "Carer did not attend a scheduled call", billing: { bill: "none", pay: "no" } },
  { key: "cancel_client", label: "Cancelled — client / family", tone: "amber", followUp: false, pause: false, hint: "Client or family cancelled the call", billing: { bill: "full", pay: "no" } },
  { key: "cancel_office", label: "Cancelled — office", tone: "blue", followUp: false, pause: false, hint: "Office stood the call down", billing: { bill: "none", pay: "no" } },
  { key: "extra", label: "Extra / additional visit", tone: "green", followUp: false, pause: false, hint: "Ad-hoc visit on top of the schedule — billable add-on", billing: { bill: "full", pay: "yes" } },
  { key: "hosp_admit", label: "Hospital admission", tone: "amber", followUp: true, pause: true, hint: "Admitted to hospital — calls paused pending discharge", billing: { bill: "none", pay: "no" } },
  { key: "respite", label: "Respite", tone: "teal", followUp: false, pause: true, hint: "Respite stay — calls paused, roster resumes automatically", billing: { bill: "none", pay: "no" } },
];

export const MISSED_CAUSES: { key: string; label: string }[] = [
  { key: "carer_noshow", label: "Carer no-show" },
  { key: "carer_sick", label: "Carer sick" },
  { key: "carer_late", label: "Carer late" },
];

const TYPE_MAP = new Map(CALL_EVENT_TYPES.map((t) => [t.key, t]));
const CAUSE_MAP = new Map(MISSED_CAUSES.map((c) => [c.key, c.label]));

export function callType(key: string): CallEventType | undefined {
  return TYPE_MAP.get(key);
}
export function causeLabel(key: string | null | undefined): string {
  return key ? CAUSE_MAP.get(key) ?? key : "";
}

/** Short human label for the billing/pay treatment. */
export function billingLabel(b: Billing): string {
  const bill = b.bill === "full" ? "Billed in full" : b.bill === "half" ? "Billed 50%" : "Not billed";
  const pay = b.pay === "yes" ? "carer paid" : "carer unpaid";
  return `${bill} · ${pay}`;
}
