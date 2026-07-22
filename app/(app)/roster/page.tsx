import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CRM_ROLES, listClients, type Role } from "@/lib/db";
import { deriveTodayVisits, groupByCarer, nowParts } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export default async function RosterPage() {
  const session = await auth();
  if (!CRM_ROLES.includes(session!.user.role as Role)) redirect("/dashboard");

  const clients = await listClients();
  const now = new Date();
  const { weekday, nowMin } = nowParts(now);
  const visits = deriveTodayVisits(clients, weekday, nowMin);
  const byCarer = groupByCarer(visits);
  const dateLabel = now.toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <header className="header">
        <h1>Carer roster</h1>
        <p>{dateLabel} — today&apos;s visits grouped by carer. {byCarer.length} rounds.</p>
      </header>
      <div className="body fade">
        <div className="grid cols-2">
          {byCarer.map((g) => {
            const unassigned = g.carer === "Unassigned";
            return (
              <div key={g.carer} className="card" style={unassigned ? { borderLeft: "4px solid var(--red-fg)" } : undefined}>
                <div className="flex between" style={{ marginBottom: 8 }}>
                  <div className="flex" style={{ gap: 8 }}>
                    <span className="ms" style={{ fontSize: 18, color: unassigned ? "var(--red-fg)" : "var(--accent)" }}>
                      {unassigned ? "report" : "badge"}
                    </span>
                    <strong style={{ fontSize: 14.5 }}>{g.carer}</strong>
                  </div>
                  <span className={`pill tone-${unassigned ? "red" : "grey"}`}>{g.visits.length} visits</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {g.visits.map((v, i) => (
                    <Link
                      key={i}
                      href={`/clients/${v.clientId}`}
                      style={{ borderLeft: `3px solid var(--${v.tone}-fg, var(--accent))`, paddingLeft: 10, display: "block" }}
                    >
                      <div className="flex" style={{ gap: 8, fontSize: 13 }}>
                        <span className="code">{v.time}</span>
                        <strong>{v.type}</strong>
                        <span className="muted">{v.durMin}m</span>
                        <span className={`pill tone-${v.tone}`} style={{ marginLeft: "auto" }}>
                          {v.statusLabel}
                        </span>
                      </div>
                      <div className="muted" style={{ fontSize: 11.5 }}>
                        {v.maskedName} · {v.su} · {v.area}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
