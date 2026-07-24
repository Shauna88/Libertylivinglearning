/**
 * Audits & QIP reference content (QA-22 · QA-22.1), transcribed from the
 * prototype: the audit lifecycle, ISO-19011-aligned principles, and the six
 * scheduled quality audits with their section checklists and trigger criteria.
 * The QIP / CAPA actions themselves are live DB records (see lib/db.ts).
 */
export type AuditStage = { n: string; label: string; icon: string; desc: string };
export type Principle = { k: string; d: string };
export type AuditSection = { title: string; items: string[] };
export type AuditDef = {
  id: string;
  name: string;
  icon: string;
  freq: string;
  owner: string;
  score: string;
  tone: string;
  policy: string;
  purpose: string;
  sampling: string;
  sections: AuditSection[];
  triggers: string[];
};

export const AUDIT_LIFECYCLE: AuditStage[] = [
  { n: "1", label: "Plan & schedule", icon: "event", desc: "Annual quality audit schedule approved by Director of Quality & Director of Operations" },
  { n: "2", label: "Define scope & requirements", icon: "rule", desc: "Regulatory + P&P requirements and forms to be audited identified" },
  { n: "3", label: "Select sample", icon: "shuffle", desc: "Random sampling reflecting high & low support levels (HSE 2025b)" },
  { n: "4", label: "Conduct audit", icon: "fact_check", desc: "Evidence-based assessment against each requirement" },
  { n: "5", label: "Quality audit report", icon: "description", desc: "Findings, evidence & good practice — all details anonymised" },
  { n: "6", label: "Raise QIPs", icon: "flag", desc: "Corrective actions with named owners & timelines (per QA-22)" },
  { n: "7", label: "Close out / re-audit", icon: "task_alt", desc: "Closed when QIPs addressed; high-risk areas re-audited & risk-registered" },
  { n: "8", label: "Communicate learning", icon: "campaign", desc: "Shared via EMT, Clinical Governance & Board Quality & Risk Committees" },
];

export const AUDIT_PRINCIPLES: Principle[] = [
  { k: "Integrity", d: "Ethical, honest & responsible; only audit where competent" },
  { k: "Fair presentation", d: "Report truthfully & accurately; raise unresolved issues" },
  { k: "Due professional care", d: "Diligence & reasoned judgement in all situations" },
  { k: "Confidentiality", d: "Discretion & security of all audit information" },
  { k: "Independence", d: "Impartial; auditor independent of the activity audited" },
  { k: "Evidence-based", d: "Verifiable, documented & appropriately sampled evidence" },
  { k: "Risk-based", d: "Risk & impact substantively shape planning & reporting" },
];

