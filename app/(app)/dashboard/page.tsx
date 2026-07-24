import Link from "next/link";
import { auth } from "@/auth";
import {
  enrollmentsForUser,
  getUserByEmail,
  listHubIssues,
  listClients,
  listCallLog,
  listPermReqs,
  listQip,
  listAssignments,
  countPendingTimeOff,
  listDashboardTodos,
  listCarers,
  coverMap,
  OVERSIGHT_ROLES,
  WORKFORCE_ROLES,
  type Role,
} from "@/lib/db";
import TodoBoard, { type PersonalTodo } from "@/components/TodoBoard";
import { messagingDept, MESSAGE_DEPTS } from "@/lib/roles";
import { presetsFor } from "@/lib/todopresets";
import { buildRefGroups } from "@/lib/refs";
import { getCourse, CAT_TONE } from "@/lib/content";
import { profileFor, hubScopeOf, deptOf, hubLabel, type Capability } from "@/lib/roles";
import { PORTALS, portalKey, rag, ragPct, trend, type Metric } from "@/lib/portals";
import { deriveTodayVisits, nowParts, isUnassignedCarer } from "@/lib/schedule";
import { callType, causeLabel } from "@/lib/callevents";
import { computeFinance, money } from "@/lib/finance";
import { statusMeta } from "@/lib/crm";

export const dynamic = "force-dynamic";

const AREA_LINKS: { cap: Capability; href: string; icon: string; label: string }[] = [
  { cap: "crm", href: "/clients", icon: "contacts", label: "Client register" },
  { cap: "crm", href: "/roster", icon: "edit_calendar", label: "Rostering" },
  { cap: "crm", href: "/call-log", icon: "phone_missed", label: "Call log" },
  { cap: "improvement", href: "/improvement", icon: "model_training", label: "Improvement & Training" },
  { cap: "oversight", href: "/monitor", icon: "insights", label: "Training monitor" },
  { cap: "workforce", href: "/workforce", icon: "groups", label: "Workforce & Training" },
  { cap: "recruit", href: "/recruitment", icon: "person_search", label: "Recruitment" },
  { cap: "finance", href: "/finance", icon: "account_balance_wallet", label: "Finance" },
  { cap: "oversight", href: "/data-protection", icon: "encrypted", label: "Data protection" },
];

