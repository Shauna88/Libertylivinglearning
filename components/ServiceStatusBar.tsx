import Link from "next/link";

export type ServiceVitals = {
  uncovered: number;
  missedVisits: number;
  carersNotCleared: number;
  reviewsOverdue: number;
  openSafeguarding: number;
  openComplaints: number;
  openIncidents: number;
};

/**
 * A slim, service-wide status bar shown the same to every office login — so no
 * department misses a vital signal. Renders nothing when everything is clear.
 */
export default function ServiceStatusBar({ vitals }: { vitals: ServiceVitals }) {
  const items: { n: number; noun: string; rest: string; href: string; tone: string; icon: string }[] = [
    { n: vitals.uncovered, noun: "uncovered call", rest: "", href: "/roster", tone: "red", icon: "event_busy" },
    { n: vitals.missedVisits, noun: "call", rest: "with no check-in", href: "/ecm", tone: "red", icon: "notification_important" },
    { n: vitals.carersNotCleared, noun: "carer", rest: "not cleared to roster", href: "/compliance", tone: "red", icon: "block" },
    { n: vitals.openSafeguarding, noun: "safeguarding concern", rest: "open", href: "/safeguarding", tone: "red", icon: "shield" },
    { n: vitals.reviewsOverdue, noun: "care-plan review", rest: "overdue", href: "/compliance", tone: "amber", icon: "event_repeat" },
    { n: vitals.openComplaints, noun: "complaint", rest: "open", href: "/complaints", tone: "amber", icon: "forum" },
    { n: vitals.openIncidents, noun: "incident", rest: "open", href: "/incidents", tone: "amber", icon: "crisis_alert" },
  ].filter((i) => i.n > 0);

  if (items.length === 0) return null;

  const urgent = items.some((i) => i.tone === "red");

  return (
    <div className={`svc-status${urgent ? " urgent" : ""}`}>
      <span className="svc-status-lead">
        <span className="ms" style={{ fontSize: 16 }}>{urgent ? "priority_high" : "info"}</span>
        Service status
      </span>
      <div className="svc-status-items">
        {items.map((i) => (
          <Link key={i.noun} href={i.href} className={`svc-chip tone-${i.tone}`}>
            <span className="ms" style={{ fontSize: 13 }}>{i.icon}</span>
            <strong>{i.n}</strong> {i.noun}{i.n === 1 ? "" : "s"}{i.rest ? ` ${i.rest}` : ""}
          </Link>
        ))}
      </div>
    </div>
  );
}
