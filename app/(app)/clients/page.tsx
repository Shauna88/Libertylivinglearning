import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CRM_ROLES, listClients, coverMap, recentCareNoteCounts, type Role } from "@/lib/db";
import { maskName, statusMeta } from "@/lib/crm";
import { clientWeekSummary } from "@/lib/schedule";
import ClientRegister, { type RegisterRow } from "@/components/ClientRegister";

function hm(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default async function ClientsPage() {
  const session = await auth();
  if (!CRM_ROLES.includes(session!.user.role as Role)) redirect("/dashboard");

  const [clients, cover, noteCounts] = await Promise.all([listClients(), coverMap(), recentCareNoteCounts(48)]);

  // Build masked register rows — no real names/identifiers reach the browser
  // until the PII gate reveals them.
  const rows: RegisterRow[] = clients.map((c) => {
    const meta = statusMeta(c.status);
    const paused = c.status === "hospital" || c.status === "hold";
    const wk = clientWeekSummary(c, cover, paused);
    const hasPlan = wk.plannedMin > 0;
    return {
      id: c.id,
      su: c.su,
      area: c.area,
      status: c.status,
      statusLabel: meta.label,
      statusTone: meta.tone,
      maskedName: maskName(c.name),
      coordinator: c.csm,
      hoursWk: c.hoursWk,
      funding: c.funding,
      flags: c.flags,
      reviewTone: c.reviewTone,
      plannedHours: hasPlan ? hm(wk.plannedMin) : null,
      deliveredHours: hasPlan ? hm(wk.deliveredMin) : null,
      deliveredShort: hasPlan && wk.deliveredMin < wk.plannedMin,
      unassigned: wk.unassigned,
      newNotes: noteCounts[c.id] ?? 0,
    };
  });

  const statusOrder = ["new", "active", "review", "hospital", "hold", "discharged", "deceased"];
  const statuses = statusOrder
    .filter((k) => clients.some((c) => c.status === k))
    .map((k) => ({ key: k, label: statusMeta(k).label, count: clients.filter((c) => c.status === k).length }));

  return (
    <>
      <header className="header">
        <h1>Client register</h1>
        <p>
          {clients.length} service users. Identifiable details are masked and revealed only with a
          logged reason (GDPR — special-category data).
        </p>
      </header>
      <div className="body fade">
        <div className="flex" style={{ gap: 10, marginBottom: 14 }}>
          <Link href="/clients/new" className="btn btn-primary">
            <span className="ms" style={{ fontSize: 18 }}>person_add</span>
            New referral
          </Link>
          <Link href="/clients/import" className="btn">
            <span className="ms" style={{ fontSize: 18 }}>upload_file</span>
            Bulk import
          </Link>
        </div>
        <ClientRegister rows={rows} statuses={statuses} />
      </div>
    </>
  );
}
