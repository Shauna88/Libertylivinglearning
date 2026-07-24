import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { IMPROVEMENT_ROLES, listQip, type Role } from "@/lib/db";
import { AUDIT_LIFECYCLE, AUDIT_PRINCIPLES, AUDITS } from "@/lib/audits";
import QipBoard, { type Qip } from "@/components/QipBoard";

export const dynamic = "force-dynamic";

export default async function AuditsPage() {
  const session = await auth();
  const role = session!.user.role as Role;
  if (!IMPROVEMENT_ROLES.includes(role)) redirect("/dashboard");

  const qip = (await listQip()) as Qip[];
  const canEdit = true; // page is already IMPROVEMENT_ROLES-gated

  return (
    <>
      <header className="header">
        <div className="flex" style={{ gap: 8, marginBottom: 6 }}>
          <span className="pill tone-amber"><span className="ms" style={{ fontSize: 14 }}>fact_check</span>QA-22 · QA-22.1</span>
        </div>
        <h1>Audits &amp; QIP</h1>
        <p>The annual quality-audit programme and the live Quality Improvement Plan (corrective actions).</p>
      </header>
      <div className="body fade">
        {/* audit schedule */}
        <div className="section-title" style={{ marginTop: 0 }}>Audit schedule</div>
        <div className="grid" style={{ gap: 10 }}>
          {AUDITS.map((a) => (
            <details key={a.id} className="card">
              <summary style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className="ms" style={{ fontSize: 20, color: "var(--accent)" }}>{a.icon}</span>
                <strong style={{ fontSize: 14.5 }}>{a.name}</strong>
                <span className="pill tone-grey">{a.freq}</span>
                <span className="code">{a.policy}</span>
                <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="muted" style={{ fontSize: 12 }}>{a.owner}</span>
                  <span className="pill" style={{ color: `var(--${a.tone}-fg)`, background: `var(--${a.tone}-bg)`, fontWeight: 800 }}>{a.score}</span>
                </span>
              </summary>
              <p className="muted" style={{ fontSize: 12.5, margin: "10px 0 6px" }}>{a.purpose}</p>
              <p style={{ fontSize: 12, margin: "0 0 10px" }}><strong>Sampling:</strong> <span className="muted">{a.sampling}</span></p>
              <div className="grid cols-2" style={{ gap: 10 }}>
                {a.sections.map((sec) => (
                  <div key={sec.title} className="card" style={{ background: "var(--bg)" }}>
                    <strong style={{ fontSize: 12.5 }}>{sec.title}</strong>
                    <ul className="prose" style={{ margin: "6px 0 0" }}>
                      {sec.items.map((it) => <li key={it} style={{ fontSize: 11.5 }}>{it}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10 }}>
                <strong style={{ fontSize: 12 }}>Escalation triggers</strong>
                <div className="flex wrap" style={{ gap: 6, marginTop: 6 }}>
                  {a.triggers.map((t) => <span key={t} className="pill tone-amber" style={{ fontSize: 11 }}>{t}</span>)}
                </div>
              </div>
            </details>
          ))}
        </div>

        {/* QIP */}
        <div className="section-title">Quality Improvement Plan (QIP / CAPA)</div>
        <QipBoard items={qip} canEdit={canEdit} />

        {/* lifecycle */}
        <div className="section-title">Audit lifecycle</div>
        <div className="grid cols-4">
          {AUDIT_LIFECYCLE.map((s) => (
            <div key={s.n} className="card">
              <div className="flex" style={{ gap: 8, alignItems: "center", marginBottom: 4 }}>
                <span className="portal-avatar" style={{ width: 26, height: 26, fontSize: 12 }}>{s.n}</span>
                <span className="ms" style={{ fontSize: 18, color: "var(--accent)" }}>{s.icon}</span>
              </div>
              <strong style={{ fontSize: 12.5 }}>{s.label}</strong>
              <p className="muted" style={{ fontSize: 11, margin: "4px 0 0" }}>{s.desc}</p>
            </div>
          ))}
        </div>

        {/* principles */}
        <div className="section-title">Audit principles</div>
        <div className="grid cols-3">
          {AUDIT_PRINCIPLES.map((p) => (
            <div key={p.k} className="card">
              <strong style={{ fontSize: 12.5 }}>{p.k}</strong>
              <p className="muted" style={{ fontSize: 11.5, margin: "3px 0 0" }}>{p.d}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
