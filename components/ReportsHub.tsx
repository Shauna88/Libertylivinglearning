import Link from "next/link";

type Item = { label: string; href: string; kind: "csv" | "open" | "soon"; sub?: string };
type Group = { title: string; icon: string; items: Item[] };

function ReportRow({ it }: { it: Item }) {
  const icon = it.kind === "csv" ? "download" : it.kind === "soon" ? "schedule" : "arrow_forward";
  const inner = (
    <>
      <span style={{ minWidth: 0 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{it.label}</span>
        {it.sub && <span className="muted" style={{ fontSize: 11.5, display: "block" }}>{it.sub}</span>}
      </span>
      <span className={`rep-tag rep-${it.kind}`}>
        {it.kind === "csv" && "CSV"}
        {it.kind === "open" && "Open"}
        {it.kind === "soon" && "Soon"}
        <span className="ms" style={{ fontSize: 14 }}>{icon}</span>
      </span>
    </>
  );
  if (it.kind === "soon") return <div className="rep-row rep-row-soon">{inner}</div>;
  if (it.kind === "csv") return <a className="rep-row" href={it.href}>{inner}</a>;
  return <Link className="rep-row" href={it.href}>{inner}</Link>;
}

/**
 * Reports hub — one place to generate and download the operational reports,
 * grouped like the office is used to (carer / client / finance / exports).
 * CSV items download a file; Open items jump to the live view.
 */
export default function ReportsHub({ caps }: { caps: { finance: boolean; oversight: boolean } }) {
  const carer: Group = {
    title: "Carer reports", icon: "badge",
    items: [
      { label: "Carer roster", href: "/roster", kind: "open" },
      { label: "Carer diary", href: "/carers", kind: "open", sub: "Clock-ins, visit notes & activity per carer" },
      { label: "Attendance & timesheets", href: "/attendance", kind: "open", sub: "Planned vs delivered, any week" },
      { label: "Workforce timesheet", href: "/api/attendance/export?scope=workforce", kind: "csv", sub: "This week — hours & exceptions per carer" },
      { label: "Time off", href: "/time-off", kind: "open" },
      { label: "Training matrix", href: "/training", kind: "open" },
    ],
  };
  const client: Group = {
    title: "Client reports", icon: "contacts",
    items: [
      { label: "Client roster", href: "/clients", kind: "open" },
      { label: "Client schedule", href: "/roster", kind: "open" },
      { label: "Unassigned appointments", href: "/api/reports/unassigned", kind: "csv", sub: "Every call with no carer allocated" },
      { label: "Client diary", href: "/clients", kind: "open", sub: "Care notes & visit diary per client" },
      { label: "Care plans", href: "/clients", kind: "open" },
      { label: "Medication administration (eMAR)", href: "#", kind: "soon" },
    ],
  };
  const finance: Group = {
    title: "Finance reports", icon: "account_balance_wallet",
    items: [
      { label: "Planned & delivered hours", href: "/api/attendance/export?scope=workforce", kind: "csv", sub: "Workforce timesheet CSV" },
      { label: "Untimesheeted appointments", href: "/attendance", kind: "open", sub: "Calls with no clock-in recorded" },
      { label: "Finance overview", href: "/finance", kind: "open" },
      { label: "Client invoicing", href: "/finance/invoicing", kind: "open" },
      { label: "HCA pay & hours", href: "/finance/pay", kind: "open" },
    ],
  };
  const exports: Group = {
    title: "Exports", icon: "ios_share",
    items: [
      { label: "Activity log", href: "/api/reports/activity-log", kind: "csv", sub: "Full system audit trail" },
    ],
  };

  const groups = [carer, client, ...(caps.finance ? [finance] : []), ...(caps.oversight ? [exports] : [])];

  return (
    <div className="rep-grid">
      {groups.map((g) => (
        <div key={g.title} className="card rep-card">
          <div className="rep-card-head">
            <span className="ms" style={{ fontSize: 18, color: "var(--accent)" }}>{g.icon}</span>
            <h2 style={{ fontSize: 14, margin: 0 }}>{g.title}</h2>
          </div>
          <div className="rep-rows">
            {g.items.map((it) => <ReportRow key={it.label} it={it} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
