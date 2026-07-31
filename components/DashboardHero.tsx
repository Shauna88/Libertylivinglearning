import Link from "next/link";

export type HeroAction = { icon: string; tone: string; text: string; href: string };
export type HeroStat = { n: number | string; label: string; tone?: string; href?: string };

/**
 * The "blend" dashboard hero: a single band that leads with what needs the
 * person now (the top ranked actions) and carries the key figures alongside,
 * so the dashboard reads at a glance before the detail below. One focal point
 * instead of a wall of equal-weight tiles.
 */
export default function DashboardHero({
  eyebrow,
  actions,
  stats,
  note,
  clearText = "You're all clear",
  clearSub = "Nothing needs you right now.",
}: {
  eyebrow: string;
  actions: HeroAction[];
  stats: HeroStat[];
  note?: string;
  clearText?: string;
  clearSub?: string;
}) {
  // Lead with the most urgent: red before amber before the rest, order kept otherwise.
  const rank = (t: string) => (t === "red" ? 0 : t === "amber" ? 1 : 2);
  const ranked = [...actions].sort((a, b) => rank(a.tone) - rank(b.tone));
  const top = ranked.slice(0, 2);
  const more = actions.length - top.length;

  return (
    <section className={`dash-hero${stats.length === 0 ? " solo" : ""}`}>
      <div className="dash-hero-main">
        <div className="dash-hero-eyebrow">{eyebrow}</div>
        {top.length === 0 ? (
          <div className="dash-hero-clear">
            <span className="ms" aria-hidden="true" style={{ fontSize: 26 }}>task_alt</span>
            <div>
              <div className="dash-hero-clear-title">{clearText}</div>
              <div className="dash-hero-sub">{clearSub}</div>
            </div>
          </div>
        ) : (
          <>
            <div className="dash-hero-label">
              <span className="ms" aria-hidden="true" style={{ fontSize: 15 }}>priority_high</span>
              Needs you now
            </div>
            <ul className="dash-hero-actions">
              {top.map((a, i) => (
                <li key={i}>
                  <Link href={a.href} className={`dash-hero-action tone-${a.tone}`}>
                    <span className={`dash-hero-dot tone-${a.tone}`}>
                      <span className="ms" aria-hidden="true" style={{ fontSize: 16 }}>{a.icon}</span>
                    </span>
                    <span className="dash-hero-action-text">{a.text}</span>
                    <span className="ms dash-hero-go" aria-hidden="true" style={{ fontSize: 18 }}>arrow_forward</span>
                  </Link>
                </li>
              ))}
            </ul>
            {more > 0 && (
              <div className="dash-hero-more">
                +{more} more action{more === 1 ? "" : "s"} in your to-do list below
              </div>
            )}
          </>
        )}
        {note && <div className="dash-hero-note">{note}</div>}
      </div>

      {stats.length > 0 && (
        <div className="dash-hero-stats">
          {stats.map((s, i) => {
            const inner = (
              <>
                <div className={`dash-hero-stat-num${s.tone ? ` tone-${s.tone}` : ""}`}>{s.n}</div>
                <div className="dash-hero-stat-lbl">{s.label}</div>
              </>
            );
            return s.href ? (
              <Link key={i} href={s.href} className="dash-hero-stat">{inner}</Link>
            ) : (
              <div key={i} className="dash-hero-stat">{inner}</div>
            );
          })}
        </div>
      )}
    </section>
  );
}
