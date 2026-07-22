/**
 * Recruitment & onboarding — pipeline, vetting, onboarding-training gateways and
 * the onboarding checklist template. Migrated from the prototype
 * (data/qms-recruitment.json). Candidates are shown by initials only.
 */
import raw from "@/data/qms-recruitment.json";

type Bundle = {
  recruitKpis: [string, string, string, string, string, string][];
  recruitStages: [string, number, string][];
  recruitPipeline: [string, string, string, string, string, string, string, string][];
  recruitVetting: [string, string, [string, string, string], [string, string, string], [string, string, string]][];
  recruitOnbTraining: [string, string, string, string, string][];
  onboardingChecklist: {
    group: string;
    gate: boolean;
    note: string;
    items: { k: string; label: string; ref: string; gate?: boolean }[];
  }[];
};
const b = raw as unknown as Bundle;

export const RECRUIT_KPIS = b.recruitKpis.map((k) => ({ name: k[0], target: k[1], value: k[2], prev: k[3], tone: k[4], sub: k[5] }));
export const RECRUIT_STAGES = b.recruitStages.map((s) => ({ label: s[0], count: s[1], tone: s[2] }));
export const RECRUIT_PIPELINE = b.recruitPipeline.map((p) => ({
  id: p[0],
  initials: p[1],
  role: p[2],
  area: p[3],
  stage: p[4],
  days: p[5],
  note: p[6],
  tone: p[7],
}));
export const RECRUIT_VETTING = b.recruitVetting.map((v) => ({
  initials: v[0],
  role: v[1],
  checks: [v[2], v[3], v[4]].map((c) => ({ label: c[0], status: c[1], tone: c[2] })),
}));
export const RECRUIT_ONB_TRAINING = b.recruitOnbTraining.map((t) => ({
  training: t[0],
  who: t[1],
  note: t[2],
  tone: t[3],
  gate: t[4],
}));
export const ONBOARDING_CHECKLIST = b.onboardingChecklist;
