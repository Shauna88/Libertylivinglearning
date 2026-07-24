"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { callType, causeLabel, billingLabel } from "@/lib/callevents";

export type CallEvent = {
  id: number;
  client_id: string | null;
  su: string | null;
  area: string | null;
  visit_time: string | null;
  kind: string;
  cause: string | null;
  carer: string | null;
  event_date: string | null;
  date_to: string | null;
  resolved: boolean;
  detail: string;
  logged_by: string;
  created_at: string;
};

function fmtDateTime(s: string) {
  return new Date(s).toLocaleString("en-IE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IE", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CallLogList({ events }: { events: CallEvent[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);

  async function send(id: number, method: "PATCH" | "DELETE", body: Record<string, unknown>) {
    setBusy(id);
    try {
      const res = await fetch("/api/call-log", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (events.length === 0) return <div className="card muted">No call events logged.</div>;

  return (
    <div className="grid" style={{ gap: 10 }}>
      {events.map((c) => {
        const t = callType(c.kind);
        const tone = t?.tone ?? "grey";
        const needsFollowUp = !!t?.followUp && !c.resolved;
        const when = t?.pause
          ? `${c.event_date ? fmtDate(c.event_date) : ""}${c.date_to ? " → " + fmtDate(c.date_to) : ""}`
          : `${fmtDateTime(c.created_at)}${c.visit_time ? " · call " + c.visit_time : ""}`;
        return (
          <div
            key={c.id}
            className="card"
            style={{ borderLeft: `4px solid var(--${needsFollowUp ? "red" : tone}-fg)`, opacity: c.resolved ? 0.72 : 1 }}
          >
            <div className="flex between wrap" style={{ gap: 8 }}>
              <div className="flex wrap" style={{ gap: 8, alignItems: "center" }}>
                <span className={`pill tone-${tone}`}>{t?.label ?? c.kind}</span>
                {c.su && <span className="code">{c.su}</span>}
                {c.area && <span className="muted" style={{ fontSize: 12 }}>{c.area}</span>}
                {c.cause && <span className="pill tone-grey">{causeLabel(c.cause)}</span>}
                {c.carer && <span className="muted" style={{ fontSize: 12 }}>· {c.carer}</span>}
              </div>
              <span className="muted" style={{ fontSize: 11.5 }}>{when}</span>
            </div>

            <p style={{ fontSize: 13, margin: "8px 0 8px" }}>{c.detail}</p>

            <div className="flex between wrap" style={{ gap: 8, alignItems: "center" }}>
              <div className="flex wrap" style={{ gap: 8, alignItems: "center" }}>
                {t && <span className="tag-cover" title="Default finance treatment">{billingLabel(t.billing)}</span>}
                {needsFollowUp && <span className="pill tone-red">Needs follow-up</span>}
                {c.resolved && <span className="pill tone-green">Resolved</span>}
                <span className="muted" style={{ fontSize: 11 }}>logged by {c.logged_by}</span>
              </div>
              <div className="flex" style={{ gap: 8 }}>
                <button className="mini" disabled={busy === c.id} onClick={() => send(c.id, "PATCH", { resolved: !c.resolved })}>
                  {c.resolved ? "Reopen" : "Mark resolved"}
                </button>
                <button
                  className="mini"
                  disabled={busy === c.id}
                  onClick={() => {
                    if (confirm("Delete this call event?")) send(c.id, "DELETE", {});
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
