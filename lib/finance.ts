/**
 * Finance — rate schemes, invoicing from delivered visits, and HCA pay & hours.
 * Ported from the prototype's finance logic (design/ QMS.dc.html): each client
 * bills against a CHO-area / funder rate scheme (weekday/Sat/Sun/bank-holiday),
 * carers earn premiums on weekends/bank holidays, and margin = billed − payroll.
 * Pure functions — compute from the client schedules for a given month.
 */
import type { Client } from "@/lib/crm";

export type RateScheme = {
  id: string;
  code: string;
  name: string;
  pod: string;
  color: string;
  funder: string;
  rates: { wd: number; sat: number; sun: number; bh: number };
};

export const RATE_SCHEMES: RateScheme[] = [
  { id: "cho6", code: "01", name: "CHO6 Dún Laoghaire · Blue Rates", pod: "Dún Laoghaire / Dublin SE", color: "#2E6FB8", funder: "HSE HSAS", rates: { wd: 30, sat: 33, sun: 38, bh: 38 } },
  { id: "cho7", code: "02", name: "CHO7 Dublin South & West", pod: "Dublin South / West", color: "#6E59B6", funder: "HSE HSAS", rates: { wd: 29, sat: 32, sun: 37, bh: 37 } },
  { id: "cho9", code: "03", name: "CHO9 Dublin North", pod: "Dublin North", color: "#1E8A5B", funder: "HSE HSAS", rates: { wd: 30, sat: 33, sun: 38, bh: 38 } },
  { id: "cho8", code: "04", name: "CHO8 Laois / Offaly · Midlands", pod: "Midlands", color: "#B0813A", funder: "HSE HSAS", rates: { wd: 28, sat: 31, sun: 35, bh: 35 } },
  { id: "fairdeal", code: "05", name: "Fair Deal · NHSS contribution", pod: "All areas", color: "#4E7A8C", funder: "Fair Deal (NHSS)", rates: { wd: 27, sat: 30, sun: 34, bh: 34 } },
  { id: "private", code: "06", name: "Private / Self-funded", pod: "All areas", color: "#B03A5A", funder: "Private", rates: { wd: 32, sat: 36, sun: 42, bh: 48 } },
];

const SCHEME_BY_ID: Record<string, RateScheme> = Object.fromEntries(RATE_SCHEMES.map((s) => [s.id, s]));

const BANK_HOLS = new Set([
  "2026-01-01", "2026-02-02", "2026-03-17", "2026-04-06", "2026-05-04",
  "2026-06-01", "2026-08-03", "2026-10-26", "2026-12-25", "2026-12-28",
]);

const PAY_FIXED: Record<string, number> = {
  "Denise Fenlon": 15.2, "Tanisha Okafor": 14.8, "Bridget Kelly": 15.5,
  "Marian Dunne": 14.5, "Séan Molloy": 15.0, "Séan Molloy ": 15.0, "Katie Phelan": 14.8,
};

export function money(n: number): string {
  return "€" + n.toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function hoursLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h + "h" + (m ? " " + m + "m" : "");
}
const rtLabel: Record<string, string> = { wd: "Weekday", sat: "Saturday", sun: "Sunday", bh: "Bank holiday" };

export function clientSchemeId(c: Client): string {
  const f = c.funding || "";
  const a = c.area || "";
  if (/private/i.test(f)) return "private";
  if (/fair deal/i.test(f) && !/hsas/i.test(f)) return "fairdeal";
  if (/dublin north/i.test(a)) return "cho9";
  if (/dublin (west|south)|lucan|kildare/i.test(a)) return "cho7";
  if (/offaly|laois|midland|tullamore|birr|portlaoise|mountmellick/i.test(a)) return "cho8";
  return "cho6";
}

export function invoiceTo(funding: string): { to: string; addr: string } {
  if (/private/i.test(funding)) return { to: "Private client account", addr: "Invoiced directly to the service user / family" };
  if (/fair deal/i.test(funding)) return { to: "HSE Nursing Home Support Scheme (Fair Deal)", addr: "Client contribution · NHSS shared cost" };
  return { to: "Finance Shared Services (FSS) Payment Services", addr: "Accounts Payable 1010, Block D, Parkgate Business Centre, Parkgate Street, D08 YFF1" };
}

