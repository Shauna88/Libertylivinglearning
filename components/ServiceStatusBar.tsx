import Link from "next/link";
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
 * the figure on hover/focus (which calls, which incident), then links through.
 * Renders nothing when everything is clear.
 */
export default function ServiceStatusBar({ vitals }: { vitals: ServiceVitals }) {
  const items = ROWS.map((r) => ({ ...r, vital: vitals[r.key] as Vital })).filter((r) => r.vital.n > 0);

  if (items.length === 0) return null;

  const urgent = items.some((i) => i.tone === "red");

  return (
    <div className={`svc-status${urgent ? " urgent" : ""}`} role="region" aria-label="Service status">
      <span className="svc-status-lead">
        <span className="ms" aria-hidden="true" style={{ fontSize: 16 }}>{urgent ? "priority_high" : "info"}</span>
        Service status
      </span>
      <div className="svc-status-items">
        {items.map((i) => {
          const label = `${i.noun}${i.vital.n === 1 ? "" : "s"}${i.rest ? ` ${i.rest}` : ""}`;
          const hidden = i.vital.n - i.vital.items.length;
          return (
            <span key={i.key} className="svc-chip-wrap">
              <Link href={i.href} className={`svc-chip tone-${i.tone}`}>
                <span className="ms" aria-hidden="true" style={{ fontSize: 13 }}>{i.icon}</span>
                <strong>{i.vital.n}</strong> {label}
                <span className="ms svc-chip-caret" aria-hidden="true" style={{ fontSize: 14 }}>expand_more</span>
              </Link>
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
                <div className="svc-pop-foot">
                  Open <span className="ms" aria-hidden="true" style={{ fontSize: 13 }}>arrow_forward</span>
                </div>
              </div>
            </span>
          );
        })}
      </div>
    </div>
  );
}
