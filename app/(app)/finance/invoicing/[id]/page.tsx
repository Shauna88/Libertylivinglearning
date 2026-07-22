import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { FINANCE_ROLES, getClient, type Role } from "@/lib/db";
import { expandClientMonth, invoiceTo, money } from "@/lib/finance";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!FINANCE_ROLES.includes(session!.user.role as Role)) redirect("/dashboard");

  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  const now = new Date();
  const monthLabel = now.toLocaleDateString("en-IE", { month: "long", year: "numeric" });
  const inv = expandClientMonth(client, now.getFullYear(), now.getMonth() + 1);
  const to = invoiceTo(client.funding);

  return (
    <>
      <header className="header">
        <div className="flex" style={{ gap: 10, marginBottom: 6 }}>
          <Link href="/finance/invoicing" className="muted flex" style={{ gap: 4, fontSize: 12.5, fontWeight: 600 }}>
            <span className="ms" style={{ fontSize: 16 }}>
              arrow_back
            </span>
            Invoicing
          </Link>
          <span className="code">{client.id}</span>
          <span className="code">{client.area}</span>
        </div>
        <h1>Invoice — {monthLabel}</h1>
        <p>Delivered visits × {inv.scheme.name} rates.</p>
      </header>
      <div className="body fade">
        <div className="grid cols-2">
          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>
              Invoice to
            </div>
            <strong style={{ fontSize: 14 }}>{to.to}</strong>
            <p className="muted" style={{ fontSize: 12.5, margin: "4px 0 0" }}>
              {to.addr}
            </p>
          </div>
          <div className="card metric">
            <div className="num">{money(inv.totalCost)}</div>
            <div className="lbl">
              Total for {monthLabel} · {Math.round((inv.totalMins / 60) * 10) / 10}h billable
            </div>
            <span className="pill tone-blue" style={{ marginTop: 8, alignSelf: "flex-start" }}>
              {inv.scheme.code} · {inv.scheme.funder}
            </span>
          </div>
        </div>

        {inv.weeks.map((w) => (
          <div key={w.order}>
            <div className="section-title flex between">
              <span>{w.label}</span>
              <span className="muted">
                {w.subHours} · {w.subCost}
              </span>
            </div>
            <div className="card" style={{ padding: 0, overflowX: "auto" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Duration</th>
                    <th>Rate</th>
                    <th>Carer</th>
                    <th style={{ width: 110 }}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {w.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="muted" style={{ whiteSpace: "nowrap" }}>
                        {l.day} {l.date}
                      </td>
                      <td>
                        <span className="code">{l.time}</span>
                      </td>
                      <td className="muted">{l.dur}</td>
                      <td>
                        {l.rate}{" "}
                        {l.premium && <span className="pill tone-amber" style={{ marginLeft: 4 }}>{l.rateLabel}</span>}
                      </td>
                      <td className="muted">{l.carer}</td>
                      <td style={{ fontWeight: 600 }}>{l.cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
