import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { CRM_ROLES, getClient, type Role } from "@/lib/db";
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
        <ClientProfile client={masked} />
      </div>
    </>
  );
}
