"use client";

import { useMemo, useState } from "react";
import Empty from "@/components/Empty";
import Link from "next/link";
import PiiRevealButton from "@/components/PiiRevealButton";
import { useToast } from "@/components/Toast";

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
  plannedHours: string | null;
  deliveredHours: string | null;
  deliveredShort: boolean;
  unassigned: number;
  soon24: number;
  soonLabel: string | null;
  newNotes: number;
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
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: "name", dir: 1 });
  const toast = useToast();

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

  // Sorted rows for the table view (clickable column headers).
  const sortVal = (r: RegisterRow, key: string): string | number => {
    switch (key) {
      case "name": return nameOf(r).toLowerCase();
      case "area": return (r.area || "").toLowerCase();
      case "status": return r.statusLabel.toLowerCase();
      case "coord": return r.coordinator.toLowerCase();
      case "hours": return parseFloat(r.hoursWk) || 0;
      default: return "";
    }
  };
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const va = sortVal(a, sort.key), vb = sortVal(b, sort.key);
      if (va < vb) return -sort.dir;
      if (va > vb) return sort.dir;
      return 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sort, names]);

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
      <div className="reg-toolbar">
        <div className="reg-search">
          <span className="ms" aria-hidden="true">search</span>
          <input className="input" placeholder="Search by ID, area or coordinator…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="seg" role="group" aria-label="View">
          {(["area", "table"] as const).map((m) => (
            <button key={m} className={`seg-btn${view === m ? " active" : ""}`} aria-pressed={view === m} onClick={() => setView(m)}>
              <span className="ms" style={{ fontSize: 15 }} aria-hidden="true">{m === "area" ? "grid_view" : "table_rows"}</span>
              {m === "area" ? "By area" : "Table"}
            </button>
          ))}
        </div>
        {revealed ? (
          <span className="pill tone-amber"><span className="ms" style={{ fontSize: 14 }} aria-hidden="true">lock_open</span>Revealed — logged</span>
        ) : (
          <PiiRevealButton scope="register" size="sm" onReveal={(d) => { setNames(d.names ?? {}); toast("Client names revealed — access logged", "info"); }} />
        )}
      </div>

      <div className="reg-filters">
        <div className="reg-filter-row">
          <span className="reg-filter-label">Area</span>
          <div className="reg-chips">
            <button className={`chip${area === "ALL" ? " active" : ""}`} onClick={() => setArea("ALL")}>All · {rows.length}</button>
            {areas.map((a) => (
              <button key={a.key} className={`chip${area === a.key ? " active" : ""}`} onClick={() => setArea(a.key)}>{a.key} · {a.count}</button>
            ))}
          </div>
        </div>
        <div className="reg-filter-row">
          <span className="reg-filter-label">Status</span>
          <div className="reg-chips">
            <button className={`chip${status === "ALL" ? " active" : ""}`} onClick={() => setStatus("ALL")}>All · {rows.length}</button>
            {statuses.map((s) => (
              <button key={s.key} className={`chip${status === s.key ? " active" : ""}`} onClick={() => setStatus(s.key)}>{s.label} · {s.count}</button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty icon="search_off" title="No clients match" hint="Try clearing a filter or search term." />
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
                      <span><span className="ms">schedule</span>{r.hoursWk} contracted</span>
                      <span title="Delivered / planned this week (uncovered calls and pauses aren't delivered)" style={r.deliveredShort ? { color: "var(--amber-fg)" } : undefined}>
                        <span className="ms">timelapse</span>{r.deliveredHours ?? "—"} / {r.plannedHours ?? "—"} this week
                      </span>
                      <span><span className="ms">badge</span>{r.coordinator}</span>
                    </div>
                    {(r.flags.length > 0 || r.unassigned > 0 || r.newNotes > 0) && (
                      <div className="flex wrap" style={{ gap: 6, marginTop: 10 }}>
                        {r.soon24 > 0 && (
                          <span className="pill tone-red urgent-soon" style={{ fontSize: 11 }}>
                            <span className="ms" style={{ fontSize: 13 }}>alarm</span>
                            {r.soon24 === 1 && r.soonLabel ? `Unassigned call in ${r.soonLabel}` : `${r.soon24} unassigned in next 24h`}
                          </span>
                        )}
                        {r.unassigned > 0 && (
                          <span className="pill tone-red" style={{ fontSize: 11 }}>
                            <span className="ms" style={{ fontSize: 13 }}>person_alert</span>{r.unassigned} unassigned call{r.unassigned === 1 ? "" : "s"}
                          </span>
                        )}
                        {r.newNotes > 0 && (
                          <span className="pill tone-blue" style={{ fontSize: 11 }}>
                            <span className="ms" style={{ fontSize: 13 }}>sticky_note_2</span>New diary note{r.newNotes === 1 ? "" : `s (${r.newNotes})`}
                          </span>
                        )}
                        {r.flags.length > 0 && (
                          <span className={`pill tone-${r.reviewTone}`} style={{ fontSize: 11 }}>
                            <span className="ms" style={{ fontSize: 13 }}>flag</span>{r.flags[0]}{r.flags.length > 1 ? ` +${r.flags.length - 1}` : ""}
                          </span>
                        )}
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
                {([["name", "Client"], ["area", "Area"], ["status", "Status"], ["coord", "Coordinator"], ["hours", "Hours / wk"]] as const).map(([k, label]) => (
                  <th key={k} className="th-sort" aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
                    onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : 1 }))}>
                    <span className="flex" style={{ gap: 4, alignItems: "center" }}>
                      {label}
                      <span className="ms" style={{ fontSize: 14, opacity: sort.key === k ? 0.85 : 0.28 }}>
                        {sort.key === k ? (sort.dir === 1 ? "arrow_upward" : "arrow_downward") : "unfold_more"}
                      </span>
                    </span>
                  </th>
                ))}
                <th>Flags</th><th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
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
                  <td className="muted">{r.hoursWk}<div style={{ fontSize: 11, color: r.deliveredShort ? "var(--amber-fg)" : undefined }}>{r.deliveredHours ?? "—"} / {r.plannedHours ?? "—"} this wk</div></td>
                  <td>
                    <div className="flex wrap" style={{ gap: 5 }}>
                      {r.soon24 > 0 && <span className="pill tone-red urgent-soon" style={{ fontSize: 10.5 }}><span className="ms" style={{ fontSize: 12 }}>alarm</span>{r.soon24 === 1 && r.soonLabel ? `in ${r.soonLabel}` : `${r.soon24}·24h`}</span>}
                      {r.unassigned > 0 && <span className="pill tone-red" style={{ fontSize: 10.5 }}><span className="ms" style={{ fontSize: 12 }}>person_alert</span>{r.unassigned}</span>}
                      {r.newNotes > 0 && <span className="pill tone-blue" style={{ fontSize: 10.5 }}><span className="ms" style={{ fontSize: 12 }}>sticky_note_2</span>Note</span>}
                      {r.flags.length > 0 && <span className={`pill tone-${r.reviewTone}`} style={{ fontSize: 10.5 }}><span className="ms" style={{ fontSize: 12 }}>flag</span>{r.flags.length}</span>}
                      {r.soon24 === 0 && r.unassigned === 0 && r.newNotes === 0 && r.flags.length === 0 && <span className="muted">—</span>}
                    </div>
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
