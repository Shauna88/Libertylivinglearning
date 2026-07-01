/**
 * Front-line field guide — the same 13 situations seen from three role "lenses"
 * (HCA in the home, Care Coordinator in the office, Client Service Manager).
 * Migrated verbatim from the prototype (data/qms-frontline.json).
 */
import raw from "@/data/qms-frontline.json";

export type Situation = {
  id: string;
  name: string;
  cat: string;
  tone: string;
  icon: string;
  policy: string;
  remember: string;
  whatItIs: string;
  lookFor: string[];
  doNow: string[];
  whoTell: string[];
  whatRecord: string[];
};

export type FlRole = {
  key: string;
  label: string;
  short: string;
  icon: string;
  mission: string;
  owns: string[];
};

export type FlLens = Record<string, { coord: string[]; csm: string[] }>;

type Bundle = { fieldGuide: Situation[]; flRoles: FlRole[]; flLens: FlLens };
const b = raw as unknown as Bundle;

export const SITUATIONS: Situation[] = b.fieldGuide;
export const FL_ROLES: FlRole[] = b.flRoles;
export const FL_LENS: FlLens = b.flLens;

/** The "Do it" steps for a situation under a given role lens. */
export function doStepsFor(situation: Situation, roleKey: string): string[] {
  if (roleKey === "hca") return situation.doNow;
  const lens = FL_LENS[situation.id];
  if (!lens) return situation.doNow;
  return roleKey === "csm" ? lens.csm : lens.coord;
}