function durMin(d: string): number {
  const h = /(\d+)\s*h/.exec(d || "");
  const m = /(\d+)\s*m/.exec(d || "");
  return (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0);
}
function carersOf(v: string): string[] {
  return String(v || "")
    .split("+")
    .map((s) => s.trim())
    .filter((n) => n && !/unassigned|to be allocated/i.test(n));
}
const DN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const p2 = (n: number) => String(n).padStart(2, "0");

export type VisitHit = {
  day: number;
  dow: number;
  iso: string;
  weekKey: string;
  weekLabel: string;
  time: string;
  dur: string;
  mins: number;
  billMins: number;
  rt: "wd" | "sat" | "sun" | "bh";
  rate: number;
  cost: number;
  carers: string[];
  isBH: boolean;
};

/** Walk one client's visits across a month, invoking cb for each billable visit. */
function walkClientMonth(c: Client, year: number, month: number, cb: (h: VisitHit) => void) {
  const daysIn = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysIn; d++) {
    const dt = new Date(year, month - 1, d);
    const dow = dt.getDay();
    const iso = `${year}-${p2(month)}-${p2(d)}`;
    const sd = c.schedule?.find((x) => x.day === DN[dow]);
    if (!sd) continue;
    const isBH = BANK_HOLS.has(iso);
    const rt = isBH ? "bh" : dow === 0 ? "sun" : dow === 6 ? "sat" : "wd";
    const scheme = SCHEME_BY_ID[clientSchemeId(c)];
    const rate = scheme.rates[rt];
    const wc = new Date(dt);
    wc.setDate(dt.getDate() - ((dow + 6) % 7));
    const weekKey = `${wc.getFullYear()}${p2(wc.getMonth() + 1)}${p2(wc.getDate())}`;
    const weekLabel = `w/c ${p2(wc.getDate())}/${p2(wc.getMonth() + 1)}/${wc.getFullYear()}`;
    for (const v of sd.visits) {
      const mins = durMin(v.dur);
      if (!mins) continue;
      const carers = carersOf(v.carer);
      const nC = Math.max(1, carers.length);
      const billMins = mins * nC;
      cb({ day: d, dow, iso, weekKey, weekLabel, time: v.time, dur: v.dur, mins, billMins, rt, rate, cost: (billMins / 60) * rate, carers, isBH });
    }
  }
}

export type InvoiceLine = { date: string; day: string; time: string; dur: string; rateLabel: string; rate: string; cost: string; carer: string; premium: boolean };
export type InvoiceWeek = { label: string; order: string; lines: InvoiceLine[]; subHours: string; subCost: string };
export type ClientInvoice = { scheme: RateScheme; weeks: InvoiceWeek[]; totalMins: number; totalCost: number };

/** Full invoice for one client for a month (weekly grouped lines) — the drill-down. */
export function expandClientMonth(c: Client, year: number, month: number): ClientInvoice {
  const scheme = SCHEME_BY_ID[clientSchemeId(c)];
  const groups = new Map<string, { label: string; order: string; lines: InvoiceLine[]; mins: number; cost: number }>();
  let totalMins = 0;
  let totalCost = 0;
  walkClientMonth(c, year, month, (h) => {
    totalMins += h.billMins;
    totalCost += h.cost;
    if (!groups.has(h.weekKey)) groups.set(h.weekKey, { label: h.weekLabel, order: h.weekKey, lines: [], mins: 0, cost: 0 });
    const g = groups.get(h.weekKey)!;
    g.mins += h.billMins;
    g.cost += h.cost;
    const nC = h.carers.length;
    g.lines.push({
      date: `${p2(h.day)}/${p2(month)}/${year}`,
      day: DN[h.dow].slice(0, 3),
      time: h.time,
      dur: h.dur + (nC > 1 ? ` ×${nC}` : ""),
      rateLabel: rtLabel[h.rt],
      rate: money(h.rate),
      cost: money(h.cost),
      carer: h.carers.join(" + ") || "—",
      premium: h.rt !== "wd",
    });
  });
  const weeks = [...groups.values()]
    .sort((a, b) => a.order.localeCompare(b.order))
    .map((g) => ({ label: g.label, order: g.order, lines: g.lines, subHours: hoursLabel(g.mins), subCost: money(g.cost) }));
  return { scheme, weeks, totalMins, totalCost };
}

export type InvoiceRow = { no: number; clientId: string; area: string; schemeCode: string; schemeName: string; schemeColor: string; funder: string; hours: string; mins: number; cost: number; costLabel: string; status: string };
export type CarerPay = { name: string; base: string; totalHours: string; wd: string; sat: string; sun: string; bh: string; hasPremium: boolean; gross: string };
export type PodRow = { code: string; name: string; pod: string; color: string; clients: number; hours: string; billed: string };

