/**
 * Role model — the single source of truth for what each of the nine app roles
 * can reach and which department they belong to. Gate arrays, the sidebar, the
 * Improvement hub scope and the dashboard all derive from here.
 *
 * Capabilities gate whole areas; `dept` places a role in one of the five
 * departments; `hubScope` decides whether their Improvement & Training hub shows
 * every open issue ("all"), only issues routed to their department ("dept"), or
 * none. Access is enforced server-side in each route — never client-side only.
 */
import type { Role } from "./db";

export type Capability =
  | "crm"
  | "oversight"
  | "finance"
  | "recruit"
  | "improvement"
  | "workforce";

export type Dept = "Client Services" | "Care & Operations" | "HR" | "Finance" | "Quality";

export type RoleProfile = {
  dept: Dept | null;
  caps: Capability[];
  hubScope: "all" | "dept" | "none";
  /** Short description of the role, shown on the role's dashboard. */
  remit: string;
};

const EVERYTHING: Capability[] = ["crm", "oversight", "finance", "recruit", "improvement", "workforce"];

export const ROLE_PROFILE: Record<string, RoleProfile> = {
  Executive: { dept: null, caps: EVERYTHING, hubScope: "all", remit: "Master oversight — every area and every register across the service." },
  Manager: { dept: null, caps: EVERYTHING, hubScope: "all", remit: "Full management oversight across all areas." },
  "Director of Quality": { dept: "Quality", caps: ["oversight", "improvement", "workforce"], hubScope: "all", remit: "Quality: registers, KPIs, audits, and org-wide issue review & routing." },
  "Director of HR": { dept: "HR", caps: ["workforce", "recruit", "improvement"], hubScope: "dept", remit: "Workforce, recruitment, and HR-routed issue review." },
  "Client Service Manager": { dept: "Client Services", caps: ["crm", "oversight", "improvement", "finance"], hubScope: "all", remit: "Operational oversight of care packages: full CRM, registers, team training." },
  "Director of Finance": { dept: "Finance", caps: ["finance"], hubScope: "dept", remit: "Invoicing, rate schemes and payroll (with billing context)." },
  "Recruitment Manager": { dept: "HR", caps: ["recruit"], hubScope: "none", remit: "Sourcing → vetting → onboarding pipeline." },
  "Care Coordinator": { dept: "Care & Operations", caps: ["crm"], hubScope: "none", remit: "Client care & scheduling: rostering, cover, call log, records." },
  "On-Call Manager": { dept: "Care & Operations", caps: ["crm"], hubScope: "none", remit: "Out-of-hours client contact and escalation." },
  "Office Administrator": { dept: null, caps: [], hubScope: "none", remit: "Training records and general administration." },
  "Healthcare Assistant": { dept: null, caps: [], hubScope: "none", remit: "Your workday, training, and the ability to raise issues." },
  "Client / Family": { dept: null, caps: [], hubScope: "none", remit: "Read-only view of your own care." },
};

export function profileFor(role: string): RoleProfile {
  return ROLE_PROFILE[role] ?? { dept: null, caps: [], hubScope: "none", remit: "" };
}

export function can(role: string, cap: Capability): boolean {
  return profileFor(role).caps.includes(cap);
}

export function deptOf(role: string): Dept | null {
  return profileFor(role).dept;
}

export function hubScopeOf(role: string): "all" | "dept" | "none" {
  return profileFor(role).hubScope;
}

/** The role-aware label for the Improvement & Training hub / nav group. */
export function hubLabel(role: string): string {
  const d = deptOf(role);
  if (hubScopeOf(role) === "all") return "Quality Management";
  if (d === "HR") return "HR Management";
  return "Improvement & Training";
}

/** Every role that has a given capability — used to build the gate arrays. */
export function rolesWith(cap: Capability, all: Role[]): Role[] {
  return all.filter((r) => can(r, cap));
}
