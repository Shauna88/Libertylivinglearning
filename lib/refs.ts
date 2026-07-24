/**
 * "Relates to" context options for to-dos and messages — a client or a
 * carer/HCA — so a shared task/message carries who or what it's about.
 */
import type { Client } from "./crm";
import type { CarerRecord } from "./carers";

export type RefOption = { label: string; href: string };
export type RefGroup = { label: string; options: RefOption[] };

export function buildRefGroups(clients: Client[], carers: CarerRecord[]): RefGroup[] {
  const groups: RefGroup[] = [];
  if (clients.length)
    groups.push({ label: "Clients", options: clients.map((c) => ({ label: `${c.su} · ${c.area}`, href: `/clients/${c.id}` })) });
  const active = carers.filter((c) => c.status === "active");
  if (active.length)
    groups.push({ label: "Carers / HCAs", options: active.map((c) => ({ label: c.name, href: `/carers/${c.id}` })) });
  return groups;
}

/** Only allow linking to a client or carer record. */
export function validRefHref(href: string): boolean {
  return /^\/(clients|carers)\/[A-Za-z0-9_-]+$/.test(href);
}
