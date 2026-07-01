"use client";

import { useMemo, useState } from "react";
import type { Policy, PolicyCat } from "@/lib/modules";

const STATUS_TONE: Record<string, string> = { current: "green", due: "amber", overdue: "red" };
const STATUS_LABEL: Record<string, string> = {
  current: "Current",
  due: "Review due",
  overdue: "Overdue",
};

export default function PolicyLibrary({
  policies,
  cats,
}: {
  policies: Policy[];
  cats: Record<string, PolicyCat>;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("ALL");
  const [active, setActive] = useState<Policy | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return policies.filter((p) => {
      if (cat !== "ALL" && p.cat !== cat) return false;
      if (!term) return true;
      return (p.code + " " + p.title + " " + p.owner).toLowerCase().includes(term);
    });
  }, [q, cat, policies]);

  const counts = (k: string) => (k === "ALL" ? policies.length : policies.filter((p) => p.cat === k).length);

  if (active) {
    const c = cats[active.cat];
    const tone = STATUS_TONE[active.status] ?? "grey";
    return (
      <div className="fade" style={{ maxWidth: 820 }}>
        <button className="btn" onClick={() => setActive(null)} style={{ marginBottom: 16 }}>
          <span className="ms" style={{ fontSize: 17 }}>
            arrow_back
          </span>
          All documents
        </button>
        <div className="card">
          <div className="flex between" style={{ alignItems: "flex-start" }}>
            <div className="flex" style={{ gap: 8 }}>
              <span className="code">{active.code}</span>
              <span className="pill" style={{ color: c.color, background: c.bg }}>
                <span className="ms" style={{ fontSize: 14 }}>
                  {c.icon}
                </span>
                {c.label}
              </span>
            </div>
            <span className={`pill tone-${tone}`}>{STATUS_LABEL[active.status]}</span>
          </div>
          <h2 style={{ fontSize: 20, margin: "12px 0 4px" }}>{active.title}</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Controlled document {active.longTitle}
          </p>
          <table className="tbl" style={{ marginTop: 8 }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600, width: 180 }}>Document owner</td>
                <td>{active.owner}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Version</td>
                <td>{active.version}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Effective from</td>
                <td>{active.effective}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Next review due</td>
                <td>{active.reviewDue}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Status</td>
                <td>
                  <span className={`pill tone-${tone}`}>{STATUS_LABEL[active.status]}</span>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="callout" style={{ marginTop: 16 }}>
            <span className="k">Controlled document</span>
            This is the register record for {active.code}. The approved full-text document is
            maintained in the document control system under version {active.version}; only the
            current controlled version may be used in practice.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade">
      <div className="flex" style={{ marginBottom: 14, position: "relative" }}>
        <span className="ms" style={{ position: "absolute", left: 12, color: "var(--text-2)", fontSize: 20 }}>
          search
        </span>
        <input
          className="input"
          style={{ paddingLeft: 40 }}
          placeholder="Search policies by code, title or owner…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="flex wrap" style={{ gap: 8, marginBottom: 18 }}>
        <button className={`chip${cat === "ALL" ? " active" : ""}`} onClick={() => setCat("ALL")}>
          All documents · {counts("ALL")}
        </button>
        {Object.entries(cats).map(([k, c]) => (
          <button
            key={k}
            className={`chip${cat === k ? " active" : ""}`}
            onClick={() => setCat(k)}
            style={cat === k ? {} : { color: c.color }}
          >
            {c.label} · {counts(k)}
          </button>
        ))}
      </div>
      <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
        {filtered.length} of {policies.length} controlled documents
      </div>
      <div className="grid cols-2">
        {filtered.map((p) => {
          const c = cats[p.cat];
          const tone = STATUS_TONE[p.status] ?? "grey";
          return (
            <button key={p.code} className="card" style={{ display: "block", textAlign: "left" }} onClick={() => setActive(p)}>
              <div className="flex between" style={{ alignItems: "flex-start" }}>
                <span className="code">{p.code}</span>
                <span className={`pill tone-${tone}`}>{STATUS_LABEL[p.status]}</span>
              </div>
              <h3 style={{ margin: "10px 0 8px", fontSize: 15 }}>{p.title}</h3>
              <div className="flex wrap" style={{ gap: 8, fontSize: 11.5, color: "var(--text-2)" }}>
                <span className="pill" style={{ color: c.color, background: c.bg }}>
                  {c.label}
                </span>
                <span className="flex" style={{ gap: 4 }}>
                  <span className="ms" style={{ fontSize: 14 }}>
                    person
                  </span>
                  {p.owner}
                </span>
                <span>v{p.version}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
