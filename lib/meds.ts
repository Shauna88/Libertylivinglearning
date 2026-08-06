/** Medication administration outcomes (eMAR), with display metadata. */

export type MedStatus = "given" | "self" | "refused" | "omitted" | "not_needed";

export const MED_STATUS: Record<MedStatus, { label: string; short: string; tone: string; icon: string }> = {
  given: { label: "Given", short: "G", tone: "green", icon: "check_circle" },
  self: { label: "Self-administered", short: "S", tone: "blue", icon: "front_hand" },
  refused: { label: "Refused", short: "R", tone: "amber", icon: "do_not_disturb_on" },
  omitted: { label: "Omitted", short: "O", tone: "red", icon: "cancel" },
  not_needed: { label: "Not needed (PRN)", short: "N", tone: "grey", icon: "remove" },
};

/** Reasons a dose might not be given — recorded against refused/omitted. */
export const MED_OMIT_REASONS = [
  "Client refused",
  "Client asleep",
  "Client in hospital",
  "Client away",
  "Medication not available",
  "Nausea / vomiting",
  "Held on clinical advice",
  "Other",
];

export const isMedStatus = (s: string): s is MedStatus => s in MED_STATUS;

/** Parse a medication's comma/space separated administration times to HH:MM[]. */
export function medTimes(times: string): string[] {
  return times
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter((t) => /^\d{1,2}:\d{2}$/.test(t))
    .map((t) => (t.length === 4 ? `0${t}` : t))
    .sort();
}
