/**
 * AI care-plan reader — turn a free-text care plan into structured intake data
 * (profile, clinical detail, care tasks, and a Schedule of Service) using Claude
 * with structured outputs, so the result is schema-validated JSON we can map
 * straight onto the client record.
 *
 * GDPR note: a care plan is special-category (health) data. This module sends
 * the pasted text to Anthropic's API for extraction and returns the structured
 * result to the caller — it does NOT persist the raw text. The calling route is
 * responsible for authorisation and for logging that an extraction happened
 * (who, when) to the audit trail, without storing the plan itself.
 */
import Anthropic from "@anthropic-ai/sdk";

export type CpVisit = { time: string; dur: string; type: string; tasks: string[] };
export type CpDay = { day: string; visits: CpVisit[] };
export type CpCareEntry = { domain: string; need: string; goals: string[]; tasks: string[] };

export type CarePlanExtract = {
  profile: {
    firstName: string;
    surname: string;
    pref: string;
    dob: string; // ISO date or ""
    sex: string;
    phone: string;
    mobile: string;
    eircode: string;
    addr: string;
    area: string;
  };
  clinical: { conditions: string[]; mobility: string; allergies: string };
  gp: { name: string; practice: string; phone: string };
  nok: { name: string; rel: string; phone: string }[];
  access: { keysafe: string; access: string; homeRisk: string[] };
  carePlan: CpCareEntry[];
  schedule: CpDay[];
  summary: string;
};

/** Is the reader switched on (an API key configured)? */
export function carePlanConfigured(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

/** Thrown when the reader is called without a configured API key. */
export class CarePlanNotConfiguredError extends Error {
  constructor() {
    super("The AI care-plan reader is not configured (no ANTHROPIC_API_KEY set).");
    this.name = "CarePlanNotConfiguredError";
  }
}

// JSON Schema for structured outputs. Every property is required and objects set
// additionalProperties:false, as structured outputs requires; the model fills
// empty strings / arrays where the plan doesn't mention something.
const strArr = { type: "array", items: { type: "string" } } as const;
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    profile: {
      type: "object",
      additionalProperties: false,
      properties: {
        firstName: { type: "string" },
        surname: { type: "string" },
        pref: { type: "string", description: "Preferred name / what they like to be called" },
        dob: { type: "string", description: "Date of birth as YYYY-MM-DD, or empty string if unknown" },
        sex: { type: "string" },
        phone: { type: "string" },
        mobile: { type: "string" },
        eircode: { type: "string" },
        addr: { type: "string", description: "Full address" },
        area: { type: "string", description: "Area / pod / catchment (e.g. a town or district)" },
      },
      required: ["firstName", "surname", "pref", "dob", "sex", "phone", "mobile", "eircode", "addr", "area"],
    },
    clinical: {
      type: "object",
      additionalProperties: false,
      properties: {
        conditions: { ...strArr, description: "Diagnosed conditions" },
        mobility: { type: "string" },
        allergies: { type: "string" },
      },
      required: ["conditions", "mobility", "allergies"],
    },
    gp: {
      type: "object",
      additionalProperties: false,
      properties: { name: { type: "string" }, practice: { type: "string" }, phone: { type: "string" } },
      required: ["name", "practice", "phone"],
    },
    nok: {
      type: "array",
      description: "Next of kin / emergency contacts",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { name: { type: "string" }, rel: { type: "string" }, phone: { type: "string" } },
        required: ["name", "rel", "phone"],
      },
    },
    access: {
      type: "object",
      additionalProperties: false,
      properties: {
        keysafe: { type: "string" },
        access: { type: "string", description: "How carers get in" },
        homeRisk: { ...strArr, description: "Home / environmental risks" },
      },
      required: ["keysafe", "access", "homeRisk"],
    },
    carePlan: {
      type: "array",
      description: "Care tasks grouped by domain (personal care, medication, nutrition, mobility, etc.)",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          domain: { type: "string" },
          need: { type: "string", description: "The identified need in this domain" },
          goals: strArr,
          tasks: { ...strArr, description: "Concrete tasks the carer performs" },
        },
        required: ["domain", "need", "goals", "tasks"],
      },
    },
    schedule: {
      type: "array",
      description: "Schedule of Service: the weekly pattern of visits. Only include days that have visits.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          day: { type: "string", description: "Weekday name, e.g. Monday" },
          visits: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                time: { type: "string", description: "24h HH:MM" },
                dur: { type: "string", description: "Duration, e.g. 45m or 1h" },
                type: { type: "string", description: "Visit type, e.g. Personal care, Medication, Welfare" },
                tasks: strArr,
              },
              required: ["time", "dur", "type", "tasks"],
            },
          },
        },
        required: ["day", "visits"],
      },
    },
    summary: { type: "string", description: "One or two sentences summarising the person and their support needs." },
  },
  required: ["profile", "clinical", "gp", "nok", "access", "carePlan", "schedule", "summary"],
} as const;

const SYSTEM = `You are a careful clinical intake assistant for an Irish home-care provider (Liberty Home Care).
You read one of the service's care-delivery forms for a service user and extract structured information for the CRM.
The document may be any of these forms (or a scan/transcript of one):
- Referral Record (SOP-001) — referral source, HSE reference, service-user details, presenting needs
- Comprehensive Needs Assessment (SOP-002) — needs, goals, preferences the care plan is built from
- Home Support Care Plan (Appendix 6) — the care plan itself: domains, goals, tasks, and visit pattern
- Environmental / Home Risk Assessment (HS-04) — access, home and environmental risks
- Manual Handling Risk Assessment (HS-11) — mobility, moving-and-handling needs and equipment
- Care Agreement (GOV-12) — package, hours and schedule of service
Extract from whichever form you are given; a single document usually won't contain every field.
Rules:
- Only extract what is actually stated. Never invent names, dates, phone numbers, conditions, or visits.
- If something isn't in the document, return an empty string or empty array for it — do not guess.
- Dates of birth as YYYY-MM-DD. Visit times as 24-hour HH:MM. Durations like "45m" or "1h".
- For the Schedule of Service, only include weekdays that have visits, in Monday-first order.
- Use Irish/UK spelling and terminology. Do not assign carers — leave staffing to the coordinator.`;

/**
 * Extract structured intake data from a care-plan document. Throws
 * CarePlanNotConfiguredError when no API key is set.
 */
export async function extractCarePlan(text: string): Promise<CarePlanExtract> {
  if (!carePlanConfigured()) throw new CarePlanNotConfiguredError();
  const client = new Anthropic(); // resolves ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN from env

  // Cast params: the installed SDK typings may lag output_config.format / effort.
  const res = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 8000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Extract the structured intake data from this care plan. Return only the fields you can find.\n\n<care_plan>\n${text}\n</care_plan>`,
      },
    ],
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
  } as unknown as Anthropic.MessageCreateParamsNonStreaming);

  const out = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!out) throw new Error("The reader returned no content.");
  return JSON.parse(out) as CarePlanExtract;
}
