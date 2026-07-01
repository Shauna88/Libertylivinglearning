import { LEADERSHIP, ASSURANCE_CYCLE, KEY_CONTACTS } from "@/lib/modules";

export default function GovernancePage() {
  return (
    <>
      <header className="header">
        <h1>Governance</h1>
        <p>Leadership, the assurance reporting cycle, and the key contacts that hold quality and safety together.</p>
      </header>
      <div className="body fade">
        <div className="section-title">Leadership team</div>
        <div className="grid cols-3">
          {LEADERSHIP.map((l) => (
            <div key={l.name + l.role} className="card">
              <div className="flex" style={{ gap: 12 }}>
                <div className="avatar" style={{ background: "var(--accent)" }}>
                  {l.name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{l.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {l.role}
                  </div>
                </div>
              </div>
              {l.detail && (
                <p className="muted" style={{ fontSize: 12, margin: "10px 0 0" }}>
                  {l.detail}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="section-title">Assurance reporting cycle</div>
        <div className="grid cols-2">
          {ASSURANCE_CYCLE.map((c) => (
            <div key={c.name} className="card">
              <div className="flex between" style={{ alignItems: "flex-start" }}>
                <h3 style={{ margin: 0, fontSize: 15 }}>{c.name}</h3>
                <span className="pill tone-blue">{c.cadence}</span>
              </div>
              <p className="muted" style={{ fontSize: 12.5, margin: "8px 0 6px" }}>
                {c.purpose}
              </p>
              <div className="flex" style={{ gap: 4, fontSize: 11.5, color: "var(--text-2)" }}>
                <span className="ms" style={{ fontSize: 14 }}>
                  groups
                </span>
                {c.audience}
              </div>
            </div>
          ))}
        </div>

        <div className="section-title">Key contacts & escalation</div>
        <div className="card" style={{ padding: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Contact</th>
                <th>Reach</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {KEY_CONTACTS.map((c) => (
                <tr key={c.label}>
                  <td>
                    <span className={`pill tone-${c.tone}`}>{c.label}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{c.detail}</td>
                  <td className="muted">{c.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
