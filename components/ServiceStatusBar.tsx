"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ServiceVitals, Vital } from "@/lib/db";

export type { ServiceVitals };

type Row = { key: keyof ServiceVitals; noun: string; rest: string; href: string; tone: string; icon: string };

const ROWS: Row[] = [
  { key: "uncovered", noun: "uncovered call", rest: "", href: "/roster", tone: "red", icon: "event_busy" },
  { key: "missedVisits", noun: "call", rest: "with no check-in", href: "/ecm", tone: "red", icon: "notification_important" },
  { key: "carersNotCleared", noun: "carer", rest: "not cleared to roster", href: "/compliance", tone: "red", icon: "block" },
  { key: "openSafeguarding", noun: "safeguarding concern", rest: "open", href: "/safeguarding", tone: "red", icon: "shield" },
  { key: "reviewsOverdue", noun: "care-plan review", rest: "overdue", href: "/compliance", tone: "amber", icon: "event_repeat" },
  { key: "openComplaints", noun: "complaint", rest: "open", href: "/complaints", tone: "amber", icon: "forum" },
  { key: "openIncidents", noun: "incident", rest: "open", href: "/incidents", tone: "amber", icon: "crisis_alert" },
];

/**
 * A slim, service-wide status bar shown the same to every office login — so no
 * department misses a vital signal. Each chip reveals the actual items behind
 * the figure (which calls, which incident); the panel opens on hover on desktop
 * and on tap on touch devices (where there is no hover), then links through via
 * the "Open" action. Renders nothing when everything is clear.
 */
export default function ServiceStatusBar({ vitals }: { vitals: ServiceVitals }) {
  const items = ROWS.map((r) => ({ ...r, vital: vitals[r.key] as Vital })).filter((r) => r.vital.n > 0);

  const [openKey, setOpenKey] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Tap-opened panels close on an outside tap or Escape.
  useEffect(() => {
    if (!openKey) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpenKey(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenKey(null);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [openKey]);

  if (items.length === 0) return null;

  const urgent = items.some((i) => i.tone === "red");

  return (
    <div ref={rootRef} className={`svc-status${urgent ? " urgent" : ""}`} role="region" aria-label="Service status">
      <span className="svc-status-lead">
        <span className={`svc-status-dot tone-${urgent ? "red" : "amber"}`} aria-hidden="true" />
        <span className="ms" aria-hidden="true" style={{ fontSize: 16 }}>{urgent ? "priority_high" : "info"}</span>
        Service status
        <span className="svc-status-count">{items.reduce((n, i) => n + i.vital.n, 0)}</span>
      </span>
      <div className="svc-status-items">
        {items.map((i) => {
          const label = `${i.noun}${i.vital.n === 1 ? "" : "s"}${i.rest ? ` ${i.rest}` : ""}`;
          const hidden = i.vital.n - i.vital.items.length;
          const key = String(i.key);
          const open = openKey === key;
          return (
            <span key={key} className={`svc-chip-wrap${open ? " open" : ""}`}>
              <button
                type="button"
                className={`svc-chip tone-${i.tone}`}
                aria-expanded={open}
                aria-label={`${i.vital.n} ${label} — show details`}
                onClick={() => setOpenKey(open ? null : key)}
              >
                <span className={`svc-chip-n tone-${i.tone}`} aria-hidden="true">{i.vital.n}</span>
                <span className="ms svc-chip-ic" aria-hidden="true" style={{ fontSize: 14 }}>{i.icon}</span>
                {label}
                <span className="ms svc-chip-caret" aria-hidden="true" style={{ fontSize: 14 }}>expand_more</span>
              </button>
              <div className="svc-pop" role="tooltip">
                <div className={`svc-pop-head tone-${i.tone}`}>
                  <span className="ms" aria-hidden="true" style={{ fontSize: 15 }}>{i.icon}</span>
                  {i.vital.n} {label}
                </div>
                <ul className="svc-pop-list">
                  {i.vital.items.map((it, idx) => (
                    <li key={idx}>
                      <span className="svc-pop-label">{it.label}</span>
                      {it.sub && <span className="svc-pop-sub">{it.sub}</span>}
                    </li>
                  ))}
                </ul>
                {hidden > 0 && <div className="svc-pop-more">+{hidden} more</div>}
                <Link href={i.href} className="svc-pop-foot" onClick={() => setOpenKey(null)}>
                  Open <span className="ms" aria-hidden="true" style={{ fontSize: 13 }}>arrow_forward</span>
                </Link>
              </div>
            </span>
          );
        })}
      </div>
    </div>
  );
}
