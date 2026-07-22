import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { FINANCE_ROLES, listClients, type Role } from "@/lib/db";
import { computeFinance, money } from "@/lib/finance";

export const dynamic = "force-dynamic";

const ST_TONE: Record<string, string> = { Paid: "green", Unpaid: "amber", Overdue: "red" };

export default async function InvoicingPage() {
  const session = await auth();
  if (!FINANCE_ROLES.includes(session!.user.role as Role)) redirect("/dashboard");

  const clients = await listClients();
  const now = new Date();
  const fin = computeFinance(clients, now.getFullYear(), now.getMonth() + 1);
  const unpaid = fin.invoices.filter((i) => i.status !== "Paid").reduce((s, i) => s + i.cost, 0);

  return (
    <>
      <header className="header">
        <h1>Client invoicing</h1>
        <p>{fin.monthLabel} — one invoice per client, from delivered visits × the client&apos;s scheme rate.</p>
      </header>
      <div className="body fade">
        <div className="grid cols-3">
          <div className="card metric">
            <div className="num">{fin.invoices.length}</div>
            <div className="lbl">Invoices this month</div>
          </div>
          <div className="card metric">
            <div className="num">{money(fin.billedTotal)}</div>
            <div className="lbl">Total billed</div>
          </div>
          <div className="card metric">
            <div className="num" style={{ color: "var(--amber-fg)" }}>
              {money(unpaid)}
            </div>
            <div className="lbl">Outstanding</div>
          </div>
        </div>

        <div className="section-title">Invoices</div>
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Scheme</th>
                <th style={{ width: 100 }}>Hours</th>
                <th style={{ width: 120 }}>Amount</th>
                <th style={{ width: 100 }}>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {fin.invoices.map((inv) => (
                <tr key={inv.clientId}>
                  <td>
                    <span className="code">INV-{inv.no}</span>
                  </td>
                  <td>
                    <span className="code">{inv.clientId}</span> <span className="muted">· {inv.area}</span>
                  </td>
                  <td>
                    <span className="flex" style={{ gap: 6 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: inv.schemeColor, display: "inline-block" }} />
                      <span className="muted" style={{ fontSize: 12 }}>
                        {inv.schemeCode} {inv.funder}
                      </span>
                    </span>
                  </td>
                  <td className="muted">{inv.hours}</td>
                  <td style={{ fontWeight: 700 }}>{inv.costLabel}</td>
                  <td>
                    <span className={`pill tone-${ST_TONE[inv.status] ?? "grey"}`}>{inv.status}</span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link href={`/finance/invoicing/${inv.clientId}`} className="btn" style={{ padding: "5px 11px", fontSize: 12.5 }}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
