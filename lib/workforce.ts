/**
 * Workforce & Training (HR / manager view) — HR-14, HSE Specs 17.x.
 * Training KPIs, readiness mix, onboarding gateways and the training catalogue
 * are migrated from the prototype (data/qms-modules.json). The per-HCA register
 * records are derived here from their raw inputs (data/qms-workforce.json),
 * reproducing the prototype's competency-matrix computation.
 */
import modules from "@/data/qms-modules.json";
import workforce from "@/data/qms-workforce.json";

// ---- migrated arrays ----
export type WfKpi = { name: string; target: string; value: string; prev: string; tone: string; icon: string };
export type Readiness = { label: string; count: number; tone: string; desc: string };
export type Gateway = {
  name: string;
  icon: string;
  gate: string;
  evidence: string;
  refresh: string;
  pct: number;
  tone: string;
  spec: string;
};
export type TrainingItem = {
  key: string;
  name: string;
  why: string;
  evidence: string;
  refresh: string;
  pct: number;
  due: number;
  exp: number;
  tone: string;
};
export type Pathway = {
  key: string;
  name: string;
  example: string;
  min: string;
  core: string;
  evidence: string;
  dementia: string;
  count: number;
  tone: string;
};

const mod = modules as unknown as {
  wfKpis: WfKpi[];
  readiness: Readiness[];
  gateways: Gateway[];
  trainingCat: TrainingItem[];
};
const wf = workforce as unknown as { wfPathways: Pathway[]; hcaRaw: HcaRaw[] };

export const WF_KPIS: WfKpi[] = mod.wfKpis;
export const READINESS: Readiness[] = mod.readiness;
export const GATEWAYS: Gateway[] = mod.gateways;
export const TRAINING_CAT: TrainingItem[] = mod.trainingCat;
export const WF_PATHWAYS: Pathway[] = wf.wfPathways;

// ---- per-HCA competency records (derived) ----

// Training status vocabulary (prototype this.TS)
const TS: Record<string, { label: string; tone: string }> = {
  C: { label: "Compliant", tone: "green" },
  D: { label: "Due soon", tone: "amber" },
  E: { label: "Expired", tone: "red" },
  P: { label: "Pending", tone: "blue" },
  N: { label: "N/A", tone: "grey" },
  X: { label: "Exempt", tone: "grey" },
};

type HcaRaw = {
  id: string;
  area: string;
  start: string;
  band: string;
  pathway: string;
  ps: string;
  award: string;
  qqi: string;
  target: string;
  dem: string;
  ind: string;
  shad: string;
  ncca: string;
  tp: string;
  t: string; // one status char per training-catalogue item, in order
};

export type TrainingCell = { key: string; name: string; code: string; label: string; tone: string };
export type Check = { k: string; v: string; ok: boolean };
export type GatewayCell = { k: string; v: string; tone: string };
export type HcaRecord = {
  id: string;
  area: string;
  start: string;
  band: string;
  pathway: string;
  pathwayShort: string;
  award: string;
  qqi: string;
  target: string;
  dementia: string;
  compliancePct: number;
  statusKey: string;
  status: string;
  due: number;
  exp: number;
  training: TrainingCell[];
  vetting: Check[];
  gateways: GatewayCell[];
};

const catOrder = TRAINING_CAT.map((t) => t.key);
const statusLabel: Record<string, string> = { red: "Action req.", amber: "Due soon", green: "Compliant" };

function gwTone(value: string, kind: "std" | "ncca"): string {
  const c = value[0];
  let code: string;
  if (kind === "ncca") code = c === "C" ? "C" : c === "P" ? "P" : c === "E" ? "E" : "D";
  else code = c === "C" ? "C" : c === "P" ? "P" : "D";
  return TS[code].tone;
}

function deriveHca(o: HcaRaw): HcaRecord {
  const training: TrainingCell[] = o.t.split("").map((code, i) => ({
    key: catOrder[i],
    name: TRAINING_CAT[i]?.name ?? catOrder[i],
    code,
    label: TS[code]?.label ?? code,
    tone: TS[code]?.tone ?? "grey",
  }));
  const gaps = training.filter((x) => x.code === "E" || x.code === "P").length;
  const due = training.filter((x) => x.code === "D").length;
  const applicable = training.filter((x) => x.code !== "N" && x.code !== "X").length;
  const ok = training.filter((x) => x.code === "C").length + due;
  const pct = applicable ? Math.round((ok / applicable) * 100) : 0;
  const statusKey = gaps > 0 ? "red" : due > 0 ? "amber" : "green";

  return {
    id: o.id,
    area: o.area,
    start: o.start,
    band: o.band,
    pathway: o.pathway,
    pathwayShort: o.ps,
    award: o.award,
    qqi: o.qqi,
    target: o.target,
    dementia: o.dem,
    compliancePct: pct,
    statusKey,
    status: statusLabel[statusKey],
    due,
    exp: gaps,
    training,
    vetting: [
      { k: "Garda / Police clearance", v: "Valid", ok: true },
      { k: "Medical fitness", v: "Confirmed", ok: true },
      { k: "Right to work / English", v: "Verified", ok: true },
      { k: "Driving documents", v: "On file", ok: true },
    ],
    gateways: [
      { k: "Induction (20h / 5h practical)", v: o.ind, tone: gwTone(o.ind, "std") },
      { k: "Shadowing (8h)", v: o.shad, tone: gwTone(o.shad, "std") },
      { k: "Annual NCCA", v: o.ncca, tone: gwTone(o.ncca, "ncca") },
      { k: "Training plan review", v: o.tp, tone: gwTone(o.tp, "std") },
    ],
  };
}

export const HCA_RECORDS: HcaRecord[] = wf.hcaRaw.map(deriveHca);

export function getHca(id: string): HcaRecord | undefined {
  return HCA_RECORDS.find((h) => h.id === id);
}
