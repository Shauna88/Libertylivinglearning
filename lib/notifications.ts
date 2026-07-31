/**
 * Notifications — outbound SMS / email to carers and clients (roster published,
 * visit reminders, shift offers) plus internal alerts, built from templates.
 *
 * This module is the in-app framework: templates, channels and the message the
 * recipient would receive. Actually *delivering* SMS / email needs a gateway
 * (e.g. Twilio / SendGrid) the developer connects — until then a "send" is
 * logged and queued, never silently dropped.
 */

export type Channel = "sms" | "email" | "in_app";

export const CHANNEL_LABEL: Record<Channel, string> = {
  sms: "SMS",
  email: "Email",
  in_app: "In-app",
};

export type Audience = "carer" | "client" | "staff";

export type NotificationTemplate = {
  key: string;
  label: string;
  audience: Audience;
  channels: Channel[];
  subject: string;
  body: string; // supports {name} {carer} {client} {date} {time} {area} {dur} {period} placeholders
  fields: string[]; // placeholder names the composer should offer
};

export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    key: "roster_published",
    label: "Roster published",
    audience: "carer",
    channels: ["sms", "email"],
    subject: "Your roster for {period}",
    body: "Hi {name}, your Liberty Living schedule for {period} is now published. Please open the app to review your calls and confirm your availability.",
    fields: ["name", "period"],
  },
  {
    key: "visit_reminder",
    label: "Visit reminder (client / family)",
    audience: "client",
    channels: ["sms"],
    subject: "Your care visit",
    body: "Hello {name}, a reminder that your carer {carer} is due to visit at {time} on {date}. Please call the office if anything needs to change.",
    fields: ["name", "carer", "time", "date"],
  },
  {
    key: "shift_offer",
    label: "Shift offer",
    audience: "carer",
    channels: ["sms"],
    subject: "Shift available",
    body: "Hi {name}, a call is available on {date} at {time} in {area} ({dur}). Reply YES to accept or NO to decline.",
    fields: ["name", "date", "time", "area", "dur"],
  },
  {
    key: "welfare_check",
    label: "Welfare / no-show follow-up (family)",
    audience: "client",
    channels: ["sms"],
    subject: "About today's visit",
    body: "Hello {name}, we're arranging cover for today's call and it may run a little late. We'll keep you updated — thank you for your patience.",
    fields: ["name"],
  },
  {
    key: "review_due",
    label: "Care-plan review due (internal)",
    audience: "staff",
    channels: ["email", "in_app"],
    subject: "Care-plan review due",
    body: "A care-plan review is due for {client}. Please schedule and complete it, then record the next review date.",
    fields: ["client"],
  },
  {
    key: "custom",
    label: "Custom message",
    audience: "carer",
    channels: ["sms", "email", "in_app"],
    subject: "",
    body: "",
    fields: ["name"],
  },
];

export const TEMPLATE_BY_KEY = Object.fromEntries(NOTIFICATION_TEMPLATES.map((t) => [t.key, t])) as Record<string, NotificationTemplate>;

/** Fill {placeholders} in a template string from a context map. */
export function renderTemplate(text: string, ctx: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_m, k: string) => (ctx[k]?.trim() ? ctx[k] : `{${k}}`));
}

export function statusMeta(status: string): { label: string; tone: string } {
  if (status === "sent") return { label: "Sent", tone: "green" };
  if (status === "failed") return { label: "Failed", tone: "red" };
  return { label: "Queued", tone: "amber" }; // pending the SMS/email gateway
}
