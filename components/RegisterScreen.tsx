import { auth } from "@/auth";
import { REGISTERS, severityTone, type RegisterKind } from "@/lib/registers";
import { listRegister, IMPROVEMENT_ROLES, OVERSIGHT_ROLES, CRM_ROLES, type Role } from "@/lib/db";
import NewEntryForm from "@/components/NewEntryForm";
import RecordDrawer from "@/components/RecordDrawer";

function parseRecord(json: string | null): Record<string, string> {
  if (!json) return {};
  try {
    return JSON.parse(json) as Record<string, string>;
  } catch {
    return {};
  }
}

function fmtDate(s: string | Date) {
  return new Date(s).toLocaleDateString("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function RegisterScreen({ kind }: { kind: RegisterKind }) {
  const cfg = REGISTERS[kind];
  const session = await auth();
  const role = session?.user?.role as Role;
  const userId = Number(session?.user?.id);
  const canEdit = IMPROVEMENT_ROLES.includes(role);
  // The shareable team-demo login browses the register read-only (no logging/editing).
  const isDemo = role === "Demo";
  // Management / operational roles see the whole register; front-line staff
  // (e.g. Healthcare Assistants) can raise entries but only see their own.
  const canSeeAll = OVERSIGHT_ROLES.includes(role) || IMPROVEMENT_ROLES.includes(role) || CRM_ROLES.includes(role) || isDemo;
  const all = await listRegister(kind);
  const entries = canSeeAll ? all : all.filter((e) => e.reporter_id === userId);
  const open = entries.filter((e) => e.status === "open").length;
  const closed = entries.length - open;

  return (
    <>
      <header className="header">
        <div className="flex" style={{ gap: 8, marginBottom: 6 }}>
          <span className={`pill tone-${cfg.accent}`}>
            <span className="ms" style={{ fontSize: 14 }}>
              {cfg.icon}
            </span>
            {cfg.policy}
          </span>
        </div>
        <h1>{canSeeAll ? `${cfg.title} register` : `${cfg.title} — raise & track`}</h1>
        <p>{canSeeAll ? cfg.intro : `Log a concern and track the ones you have raised. Only you and the management team can see your reports.`}</p>
      </header>
      <div className="body fade">
        {canSeeAll ? (
          <div className="grid cols-3">
            <div className="card metric">
              <div className="num">{entries.length}</div>
              <div className="lbl">Total this year</div>
            </div>
            <div className="card metric">
              <div className="num" style={{ color: "var(--amber-fg)" }}>
                {open}
              </div>
              <div className="lbl">Open</div>
            </div>
            <div className="card metric">
              <div className="num" style={{ color: "var(--green-fg)" }}>
                {closed}
              </div>
              <div className="lbl">Closed</div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ background: "var(--blue-bg)", borderColor: "var(--blue-fg)", fontSize: 13 }}>
            <span className="ms" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 6, color: "var(--blue-fg)" }}>info</span>
            You have raised <strong>{entries.length}</strong> report{entries.length === 1 ? "" : "s"} in this register. The management team review and action every one.
          </div>
        )}

        {!isDemo && (
          <div style={{ marginTop: 22 }}>
            <NewEntryForm cfg={cfg} />
          </div>
        )}

        {entries.length === 0 ? (
          <div className="card muted">{canSeeAll ? "No entries yet. Use the button above to log one." : "You haven't raised anything yet. Use the button above if you need to."}</div>
        ) : (
          <div className="grid" style={{ gap: 12 }}>
            {entries.map((e) => (
              <div key={e.id} className="card">
                <div className="flex between wrap" style={{ gap: 8 }}>
                  <div className="flex wrap" style={{ gap: 8 }}>
                    <span className="code">{e.ref}</span>
                    <span className={`pill tone-${cfg.accent}`}>{e.category}</span>
                    <span className={`pill tone-${severityTone(cfg, e.severity)}`}>{e.severity}</span>
                  </div>
                  <span className={`pill ${e.status === "open" ? "tone-amber" : "tone-green"}`}>
                    {e.status === "open" ? "Open" : "Closed"}
                  </span>
                </div>
                <h3 style={{ margin: "10px 0 6px", fontSize: 15 }}>{e.summary}</h3>
                <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
                  {e.detail}
                </p>
                <div className="flex wrap" style={{ gap: 14, fontSize: 11.5, color: "var(--text-2)", marginTop: 4 }}>
                  {e.location && (
                    <span className="flex" style={{ gap: 4 }}>
                      <span className="ms" style={{ fontSize: 14 }}>
                        place
                      </span>
                      {e.location}
                    </span>
                  )}
                  <span className="flex" style={{ gap: 4 }}>
                    <span className="ms" style={{ fontSize: 14 }}>
                      person
                    </span>
                    {e.reporter_name}
                  </span>
                  <span className="flex" style={{ gap: 4 }}>
                    <span className="ms" style={{ fontSize: 14 }}>
                      event
                    </span>
                    {fmtDate(e.created_at)}
                  </span>
                </div>
                <RecordDrawer kind={kind} id={e.id} record={parseRecord(e.record_json)} canEdit={canEdit} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
