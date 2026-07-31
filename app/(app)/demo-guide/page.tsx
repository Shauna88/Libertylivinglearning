import Link from "next/link";

/**
 * Team-demo Q&A — a plain-English FAQ that frames what the shared demo login
 * shows and how each area helps. Linked from the demo dashboard and sidebar.
 */

type QA = { q: string; a: React.ReactNode };
type Section = { title: string; icon: string; items: QA[] };

const SECTIONS: Section[] = [
  {
    title: "About this demo",
    icon: "info",
    items: [
      {
        q: "What am I looking at?",
        a: (
          <>
            A guided, read-only tour of Liberty Living&rsquo;s quality &amp; care platform. It shows the
            front-line tools — <Link href="/complaints">complaints</Link> and{" "}
            <Link href="/incidents">incidents</Link>, the <Link href="/frontline">Front-line Guide</Link>,{" "}
            <Link href="/training">training</Link> and the <Link href="/sops">SOP Library</Link> — plus the
            kind of daily snapshot the office team works from.
          </>
        ),
      },
      {
        q: "Can I change anything?",
        a: "No — this login is read-only, so you can open and read everything but nothing you do is saved. It's safe to click around.",
      },
      {
        q: "Is this real client data?",
        a: "No. Everything here is realistic sample data built for the demo. Real client names are always masked behind a logged reveal step (GDPR — special-category data) in the live system.",
      },
    ],
  },
  {
    title: "Complaints & incidents",
    icon: "crisis_alert",
    items: [
      {
        q: "What does the complaints register do?",
        a: "Every complaint is logged with how it was received, a severity grade, the 5-day acknowledgement, the outcome, and whether it went to the Ombudsman or into a quality-improvement action — so nothing slips and the whole history is in one place.",
      },
      {
        q: "And incidents?",
        a: "Incidents capture the NIMS reference, a proportionate category, whether open disclosure happened, and any external notification — the mandated fields, with a completeness check on each record.",
      },
      {
        q: "Who can see them?",
        a: "Front-line carers can log a complaint or incident but only see the ones they raised. The management team sees the whole register and signs each one off. This demo shows the management (read-only) view.",
      },
    ],
  },
  {
    title: "Guidance, training & SOPs",
    icon: "school",
    items: [
      {
        q: "What's the Front-line Guide?",
        a: "Plain-English 'what do I do if…' guidance for carers — pick a situation and it shows the right steps for your role, tied back to the relevant policy.",
      },
      {
        q: "How does training work?",
        a: "The Staff Training Hub holds every course and learning pathway. Each person's completions are tracked, so managers can see who is up to date and who needs a nudge.",
      },
      {
        q: "What's in the SOP Library?",
        a: "The Standard Operating Procedures — each one laid out as numbered steps with the responsible role and the timeframe, so there's one agreed way to do things.",
      },
    ],
  },
  {
    title: "The daily dashboard",
    icon: "space_dashboard",
    items: [
      {
        q: "What does the daily dashboard show?",
        a: (
          <>
            A snapshot of what needs attention today — uncovered calls, open complaints and incidents, and
            active clients. In the live system each management role gets its own version (rostering, finance,
            quality, on-call), leading with a ranked list of what needs them that day. Open the{" "}
            <Link href="/dashboard">dashboard</Link> to see the demo version.
          </>
        ),
      },
      {
        q: "Why does it matter?",
        a: "It turns a pile of separate spreadsheets and inboxes into one prioritised view, so the team starts the day knowing exactly what to act on first.",
      },
    ],
  },
];

export default function DemoGuidePage() {
  return (
    <>
      <header className="header">
        <div className="flex" style={{ gap: 8, marginBottom: 6 }}>
          <span className="pill tone-teal"><span className="ms" style={{ fontSize: 14 }}>help</span>Demo Q&amp;A</span>
        </div>
        <h1>Questions &amp; answers</h1>
        <p>A quick guide to what this demo shows and how each part helps the team day to day.</p>
      </header>
      <div className="body fade">
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <div className="flex" style={{ gap: 8, alignItems: "center", marginBottom: 10 }}>
                <span className="ms" style={{ fontSize: 18, color: "var(--accent)" }}>{s.icon}</span>
                <h2 style={{ margin: 0, fontSize: 15 }}>{s.title}</h2>
              </div>
              <div className="grid" style={{ gap: 12 }}>
                {s.items.map((it) => (
                  <div key={it.q} className="card">
                    <h3 style={{ margin: "0 0 6px", fontSize: 14 }}>{it.q}</h3>
                    <p className="muted" style={{ fontSize: 13, margin: 0, lineHeight: 1.55 }}>{it.a}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
