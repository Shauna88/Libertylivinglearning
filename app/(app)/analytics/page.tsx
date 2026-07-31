import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { OVERSIGHT_ROLES, FINANCE_ROLES, listClients, listCarers, coverMap, registerOpenCounts, type Role } from "@/lib/db";
import { computeFinance, money, hoursLabel } from "@/lib/finance";
import { computeAnalytics } from "@/lib/analytics";

export const dynamic = "force-dynamic";

const CAN_VIEW: Role[] = [...new Set([...OVERSIGHT_ROLES, ...FINANCE_ROLES])] as Role[];

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 8, borderRadius: 999, background: "var(--grey-bg)", overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: "100%", background: color, borderRadius: 999 }} />
    </div>
  );
}

export default async function AnalyticsPage() {
  const session = await auth();
  if (!CAN_VIEW.includes(session!.user.role as Role)) redirect("/dashboard");

  const now = new Date();
  const [clients, carers, cover, openCounts] = await Promise.all([listClients(), listCarers(), coverMap(), registerOpenCounts()]);
  const fin = computeFinance(clients, now.getFullYear(), now.getMonth() + 1);
  const a = computeAnalytics({ clients, carers, coverMap: cover, invoices: fin.invoices });

  const deliveryTone = a.deliveryPct >= 95 ? "green" : a.deliveryPct >= 85 ? "amber" : "red";
  const utilTone = a.utilisation.pct >= 90 ? "red" : a.utilisation.pct >= 70 ? "green" : "amber";

  const tiles = [
    { n: String(a.activeClients), label: "Active clients", tone: "text", sub: `${a.weeklyCalls} calls / week` },
    { n: `${a.deliveryPct}%`, label: "Care delivered this week", tone: deliveryTone, sub: `${hoursLabel(a.deliveredMins)} of ${hoursLabel(a.plannedMins)}` },
    { n: String(a.uncoveredCalls), label: "Uncovered calls", tone: a.uncoveredCalls ? "red" : "green", sub: `${hoursLabel(a.unassignedMins)} unassigned` },
    { n: `${a.utilisation.pct}%`, label: "Carer utilisation", tone: utilTone, sub: `${a.utilisation.freeHours}h spare capacity` },
    { n: String(openCounts.complaint ?? 0), label: "Open complaints", tone: (openCounts.complaint ?? 0) ? "amber" : "green", sub: "" },
    { n: String(openCounts.incident ?? 0), label: "Open incidents", tone: (openCounts.incident ?? 0) ? "amber" : "green", sub: "" },
    { n: money(fin.billedTotal), label: `Billed · ${fin.monthLabel}`, tone: "text", sub: `payroll ${money(fin.payrollTotal)}` },
    { n: `${fin.marginPct}%`, label: "Margin", tone: fin.marginPct >= 20 ? "green" : "amber", sub: money(fin.margin) },
  ];

  return (
    <>
      <header className="header">
        <div className="flex" style={{ gap: 8, marginBottom: 6 }}>
          <span className="pill tone-teal"><span className="ms" style={{ fontSize: 14 }}>query_stats</span>Analytics &amp; funder reporting</span>
        </div>
        <h1>Service analytics</h1>
        <p>Operational and business measures across the service, and the hours &amp; billing split by funder (HSE CHO / Fair Deal / private).</p>
      </header>
      <div className="body fade">
        <div className="grid cols-4" style={{ marginBottom: 24 }}>
          {tiles.map((t) => (
            <div key={t.label} className="card metric">
              <div className="num" style={{ color: t.tone === "text" ? undefined : `var(--${t.tone}-fg)` }}>{t.n}</div>
              <div className="lbl">{t.label}</div>
              {t.sub && <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{t.sub}</div>}
            </div>
          ))}
        </div>

        {/* Care delivered by area */}
        <div className="section-title">Care delivered by area (this week)</div>
        <div className="card" style={{ marginBottom: 24 }}>
          {a.areas.map((r) => {
            const pct = r.plannedMins ? Math.round((r.deliveredMins / r.plannedMins) * 100) : 0;
            const tone = pct >= 95 ? "green" : pct >= 85 ? "amber" : "red";
            return (
              <div key={r.area} style={{ padding: "9px 0", borderTop: "1px solid var(--line)" }}>
                <div className="flex between" style={{ marginBottom: 6, fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{r.area} <span className="muted" style={{ fontWeight: 400 }}>· {r.clients} client{r.clients === 1 ? "" : "s"}</span></span>
                  <span className="muted">{hoursLabel(r.deliveredMins)} / {hoursLabel(r.plannedMins)} · <span style={{ color: `var(--${tone}-fg)`, fontWeight: 700 }}>{pct}%</span></span>
                </div>
                <Bar pct={pct} color={`var(--${tone}-fg)`} />
              </div>
            );
          })}
        </div>

        {/* Funder report */}
        <div className="section-title">Funder report · {fin.monthLabel}</div>
        <div className="card" style={{ padding: 0, overflowX: "auto", marginBottom: 16 }}>
          <table className="tbl">
            <thead>
              <tr><th>Funder</th><th>Clients</th><th>Weekly hours</th><th>Billed (month)</th><th style={{ width: 220 }}>Share of billing</th></tr>
            </thead>
            <tbody>
              {a.funders.map((f) => (
                <tr key={f.funder}>
                  <td style={{ fontWeight: 700 }}>{f.funder}</td>
                  <td className="muted">{f.clients}</td>
                  <td className="muted">{hoursLabel(f.weeklyMins)}</td>
                  <td style={{ fontWeight: 700 }}>{money(f.billed)}</td>
                  <td>
                    <div className="flex" style={{ gap: 8, alignItems: "center" }}>
                      <div style={{ flex: 1 }}><Bar pct={f.sharePct} color="var(--accent)" /></div>
                      <span className="muted" style={{ fontSize: 12, minWidth: 34, textAlign: "right" }}>{f.sharePct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CHO scheme breakdown */}
        <div className="section-title">By CHO area / rate scheme</div>
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr><th>Code</th><th>Scheme</th><th>Funder</th><th>Clients</th><th>Weekly hours</th><th>Delivered</th><th>Billed (month)</th></tr>
            </thead>
            <tbody>
              {a.schemes.map((s) => {
                const pct = s.weeklyMins ? Math.round((s.deliveredMins / s.weeklyMins) * 100) : 0;
                return (
                  <tr key={s.code}>
                    <td><span className="code" style={{ borderLeft: `3px solid ${s.color}`, paddingLeft: 6 }}>{s.code}</span></td>
                    <td style={{ fontWeight: 600, fontSize: 12.5 }}>{s.name}</td>
                    <td className="muted">{s.funder}</td>
                    <td className="muted">{s.clients}</td>
                    <td className="muted">{hoursLabel(s.weeklyMins)}</td>
                    <td className="muted">{pct}%</td>
                    <td style={{ fontWeight: 700 }}>{money(s.billed)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: 11.5, marginTop: 12 }}>
          Weekly hours are the planned Schedule of Service; delivered strips out uncovered calls and paused clients. Billing is computed live from delivered visits × the CHO/funder rate card for {fin.monthLabel}.
        </p>
      </div>
    </>
  );
}
