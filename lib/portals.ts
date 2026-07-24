/**
 * Role "portals" — the personalised manager dashboards. Each senior role has a
 * mandate (what they're accountable for) and a scorecard of the HSE Authorisation
 * Scheme KPIs they're measured on (target / current / previous, RAG-rated).
 * Transcribed verbatim from the prototype's `mgrPortals`.
 */
export type Metric = { name: string; target: string; value: string; prev: string; dir: "over" | "under"; ref: string };
export type Portal = { mandate: string; scorecard: Metric[] };

const m = (name: string, target: string, value: string, prev: string, dir: "over" | "under", ref: string): Metric => ({
  name,
  target,
  value,
  prev,
  dir,
  ref,
});

export const PORTALS: Record<string, Portal> = {
  exec: {
    mandate:
      "You hold overall accountability for the safety and quality of the service. These are the service-wide targets the HSE Authorisation Scheme holds Liberty Living to.",
    scorecard: [
      m("Care plans reviewed within 12 months", "100%", "96%", "94%", "over", "CARE-27"),
      m("Unplanned missed visits", "<0.5%", "0.3%", "0.4%", "under", "QA-13"),
      m("Visit punctuality (within 15 min)", "≥90%", "91%", "89%", "over", "GOV-25"),
      m("Service-user satisfaction", "≥90%", "93%", "92%", "over", "QA-03"),
      m("Complaints resolved within 30 working days", "≥90%", "88%", "90%", "over", "QA-03"),
      m("Serious incidents — open disclosure completed", "100%", "100%", "100%", "over", "QA-13"),
      m("Staff mandatory training compliance", "≥95%", "92%", "91%", "over", "HR-14"),
      m("Garda vetting valid before commencement", "100%", "100%", "100%", "over", "HR-05"),
    ],
  },
  quality: {
    mandate:
      "You own quality governance and assurance. These are the compliance metrics the service is measured on for complaints, incidents, safeguarding and the audit programme.",
    scorecard: [
      m("Complaints acknowledged within 3 working days", "100%", "100%", "98%", "over", "QA-03"),
      m("Complaints responded within 30 working days", "≥90%", "88%", "90%", "over", "QA-03"),
      m("Incidents reported same day", "100%", "97%", "96%", "over", "QA-13"),
      m("Open disclosure completed where required", "100%", "100%", "100%", "over", "QA-13"),
      m("Safeguarding notified to HSE within 3 working days", "100%", "100%", "100%", "over", "HS-23"),
      m("Annual audit programme completed", "≥90%", "86%", "80%", "over", "QA-22"),
      m("QIP actions closed by due date", "≥85%", "82%", "78%", "over", "QA-22"),
      m("Policies reviewed on schedule", "≥90%", "88%", "85%", "over", "GOV-01"),
    ],
  },
  hr: {
    mandate:
      "You own workforce governance. These are the training, vetting and supervision targets the service must hit for a compliant, competent workforce.",
    scorecard: [
      m("Mandatory training compliance", "≥95%", "92%", "91%", "over", "HR-14"),
      m("Induction before first assignment", "100%", "97%", "96%", "over", "HR-14"),
      m("Shadowing before lone working", "100%", "95%", "94%", "over", "HR-14"),
      m("Garda vetting valid before commencement", "100%", "100%", "100%", "over", "HR-05"),
      m("Annual NCCA completed", "≥95%", "90%", "92%", "over", "HR-14"),
      m("Supervision completed on schedule", "≥90%", "93%", "90%", "over", "HR-14"),
      m("QQI L5 pathway on track", "≥90%", "88%", "86%", "over", "HR-14"),
      m("Right-to-work verified", "100%", "100%", "100%", "over", "HR-05"),
    ],
  },
  csm: {
    mandate:
      "You hold operational oversight of your care packages. These are the front-line targets for your team's visits, incidents and training.",
    scorecard: [
      m("Care plans reviewed within timeframe", "100%", "95%", "93%", "over", "CARE-27"),
      m("Unplanned missed visits", "<0.5%", "0.4%", "0.5%", "under", "QA-13"),
      m("Incidents reported same day", "100%", "96%", "95%", "over", "QA-13"),
      m("Complaints acknowledged within 3 working days", "100%", "100%", "97%", "over", "QA-03"),
      m("Safeguarding raised to DSO same day", "100%", "100%", "100%", "over", "HS-23"),
      m("Team mandatory training compliance", "≥95%", "91%", "90%", "over", "HR-14"),
      m("Supervision completed on schedule", "≥90%", "92%", "88%", "over", "HR-14"),
    ],
  },
  recruit: {
    mandate:
      "You own the recruitment pipeline. Every carer must reach their first shift with all pre-employment checks complete.",
    scorecard: [
      m("Pre-start compliance (all checks before day 1)", "100%", "100%", "98%", "over", "HR-05"),
      m("References verified (2 per hire)", "100%", "100%", "100%", "over", "SOP-056"),
      m("Right-to-work verified", "100%", "100%", "100%", "over", "SOP-057"),
      m("Offer acceptance rate", "≥70%", "74%", "69%", "over", "HR-05"),
    ],
  },
};

/** Map an app Role to its portal key (senior roles only). */
export function portalKey(role: string): string | null {
  switch (role) {
    case "Executive":
    case "Manager":
      return "exec";
    case "Director of Quality":
      return "quality";
    case "Director of HR":
      return "hr";
    case "Client Service Manager":
      return "csm";
    case "Recruitment Manager":
      return "recruit";
    default:
      return null;
  }
}

function num(s: string): number {
  return parseFloat(String(s).replace(/[^0-9.]/g, "")) || 0;
}

/** RAG rating for a metric — green on target, amber near, red off (prototype `rag`). */
export function rag(value: string, target: string, dir: "over" | "under"): "green" | "amber" | "red" {
  const v = num(value);
  const t = num(target);
  const ok = dir === "under" ? v <= t : v >= t;
  const near = dir === "under" ? v <= t * 1.5 : v >= t - 5;
  return ok ? "green" : near ? "amber" : "red";
}

/** Bar fill for a metric (0–100). */
export function ragPct(value: string, dir: "over" | "under"): number {
  const v = num(value);
  return dir === "under" ? Math.max(6, 100 - v * 8) : Math.min(100, v || 0);
}

/** Trend of current vs previous, given the direction that is "good". */
export function trend(value: string, prev: string, dir: "over" | "under"): "up" | "down" | "flat" {
  const v = num(value);
  const p = num(prev);
  if (v === p) return "flat";
  const rising = v > p;
  // For "under" metrics a fall is an improvement.
  if (dir === "under") return rising ? "down" : "up";
  return rising ? "up" : "down";
}
