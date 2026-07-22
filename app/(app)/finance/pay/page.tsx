import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { FINANCE_ROLES, listClients, type Role } from "@/lib/db";
import { computeFinance, money } from "@/lib/finance";

export const dynamic = "force-dynamic";

export default async function PayPage() {
  const session = await auth();
  if (!FINANCE_ROLES.includes(session!.user.role as Role)) redirect("/dashboard");

  const clients = await listClients();
  const now = new Date();
  const fin = computeFinance(clients, now.getFullYear(), now.getMonth() + 1);

  return (
    <>
      <header className="header">
        <h1>HCA pay & hours</h1>
        <p>{fin.monthLabel} — payroll hours from worked visits, with weekend and bank-holiday premiums.</p>
      </header>
      <div className="body fade">
        <div className="grid cols-3">
          <div className="card metric">
            <div className="num">{fin.carerPay.length}</div>
            <div className="lbl">Carers with hours</div>
          </div>
          <div className="card metric">
            <div className="num">{money(fin.payrollTotal)}</div>
            <div className="lbl">Gross payroll</div>
          </div>
          <div className="card metric">
            <div className="num">{fin.marginPct}%</div>
            <div className="lbl">Margin after payroll</div>
          </div>
        </div>

        <div className="section-title">Per-carer pay</div>
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Carer</th>
                <th>Base</th>
                <th>Total hrs</th>
                <th>Weekday</th>
                <th>Sat</th>
                <th>Sun</th>
                <th>Bank hol</th>
                <th style={{ width: 110 }}>Gross</th>
              </tr>
            </thead>
            <tbody>
              {fin.carerPay.map((p) => (
                <tr key={p.name}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td className="muted">{p.base}</td>
                  <td>{p.totalHours}</td>
                  <td className="muted">{p.wd}</td>
                  <td className="muted">{p.sat}</td>
                  <td className="muted">{p.sun}</td>
                  <td className="muted">{p.bh}</td>
                  <td style={{ fontWeight: 700 }}>{p.gross}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: 11.5, marginTop: 16 }}>
          Premiums: Saturday +€1/hr, Sunday ×1.35, bank holiday ×2. Base rates are illustrative pending the HR payroll feed.
        </p>
      </div>
    </>
  );
}
