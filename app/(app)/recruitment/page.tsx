import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RECRUIT_ROLES, type Role } from "@/lib/db";
import {
  RECRUIT_KPIS,
  RECRUIT_STAGES,
  RECRUIT_PIPELINE,
  RECRUIT_VETTING,
  RECRUIT_ONB_TRAINING,
  ONBOARDING_CHECKLIST,
} from "@/lib/recruitment";

export default async function RecruitmentPage() {
  const session = await auth();
  if (!RECRUIT_ROLES.includes(session!.user.role as Role)) redirect("/dashboard");

  const maxStage = Math.max(...RECRUIT_STAGES.map((s) => s.count));

  return (
    <>
      <header className="header">
        <h1>Recruitment</h1>
        <p>Sourcing → vetting → references → right-to-work → onboarding-ready. Candidates shown by initials.</p>
      </header>
      <div className="body fade">
        {/* KPIs */}
        <div className="grid cols-3">
          {RECRUIT_KPIS.map((k) => (
            <div key={k.name} className="card metric">
              <div className="num" style={{ color: `var(--${k.tone}-fg)` }}>
                {k.value}
              </div>
              <div className="lbl">{k.name}</div>
              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                {k.sub} {k.prev && `· prev ${k.prev}`}
              </div>
            </div>
          ))}
        </div>

        {/* funnel */}
        <div className="section-title">Pipeline funnel</div>
        <div className="card">
          {RECRUIT_STAGES.map((s) => (
            <div key={s.label} className="flex" style={{ gap: 12, margin: "6px 0" }}>
              <div style={{ width: 190, fontSize: 13, fontWeight: 600 }}>{s.label}</div>
              <div className={`bar ${s.tone === "green" ? "" : s.tone}`} style={{ flex: 1 }}>
                <span style={{ width: `${Math.max(6, (s.count / maxStage) * 100)}%` }} />
              </div>
              <div style={{ width: 36, textAlign: "right", fontWeight: 700 }}>{s.count}</div>
            </div>
          ))}
        </div>

        {/* candidates */}
        <div className="section-title">Candidates in progress</div>
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Candidate</th>
                <th>Role</th>
                <th>Area</th>
                <th>Stage</th>
                <th>Days</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {RECRUIT_PIPELINE.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="code">{c.id}</span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{c.initials}</td>
                  <td className="muted">{c.role}</td>
                  <td className="muted">{c.area}</td>
                  <td className="muted">{c.stage}</td>
                  <td className="muted">{c.days}</td>
                  <td>
                    <span className={`pill tone-${c.tone}`}>{c.note}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* vetting */}
        <div className="section-title">Vetting & checks</div>
        <div className="grid cols-3">
          {RECRUIT_VETTING.map((v) => (
            <div key={v.initials} className="card">
              <div className="flex between" style={{ marginBottom: 8 }}>
                <strong style={{ fontSize: 14 }}>{v.initials}</strong>
                <span className="muted" style={{ fontSize: 12 }}>
                  {v.role}
                </span>
              </div>
              {v.checks.map((chk) => (
                <div key={chk.label} className="flex between" style={{ fontSize: 12.5, padding: "3px 0" }}>
                  <span className="muted">{chk.label}</span>
                  <span className={`pill tone-${chk.tone}`}>{chk.status}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* onboarding training gateways */}
        <div className="section-title">Onboarding training — gateways before first shift</div>
        <div className="grid cols-2">
          {RECRUIT_ONB_TRAINING.map((t) => (
            <div key={t.training} className="card">
              <div className="flex between" style={{ alignItems: "flex-start" }}>
                <strong style={{ fontSize: 14 }}>{t.training}</strong>
                <span className={`pill tone-${t.tone}`}>{t.note}</span>
              </div>
              <div className="muted" style={{ fontSize: 12, margin: "6px 0 2px" }}>
                {t.gate}
              </div>
              <div style={{ fontSize: 12.5 }}>To return: {t.who}</div>
            </div>
          ))}
        </div>

        {/* onboarding checklist template */}
        <div className="section-title">Onboarding checklist (HR-05 · SOP-055–058 · HR-14)</div>
        <div className="grid" style={{ gap: 10 }}>
          {ONBOARDING_CHECKLIST.map((g) => (
            <details key={g.group} className="card">
              <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                {g.gate && <span className="pill tone-red">gate</span>}
                {g.group}
                <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                  · {g.items.length} items
                </span>
              </summary>
              <p className="muted" style={{ fontSize: 12, margin: "8px 0 6px" }}>
                {g.note}
              </p>
              <ul className="prose" style={{ margin: 0 }}>
                {g.items.map((it) => (
                  <li key={it.k} style={{ fontSize: 12.5 }}>
                    {it.label} <span className="code">{it.ref}</span>
                    {it.gate && <span className="pill tone-red" style={{ marginLeft: 6 }}>gate</span>}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </div>
    </>
  );
}
