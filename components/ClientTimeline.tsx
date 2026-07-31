"use client";

import { useState } from "react";
import type { ActivityEvent } from "@/lib/db";

const KINDS: { key: string; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "note", label: "Care notes" },
  { key: "call", label: "Call events" },
  { key: "cover", label: "Cover" },
  { key: "assessment", label: "Assessments" },
  { key: "ecm", label: "Check-ins" },
];

function when(iso: string) {
  return new Date(iso).toLocaleString("en-IE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ClientTimeline({ events }: { events: ActivityEvent[] }) {
  const [filter, setFilter] = useState("ALL");
  const present = new Set(events.map((e) => e.kind));
  const facets = KINDS.filter((k) => k.key === "ALL" || present.has(k.key));
  const shown = filter === "ALL" ? events : events.filter((e) => e.kind === filter);

  if (events.length === 0) {
    return <div className="card muted">No activity recorded yet.</div>;
  }

  return (
    <div className="card">
      <div className="flex wrap" style={{ gap: 6, marginBottom: 14 }}>
        {facets.map((f) => (
          <button key={f.key} className={`chip${filter === f.key ? " active" : ""}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {shown.map((e, i) => (
          <div key={i} className="flex" style={{ gap: 12, alignItems: "flex-start", padding: "10px 0", borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
            <div
              className="flex"
              style={{
                width: 30, height: 30, flex: "0 0 30px", borderRadius: 8, alignItems: "center", justifyContent: "center",
                background: `var(--${e.tone}-bg)`, color: `var(--${e.tone}-fg)`,
              }}
            >
              <span className="ms" style={{ fontSize: 17 }}>{e.icon}</span>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="flex between wrap" style={{ gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{e.title}</span>
                <span className="muted" style={{ fontSize: 11.5, whiteSpace: "nowrap" }}>{when(e.at)}</span>
              </div>
              {e.detail && <p className="muted" style={{ fontSize: 12.5, margin: "3px 0 0", lineHeight: 1.5 }}>{e.detail}</p>}
              {e.by && <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>· {e.by}</div>}
            </div>
          </div>
        ))}
        {shown.length === 0 && <div className="muted" style={{ fontSize: 13, padding: "8px 0" }}>Nothing of this type yet.</div>}
      </div>
    </div>
  );
}
