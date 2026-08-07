import type { Client } from "./crm";
import { deriveTodayVisits, isUnassignedCarer, type TodayVisit } from "./schedule";

export type PresenceLine = { icon: string; text: string; tone: string };

function clock(min: number): string {
  return `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(((min % 60) + 60) % 60).padStart(2, "0")}`;
}

function lineFor(vs: TodayVisit[], nowMin: number, kind: "client" | "carer"): PresenceLine {
  if (vs.length === 0) {
    return kind === "carer"
      ? { icon: "event_busy", tone: "grey", text: "Not working today" }
      : { icon: "event_busy", tone: "grey", text: "No visits today" };
  }
  const sorted = vs.slice().sort((a, b) => a.startMin - b.startMin);
  const current = sorted.find((v) => nowMin >= v.startMin && nowMin < v.startMin + v.durMin);
  if (current) {
    return kind === "carer"
      ? { icon: "directions_run", tone: "green", text: `In a call now · ${current.su} (until ${clock(current.startMin + current.durMin)})` }
      : { icon: "directions_run", tone: "green", text: `Carer on site · until ${clock(current.startMin + current.durMin)}` };
  }
  const next = sorted.find((v) => v.startMin >= nowMin);
  if (next) {
    return kind === "carer"
      ? { icon: "schedule", tone: "blue", text: `Next call ${next.time} · ${next.su}` }
      : { icon: "schedule", tone: "blue", text: `Next visit ${next.time}` };
  }
  return { icon: "task_alt", tone: "grey", text: `Finished today · ${vs.length} call${vs.length > 1 ? "s" : ""}` };
}

/**
 * Today's live status for every client and carer, for the name hover-cards:
 * whether they're in a call now, their next call, or done / not working.
 * Time-based (no check-in events needed) so it's cheap on list pages.
 */
export function presenceMaps(
  clients: Client[],
  cover: Record<string, string>,
  weekday: string,
  nowMin: number,
  timeOverrides: Record<string, string> = {}
): { client: Record<string, PresenceLine>; carer: Record<string, PresenceLine>; carerCount: Record<string, number> } {
  const visits = deriveTodayVisits(clients, weekday, nowMin, cover, timeOverrides);
  const byClient = new Map<string, TodayVisit[]>();
  const byCarer = new Map<string, TodayVisit[]>();
  for (const v of visits) {
    if (!byClient.has(v.clientId)) byClient.set(v.clientId, []);
    byClient.get(v.clientId)!.push(v);
    if (v.status === "gap" || isUnassignedCarer(v.carer)) continue;
    for (const one of String(v.carer).split("+").map((s) => s.trim())) {
      if (!one || isUnassignedCarer(one)) continue;
      if (!byCarer.has(one)) byCarer.set(one, []);
      byCarer.get(one)!.push(v);
    }
  }
  const client: Record<string, PresenceLine> = {};
  for (const [id, vs] of byClient) client[id] = lineFor(vs, nowMin, "client");
  const carer: Record<string, PresenceLine> = {};
  const carerCount: Record<string, number> = {};
  for (const [name, vs] of byCarer) {
    carer[name] = lineFor(vs, nowMin, "carer");
    carerCount[name] = vs.length;
  }
  return { client, carer, carerCount };
}