export const AUDITS: AuditDef[] = [
  {
    id: "incident", name: "Incident & Safeguarding Governance Audit", icon: "crisis_alert", freq: "Quarterly", owner: "Director of Quality", score: "88%", tone: "amber", policy: "QA-13 · QA-SOP-INC-01",
    purpose: "Assure that every incident is identified, classified, escalated, investigated and learned from in line with QA-13 and the HSE ERM 2023 risk methodology.",
    sampling: "Random sample plus all Category 1 incidents, all high-risk incidents and any trend-based selection. Sample reflects high & low support levels.",
    sections: [
      { title: "1 · Incident identification & classification", items: ["Incident recorded within 24 hours", "Correct category (1–4) assigned", "Risk score applied correctly using the approved matrix", "Category 4 (near miss) recorded and trended", "Reclassification documented where required"] },
      { title: "2 · Proportional escalation & external reporting", items: ["Category 4 reviewed at quarterly governance", "Category 3 closed within 28 days", "Category 2 escalated to Director of Quality where required", "Category 1 escalated to SAO within 24 hours where required", "SIMT convened within required timeframe where required", "External reporting completed within required timeframe", "Evidence of external submission retained"] },
      { title: "3 · Safeguarding, clinical & support controls", items: ["DSO referral made where safeguarding triggered", "Clinical Lead review documented where required", "Open disclosure initiated appropriately where required", "Service User Designated Liaison Person engaged where required", "Staff Support Person engaged where required"] },
      { title: "4 · Investigation quality", items: ["Investigation completed within required timeframe (28/125 days)", "Root cause analysis systems-focused (not blame-focused)", "Contributory factors documented", "Evidence and documentation referenced", "Review team independence maintained where required", "SAO approval documented for Category 1 review"] },
      { title: "5 · Corrective action & system improvement", items: ["Corrective actions SMART and measurable", "Named owner assigned for corrective actions", "Corrective actions closed on time", "Effectiveness review completed post-implementation", "Risk Register updated where required", "QIP raised where systemic issue identified", "Repeat Category 2/3 patterns detected and managed"] },
      { title: "6 · Trend, governance oversight & learning", items: ["Incident included in quarterly trend report", "Category 4 trends reviewed at governance", "Incident KPIs included in governance dashboard", "Learning shared with relevant teams", "Policy / procedure updated where required"] },
      { title: "7 · Culture & reporting environment", items: ["Evidence of non-punitive reporting culture maintained", "Near-miss reporting volume monitored", "Staff training updated following incidents where required"] },
    ],
    triggers: ["Any Category 1 incident in the quarter", "≥3 Category 2 incidents (repeat pattern)", "≥5 Category 3 incidents (repeat pattern)", "Near-miss rate below 10% of total incidents", "≥2 overdue corrective actions", "Any Category 1 not reported externally within 24h"],
  },
  {
    id: "medication", name: "Medication Management Audit", icon: "medication", freq: "Quarterly", owner: "Clinical Lead", score: "91%", tone: "green", policy: "CARE-20",
    purpose: "Confirm medication support is authorised, accurately recorded, safely handled and delivered by competent staff, with all errors reported and learned from.",
    sampling: "Minimum 10 medication prompting / administration records per cycle across all lots, reflecting high & low support levels.",
    sections: [
      { title: "1 · Authorisation & consent", items: ["Level of medication support documented in the care plan", "Consent for medication support recorded", "GP and pharmacy details current and on file", "Allergies and sensitivities recorded"] },
      { title: "2 · Recording & MAR", items: ["Prompting / administration records complete and signed", "No unexplained gaps in the record", "PRN protocols documented where applicable", "Record matches the agreed care-plan support level"] },
      { title: "3 · Storage & handling", items: ["Medication stored safely in the home", "Controlled drugs handled per policy where applicable", "Disposal / return documented where required"] },
      { title: "4 · Errors & incidents", items: ["Medication errors reported via QA-13", "Near-misses logged and trended", "Corrective actions raised and closed"] },
      { title: "5 · Staff competency", items: ["Medication training current for all relevant staff", "Competency assessed and signed off (NCCA)", "Supervision evidence on file"] },
    ],
    triggers: ["Any medication error reaching the Service User", "Record compliance below 100%", "Any expired staff medication competency", "Repeat error pattern across a lot"],
  },
  {
    id: "clinical", name: "Clinical & Service Assurance Audit", icon: "clinical_notes", freq: "Quarterly", owner: "Clinical Lead", score: "94%", tone: "green", policy: "CARE-08 · CARE-02",
    purpose: "Assure that care is assessed, planned, reviewed and delivered in a person-centred way that reflects each Service User's needs, choices and preferences.",
    sampling: "Random Service User record sample reflecting high & low levels of support.",
    sections: [
      { title: "1 · Assessment", items: ["Comprehensive needs assessment completed before service commenced", "Clearly defined risk assessments in place", "Assessments reviewed in line with schedule or change of need"] },
      { title: "2 · Care plan", items: ["Care plan is person-centred and developed with the Service User / family", "Reflects the Service User's needs, choices and preferences", "Held in the home or electronically and accessible to all staff", "Signed and dated by the Service User / representative"] },
      { title: "3 · Reviews", items: ["Care plan reviewed at defined intervals or on change of need", "Updates documented and communicated", "Service User involvement in review evidenced"] },
      { title: "4 · Service delivery", items: ["Visits delivered in line with the care plan", "Minimum 30-minute call honoured where applicable", "Change of carer / time communicated in advance (HS-04)", "Continuity of care maintained"] },
      { title: "5 · Records", items: ["Daily care notes complete and contemporaneous", "Records anonymised within audit reports", "Records retained in line with IM-30"] },
    ],
    triggers: ["Care plan not in place or not reviewed on time", "Risk assessment missing for a sampled record", "Repeated missed or shortened visits", "Service User not involved in care planning"],
  },
  {
    id: "complaints", name: "Complaints Handling Audit", icon: "forum", freq: "Quarterly", owner: "Director of Quality", score: "96%", tone: "green", policy: "QA-03 · QA-03.2",
    purpose: "Assure complaints are logged, acknowledged, investigated, resolved and learned from within scheme timeframes, with serious matters escalated appropriately.",
    sampling: "All complaints on the Master Complaints Log for the period, with focused review of any Level 3/4 or safeguarding-linked complaints.",
    sections: [
      { title: "1 · Acknowledgement & logging", items: ["Complaint logged on the Master Complaints Log", "Acknowledged within 5 working days", "Severity level assigned correctly", "Service User informed of the process"] },
      { title: "2 · Investigation & resolution", items: ["Resolved within 30 working days", "Service User kept informed throughout", "Internal review completed within 20 days where requested", "Outcome communicated to the complainant"] },
      { title: "3 · Escalation", items: ["Safeguarding-linked complaints escalated to the DSO", "Serious complaints reported to the HSE immediately", "Incident triggered via QA-13 where required", "Open disclosure completed where harm occurred"] },
      { title: "4 · Learning", items: ["Trend analysis completed for the period", "QIPs raised where themes recur", "Learning shared across the service"] },
    ],
    triggers: ["30-day resolution rate below 75%", "A theme recurring 3+ times", "Any Level 4 (actual harm) complaint", "Safeguarding complaints rising >25% quarter-on-quarter"],
  },
  {
    id: "workforce", name: "Workforce Compliance Audit", icon: "badge", freq: "Quarterly", owner: "Director of HR", score: "86%", tone: "amber", policy: "HR-14 · HR-29",
    purpose: "Confirm staff are safely recruited, vetted, inducted, trained, supervised and allocated in line with the Authorisation Scheme workforce specifications.",
    sampling: "Random staff-file sample across all lots, including recent starters and staff with upcoming refresher dates.",
    sections: [
      { title: "1 · Recruitment & vetting", items: ["Garda vetting cleared before commencement", "Two written references verified", "Right to work and identity verified", "Medical fitness confirmed on file"] },
      { title: "2 · Induction & training", items: ["Induction (20h incl. 5h practical) completed before first assignment", "Shadowing (8h) completed before lone working", "All mandatory training current", "Service-specific training completed for the role"] },
      { title: "3 · Supervision & competency", items: ["Supervision completed in line with schedule", "Annual NCCA competency assessment completed", "QQI Level 5 qualification or pathway tracked", "Professional boundaries acknowledged (HR-38)"] },
      { title: "4 · Allocation", items: ["Carers matched to Service User needs", "Continuity of carer maintained where possible", "Lone-worker arrangements in place (HS-16)"] },
    ],
    triggers: ["Any worker assigned before vetting cleared", "Mandatory training compliance below 90%", "Any expired competency in the sample", "Induction not completed before first assignment"],
  },
  {
    id: "environmental", name: "Environmental Risk Audit", icon: "home_health", freq: "Annual", owner: "Clinical Lead / Safety Officer", score: "92%", tone: "green", policy: "HS-24 · HS-10 · HS-16",
    purpose: "Assure that Service Users' home environments, lone-working arrangements, infection prevention and equipment are assessed and safely managed.",
    sampling: "Annual review across a representative sample of Service User homes and all active lone-working arrangements.",
    sections: [
      { title: "1 · Home environment", items: ["Environmental risk assessment completed for each sampled home", "Hazards identified and control measures in place", "Access and entry protocols documented", "Re-assessment triggered on change of circumstance"] },
      { title: "2 · Lone worker", items: ["Lone-worker risk assessments completed", "Check-in / escalation protocols in place and followed", "HS-16 Lone Worker Policy current and signed"] },
      { title: "3 · Infection prevention & control", items: ["IPC measures in place in the home (HS-15)", "PPE available and used appropriately", "Hand-hygiene standards met (HS-34)"] },
      { title: "4 · Equipment", items: ["Moving & handling equipment serviced and safe", "Staff trained in safe use (HS-18)", "Defects reported and actioned"] },
    ],
    triggers: ["Uncontrolled hazard identified in a home", "Lone-worker check-in protocol not followed", "PPE unavailable at point of care", "Unserviced moving & handling equipment in use"],
  },
];

/** QIP / CAPA statuses. */
export const QIP_STATUS: Record<string, { label: string; tone: string }> = {
  Open: { label: "Open", tone: "blue" },
  "In progress": { label: "In progress", tone: "amber" },
  Complete: { label: "Complete", tone: "green" },
  Overdue: { label: "Overdue", tone: "red" },
};
