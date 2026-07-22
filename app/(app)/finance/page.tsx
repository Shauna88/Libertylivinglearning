import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { FINANCE_ROLES, listClients, type Role } from "@/lib/db";
import { computeFinance, money } from "@/lib/finance";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const session = await auth();
  if (!FINANCE_ROLES.includes(session!.user.role as Role)) redirect("/dashboard");

  const clients = await listClients();
  const now = new Date();
  const fin = computeFinance(clients, now.getFullYear(), now.getMonth() + 1);

  return (
    <>
      <header className="header">
        <h1>Finance overview</h1>
        <p>{fin.monthLabel} — invoicing from delivered visits, payroll from worked visits, and margin.</p>
      </header>
      <div className="body fade">
        <div className="grid cols-2">
          <div className="card metric">
            <div className="num">{money(fin.billedTotal)}</div>
            <div className="lbl">Billed to funders</div>
          </div>
          <div className="card metric">
            <div className="num">{money(fin.payrollTotal)}</div>
            <div className="lbl">HCA payroll (gross)</div>
          </div>
          <div className="card metric">
            <div className="num" style={{ color: "var(--green-fg)" }}>
              {money(fin.margin)}
            </div>
            <div className="lbl">Contribution margin</div>
          </div>
          <div className="card metric">
            <div className="num">{fin.marginPct}%</div>
            <div className="lbl">Margin %</div>
            <div className={`bar ${fin.marginPct >= 30 ? "" : "amber"}`} style={{ marginTop: 8 }}>
              <span style={{ width: `${Math.max(4, Math.min(100, fin.marginPct))}%` }} />
            </div>
          </div>
        </div>

        <div className="section-title">Billing by rate scheme (CHO area / funder)</div>
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Scheme</th>
                <th>Area</th>
                <th style={{ width: 90 }}>Clients</th>
                <th style={{ width: 110 }}>Hours</th>
                <th style={{ width: 130 }}>Billed</th>
              </tr>
            </thead>
            <tbody>
              {fin.pods.map((p) => (
                <tr key={p.code}>
                  <td>
                    <span className="flex" style={{ gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color, display: "inline-block" }} />
                      <span className="code">{p.code}</span>
                      <strong style={{ fontSize: 13 }}>{p.name}</strong>
                    </span>
                  </td>
                  <td className="muted">{p.pod}</td>
                  <td>{p.clients}</td>
                  <td className="muted">{p.hours}</td>
                  <td style={{ fontWeight: 700 }}>{p.billed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: 11.5, marginTop: 16 }}>
          Figures are computed from each client&apos;s delivered visits × their scheme rate for {fin.monthLabel} (weekday /
          Saturday / Sunday / bank-holiday). Invoice payment status is illustrative.
        </p>
      </div>
    </>
  );
}
