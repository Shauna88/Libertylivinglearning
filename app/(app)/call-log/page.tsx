import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CRM_ROLES, listCallLog, listClients, type Role } from "@/lib/db";
import CallLogForm from "@/components/CallLogForm";

export const dynamic = "force-dynamic";

const KIND_META: Record<string, { label: string; tone: string }> = {
  late: { label: "Late call", tone: "amber" },
  missed: { label: "Missed visit", tone: "red" },
  noshow: { label: "No-show", tone: "red" },
  other: { label: "Other", tone: "grey" },
};

function fmt(s: string | Date) {
  return new Date(s).toLocaleString("en-IE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function CallLogPage() {
  const session = await auth();
  if (!CRM_ROLES.includes(session!.user.role as Role)) redirect("/dashboard");

  const [log, clients] = await Promise.all([listCallLog(100), listClients()]);
  const options = clients.map((c) => ({ id: c.id, label: `${c.su} · ${c.area}` }));

  return (
    <>
      <header className="header">
        <h1>Call log</h1>
        <p>Missed, late and no-show events — the feed that surfaces on the live monitor and cover board.</p>
      </header>
      <div className="body fade">
        <CallLogForm clients={options} />

        {log.length === 0 ? (
          <div className="card muted">No call events logged.</div>
        ) : (
          <div className="grid" style={{ gap: 10 }}>
            {log.map((c) => {
              const meta = KIND_META[c.kind] ?? { label: c.kind, tone: "grey" };
              return (
                <div key={c.id} className="card">
                  <div className="flex between wrap" style={{ gap: 8 }}>
                    <div className="flex wrap" style={{ gap: 8 }}>
                      <span className={`pill tone-${meta.tone}`}>{meta.label}</span>
                      {c.su && <span className="code">{c.su}</span>}
                      {c.visit_time && <span className="code">{c.visit_time}</span>}
                      {c.area && <span className="muted" style={{ fontSize: 12 }}>{c.area}</span>}
                    </div>
                    <span className="muted" style={{ fontSize: 11.5 }}>
                      {fmt(c.created_at)} · {c.logged_by}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, margin: "8px 0 0" }}>{c.detail}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
