import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { CRM_ROLES, OVERSIGHT_ROLES, getClient, listCareNotes, listClientDocs, listClients, listPermReqs, coverMap, coverReasons, type Role } from "@/lib/db";
import { carerPool } from "@/lib/schedule";
import { CARER_DIRECTORY, suggestCarers } from "@/lib/carers";
import {
  maskName,
  maskAddr,
  maskEircode,
  maskPhone,
  maskDob,
  statusMeta,
  type Client,
} from "@/lib/crm";
import ClientProfile from "@/components/ClientProfile";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!CRM_ROLES.includes(session!.user.role as Role)) redirect("/dashboard");

  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  const [notes, docs, allClients, pendingAll, cover, reasons] = await Promise.all([
    listCareNotes(id),
    listClientDocs(id),
    listClients(),
    listPermReqs("pending"),
    coverMap(),
    coverReasons(),
  ]);
  const carers = carerPool(allClients);
  // Rank the carer directory for this client's area + conditions (best fit first).
  const suggestions = suggestCarers(CARER_DIRECTORY, { area: client.area, conditions: client.conditions }, { limit: 5 });
  const isApprover = OVERSIGHT_ROLES.includes(session!.user.role as Role);
  const pending = pendingAll
    .filter((p) => p.client_id === id)
    .map((p) => ({ id: p.id, day: p.day, time: p.time, carer: p.carer, note: p.note, requestedBy: p.requested_by }));
  // This client's cover overrides + unassign reasons, keyed day|time.
  const prefix = `${id}|`;
  const clientCover: Record<string, string> = {};
  const clientReasons: Record<string, string> = {};
  for (const [k, v] of Object.entries(cover)) if (k.startsWith(prefix)) clientCover[k.slice(prefix.length)] = v;
  for (const [k, v] of Object.entries(reasons)) if (k.startsWith(prefix)) clientReasons[k.slice(prefix.length)] = v;

  // Mask every identifiable field before it reaches the browser; the PII gate
  // reveals the real values through /api/pii/reveal (which logs the access).
  const masked: Client = {
    ...client,
    name: maskName(client.name),
    addr: maskAddr(),
    eircode: maskEircode(client.eircode),
    phone: maskPhone(client.phone),
    mobile: client.mobile ? maskPhone(client.mobile) : client.mobile,
    dob: maskDob(),
    nok: client.nok.map((n) => ({ ...n, name: maskName(n.name), phone: n.phone ? maskPhone(n.phone) : n.phone })),
  };

  const meta = statusMeta(client.status);

  return (
    <>
      <header className="header">
        <div className="flex" style={{ gap: 10, marginBottom: 6 }}>
          <Link href="/clients" className="muted flex" style={{ gap: 4, fontSize: 12.5, fontWeight: 600 }}>
            <span className="ms" style={{ fontSize: 16 }}>
              arrow_back
            </span>
            Client register
          </Link>
          <span className="code">{client.id}</span>
          <span className="code">{client.su}</span>
          <span className={`pill tone-${meta.tone}`}>{meta.label}</span>
        </div>
        <h1>Client record</h1>
        <p>
          {client.area} · identifiable details are masked until revealed with a logged reason.
        </p>
      </header>
      <div className="body">
        <ClientProfile client={masked} notes={notes} docs={docs} carers={carers} pending={pending} cover={clientCover} reasons={clientReasons} isApprover={isApprover} suggestions={suggestions} editable />
      </div>
    </>
  );
}
