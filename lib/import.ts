/**
 * Bulk CSV import for client (service-user) records: field definitions, a small
 * CSV parser, column auto-mapping (by header aliases), and a builder that turns a
 * mapped row into a full Client with safe defaults. Mirrors the prototype's
 * importer. Pure/serialisable — safe on both server and client.
 */
import type { Client } from "./crm";

export type ImportField = {
  key: string;
  label: string;
  req: boolean;
  pii?: boolean;
  hint?: string;
  aliases: string[];
};

export const CLIENT_IMPORT_FIELDS: ImportField[] = [
  { key: "su", label: "Service User ID", req: false, hint: "e.g. SU-3182 — generated if blank", aliases: ["su", "serviceuserid", "suid", "userid", "clientid", "id"] },
  { key: "surname", label: "Surname", req: true, pii: true, aliases: ["surname", "lastname", "familyname"] },
  { key: "firstName", label: "First name", req: true, pii: true, aliases: ["firstname", "forename", "givenname"] },
  { key: "area", label: "Area / pod", req: true, hint: "e.g. Dublin North", aliases: ["area", "pod", "region", "lot", "cho"] },
  { key: "eircode", label: "Eircode", req: false, pii: true, aliases: ["eircode", "postcode", "eir"] },
  { key: "funding", label: "Funding stream", req: false, hint: "HSE HSAS / Fair Deal / Private", aliases: ["funding", "fundingstream", "scheme", "fund"] },
  { key: "hoursWk", label: "Weekly hours", req: false, aliases: ["hoursweek", "weeklyhours", "hoursperweek", "hours"] },
  { key: "startDate", label: "Start date", req: false, aliases: ["startdate", "commenced", "start", "datestart"] },
  { key: "coordinator", label: "Coordinator / CSM", req: false, aliases: ["coordinator", "csm", "keyworker", "manager"] },
  { key: "phone", label: "Phone", req: false, pii: true, aliases: ["phone", "telephone", "landline", "tel"] },
];

/** RFC-ish CSV parser handling quoted fields and escaped quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const nx = text[i + 1];
    if (q) {
      if (ch === '"' && nx === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        q = false;
      } else cell += ch;
    } else {
      if (ch === '"') q = true;
      else if (ch === ",") {
        row.push(cell);
        cell = "";
      } else if (ch === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else if (ch === "\r") {
        /* skip */
      } else cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}

const norm = (s: string) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Map header columns to field keys by alias. Returns fieldKey → column index. */
export function autoMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const f of CLIENT_IMPORT_FIELDS) {
    headers.forEach((h, i) => {
      const nh = norm(h);
      if (map[f.key] == null && f.aliases.some((a) => nh === a || nh.indexOf(a) >= 0)) map[f.key] = i;
    });
  }
  return map;
}

export type MappedRow = Record<string, string>;

/** Extract mapped rows (fieldKey → value) from parsed CSV using a column map. */
export function extractRows(rows: string[][], map: Record<string, number>): MappedRow[] {
  const [, ...body] = rows;
  return body.map((r) => {
    const out: MappedRow = {};
    for (const f of CLIENT_IMPORT_FIELDS) {
      const idx = map[f.key];
      out[f.key] = idx != null ? String(r[idx] ?? "").trim() : "";
    }
    return out;
  });
}

/** Validation errors for a mapped row (empty array = valid). */
export function rowErrors(row: MappedRow): string[] {
  const errs: string[] = [];
  for (const f of CLIENT_IMPORT_FIELDS) {
    if (f.req && !row[f.key]) errs.push(f.label);
  }
  return errs;
}

/** Turn a validated mapped row into a full Client (id assigned by the caller). */
export function buildClient(id: string, su: string, row: MappedRow): Client {
  const name = `${row.firstName} ${row.surname}`.trim();
  return {
    id,
    su,
    name,
    pref: row.firstName || name,
    dob: "",
    sex: "",
    addr: "",
    eircode: row.eircode || "",
    phone: row.phone || "",
    mobile: "",
    area: row.area || "",
    status: "new",
    funding: row.funding || "—",
    pkg: "Home support (to assess)",
    hoursWk: row.hoursWk || "—",
    startDate: row.startDate || "",
    gp: { name: "", practice: "", phone: "" },
    nok: [],
    keysafe: "",
    access: "",
    homeRisk: [],
    conditions: [],
    mobility: "",
    allergies: "None recorded",
    carer: "",
    carers: [],
    csm: row.coordinator || "",
    lastVisit: "—",
    reviewDue: "Assessment due",
    reviewTone: "amber",
    reviewNote: "New referral — imported; care plan and schedule to be completed.",
    flags: ["New referral"],
    notes: [],
    schedule: [],
    carePlan: [],
    requirements: [],
  };
}

/** A downloadable CSV template with headers + one example row. */
export const CLIENT_TEMPLATE =
  "Service User ID,Surname,First Name,Area,Eircode,Funding,Weekly Hours,Start Date,Coordinator,Phone\n" +
  "SU-5501,Mooney,Bridget,Dublin North,D05 K210,HSE HSAS,14h 00m,06/01/2026,Mary James,01 848 2214";
