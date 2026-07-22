import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  OVERSIGHT_ROLES,
  listAccessUsers,
  listAuditLog,
  listClients,
  listPiiLog,
  dsarExportCount,
  type Role,
} from "@/lib/db";
import { RETENTION_SCHEDULE, ROLE_DATA_ACCESS } from "@/lib/retention";

export const runtime = "nodejs";

function fmt(s: string | Date) {
  return new Date(s).toLocaleString("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CAT_TONE: Record<string, string> = {
  Client: "green",
  Staff: "blue",
  Quality: "amber",
  Finance: "teal",
  Access: "grey",
};

export default async function DataProtectionPage() {
  const session = await auth();
  if (!OVERSIGHT_ROLES.includes(session!.user.role as Role)) redirect("/dashboard");

  const [users, audit, clients, pii, dsarCount] = await Promise.all([
    listAccessUsers(),
    listAuditLog(150),
    listClients(),
    listPiiLog(500),
    dsarExportCount(),
  ]);

  const logins = audit.filter((a) => a.action === "auth.login").length;

  return (
    <>
      <header className="header">
        <h1>Data protection</h1>
        <p>
          The GDPR accountability layer: who can reach what, the audit trail, data-subject access
          exports, and the retention schedule. Oversight-only.
        </p>
      </header>
      <div className="body fade">
        {/* metrics */}
        <div className="grid cols-4">
          <div className="card metric">
            <div className="num">{audit.length}</div>
            <div className="lbl">Audit events (latest 150)</div>
          </div>
          <div className="card metric">
            <div className="num">{pii.length}</div>
            <div className="lbl">PII reveals logged</div>
          </div>
          <div className="card metric">
            <div className="num">{dsarCount}</div>
            <div className="lbl">DSAR exports</div>
          </div>
          <div className="card metric">
            <div className="num">{logins}</div>
            <div className="lbl">Logins in trail</div>
          </div>
        </div>

        {/* access register */}
        <div className="section-title">Access register — who can reach what</div>
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Login</th>
                <th>Role</th>
                <th>Region</th>
                <th>Data they can reach</th>
                <th>Linked client</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{u.email}</div>
                  </td>
                  <td className="muted">{u.role}</td>
                  <td className="muted">{u.region}</td>
                  <td style={{ fontSize: 12.5 }}>
                    {(ROLE_DATA_ACCESS[u.role] ?? ["—"]).join(" · ")}
                  </td>
                  <td className="code">{u.client_id ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* DSAR */}
        <div className="section-title">Data-subject access (DSAR)</div>
        <div className="card" style={{ marginBottom: 12 }}>
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
            Export everything held about a service user (GDPR Art. 15 / 20) as a JSON file — their
            record, care plan, schedule, related call events, and the log of who accessed their
            data. Every export is written to the audit trail and PII access log.
          </p>
        </div>
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Client</th>
                <th>Ref</th>
                <th>Area</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Export</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td className="code">{c.su}</td>
                  <td className="muted">{c.area}</td>
                  <td className="muted">{c.status}</td>
                  <td style={{ textAlign: "right" }}>
                    <a className="pill tone-blue" href={`/api/dsar/${c.id}`} download>
                      <span className="ms" style={{ fontSize: 14, marginRight: 4 }}>download</span>
                      Export data
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* retention */}
        <div className="section-title">Retention schedule</div>
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Record</th>
                <th>Category</th>
                <th>Retention period</th>
                <th>Basis</th>
              </tr>
            </thead>
            <tbody>
              {RETENTION_SCHEDULE.map((r) => (
                <tr key={r.record}>
                  <td style={{ fontWeight: 600 }}>
                    {r.record}
                    {r.special && (
                      <span className="pill tone-red" style={{ marginLeft: 6 }}>special-category</span>
                    )}
                  </td>
                  <td>
                    <span className={`pill tone-${CAT_TONE[r.category] ?? "grey"}`}>{r.category}</span>
                  </td>
                  <td className="muted" style={{ whiteSpace: "nowrap" }}>{r.period}</td>
                  <td className="muted" style={{ fontSize: 12.5 }}>{r.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* audit log */}
        <div className="section-title">Audit trail</div>
        {audit.length === 0 ? (
          <div className="card muted">No audit events recorded yet.</div>
        ) : (
          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>{fmt(a.created_at)}</td>
                    <td style={{ fontWeight: 600 }}>{a.actor_name}</td>
                    <td className="code">{a.action}</td>
                    <td className="code">{a.target ?? "—"}</td>
                    <td className="muted" style={{ fontSize: 12.5 }}>{a.detail || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* governance */}
        <div className="section-title">Governance & safeguards</div>
        <div className="grid cols-2">
          <div className="card">
            <strong style={{ fontSize: 14 }}>Data Protection Officer</strong>
            <p className="muted" style={{ fontSize: 13, margin: "6px 0 0" }}>
              Data-subject requests, breaches and retention sign-off:{" "}
              <span className="code">dpo@libertyhomecare.ie</span>. Special-category (health) data
              is masked by default and only revealed through the logged PII gate.
            </p>
          </div>
          <div className="card">
            <strong style={{ fontSize: 14 }}>Hardening roadmap</strong>
            <ul className="prose" style={{ margin: "6px 0 0", fontSize: 12.5 }}>
              <li>2FA for manager &amp; director logins</li>
              <li>Encrypted EU-region database backups + restore test</li>
              <li>Annual access review against this register</li>
              <li>Automated retention purge past the schedule above</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
