"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PiiRevealButton from "@/components/PiiRevealButton";

export type RegisterRow = {
  id: string;
  su: string;
  area: string;
  status: string;
  statusLabel: string;
  statusTone: string;
  maskedName: string;
  coordinator: string;
  hoursWk: string;
  funding: string;
  flags: string[];
  reviewTone: string;
};

export default function ClientRegister({
  rows,
  statuses,
}: {
  rows: RegisterRow[];
  statuses: { key: string; label: string; count: number }[];
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [area, setArea] = useState("ALL");
  const [view, setView] = useState<"area" | "table">("area");
  const [names, setNames] = useState<Record<string, string> | null>(null);

  const revealed = names !== null;
  const nameOf = (r: RegisterRow) => (revealed ? names?.[r.id] ?? r.maskedName : r.maskedName);

  // Area facets (with counts) for the chips + grouping.
  const areas = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.area || "Unassigned", (m.get(r.area || "Unassigned") ?? 0) + 1);
    return [...m.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => a.key.localeCompare(b.key));
  }, [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "ALL" && r.status !== status) return false;
      if (area !== "ALL" && (r.area || "Unassigned") !== area) return false;
      if (!term) return true;
      const nm = names?.[r.id] ?? "";
      return (r.id + " " + r.su + " " + r.area + " " + r.coordinator + " " + nm).toLowerCase().includes(term);
    });
  }, [q, status, area, rows, names]);

  // Group the filtered rows by area for the card view.
  const grouped = useMemo(() => {
    const m = new Map<string, RegisterRow[]>();
    for (const r of filtered) {
      const key = r.area || "Unassigned";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    return [...m.entries()]
      .map(([a, rs]) => ({ area: a, rows: rs.sort((x, y) => nameOf(x).localeCompare(nameOf(y))) }))
      .sort((a, b) => a.area.localeCompare(b.area));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, revealed, names]);

  return (
    <>
      <div className="flex between wrap" style={{ gap: 12, marginBottom: 14 }}>
        <div className="flex" style={{ position: "relative", flex: "1 1 300px" }}>
          <span className="ms" style={{ position: "absolute", left: 12, top: 10, color: "var(--text-2)", fontSize: 20 }}>search</span>
          <input className="input" style={{ paddingLeft: 40 }} placeholder="Search by ID, area or coordinator…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex" style={{ gap: 8, alignItems: "center" }}>
          <div className="flex" style={{ gap: 6 }}>
            {(["area", "table"] as const).map((m) => (
              <button key={m} className={`chip${view === m ? " active" : ""}`} onClick={() => setView(m)}>
                <span className="ms" style={{ fontSize: 14 }}>{m === "area" ? "grid_view" : "table_rows"}</span>
                {m === "area" ? "By area" : "Table"}
              </button>
            ))}
          </div>
          {revealed ? (
            <span className="pill tone-amber"><span className="ms" style={{ fontSize: 14 }}>lock_open</span>Revealed — logged</span>
          ) : (
            <PiiRevealButton scope="register" size="md" onReveal={(d) => setNames(d.names ?? {})} />
          )}
        </div>
      </div>

      {/* area facets */}
      <div className="flex wrap" style={{ gap: 8, marginBottom: 8 }}>
        <button className={`chip${area === "ALL" ? " active" : ""}`} onClick={() => setArea("ALL")}>
          <span className="ms" style={{ fontSize: 14 }}>pin_drop</span>All areas · {rows.length}
        </button>
        {areas.map((a) => (
          <button key={a.key} className={`chip${area === a.key ? " active" : ""}`} onClick={() => setArea(a.key)}>{a.key} · {a.count}</button>
        ))}
      </div>

      {/* status facets */}
      <div className="flex wrap" style={{ gap: 8, marginBottom: 14 }}>
        <button className={`chip${status === "ALL" ? " active" : ""}`} onClick={() => setStatus("ALL")}>All statuses · {rows.length}</button>
        {statuses.map((s) => (
          <button key={s.key} className={`chip${status === s.key ? " active" : ""}`} onClick={() => setStatus(s.key)}>{s.label} · {s.count}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="muted">No clients match.</p>
      ) : view === "area" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {grouped.map((g) => (
            <section key={g.area}>
              <div className="flex" style={{ gap: 8, alignItems: "center", marginBottom: 10 }}>
                <span className="ms" style={{ fontSize: 18, color: "var(--accent)" }}>pin_drop</span>
                <h2 style={{ margin: 0, fontSize: 15 }}>{g.area}</h2>
                <span className="pill tone-grey">{g.rows.length}</span>
              </div>
              <div className="grid cols-3">
                {g.rows.map((r) => (
                  <Link key={r.id} href={`/clients/${r.id}`} className="card client-card">
                    <div className="flex between" style={{ gap: 8, alignItems: "flex-start" }}>
                      <div className="flex" style={{ gap: 10, minWidth: 0 }}>
                        <div className="cc-avatar">
                          <span className="ms" style={{ fontSize: 18 }}>{revealed ? "person" : "lock"}</span>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nameOf(r)}</div>
                          <div className="code" style={{ display: "inline-block", marginTop: 3 }}>{r.su}</div>
                        </div>
                      </div>
                      <span className={`pill tone-${r.statusTone}`}>{r.statusLabel}</span>
                    </div>
                    <div className="cc-meta">
                      <span><span className="ms">schedule</span>{r.hoursWk}</span>
                      <span><span className="ms">badge</span>{r.coordinator}</span>
                      <span><span className="ms">account_balance</span>{r.funding}</span>
                    </div>
                    {r.flags.length > 0 && (
                      <div className={`pill tone-${r.reviewTone}`} style={{ marginTop: 10, fontSize: 11 }}>
                        <span className="ms" style={{ fontSize: 13 }}>flag</span>{r.flags[0]}{r.flags.length > 1 ? ` +${r.flags.length - 1}` : ""}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Client</th><th>Area</th><th>Status</th><th>Coordinator</th><th>Hours / wk</th><th>Flags</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="flex" style={{ gap: 8 }}>
                      <span className="ms" style={{ fontSize: 16, color: revealed ? "var(--accent)" : "var(--text-2)" }}>{revealed ? "person" : "lock"}</span>
                      <div>
                        <div style={{ fontWeight: 700 }}>{nameOf(r)}</div>
                        <div className="code" style={{ display: "inline-block", marginTop: 2 }}>{r.su}</div>
                      </div>
                    </div>
                  </td>
                  <td className="muted">{r.area}</td>
                  <td><span className={`pill tone-${r.statusTone}`}>{r.statusLabel}</span></td>
                  <td className="muted">{r.coordinator}</td>
                  <td className="muted">{r.hoursWk}</td>
                  <td>
                    {r.flags.length > 0 ? (
                      <span className={`pill tone-${r.reviewTone}`}><span className="ms" style={{ fontSize: 13 }}>flag</span>{r.flags.length}</span>
                    ) : <span className="muted">—</span>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link href={`/clients/${r.id}`} className="btn" style={{ padding: "5px 11px", fontSize: 12.5 }}>Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