function greeting(hour: number) {
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

type Todo = { icon: string; tone: string; text: string; href: string };

function pastDue(due: string | null): boolean {
  if (!due) return false;
  const t = Date.parse(due);
  return !Number.isNaN(t) && t < Date.now();
}

/** Daily improvement prompts for a management/department role. */
function improvementTodos(
  dept: string | null,
  scopeIsDept: boolean,
  issues: { dept: string; status: string; signoff_count: number }[],
  qip: { status: string; due: string | null }[],
  assignments: { withdrawn: boolean }[]
): Todo[] {
  const scoped = scopeIsDept && dept ? issues.filter((i) => i.dept === dept) : issues;
  const open = scoped.filter((i) => i.status === "open");
  const needReview = open.filter((i) => i.signoff_count === 0);
  const inReview = open.length - needReview.length;
  const qipOpen = qip.filter((a) => !/complete|closed|done/i.test(a.status));
  const qipOverdue = qipOpen.filter((a) => pastDue(a.due));
  const pushes = assignments.filter((a) => !a.withdrawn);
  const scopeLabel = scopeIsDept && dept ? `${dept} ` : "";
  const todos: Todo[] = [];
  if (needReview.length) todos.push({ icon: "rate_review", tone: "amber", text: `${needReview.length} open ${scopeLabel}issue${needReview.length === 1 ? "" : "s"} to review & sign off`, href: "/improvement" });
  if (inReview > 0) todos.push({ icon: "pending_actions", tone: "blue", text: `${inReview} ${scopeLabel}issue${inReview === 1 ? "" : "s"} part-signed — awaiting closure`, href: "/improvement" });
  if (qipOverdue.length) todos.push({ icon: "assignment_late", tone: "red", text: `${qipOverdue.length} improvement (QIP) action${qipOverdue.length === 1 ? "" : "s"} overdue`, href: "/audits" });
  const qipInProgress = qipOpen.length - qipOverdue.length;
  if (qipInProgress > 0) todos.push({ icon: "checklist", tone: "amber", text: `${qipInProgress} improvement action${qipInProgress === 1 ? "" : "s"} in progress`, href: "/audits" });
  if (pushes.length) todos.push({ icon: "school", tone: "blue", text: `${pushes.length} training push${pushes.length === 1 ? "" : "es"} out to the team`, href: "/improvement" });
  return todos;
}

function Trend({ metric }: { metric: Metric }) {
  const t = trend(metric.value, metric.prev, metric.dir);
  if (t === "flat") return <span className="kpi-trend flat">— held</span>;
  const good = t === "up";
  return (
    <span className={`kpi-trend ${good ? "up" : "down"}`}>
      <span className="ms" style={{ fontSize: 14 }}>{good ? "trending_up" : "trending_down"}</span>
      from {metric.prev}
    </span>
  );
}

function Scorecard({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="scorecard">
      {metrics.map((k) => {
        const tone = rag(k.value, k.target, k.dir);
        return (
          <div key={k.name} className={`kpi-tile tone-edge-${tone}`}>
            <div className="kpi-top">
              <span className="kpi-value" style={{ color: `var(--${tone}-fg)` }}>{k.value}</span>
              <Trend metric={k} />
            </div>
            <div className="kpi-name">{k.name}</div>
            <div className={`bar ${tone === "green" ? "" : tone}`} style={{ marginTop: 8 }}>
              <span style={{ width: `${ragPct(k.value, k.dir)}%` }} />
            </div>
            <div className="kpi-foot">
              <span className="muted">Target {k.target}</span>
              <span className="code">{k.ref}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const user = await getUserByEmail(session!.user.email!);
  if (!user) return null;

  const role = user.role as Role;
  const profile = profileFor(role);
  const isTimeOffApprover = OVERSIGHT_ROLES.includes(role) || WORKFORCE_ROLES.includes(role);
  const myDept = messagingDept(role);
  const personalTodos: PersonalTodo[] = (await listDashboardTodos(user.id, myDept)).map((t) => ({
    id: t.id, text: t.text, href: t.href, done: t.done, toDept: t.to_dept, fromName: t.from_name, mine: t.user_id === user.id,
    refLabel: t.ref_label, refHref: t.ref_href,
  }));
  const todoPresets = presetsFor(myDept);
  const shareDepts = (MESSAGE_DEPTS as readonly string[]).filter((d) => d !== "All staff");
  const [refClients, refCarers] = await Promise.all([listClients(), listCarers()]);
  const todoRefGroups = buildRefGroups(refClients, refCarers);
  const firstName = user.name.split(" ")[0] || "there";
  const hour = new Date().toLocaleString("en-IE", { hour: "2-digit", hour12: false, timeZone: "Europe/Dublin" });
  const hi = `${greeting(parseInt(hour, 10) || 9)}, ${firstName}`;

  // Quick links for the areas this role can reach.
  const seen = new Set<string>();
  const links = AREA_LINKS.filter((l) => profile.caps.includes(l.cap) && !seen.has(l.href) && seen.add(l.href));

  // Live department issue inbox (management roles).
  const isMgmt = profile.caps.includes("improvement");
  let openIssues = 0;
  if (isMgmt) {
    const issues = await listHubIssues();
    const dept = deptOf(role);
    const scoped = hubScopeOf(role) === "dept" && dept ? issues.filter((i) => i.dept === dept) : issues;
    openIssues = scoped.filter((i) => i.status === "open").length;
  }

  const portal = portalKey(role) ? PORTALS[portalKey(role)!] : null;
  const isFinanceDir = role === "Director of Finance";
  const isOps = profile.caps.includes("crm") && !portal; // Care Coordinator / On-Call

  const header = (
    <header className="header">
      <h1>{hi}</h1>
      <p>
        {role} · {user.region}
        {profile.remit ? ` — ${profile.remit}` : ""}
      </p>
    </header>
  );

  const inbox = isMgmt && (
    <Link
      href="/improvement"
      className="card dash-inbox"
      style={{ borderLeft: `4px solid var(--${openIssues ? "amber" : "green"}-fg)` }}
    >
      <div>
        <strong style={{ fontSize: 15 }}>{hubLabel(role)}</strong>
        <p className="muted" style={{ margin: "3px 0 0", fontSize: 13 }}>
          {deptOf(role) && hubScopeOf(role) === "dept"
            ? `Issues routed to your department (${deptOf(role)})`
            : "Open complaints, incidents and safeguarding across the service"}
        </p>
      </div>
      <div className="metric" style={{ textAlign: "right" }}>
        <div className="num" style={{ color: `var(--${openIssues ? "amber" : "green"}-fg)` }}>{openIssues}</div>
        <div className="lbl">open to action</div>
      </div>
    </Link>
  );

  const quickLinks = links.length > 0 && (
    <>
      <div className="section-title">Your areas</div>
      <div className="grid cols-4" style={{ marginBottom: 8 }}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="card dash-link">
            <span className="ms" style={{ fontSize: 22, color: "var(--accent)" }}>{l.icon}</span>
            <strong style={{ fontSize: 13.5 }}>{l.label}</strong>
          </Link>
        ))}
      </div>
    </>
  );

  // ---------- CSM operational cockpit (day-to-day) ----------
  if (role === "Client Service Manager") {
    const [clients, cover, calls, permReqs, issues, timeOffPending] = await Promise.all([
      listClients(),
      coverMap(),
      listCallLog(120),
      listPermReqs("pending"),
      listHubIssues(),
      countPendingTimeOff(),
    ]);
    const now = new Date();
    const { weekday, nowMin } = nowParts(now);
    const clientById = new Map(clients.map((c) => [c.id, c]));
    const regHref: Record<string, string> = { complaint: "/complaints", incident: "/incidents", safeguarding: "/safeguarding" };

    const visits = deriveTodayVisits(clients, weekday, nowMin, cover);
    const uncovered = visits.filter((v) => isUnassignedCarer(v.carer));
    const sick = calls.filter((c) => (c.cause === "carer_sick" || c.cause === "carer_noshow") && !c.resolved);
    const followCalls = calls.filter((c) => callType(c.kind)?.followUp && !c.resolved);
    const openIssues2 = issues.filter((i) => i.status === "open");
    const reviewsDue = clients.filter((c) => c.status === "active" && (c.reviewTone === "red" || (c.flags ?? []).some((f) => /review/i.test(f))));

    const tiles: { n: number; lbl: string; tone: string; href: string }[] = [
      { n: visits.length, lbl: `Calls today (${weekday})`, tone: "text", href: "/live-monitor" },
      { n: uncovered.length, lbl: "Uncovered now", tone: uncovered.length ? "red" : "green", href: "/roster" },
      { n: permReqs.length, lbl: "Approvals waiting", tone: permReqs.length ? "amber" : "green", href: "/dashboard" },
      { n: sick.length, lbl: "Sick / no-show", tone: sick.length ? "red" : "green", href: "/call-log" },
      { n: openIssues2.length, lbl: "Complaints / incidents", tone: openIssues2.length ? "amber" : "green", href: "/improvement" },
      { n: reviewsDue.length, lbl: "Reviews due", tone: reviewsDue.length ? "amber" : "green", href: "/clients" },
    ];

    // A single ranked "to-do" so nothing is missed.
    const todos: { icon: string; tone: string; text: string; href: string }[] = [];
    if (uncovered.length) todos.push({ icon: "event_busy", tone: "red", text: `${uncovered.length} uncovered call${uncovered.length === 1 ? "" : "s"} today need a carer`, href: "/roster" });
    if (permReqs.length) todos.push({ icon: "how_to_reg", tone: "amber", text: `${permReqs.length} permanent carer change${permReqs.length === 1 ? "" : "s"} awaiting your approval`, href: "/dashboard#csm-approvals" });
    if (sick.length) todos.push({ icon: "sick", tone: "red", text: `${sick.length} carer sick / no-show call${sick.length === 1 ? "" : "s"} to re-cover`, href: "/call-log" });
    if (followCalls.length) todos.push({ icon: "call", tone: "amber", text: `${followCalls.length} call event${followCalls.length === 1 ? "" : "s"} to follow up`, href: "/call-log" });
    if (openIssues2.length) todos.push({ icon: "flag", tone: "amber", text: `${openIssues2.length} complaint${openIssues2.length === 1 ? "" : "s"} / incident${openIssues2.length === 1 ? "" : "s"} open`, href: "/improvement" });
    if (reviewsDue.length) todos.push({ icon: "event_repeat", tone: "amber", text: `${reviewsDue.length} care-plan review${reviewsDue.length === 1 ? "" : "s"} due or overdue`, href: "/clients" });
    if (timeOffPending) todos.push({ icon: "beach_access", tone: "amber", text: `${timeOffPending} time-off request${timeOffPending === 1 ? "" : "s"} to approve`, href: "/time-off" });

    return (
      <>
        {header}
        <div className="body fade">
          <div className="card mandate">
            <span className="ms" style={{ fontSize: 20, color: "var(--accent)" }}>flag</span>
            <p style={{ margin: 0, fontSize: 13.5 }}>{profile.remit} Here&apos;s what needs you today.</p>
          </div>

          {/* to-do prompts + personal to-dos */}
          <TodoBoard title="To do" emptyText="All clear" systemTodos={todos} todos={personalTodos} presets={todoPresets} depts={shareDepts} myDept={myDept} refGroups={todoRefGroups} />

          <div className="grid cols-4">
            {tiles.map((t) => (
              <Link key={t.lbl} href={t.href} className="card metric" style={{ display: "block" }}>
                <div className="num" style={{ color: t.tone === "text" ? undefined : `var(--${t.tone}-fg)` }}>{t.n}</div>
                <div className="lbl">{t.lbl}</div>
              </Link>
            ))}
          </div>

          {/* approvals */}
          <div id="csm-approvals" className="section-title" style={{ scrollMarginTop: 90 }}>Approvals — permanent carer changes</div>
          {permReqs.length === 0 ? (
            <div className="card muted" style={{ fontSize: 13 }}>No changes waiting for approval.</div>
          ) : (
            <div className="card" style={{ borderLeft: "4px solid var(--amber-fg)" }}>
              {permReqs.map((p) => {
                const c = clientById.get(p.client_id);
                return (
                  <Link key={p.id} href={`/clients/${p.client_id}`} className="dash-row">
                    <span className="code">{c?.su ?? p.client_id}</span>
                    <span style={{ fontSize: 12.5 }}>{p.day} {p.time} → <strong>{p.carer}</strong></span>
                    <span className="muted" style={{ fontSize: 12 }}>by {p.requested_by}</span>
                    <span className="pill tone-amber" style={{ marginLeft: "auto" }}>Review &amp; approve</span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* uncovered today */}
          <div className="section-title">Uncovered calls today ({weekday})</div>
          {uncovered.length === 0 ? (
            <div className="card muted" style={{ fontSize: 13 }}>Every call today is covered. <Link href="/roster" style={{ color: "var(--accent-dark)", fontWeight: 700 }}>Open rostering →</Link></div>
          ) : (
            <div className="card" style={{ borderLeft: "4px solid var(--red-fg)" }}>
              {uncovered.slice(0, 8).map((v) => (
                <Link key={`${v.clientId}-${v.time}`} href="/roster" className="dash-row">
                  <span className="code">{v.time}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{v.type}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{v.su} · {v.area}</span>
                  <span className="pill tone-red" style={{ marginLeft: "auto" }}>To cover</span>
                </Link>
              ))}
              {uncovered.length > 8 && <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>+{uncovered.length - 8} more in rostering</div>}
            </div>
          )}

          <div className="grid cols-2" style={{ marginTop: 8 }}>
            {/* sick / absent */}
            <div>
              <div className="section-title">Sick &amp; absent carers</div>
              {sick.length === 0 ? (
                <div className="card muted" style={{ fontSize: 13 }}>No sick or no-show calls logged.</div>
              ) : (
                <div className="card" style={{ borderLeft: "4px solid var(--red-fg)" }}>
                  {sick.slice(0, 6).map((c) => (
                    <Link key={c.id} href="/call-log" className="dash-row">
                      <span className="pill tone-red">{causeLabel(c.cause)}</span>
                      <span className="muted" style={{ fontSize: 12 }}>{c.carer ?? ""}{c.su ? ` · ${c.su}` : ""}</span>
                      <span className="muted" style={{ fontSize: 12, marginLeft: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{c.detail}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {/* complaints & incidents */}
            <div>
              <div className="section-title">Complaints &amp; incidents to follow up</div>
              {openIssues2.length === 0 ? (
                <div className="card muted" style={{ fontSize: 13 }}>Nothing open across the registers.</div>
              ) : (
                <div className="card" style={{ borderLeft: "4px solid var(--amber-fg)" }}>
                  {openIssues2.slice(0, 6).map((i) => (
                    <Link key={`${i.kind}-${i.entry_id}`} href={regHref[i.kind] ?? "/improvement"} className="dash-row">
                      <span className="pill tone-grey">{i.kind}</span>
                      <span className="code">{i.ref}</span>
                      <span className="muted" style={{ fontSize: 12, marginLeft: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>{i.summary}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* reviews due */}
          {reviewsDue.length > 0 && (
            <>
              <div className="section-title">Care-plan reviews due</div>
              <div className="card" style={{ borderLeft: "4px solid var(--amber-fg)" }}>
                {reviewsDue.slice(0, 6).map((c) => (
                  <Link key={c.id} href={`/clients/${c.id}`} className="dash-row">
                    <span className="code">{c.su}</span>
                    <span className="muted" style={{ fontSize: 12 }}>{c.area}</span>
                    <span className="muted" style={{ fontSize: 12, marginLeft: "auto" }}>{c.reviewNote ?? "Review due"}</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          {inbox}

          {portal && (
            <>
              <div className="section-title">Service scorecard · HSE Authorisation Scheme</div>
              <Scorecard metrics={portal.scorecard} />
            </>
          )}
          {quickLinks}
        </div>
      </>
    );
  }

  // ---------- senior scorecard dashboard ----------
  if (portal) {
    // Management roles that own improvement get a daily-improvement prompt list.
    let improveTodos: Todo[] = [];
    if (profile.caps.includes("improvement")) {
      const [issues, qip, assignments] = await Promise.all([listHubIssues(), listQip(), listAssignments()]);
      improveTodos = improvementTodos(deptOf(role), hubScopeOf(role) === "dept", issues, qip, assignments);
    }
    if (isTimeOffApprover) {
      const n = await countPendingTimeOff();
      if (n) improveTodos = [{ icon: "beach_access", tone: "amber", text: `${n} time-off request${n === 1 ? "" : "s"} to approve`, href: "/time-off" }, ...improveTodos];
    }
    return (
      <>
        {header}
        <div className="body fade">
          <div className="card mandate">
            <span className="ms" style={{ fontSize: 20, color: "var(--accent)" }}>flag</span>
            <p style={{ margin: 0, fontSize: 13.5 }}>{portal.mandate}</p>
          </div>
          {profile.caps.includes("improvement") && (
            <>
              <div className="section-title">Daily improvement prompts{deptOf(role) && hubScopeOf(role) === "dept" ? ` · ${deptOf(role)}` : ""}</div>
              <TodoBoard title="Drive your department's improvements" systemTodos={improveTodos} todos={personalTodos} presets={todoPresets} depts={shareDepts} myDept={myDept} refGroups={todoRefGroups} emptyText="Nothing outstanding" />
            </>
          )}
          {inbox}
          <div className="section-title">Your scorecard · HSE Authorisation Scheme</div>
          <Scorecard metrics={portal.scorecard} />
          {quickLinks}
        </div>
      </>
    );
  }

  // ---------- finance director: live financial summary ----------
  if (isFinanceDir) {
    const clients = await listClients();
    const now = new Date();
    const fin = computeFinance(clients, now.getFullYear(), now.getMonth() + 1);
    const unpaid = fin.invoices.filter((i) => i.status === "Unpaid").length;
    const finTodos: Todo[] = [];
    if (unpaid) finTodos.push({ icon: "receipt_long", tone: "amber", text: `${unpaid} invoice${unpaid === 1 ? "" : "s"} unpaid — chase for payment`, href: "/finance/invoicing" });
    if (fin.marginPct < 20) finTodos.push({ icon: "trending_down", tone: "red", text: `Margin at ${fin.marginPct}% — review rate schemes vs pay`, href: "/finance/rate-schemes" });
    return (
      <>
        {header}
        <div className="body fade">
          <div className="card mandate">
            <span className="ms" style={{ fontSize: 20, color: "var(--accent)" }}>flag</span>
            <p style={{ margin: 0, fontSize: 13.5 }}>{profile.remit} This month ({fin.monthLabel}) at a glance.</p>
          </div>
          <div className="section-title">Daily prompts · Finance</div>
          <TodoBoard title="Keep the books current" systemTodos={finTodos} todos={personalTodos} presets={todoPresets} depts={shareDepts} myDept={myDept} refGroups={todoRefGroups} emptyText="Nothing outstanding" />
          <div className="grid cols-4">
            <div className="card metric"><div className="num">{money(fin.billedTotal)}</div><div className="lbl">Billed this month</div></div>
            <div className="card metric"><div className="num">{money(fin.payrollTotal)}</div><div className="lbl">Payroll</div></div>
            <div className="card metric"><div className="num" style={{ color: "var(--green-fg)" }}>{money(fin.margin)}</div><div className="lbl">Margin ({fin.marginPct}%)</div></div>
            <div className="card metric"><div className="num" style={{ color: unpaid ? "var(--amber-fg)" : "var(--green-fg)" }}>{unpaid}</div><div className="lbl">Invoices unpaid</div></div>
          </div>
          <div className="section-title">By funding scheme</div>
          <div className="grid cols-3">
            {fin.pods.map((p) => (
              <div key={p.code} className="card">
                <div className="flex between" style={{ marginBottom: 4 }}>
                  <strong style={{ fontSize: 13.5 }}>{p.name}</strong>
                  <span className="pill tone-grey">{p.clients} clients</span>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>{p.pod} · {p.hours}</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{p.billed}</div>
              </div>
            ))}
          </div>
          {quickLinks}
        </div>
      </>
    );
  }

  // ---------- operational "your day" (Care Coordinator / On-Call) ----------
  if (isOps) {
    const isOnCall = role === "On-Call Manager";
    const [clients, cover, calls] = await Promise.all([listClients(), coverMap(), listCallLog(100)]);
    const now = new Date();
    const { weekday, nowMin } = nowParts(now);
    const visits = deriveTodayVisits(clients, weekday, nowMin, cover);
    const gaps = visits.filter((v) => isUnassignedCarer(v.carer));
    const followUps = calls.filter((c) => callType(c.kind)?.followUp && !c.resolved);
    const active = clients.filter((c) => c.status === "active").length;
    const paused = clients.filter((c) => c.status === "hospital" || c.status === "hold");
    const sick = calls.filter((c) => (c.cause === "carer_sick" || c.cause === "carer_noshow") && !c.resolved);

    const opsTodos: Todo[] = [];
    if (gaps.length) opsTodos.push({ icon: "event_busy", tone: "red", text: `${gaps.length} uncovered call${gaps.length === 1 ? "" : "s"} today need a carer`, href: "/roster" });
    if (sick.length) opsTodos.push({ icon: "sick", tone: "red", text: `${sick.length} carer sick / no-show call${sick.length === 1 ? "" : "s"} to re-cover`, href: "/call-log" });
    if (followUps.length) opsTodos.push({ icon: "call", tone: "amber", text: `${followUps.length} call event${followUps.length === 1 ? "" : "s"} to follow up`, href: "/call-log" });
    if (isOnCall && paused.length) opsTodos.push({ icon: "pause_circle", tone: "blue", text: `${paused.length} client${paused.length === 1 ? "" : "s"} paused (hospital / hold) — check for resume`, href: "/live-monitor" });

    return (
      <>
        {header}
        <div className="body fade">
          <div className="card mandate">
            <span className="ms" style={{ fontSize: 20, color: "var(--accent)" }}>flag</span>
            <p style={{ margin: 0, fontSize: 13.5 }}>{profile.remit} {isOnCall ? "Out-of-hours — here's what's live right now." : "Here's your day."}</p>
          </div>
          <div className="section-title">{isOnCall ? "On call — action now" : "Your day — action now"}</div>
          <TodoBoard title={isOnCall ? "Live out-of-hours" : "To do today"} systemTodos={opsTodos} todos={personalTodos} presets={todoPresets} depts={shareDepts} myDept={myDept} refGroups={todoRefGroups} emptyText="All calls covered" />

          <div className="grid cols-4">
            <div className="card metric"><div className="num">{visits.length}</div><div className="lbl">Visits today ({weekday})</div></div>
            <div className="card metric"><div className="num" style={{ color: gaps.length ? "var(--red-fg)" : "var(--green-fg)" }}>{gaps.length}</div><div className="lbl">{isOnCall ? "Uncovered now" : "Gaps to cover"}</div></div>
            <div className="card metric"><div className="num" style={{ color: followUps.length ? "var(--amber-fg)" : "var(--green-fg)" }}>{followUps.length}</div><div className="lbl">Calls to follow up</div></div>
            <div className="card metric"><div className="num" style={{ color: isOnCall && paused.length ? "var(--blue-fg)" : undefined }}>{isOnCall ? paused.length : active}</div><div className="lbl">{isOnCall ? "Paused (hosp / hold)" : "Active clients"}</div></div>
          </div>

          <div className="section-title">{isOnCall ? "Uncovered calls right now" : "Gaps to cover today"}</div>
          {gaps.length === 0 ? (
            <div className="card muted" style={{ fontSize: 13 }}>Every visit today is covered. <Link href="/roster" style={{ color: "var(--accent-dark)", fontWeight: 700 }}>Open rostering →</Link></div>
          ) : (
            <div className="card" style={{ borderLeft: "4px solid var(--red-fg)" }}>
              {gaps.slice(0, 6).map((v) => (
                <Link key={`${v.clientId}-${v.time}`} href="/roster" className="dash-row">
                  <span className="code">{v.time}</span>
                  <span style={{ fontWeight: 600 }}>{v.type}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{v.su} · {v.area}</span>
                  <span className="pill tone-red" style={{ marginLeft: "auto" }}>To cover</span>
                </Link>
              ))}
              {gaps.length > 6 && <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>+{gaps.length - 6} more in rostering</div>}
            </div>
          )}

          {followUps.length > 0 && (
            <>
              <div className="section-title">Calls needing follow-up</div>
              <div className="card" style={{ borderLeft: "4px solid var(--amber-fg)" }}>
                {followUps.slice(0, 5).map((c) => (
                  <Link key={c.id} href="/call-log" className="dash-row">
                    <span className={`pill tone-${callType(c.kind)?.tone ?? "grey"}`}>{callType(c.kind)?.label ?? c.kind}</span>
                    <span className="muted" style={{ fontSize: 12 }}>{c.su ?? ""}{c.carer ? ` · ${c.carer}` : ""}</span>
                    <span className="muted" style={{ fontSize: 12, marginLeft: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 320 }}>{c.detail}</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          {isOnCall && paused.length > 0 && (
            <>
              <div className="section-title">Paused clients — watch for resume</div>
              <div className="card" style={{ borderLeft: "4px solid var(--blue-fg)" }}>
                {paused.map((c) => (
                  <Link key={c.id} href={`/clients/${c.id}`} className="dash-row">
                    <span className="code">{c.su}</span>
                    <span className={`pill tone-${statusMeta(c.status).tone}`}>{statusMeta(c.status).label}</span>
                    <span className="muted" style={{ fontSize: 12, marginLeft: "auto" }}>{c.area}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
          {quickLinks}
        </div>
      </>
    );
  }

  // ---------- staff training dashboard (HCA / Office Admin) ----------
  const enrollments = await enrollmentsForUser(user.id);
  const total = enrollments.length;
  const done = enrollments.filter((e) => e.status === "completed").length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const barTone = pct >= 90 ? "" : pct >= 70 ? " amber" : " red";
  const hcaTodos: Todo[] = [];
  if (total - done > 0) hcaTodos.push({ icon: "school", tone: "amber", text: `${total - done} training course${total - done === 1 ? "" : "s"} to complete`, href: "/training" });

  return (
    <>
      {header}
      <div className="body fade">
        <TodoBoard title="To do" emptyText="Nothing outstanding" systemTodos={hcaTodos} todos={personalTodos} presets={todoPresets} depts={shareDepts} myDept={myDept} refGroups={todoRefGroups} />
        {total > 0 ? (
          <>
            <div className="grid cols-3">
              <div className="card metric">
                <div className="num">{pct}%</div>
                <div className="lbl">Training compliance</div>
                <div className={`bar${barTone}`} style={{ marginTop: 8 }}><span style={{ width: `${pct}%` }} /></div>
              </div>
              <div className="card metric"><div className="num">{done}/{total}</div><div className="lbl">Courses completed</div></div>
              <div className="card metric"><div className="num">{total - done}</div><div className="lbl">Outstanding</div></div>
            </div>
            <div className="section-title">Your qualification pathway</div>
            <div className="grid cols-2">
              {enrollments.map((e) => {
                const course = getCourse(e.course_id);
                if (!course) return null;
                const tone = CAT_TONE[course.cat] ?? "grey";
                const completed = e.status === "completed";
                return (
                  <Link key={e.course_id} href={`/training/${e.course_id}`} className="card" style={{ display: "block" }}>
                    <div className="flex between" style={{ alignItems: "flex-start" }}>
                      <span className={`pill tone-${tone}`}>{course.cat}</span>
                      {completed ? (
                        <span className="pill tone-green"><span className="ms" style={{ fontSize: 14 }}>check_circle</span>{e.best_score ?? ""}%</span>
                      ) : (
                        <span className="pill tone-amber">Assigned</span>
                      )}
                    </div>
                    <h3 style={{ margin: "10px 0 6px", fontSize: 15.5 }}>{course.title}</h3>
                    <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>{course.summary}</p>
                    <div className="flex" style={{ marginTop: 12, fontSize: 11.5, color: "var(--text-2)", gap: 12 }}>
                      <span className="flex" style={{ gap: 4 }}><span className="ms" style={{ fontSize: 15 }}>schedule</span>{course.duration}</span>
                      <span className="code">{course.policy.split("·")[0].trim()}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          <div className="card">
            <strong>Welcome</strong>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
              Use the Staff Training Hub to complete your assigned courses.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
