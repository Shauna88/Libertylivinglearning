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
  const [names, setNames] = useState<Record<string, string> | null>(null);

  const revealed = names !== null;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "ALL" && r.status !== status) return false;
      if (!term) return true;
      const nm = names?.[r.id] ?? "";
      return (r.id + " " + r.su + " " + r.area + " " + r.coordinator + " " + nm).toLowerCase().includes(term);
    });
  }, [q, status, rows, names]);

  return (
    <>
      <div className="flex between wrap" style={{ gap: 12, marginBottom: 14 }}>
        <div className="flex" style={{ position: "relative", flex: "1 1 320px" }}>
          <span className="ms" style={{ position: "absolute", left: 12, top: 10, color: "var(--text-2)", fontSize: 20 }}>
            search
          </span>
          <input
            className="input"
            style={{ paddingLeft: 40 }}
            placeholder="Search by ID, area or coordinator…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {revealed ? (
          <span className="pill tone-amber">
            <span className="ms" style={{ fontSize: 14 }}>
              lock_open
            </span>
            Identifiable data revealed — access logged
          </span>
        ) : (
          <PiiRevealButton scope="register" size="md" onReveal={(d) => setNames(d.names ?? {})} />
        )}
      </div>

      <div className="flex wrap" style={{ gap: 8, marginBottom: 12 }}>
        <button className={`chip${status === "ALL" ? " active" : ""}`} onClick={() => setStatus("ALL")}>
          All · {rows.length}
        </button>
        {statuses.map((s) => (
          <button key={s.key} className={`chip${status === s.key ? " active" : ""}`} onClick={() => setStatus(s.key)}>
            {s.label} · {s.count}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Client</th>
              <th>Area</th>
              <th>Status</th>
              <th>Coordinator</th>
              <th>Hours / wk</th>
              <th>Flags</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="flex" style={{ gap: 8 }}>
                    <span className="ms" style={{ fontSize: 16, color: revealed ? "var(--accent)" : "var(--text-2)" }}>
                      {revealed ? "person" : "lock"}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700 }}>{revealed ? names?.[r.id] ?? r.maskedName : r.maskedName}</div>
                      <div className="code" style={{ display: "inline-block", marginTop: 2 }}>
                        {r.su}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="muted">{r.area}</td>
                <td>
                  <span className={`pill tone-${r.statusTone}`}>{r.statusLabel}</span>
                </td>
                <td className="muted">{r.coordinator}</td>
                <td className="muted">{r.hoursWk}</td>
                <td>
                  {r.flags.length > 0 ? (
                    <span className={`pill tone-${r.reviewTone}`}>
                      <span className="ms" style={{ fontSize: 13 }}>
                        flag
                      </span>
                      {r.flags.length}
                    </span>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td style={{ textAlign: "right" }}>
                  <Link href={`/clients/${r.id}`} className="btn" style={{ padding: "5px 11px", fontSize: 12.5 }}>
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <p className="muted">No clients match.</p>}
    </>
  );
}
