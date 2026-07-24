/**
 * Carer matching — given a client's area and care needs, score the carer
 * directory to recommend who is best suited. Pure functions (directory passed
 * in) so the logic is testable and reusable on the server or the client.
 *
 * A match blends three things a coordinator weighs by hand today:
 *   1. Radius  — is the carer's travel area a fit for the client's area?
 *   2. Skills  — do the carer's competencies cover this client's conditions?
 *   3. Capacity— does the carer have spare contracted hours this week?
 */

import rawDirectory from "@/data/qms-carers.json";

export type CarerSkill = { key: string; label: string };
export type CarerArea = { key: string; adjacent: string[] };

export type CarerRecord = {
  id: string;
  name: string;
  homeArea: string;
  covers: string[];
  skills: string[];
  pathway: string;
  transport: string;
  capacityHours: number;
  committedHours: number;
  status: string;
  note: string;
};

export type CarerDirectory = {
  skills: CarerSkill[];
  areas: CarerArea[];
  carers: CarerRecord[];
};

/** The carer directory, loaded from the seed JSON. */
export const CARER_DIRECTORY = rawDirectory as CarerDirectory;

export type MatchReason = { kind: "good" | "warn"; text: string };

export type CarerMatch = {
  carer: CarerRecord;
  score: number; // 0–100
  band: "strong" | "good" | "fair" | "poor";
  areaFit: "home" | "radius" | "outside";
  matchedSkills: string[]; // labels
  missingSkills: string[]; // labels of required skills the carer lacks
  freeHours: number;
  reasons: MatchReason[];
};

/**
 * Map a clinical condition (free text on the client record) to the carer
 * skills a coordinator would want covered. Baseline personal care and
 * medication support are assumed of every carer, so they aren't required here.
 */
export function conditionToSkills(condition: string): string[] {
  const c = condition.toLowerCase();
  const out = new Set<string>();
  if (/dementia|cognitive|alzheimer|memory/.test(c)) out.add("dementia");
  if (/diabet/.test(c)) out.add("diabetes");
  if (/parkinson/.test(c)) out.add("parkinsons");
  if (/stroke|cva|hemipleg|weakness/.test(c)) out.add("stroke");
  if (/copd|o₂|oxygen|respirat|breath|emphysema/.test(c)) out.add("respiratory");
  if (/heart failure|cardiac|atrial|afib|a\.?f\.?\b|hypertension/.test(c)) out.add("cardiac");
  if (/palliat|end.of.life|pressure.sore|hospice/.test(c)) out.add("palliative");
  if (/anxiety|depress|low mood|mental/.test(c)) out.add("mental-health");
  if (/falls|reduced mobility|osteo|arthrit|frail|transfer/.test(c)) out.add("manual-handling");
  return [...out];
}

/** The distinct set of skill keys a client's conditions call for. */
export function requiredSkills(conditions: string[]): string[] {
  const set = new Set<string>();
  for (const cond of conditions) for (const s of conditionToSkills(cond)) set.add(s);
  return [...set];
}

function labelFor(dir: CarerDirectory, key: string): string {
  return dir.skills.find((s) => s.key === key)?.label ?? key;
}

/** Areas reachable from `area`: itself plus any adjacent areas in the directory. */
function radiusOf(dir: CarerDirectory, area: string): Set<string> {
  const a = dir.areas.find((x) => x.key === area);
  return new Set([area, ...(a?.adjacent ?? [])]);
}

export function scoreCarer(
  dir: CarerDirectory,
  carer: CarerRecord,
  client: { area: string; conditions: string[] }
): CarerMatch {
  const need = requiredSkills(client.conditions);
  const reasons: MatchReason[] = [];

  // 1. Radius (max 40) — home area is the strongest fit, an area the carer
  //    covers is workable, anything else is outside their travel radius.
  const covers = new Set(carer.covers);
  const inRadius = radiusOf(dir, client.area);
  let areaFit: CarerMatch["areaFit"];
  let areaScore: number;
  if (carer.homeArea === client.area) {
    areaFit = "home"; areaScore = 40;
    reasons.push({ kind: "good", text: `Based in ${client.area}` });
  } else if (covers.has(client.area) || carer.covers.some((c) => inRadius.has(c))) {
    areaFit = "radius"; areaScore = 26;
    reasons.push({ kind: "good", text: `Covers ${client.area} (travels from ${carer.homeArea})` });
  } else {
    areaFit = "outside"; areaScore = 0;
    reasons.push({ kind: "warn", text: `Outside travel radius (based in ${carer.homeArea})` });
  }

  // 2. Skills (max 40) — proportion of the client's required skills the carer
  //    holds. With no special needs, everyone scores full on skills.
  const has = new Set(carer.skills);
  const matched = need.filter((k) => has.has(k));
  const missing = need.filter((k) => !has.has(k));
  const skillScore = need.length === 0 ? 40 : Math.round((matched.length / need.length) * 40);
  if (matched.length) reasons.push({ kind: "good", text: `Skilled in ${matched.map((k) => labelFor(dir, k)).join(", ")}` });
  if (missing.length) reasons.push({ kind: "warn", text: `No ${missing.map((k) => labelFor(dir, k)).join(", ")} training` });

  // 3. Capacity (max 20) — spare contracted hours this week.
  const freeHours = Math.max(0, carer.capacityHours - carer.committedHours);
  let capScore: number;
  if (freeHours <= 0) { capScore = 0; reasons.push({ kind: "warn", text: "At full hours this week" }); }
  else if (freeHours < 4) { capScore = 8; reasons.push({ kind: "warn", text: `Only ${freeHours}h spare this week` }); }
  else { capScore = 20; reasons.push({ kind: "good", text: `${freeHours}h available this week` }); }

  const score = Math.min(100, areaScore + skillScore + capScore);
  const band: CarerMatch["band"] = score >= 80 ? "strong" : score >= 60 ? "good" : score >= 40 ? "fair" : "poor";

  return {
    carer, score, band, areaFit, freeHours,
    matchedSkills: matched.map((k) => labelFor(dir, k)),
    missingSkills: missing.map((k) => labelFor(dir, k)),
    reasons,
  };
}

/**
 * Rank the active directory for a client, best fit first. Carers entirely
 * outside the travel radius are dropped unless `includeOutside` is set.
 */
export function suggestCarers(
  dir: CarerDirectory,
  client: { area: string; conditions: string[] },
  opts: { includeOutside?: boolean; limit?: number } = {}
): CarerMatch[] {
  const ranked = dir.carers
    .filter((c) => c.status === "active")
    .map((c) => scoreCarer(dir, c, client))
    .filter((m) => (opts.includeOutside ? true : m.areaFit !== "outside"))
    .sort((a, b) => b.score - a.score || a.carer.name.localeCompare(b.carer.name));
  return typeof opts.limit === "number" ? ranked.slice(0, opts.limit) : ranked;
}
