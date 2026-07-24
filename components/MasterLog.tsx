"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type LogRow = {
  id: number;
  kind: string;
  ref: string;
  category: string;
  severity: string;
  summary: string;
  status: string;
  reporter: string;
  created_at: string;
};

const KIND: Record<string, { label: string; tone: string; href: string; icon: string }> = {
  complaint: { label: "Complaint", tone: "amber", href: "/complaints", icon: "forum" },
  incident: { label: "Incident", tone: "red", href: "/incidents", icon: "crisis_alert" },
  safeguarding: { label: "Safeguarding", tone: "hs", href: "/safeguarding", icon: "shield" },
};

function fmt(s: string) {
  return new Date(s).toLocaleDateString("en-IE", { day: "2-digit", month: "short", year: "numeric" });
}

export default function MasterLog({ rows }: { rows: LogRow[] }) {
  const [kind, setKind] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { complaint: 0, incident: 0, safeguarding: 0 };
    for (const r of rows) c[r.kind] = (c[r.kind] ?? 0) + 1;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (kind !== "ALL" && r.kind !== kind) return false;
      if (status !== "ALL" && r.status !== status) return false;
      if (!term) return true;
      return (r.ref + " " + r.category + " " + r.summary + " " + r.reporter).toLowerCase().includes(term);
    });
  }, [rows, kind, status, q]);

  const open = filtered.filter((r) => r.status === "open").length;

  return (
    <>
      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <div className="card metric"><div className="num">{rows.length}</div><div className="lbl">Total logged</div></div>
        <div className="card metric"><div className="num" style={{ color: "var(--amber-fg)" }}>{counts.complaint}</div><div className="lbl">Complaints</div></div>
        <div className="card metric"><div className="num" style={{ color: "var(--red-fg)" }}>{counts.incident}</div><div className="lbl">Incidents</div></div>
        <div className="card metric"><div className="num" style={{ color: "var(--hs)" }}>{counts.safeguarding}</div><div className="lbl">Safeguarding</div></div>
      </div>

      <div className="flex between wrap" style={{ gap: 12, marginBottom: 12 }}>
        <div className="flex" style={{ position: "relative", flex: "1 1 280px" }}>
          <span className="ms" style={{ position: "absolute", left: 12, top: 10, color: "var(--text-2)", fontSize: 20 }}>search</span>
          <input className="input" style={{ paddingLeft: 40 }} placeholder="Search ref, category, summary or reporter…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="flex wrap" style={{ gap: 8, marginBottom: 8 }}>
        <button className={`chip${kind === "ALL" ? " active" : ""}`} onClick={() => setKind("ALL")}>All types · {rows.length}</button>
        {Object.entries(KIND).map(([k, v]) => (
          <button key={k} className={`chip${kind === k ? " active" : ""}`} onClick={() => setKind(k)}>{v.label}s · {counts[k] ?? 0}</button>
        ))}
      </div>
      <div className="flex wrap" style={{ gap: 8, marginBottom: 14 }}>
        {["ALL", "open", "closed"].map((s) => (
          <button key={s} className={`chip${status === s ? " active" : ""}`} onClick={() => setStatus(s)}>{s === "ALL" ? "All statuses" : s[0].toUpperCase() + s.slice(1)}</button>
        ))}
        <span className="pill tone-amber" style={{ marginLeft: "auto" }}>{open} open in view</span>
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Ref</th><th>Logged</th><th>Type</th><th>Category</th><th>Severity</th><th>Status</th><th>Logged by</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const cfg = KIND[r.kind] ?? { label: r.kind, tone: "grey", href: "/dashboard", icon: "description" };
              return (
                <tr key={`${r.kind}-${r.id}`}>
                  <td><span className="code">{r.ref}</span></td>
                  <td className="muted" style={{ fontSize: 12.5, whiteSpace: "nowrap" }}>{fmt(r.created_at)}</td>
                  <td><span className={`pill tone-${cfg.tone}`}><span className="ms" style={{ fontSize: 13 }}>{cfg.icon}</span>{cfg.label}</span></td>
                  <td style={{ fontSize: 12.5 }}>{r.category}<div className="muted" style={{ fontSize: 11.5, maxWidth: 340, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.summary}</div></td>
                  <td className="muted" style={{ fontSize: 12 }}>{r.severity}</td>
                  <td><span className={`pill tone-${r.status === "open" ? "amber" : "green"}`}>{r.status === "open" ? "Open" : "Closed"}</span></td>
                  <td className="muted" style={{ fontSize: 12 }}>{r.reporter}</td>
                  <td style={{ textAlign: "right" }}><Link href={cfg.href} className="btn" style={{ padding: "5px 11px", fontSize: 12.5 }}>Open</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <p className="muted">Nothing matches.</p>}
    </>
  );
}
