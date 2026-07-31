/**
 * Analytics / BI — operational and business aggregates across the service, plus
 * funder (HSE CHO / Fair Deal / private) reporting. Pure aggregation over the
 * client, carer, cover and finance data already computed elsewhere.
 */
import type { Client } from "./crm";
import type { CarerRecord } from "./carers";
import { clientWeekSummary } from "./schedule";
import { RATE_SCHEMES, clientSchemeId, type InvoiceRow } from "./finance";

const SCHEME_BY_ID = Object.fromEntries(RATE_SCHEMES.map((s) => [s.id, s]));

export type SchemeRow = {
  code: string; name: string; color: string; funder: string;
  clients: number; weeklyMins: number; deliveredMins: number; billed: number;
};
export type FunderRow = { funder: string; clients: number; weeklyMins: number; billed: number; sharePct: number };
export type AreaRow = { area: string; clients: number; plannedMins: number; deliveredMins: number };

export type Analytics = {
  activeClients: number;
  plannedMins: number;
  deliveredMins: number;
  unassignedMins: number;
  deliveryPct: number;
  weeklyCalls: number;
  uncoveredCalls: number;
  utilisation: { committed: number; capacity: number; pct: number; freeHours: number };
  schemes: SchemeRow[];
  funders: FunderRow[];
  areas: AreaRow[];
};

export function computeAnalytics(opts: {
  clients: Client[];
  carers: CarerRecord[];
  coverMap: Record<string, string>;
  invoices: InvoiceRow[]; // from computeFinance — billed per client, with scheme + funder
}): Analytics {
  const { clients, carers, coverMap, invoices } = opts;

  const billedByScheme = new Map<string, number>();
  const billedByFunder = new Map<string, number>();
  for (const inv of invoices) {
    billedByScheme.set(inv.schemeCode, (billedByScheme.get(inv.schemeCode) ?? 0) + inv.cost);
    billedByFunder.set(inv.funder, (billedByFunder.get(inv.funder) ?? 0) + inv.cost);
  }

  let plannedMins = 0, deliveredMins = 0, unassignedMins = 0, weeklyCalls = 0, uncoveredCalls = 0, activeClients = 0;
  const schemeAcc = new Map<string, { clients: number; weeklyMins: number; deliveredMins: number }>();
  const funderAcc = new Map<string, { clients: number; weeklyMins: number }>();
  const areaAcc = new Map<string, { clients: number; plannedMins: number; deliveredMins: number }>();

  for (const c of clients) {
    if (c.status === "discharged" || c.status === "deceased") continue;
    const paused = c.status === "hospital" || c.status === "hold";
    const wk = clientWeekSummary(c, coverMap, paused);
    if (c.status === "active") activeClients++;
    plannedMins += wk.plannedMin;
    deliveredMins += wk.deliveredMin;
    unassignedMins += wk.unassignedMin;
    uncoveredCalls += wk.unassigned;
    for (const d of c.schedule) weeklyCalls += d.visits.length;

    const scheme = SCHEME_BY_ID[clientSchemeId(c)];
    const sa = schemeAcc.get(scheme.code) ?? { clients: 0, weeklyMins: 0, deliveredMins: 0 };
    sa.clients++; sa.weeklyMins += wk.plannedMin; sa.deliveredMins += wk.deliveredMin;
    schemeAcc.set(scheme.code, sa);

    const fa = funderAcc.get(scheme.funder) ?? { clients: 0, weeklyMins: 0 };
    fa.clients++; fa.weeklyMins += wk.plannedMin;
    funderAcc.set(scheme.funder, fa);

    const area = c.area || "Unassigned";
    const aa = areaAcc.get(area) ?? { clients: 0, plannedMins: 0, deliveredMins: 0 };
    aa.clients++; aa.plannedMins += wk.plannedMin; aa.deliveredMins += wk.deliveredMin;
    areaAcc.set(area, aa);
  }

  const deliveryPct = plannedMins ? Math.round((deliveredMins / plannedMins) * 100) : 0;

  const activeCarers = carers.filter((c) => c.status === "active");
  const committed = activeCarers.reduce((s, c) => s + c.committedHours, 0);
  const capacity = activeCarers.reduce((s, c) => s + c.capacityHours, 0);
  const utilisation = { committed, capacity, pct: capacity ? Math.round((committed / capacity) * 100) : 0, freeHours: Math.max(0, capacity - committed) };

  const schemes: SchemeRow[] = RATE_SCHEMES.filter((s) => schemeAcc.has(s.code)).map((s) => {
    const a = schemeAcc.get(s.code)!;
    return { code: s.code, name: s.name, color: s.color, funder: s.funder, clients: a.clients, weeklyMins: a.weeklyMins, deliveredMins: a.deliveredMins, billed: billedByScheme.get(s.code) ?? 0 };
  });

  const totalBilled = [...billedByFunder.values()].reduce((s, v) => s + v, 0);
  const funders: FunderRow[] = [...funderAcc.entries()]
    .map(([funder, a]) => ({ funder, clients: a.clients, weeklyMins: a.weeklyMins, billed: billedByFunder.get(funder) ?? 0, sharePct: totalBilled ? Math.round(((billedByFunder.get(funder) ?? 0) / totalBilled) * 100) : 0 }))
    .sort((x, y) => y.billed - x.billed);

  const areas: AreaRow[] = [...areaAcc.entries()]
    .map(([area, a]) => ({ area, clients: a.clients, plannedMins: a.plannedMins, deliveredMins: a.deliveredMins }))
    .sort((x, y) => x.area.localeCompare(y.area));

  return { activeClients, plannedMins, deliveredMins, unassignedMins, deliveryPct, weeklyCalls, uncoveredCalls, utilisation, schemes, funders, areas };
}