export type FinanceSummary = {
  monthLabel: string;
  invoices: InvoiceRow[];
  carerPay: CarerPay[];
  pods: PodRow[];
  billedTotal: number;
  payrollTotal: number;
  margin: number;
  marginPct: number;
};

const STATUS_CYCLE = ["Unpaid", "Paid", "Unpaid", "Unpaid", "Paid", "Unpaid", "Unpaid"];

/** Compute the whole finance picture for a month across all (non-new) clients. */
export function computeFinance(clients: Client[], year: number, month: number): FinanceSummary {
  const billable = clients.filter((c) => c.status !== "new").sort((a, b) => a.id.localeCompare(b.id));
  const payBase = carerPayBase(clients);
  const carerAcc: Record<string, { mins: number; wd: number; sat: number; sun: number; bh: number; gross: number; base: number }> = {};
  const podAcc: Record<string, { scheme: RateScheme; clients: number; mins: number; cost: number }> = {};
  const invoices: InvoiceRow[] = [];
  let billedTotal = 0;

  billable.forEach((c, i) => {
    let mins = 0;
    let cost = 0;
    const scheme = SCHEME_BY_ID[clientSchemeId(c)];
    walkClientMonth(c, year, month, (h) => {
      mins += h.billMins;
      cost += h.cost;
      for (const nm of h.carers) {
        const base = payBase[nm] ?? 14.5;
        const prate = h.isBH ? base * 2 : h.dow === 0 ? base * 1.35 : h.dow === 6 ? base + 1 : base;
        const A = (carerAcc[nm] ??= { mins: 0, wd: 0, sat: 0, sun: 0, bh: 0, gross: 0, base });
        A.mins += h.mins;
        A[h.rt] += h.mins;
        A.gross += (h.mins / 60) * prate;
      }
    });
    billedTotal += cost;
    const status = STATUS_CYCLE[i % STATUS_CYCLE.length];
    invoices.push({
      no: 22528 + i,
      clientId: c.id,
      area: c.area,
      schemeCode: scheme.code,
      schemeName: scheme.name,
      schemeColor: scheme.color,
      funder: scheme.funder,
      hours: hoursLabel(mins),
      mins,
      cost,
      costLabel: money(cost),
      status,
    });
    const P = (podAcc[scheme.id] ??= { scheme, clients: 0, mins: 0, cost: 0 });
    P.clients++;
    P.mins += mins;
    P.cost += cost;
  });

  const carerPay: CarerPay[] = Object.keys(carerAcc)
    .sort()
    .map((nm) => {
      const A = carerAcc[nm];
      return {
        name: nm,
        base: money(A.base) + "/hr",
        totalHours: hoursLabel(A.mins),
        wd: A.wd ? hoursLabel(A.wd) : "—",
        sat: A.sat ? hoursLabel(A.sat) : "—",
        sun: A.sun ? hoursLabel(A.sun) : "—",
        bh: A.bh ? hoursLabel(A.bh) : "—",
        hasPremium: A.sat + A.sun + A.bh > 0,
        gross: money(A.gross),
      };
    });
  const payrollTotal = Object.values(carerAcc).reduce((s, a) => s + a.gross, 0);
  const margin = billedTotal - payrollTotal;
  const marginPct = billedTotal ? Math.round((margin / billedTotal) * 100) : 0;
  const pods: PodRow[] = Object.values(podAcc)
    .sort((a, b) => a.scheme.code.localeCompare(b.scheme.code))
    .map((P) => ({ code: P.scheme.code, name: P.scheme.name, pod: P.scheme.pod, color: P.scheme.color, clients: P.clients, hours: hoursLabel(P.mins), billed: money(P.cost) }));

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-IE", { month: "long", year: "numeric" });
  return { monthLabel, invoices, carerPay, pods, billedTotal, payrollTotal, margin, marginPct };
}

export function carerPayBase(clients: Client[]): Record<string, number> {
  const names = new Set<string>();
  for (const c of clients) for (const d of c.schedule ?? []) for (const v of d.visits) for (const n of carersOf(v.carer)) names.add(n);
  const out: Record<string, number> = {};
  for (const n of names) out[n] = PAY_FIXED[n] ?? 14.5 + (n.length % 5) * 0.25;
  return out;
}
