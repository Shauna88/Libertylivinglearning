"use client";

import { useState } from "react";
import Empty from "@/components/Empty";
import type { ActivityEvent } from "@/lib/db";

const KINDS: { key: string; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "ecm", label: "Clock in / out" },
  { key: "diary", label: "Diary notes" },
  { key: "cover", label: "Cover" },
  { key: "system", label: "System" },
];

function when(iso: string) {
  return new Date(iso).toLocaleString("en-IE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * A carer's own activity feed — clock-ins / clock-outs, visit diary notes, cover
 * they picked up and system actions — with the same faceted-filter layout as the
 * client timeline. Client names shown here are already masked by the caller.
 */
export default function CarerTimeline({ events }: { events: ActivityEvent[] }) {
  const [filter, setFilter] = useState("ALL");
  const present = new Set(events.map((e) => e.kind));
  const facets = KINDS.filter((k) => k.key === "ALL" || present.has(k.key));
  const shown = filter === "ALL" ? events : events.filter((e) => e.kind === filter);

  if (events.length === 0) {
    return <Empty icon="history" title="No activity recorded yet" hint="Clock-ins, clock-outs and visit diary notes appear here as calls are delivered." />;
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
              {e.by && <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>· recorded by {e.by}</div>}
            </div>
          </div>
        ))}
        {shown.length === 0 && <div className="muted" style={{ fontSize: 13, padding: "8px 0" }}>Nothing of this type yet.</div>}
      </div>
    </div>
  );
}
