import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CRM_ROLES, WORKFORCE_ROLES, OVERSIGHT_ROLES, listCarers, listAllCompliance, type Role } from "@/lib/db";
import {
  COMPLIANCE_ITEMS,
  COMPLIANCE_ITEM,
  complianceStatus,
  summariseCompliance,
  statusTone,
  daysPhrase,
  EXPIRING_WINDOW_DAYS,
  type ComplianceStatus,
} from "@/lib/compliance";

const CAN_VIEW: Role[] = [...new Set([...CRM_ROLES, ...WORKFORCE_ROLES, ...OVERSIGHT_ROLES])] as Role[];

export default async function CompliancePage() {
  const session = await auth();
  if (!CAN_VIEW.includes(session!.user.role as Role)) redirect("/dashboard");

  const now = new Date();
  const [carers, allCompliance] = await Promise.all([listCarers(), listAllCompliance()]);

  // Group held credentials by carer.
  const byCarer = new Map<string, { itemKey: string; expiry: string | null }[]>();
  for (const r of allCompliance) {
    if (!byCarer.has(r.carer_id)) byCarer.set(r.carer_id, []);
    byCarer.get(r.carer_id)!.push({ itemKey: r.item_key, expiry: r.expiry });
  }

  const active = carers.filter((c) => c.status === "active");
  const rows = active.map((c) => {
    const held = byCarer.get(c.id) ?? [];
    const summary = summariseCompliance(held.map((h) => ({ itemKey: h.itemKey, held: true, expiry: h.expiry })), now);
    // The specific credentials needing attention (expired / expiring / missing).
    const heldMap = new Map(held.map((h) => [h.itemKey, h.expiry]));
    const attention = COMPLIANCE_ITEMS.map((it) => {
      const has = heldMap.has(it.key);
      const st = complianceStatus(has, heldMap.get(it.key) ?? null, now);
      return { item: it, st };
    }).filter((x) => x.st.status !== "valid");
    return { carer: c, summary, attention };
  });

  const rank: Record<ComplianceStatus, number> = { expired: 0, missing: 1, expiring: 2, valid: 3 };
  rows.sort((a, b) => {
    if (a.summary.blockedFromRoster !== b.summary.blockedFromRoster) return a.summary.blockedFromRoster ? -1 : 1;
    if (rank[a.summary.worst] !== rank[b.summary.worst]) return rank[a.summary.worst] - rank[b.summary.worst];
    return b.attention.length - a.attention.length;
  });

  const totals = rows.reduce(
    (t, r) => {
      t.expired += r.summary.expired;
      t.expiring += r.summary.expiring;
      t.missing += r.summary.missing;
      if (r.summary.blockedFromRoster) t.blocked += 1;
      return t;
    },
    { blocked: 0, expired: 0, expiring: 0, missing: 0 }
  );
  const allClear = rows.filter((r) => r.summary.worst === "valid").length;

  const tiles = [
    { n: totals.blocked, label: "Not cleared to roster", tone: totals.blocked ? "red" : "green", icon: "block" },
    { n: totals.expired, label: "Credentials expired", tone: totals.expired ? "red" : "green", icon: "event_busy" },
    { n: totals.expiring, label: `Expiring ≤ ${EXPIRING_WINDOW_DAYS} days`, tone: totals.expiring ? "amber" : "green", icon: "schedule" },
    { n: totals.missing, label: "Not recorded", tone: totals.missing ? "grey" : "green", icon: "help" },
  ];

  return (
    <>
      <header className="header">
        <div className="flex" style={{ gap: 8, marginBottom: 6 }}>
          <span className="pill tone-teal"><span className="ms" style={{ fontSize: 14 }}>verified_user</span>Workforce compliance</span>
        </div>
        <h1>Compliance &amp; credential expiry</h1>
        <p>
          Garda vetting, mandatory training, right-to-work and insurance for every active carer — flagged
          before they lapse. Safety-critical credentials that expire or go unrecorded stop a carer being
          cleared to roster. Open a carer to update their dates.
        </p>
      </header>
      <div className="body fade">
        <div className="grid cols-4" style={{ marginBottom: 22 }}>
          {tiles.map((t) => (
            <div key={t.label} className="card metric">
              <div className="flex" style={{ gap: 8, alignItems: "center" }}>
                <span className="ms" style={{ fontSize: 18, color: t.tone === "grey" ? "var(--text-2)" : `var(--${t.tone}-fg)` }}>{t.icon}</span>
                <div className="num" style={{ color: `var(--${t.tone}-fg)` }}>{t.n}</div>
              </div>
              <div className="lbl">{t.label}</div>
            </div>
          ))}
        </div>

        <div className="flex between wrap" style={{ gap: 8, alignItems: "baseline", marginBottom: 10 }}>
          <div className="section-title" style={{ margin: 0 }}>Action needed</div>
          <span className="muted" style={{ fontSize: 12 }}>{allClear} of {active.length} carers fully in date</span>
        </div>

        {rows.filter((r) => r.attention.length > 0).length === 0 ? (
          <div className="card muted">Every active carer&apos;s credentials are in date. 🎉</div>
        ) : (
          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Carer</th>
                  <th>Home area</th>
                  <th>Status</th>
                  <th>Needs attention</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.filter((r) => r.attention.length > 0).map(({ carer, summary, attention }) => (
                  <tr key={carer.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{carer.name}</div>
                      <div className="code" style={{ display: "inline-block", marginTop: 2 }}>{carer.id}</div>
                    </td>
                    <td className="muted">{carer.homeArea || "—"}</td>
                    <td>
                      {summary.blockedFromRoster ? (
                        <span className="pill tone-red" style={{ fontSize: 11 }}><span className="ms" style={{ fontSize: 13 }}>block</span>Not cleared</span>
                      ) : summary.worst === "expired" ? (
                        <span className="pill tone-red" style={{ fontSize: 11 }}>Expired</span>
                      ) : summary.worst === "missing" ? (
                        <span className="pill tone-grey" style={{ fontSize: 11 }}>Missing</span>
                      ) : (
                        <span className="pill tone-amber" style={{ fontSize: 11 }}>Expiring</span>
                      )}
                    </td>
                    <td>
                      <div className="flex wrap" style={{ gap: 5 }}>
                        {attention.map(({ item, st }) => (
                          <span key={item.key} className={`pill tone-${statusTone(st.status)}`} style={{ fontSize: 10.5 }} title={`${COMPLIANCE_ITEM[item.key].label} — ${daysPhrase(st)}`}>
                            {item.blocking && st.status !== "expiring" && <span className="ms" style={{ fontSize: 12 }}>priority_high</span>}
                            {item.short}
                            {st.status === "missing" ? " · missing" : ` · ${daysPhrase(st)}`}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/carers/${carer.id}`} className="btn" style={{ padding: "5px 11px", fontSize: 12.5 }}>Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
