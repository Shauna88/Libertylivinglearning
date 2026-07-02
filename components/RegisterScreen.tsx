import { REGISTERS, severityTone, type RegisterKind } from "@/lib/registers";
import { listRegister } from "@/lib/db";
import NewEntryForm from "@/components/NewEntryForm";

function fmtDate(s: string | Date) {
  return new Date(s).toLocaleDateString("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function RegisterScreen({ kind }: { kind: RegisterKind }) {
  const cfg = REGISTERS[kind];
  const entries = await listRegister(kind);
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
        <h1>{cfg.title} register</h1>
        <p>{cfg.intro}</p>
      </header>
      <div className="body fade">
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

        <div style={{ marginTop: 22 }}>
          <NewEntryForm cfg={cfg} />
        </div>

        {entries.length === 0 ? (
          <div className="card muted">No entries yet. Use the button above to log one.</div>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
