import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { OVERSIGHT_ROLES, listPiiLog, type Role } from "@/lib/db";

function fmt(s: string | Date) {
  return new Date(s).toLocaleString("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AccessLogPage() {
  const session = await auth();
  if (!OVERSIGHT_ROLES.includes(session!.user.role as Role)) redirect("/dashboard");

  const log = await listPiiLog(200);

  return (
    <>
      <header className="header">
        <h1>PII access log</h1>
        <p>Every reveal of identifiable client data — who, when, and why. The GDPR audit trail for special-category data.</p>
      </header>
      <div className="body fade">
        <div className="grid cols-3">
          <div className="card metric">
            <div className="num">{log.length}</div>
            <div className="lbl">Reveals logged (latest 200)</div>
          </div>
          <div className="card metric">
            <div className="num">{new Set(log.map((l) => l.user_name)).size}</div>
            <div className="lbl">Staff who accessed</div>
          </div>
          <div className="card metric">
            <div className="num">{log.filter((l) => l.scope === "client").length}</div>
            <div className="lbl">Client-record reveals</div>
          </div>
        </div>

        <div className="section-title">Access events</div>
        {log.length === 0 ? (
          <div className="card muted">No identifiable data has been revealed yet.</div>
        ) : (
          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>Scope</th>
                  <th>Client</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {log.map((l) => (
                  <tr key={l.id}>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>
                      {fmt(l.created_at)}
                    </td>
                    <td style={{ fontWeight: 600 }}>{l.user_name}</td>
                    <td>
                      <span className={`pill tone-${l.scope === "client" ? "blue" : "grey"}`}>{l.scope}</span>
                    </td>
                    <td className="code">{l.client_id ?? "—"}</td>
                    <td>{l.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
