/**
 * Data-retention schedule (reference). Records how long each class of record is
 * kept and the basis for it. Periods reflect common Irish homecare / HIQA & HSE
 * norms and GDPR storage-limitation (Art. 5(1)(e)); confirm against the DPO's
 * signed retention policy before relying on them operationally.
 */
export type RetentionRule = {
  record: string;
  category: "Client" | "Staff" | "Quality" | "Finance" | "Access";
  period: string;
  basis: string;
  special?: boolean; // special-category (health) data
};

export const RETENTION_SCHEDULE: RetentionRule[] = [
  {
    record: "Client care records & care plans",
    category: "Client",
    period: "8 years after care ends",
    basis: "HSE / HIQA healthcare-record retention; special-category health data",
    special: true,
  },
  {
    record: "Client care notes & visit logs",
    category: "Client",
    period: "8 years after care ends",
    basis: "Continuity of care; HIQA record-keeping standards",
    special: true,
  },
  {
    record: "Complaints, incidents & safeguarding records",
    category: "Quality",
    period: "10 years from closure",
    basis: "HIQA / statutory safeguarding; potential litigation",
    special: true,
  },
  {
    record: "Staff files & Garda/NVB vetting",
    category: "Staff",
    period: "7 years after employment ends",
    basis: "Employment law; National Vetting Bureau Acts",
  },
  {
    record: "Training completions & certificates",
    category: "Staff",
    period: "Duration of employment + 7 years",
    basis: "Competency evidence for HIQA inspection",
  },
  {
    record: "Invoices, pay runs & financial records",
    category: "Finance",
    period: "6 years",
    basis: "Revenue / Companies Act accounting-record requirements",
  },
  {
    record: "PII access log & audit trail",
    category: "Access",
    period: "2 years",
    basis: "GDPR accountability (Art. 5(2)); security monitoring",
  },
  {
    record: "Recruitment records (unsuccessful candidates)",
    category: "Staff",
    period: "12 months after decision",
    basis: "Equality/tribunal window; consent for talent pool otherwise",
  },
];

/** How each app role maps to the classes of data it can reach — the access register. */
export const ROLE_DATA_ACCESS: Record<string, string[]> = {
  Manager: ["All client data", "Staff", "Quality", "Finance", "Access logs"],
  "Client Service Manager": ["All client data", "Staff", "Quality", "Finance", "Access logs"],
  "Care Coordinator": ["Client care & scheduling (masked identity by default)"],
  "Healthcare Assistant": ["Own training & tasks; can raise issues"],
  "Office Administrator": ["Training records; general admin"],
  "On-Call Manager": ["Out-of-hours client contact & escalation"],
  "Client / Family": ["Own linked client record only (read-only)"],
};
