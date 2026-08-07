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
  registerOpenCounts,
  complianceAlerts,
  ecmAlertCount,
  assessmentsDueCount,
  OVERSIGHT_ROLES,
  WORKFORCE_ROLES,
  type Role,
} from "@/lib/db";
import TodoBoard, { type PersonalTodo } from "@/components/TodoBoard";
import DashboardHero from "@/components/DashboardHero";
import { messagingDept, MESSAGE_DEPTS } from "@/lib/roles";
import { presetsFor } from "@/lib/todopresets";
import { buildRefGroups } from "@/lib/refs";
import { getCourse, CAT_TONE } from "@/lib/content";
import { profileFor, hubScopeOf, deptOf, hubLabel, type Capability } from "@/lib/roles";
import { PORTALS, portalKey } from "@/lib/portals";
import { deriveTodayVisits, nowParts, isUnassignedCarer, carerPool } from "@/lib/schedule";
import { presenceMaps } from "@/lib/presence";
import DashCover from "@/components/DashCover";
import PersonHover, { type HoverLine, type PersonHoverData } from "@/components/PersonHover";
import { callType, causeLabel } from "@/lib/callevents";
import { computeFinance, money } from "@/lib/finance";
import { statusMeta } from "@/lib/crm";

export const dynamic = "force-dynamic";

const AREA_LINKS: { cap: Capability; href: string; icon: string; label: string }[] = [
  { cap: "crm", href: "/clients", icon: "contacts", label: "Client register" },
  { cap: "crm", href: "/roster", icon: "edit_calendar", label: "Day board" },
  { cap: "crm", href: "/call-log", icon: "phone_missed", label: "Call log" },
  { cap: "improvement", href: "/improvement", icon: "model_training", label: "Improvement & Training" },
  { cap: "oversight", href: "/analytics", icon: "query_stats", label: "Analytics" },
  { cap: "oversight", href: "/monitor", icon: "insights", label: "Training monitor" },
  { cap: "workforce", href: "/workforce", icon: "groups", label: "Workforce & Training" },
  { cap: "recruit", href: "/recruitment", icon: "person_search", label: "Recruitment" },
  { cap: "finance", href: "/finance", icon: "account_balance_wallet", label: "Finance" },
  { cap: "finance", href: "/analytics", icon: "query_stats", label: "Analytics" },
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

export default async function DashboardPage() {
  const session = await auth();
  const user = await getUserByEmail(session!.user.email!);
  if (!user) return null;

  const role = user.role as Role;
  const profile = profileFor(role);

  // ---- Shareable team-demo login: a curated, read-only daily dashboard ----
  if (role === "Demo") {
    const [reg, demoClients, demoCover] = await Promise.all([registerOpenCounts(), listClients(), coverMap()]);
    const { weekday, nowMin } = nowParts(new Date());
    const demoVisits = deriveTodayVisits(demoClients, weekday, nowMin, demoCover);
    const uncoveredToday = demoVisits.filter((v) => v.status === "gap").length;
    const activeClients = demoClients.filter((c) => c.status === "active").length;
    const dhour = new Date().toLocaleString("en-IE", { hour: "2-digit", hour12: false, timeZone: "Europe/Dublin" });

    const tiles = [
      { n: uncoveredToday, label: "Uncovered calls today", tone: uncoveredToday ? "red" : "green", icon: "person_alert" },
      { n: reg.complaint ?? 0, label: "Open complaints", tone: (reg.complaint ?? 0) ? "amber" : "green", icon: "forum" },
      { n: reg.incident ?? 0, label: "Open incidents", tone: (reg.incident ?? 0) ? "amber" : "green", icon: "crisis_alert" },
      { n: activeClients, label: "Active clients", tone: "text", icon: "groups" },
    ];
    const tour = [
      { href: "/frontline", icon: "health_and_safety", title: "Front-line Guide", body: "Plain-English guidance for carers — what to do in real situations, by role." },
      { href: "/training", icon: "school", title: "Staff Training Hub", body: "Every course and learning pathway, with completions tracked per person." },
      { href: "/sops", icon: "menu_book", title: "SOP Library", body: "Standard Operating Procedures — the numbered steps, owner and timeframe for each." },
      { href: "/complaints", icon: "forum", title: "Complaints", body: "The complaints register — how each one is graded, acknowledged and closed out." },
      { href: "/incidents", icon: "crisis_alert", title: "Incidents", body: "The incidents register — NIMS category, open disclosure and follow-up." },
      { href: "/demo-guide", icon: "help", title: "Questions & answers", body: "A quick FAQ about what you're looking at and how the platform helps." },
    ];

    return (
      <>
        <header className="header">
          <div className="flex" style={{ gap: 8, marginBottom: 6 }}>
            <span className="pill tone-teal"><span className="ms" style={{ fontSize: 14 }}>visibility</span>Read-only demo</span>
          </div>
          <h1>{greeting(parseInt(dhour, 10) || 9)} — welcome to the Liberty Living demo</h1>
          <p>A guided tour of the front-line tools: complaints & incidents, the Front-line Guide, training, SOPs — and the kind of daily snapshot the team works from. Nothing here can be changed.</p>
        </header>
        <div className="body fade">
          <DashboardHero
            eyebrow="Read-only demo · today"
            actions={[]}
            stats={tiles.map((t) => ({ n: t.n, label: t.label, tone: t.tone === "text" ? undefined : t.tone }))}
            clearText="Today at a glance"
            clearSub="A snapshot of the kind of daily view the team works from — nothing here can be changed."
          />

          <div className="section-title">Take the tour</div>
          <div className="grid cols-3">
            {tour.map((c) => (
              <Link key={c.href} href={c.href} className="card" style={{ display: "block" }}>
                <div className="flex" style={{ gap: 10, alignItems: "center", marginBottom: 8 }}>
                  <div className="cc-avatar"><span className="ms" style={{ fontSize: 18 }}>{c.icon}</span></div>
                  <h3 style={{ margin: 0, fontSize: 15 }}>{c.title}</h3>
                </div>
                <p className="muted" style={{ fontSize: 13, margin: 0 }}>{c.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </>
    );
  }

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
    const [clients, cover, calls, permReqs, issues, timeOffPending, carerList] = await Promise.all([
      listClients(),
      coverMap(),
      listCallLog(120),
      listPermReqs("pending"),
      listHubIssues(),
      countPendingTimeOff(),
      listCarers(),
    ]);
    const now = new Date();
    const { weekday, nowMin } = nowParts(now);
    // hover cards for carer names (approvals, sick list)
    const presence = presenceMaps(clients, cover, weekday, nowMin);
    const carerMetaMap = new Map(carerList.map((c) => [c.name, c]));
    const carerHover = (name: string): PersonHoverData => {
      const c = carerMetaMap.get(name);
      const lines: HoverLine[] = [];
      if (c?.homeArea) lines.push({ icon: "place", text: c.homeArea });
      if (c?.phone) lines.push({ icon: "call", text: c.phone });
      lines.push(presence.carer[name] ?? { icon: "event_busy", tone: "grey", text: "Not working today" });
      return { title: name, kind: "Carer", lines, href: "/carers" };
    };
    const clientById = new Map(clients.map((c) => [c.id, c]));
    const regHref: Record<string, string> = { complaint: "/complaints", incident: "/incidents", safeguarding: "/safeguarding" };

    const visits = deriveTodayVisits(clients, weekday, nowMin, cover);
    const uncovered = visits.filter((v) => isUnassignedCarer(v.carer));
    const sick = calls.filter((c) => (c.cause === "carer_sick" || c.cause === "carer_noshow") && !c.resolved);
    const followCalls = calls.filter((c) => callType(c.kind)?.followUp && !c.resolved);
    const openIssues2 = issues.filter((i) => i.status === "open");
    const reviewsDue = clients.filter((c) => c.status === "active" && (c.reviewTone === "red" || (c.flags ?? []).some((f) => /review/i.test(f))));

    const tiles: { n: number; lbl: string; tone: string; href: string }[] = [
      { n: visits.length, lbl: `Calls today (${weekday})`, tone: "text", href: "/ecm" },
      { n: uncovered.length, lbl: "Uncovered now", tone: uncovered.length ? "red" : "green", href: "/roster" },
      { n: permReqs.length, lbl: "Approvals waiting", tone: permReqs.length ? "amber" : "green", href: "/dashboard#csm-approvals" },
      { n: sick.length, lbl: "Sick / no-show", tone: sick.length ? "red" : "green", href: "/call-log" },
      { n: openIssues2.length, lbl: "Complaints / incidents", tone: openIssues2.length ? "amber" : "green", href: "/improvement" },
      { n: reviewsDue.length, lbl: "Reviews due", tone: reviewsDue.length ? "amber" : "green", href: "/clients" },
    ];

    const ecmAlerts = await ecmAlertCount();
    const assessDue = await assessmentsDueCount();

    // A single ranked "to-do" so nothing is missed.
    const todos: { icon: string; tone: string; text: string; href: string }[] = [];
    if (ecmAlerts) todos.push({ icon: "notification_important", tone: "red", text: `${ecmAlerts} call${ecmAlerts === 1 ? "" : "s"} with no check-in — check for a missed visit`, href: "/ecm" });
    if (assessDue.overdue) todos.push({ icon: "assignment_late", tone: "red", text: `${assessDue.overdue} client${assessDue.overdue === 1 ? "" : "s"} with an assessment or review overdue`, href: "/clients" });
    else if (assessDue.dueSoon) todos.push({ icon: "event_repeat", tone: "amber", text: `${assessDue.dueSoon} client${assessDue.dueSoon === 1 ? "" : "s"} with a review due soon`, href: "/clients" });
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
          <DashboardHero
            eyebrow={`Today · ${weekday}`}
            actions={todos}
            stats={tiles.map((t) => ({ n: t.n, label: t.lbl, tone: t.tone === "text" ? undefined : t.tone, href: t.href }))}
            clearText="Every call's covered"
            clearSub="No urgent actions across rostering, ECM, approvals or the registers."
          />

          {/* full working list — system prompts + personal to-dos */}
          <TodoBoard title="To do" emptyText="All clear" systemTodos={todos} todos={personalTodos} presets={todoPresets} depts={shareDepts} myDept={myDept} refGroups={todoRefGroups} />

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
                    <span style={{ fontSize: 12.5 }}>{p.day} {p.time} → <strong><PersonHover data={carerHover(p.carer)}>{p.carer}</PersonHover></strong></span>
                    <span className="muted" style={{ fontSize: 12 }}>by {p.requested_by}</span>
                    <span className="pill tone-amber" style={{ marginLeft: "auto" }}>Review &amp; approve</span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* uncovered today — assign right here (last-minute change, pushes to HCA + family) */}
          <div className="section-title">Uncovered calls today ({weekday})</div>
          {uncovered.length === 0 ? (
            <div className="card muted" style={{ fontSize: 13 }}>Every call today is covered. <Link href="/roster" style={{ color: "var(--accent-dark)", fontWeight: 700 }}>Open the Day board →</Link></div>
          ) : (
            <DashCover
              calls={uncovered.map((v) => ({ clientId: v.clientId, su: v.su, area: v.area, day: v.day, time: v.time, baseTime: v.baseTime, type: v.type }))}
              carers={carerPool(clients)}
            />
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
                      <span className="muted" style={{ fontSize: 12 }}>{c.carer ? <PersonHover data={carerHover(c.carer)}>{c.carer}</PersonHover> : ""}{c.su ? ` · ${c.su}` : ""}</span>
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
    if (profile.caps.includes("workforce")) {
      const ca = await complianceAlerts();
      if (ca.blocked) improveTodos = [{ icon: "block", tone: "red", text: `${ca.blocked} carer${ca.blocked === 1 ? "" : "s"} not cleared to roster — a credential is expired or unrecorded`, href: "/compliance" }, ...improveTodos];
      else if (ca.expired) improveTodos = [{ icon: "event_busy", tone: "red", text: `${ca.expired} carer credential${ca.expired === 1 ? "" : "s"} expired`, href: "/compliance" }, ...improveTodos];
      else if (ca.expiring) improveTodos = [{ icon: "schedule", tone: "amber", text: `${ca.expiring} carer credential${ca.expiring === 1 ? "" : "s"} expiring soon`, href: "/compliance" }, ...improveTodos];
    }
    return (
      <>
        {header}
        <div className="body fade">
          <DashboardHero
            eyebrow="Your remit · today"
            actions={improveTodos}
            stats={[]}
            note={portal.mandate}
            clearText="Nothing outstanding"
            clearSub="No open actions for your department right now."
          />
          {profile.caps.includes("improvement") && (
            <>
              <div className="section-title">Daily improvement prompts{deptOf(role) && hubScopeOf(role) === "dept" ? ` · ${deptOf(role)}` : ""}</div>
              <TodoBoard title="Drive your department's improvements" systemTodos={improveTodos} todos={personalTodos} presets={todoPresets} depts={shareDepts} myDept={myDept} refGroups={todoRefGroups} emptyText="Nothing outstanding" />
            </>
          )}
          {inbox}
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
          <DashboardHero
            eyebrow={`This month · ${fin.monthLabel}`}
            actions={finTodos}
            stats={[
              { n: money(fin.billedTotal), label: "Billed this month" },
              { n: money(fin.payrollTotal), label: "Payroll" },
              { n: money(fin.margin), label: `Margin (${fin.marginPct}%)`, tone: "green" },
              { n: unpaid, label: "Invoices unpaid", tone: unpaid ? "amber" : "green", href: "/finance/invoicing" },
            ]}
            note={profile.remit}
            clearText="Books are current"
            clearSub="No invoices to chase and margin's healthy this month."
          />
          <TodoBoard title="Keep the books current" systemTodos={finTodos} todos={personalTodos} presets={todoPresets} depts={shareDepts} myDept={myDept} refGroups={todoRefGroups} emptyText="Nothing outstanding" />
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

    const ecmAlerts = await ecmAlertCount();
    const assessDue = await assessmentsDueCount();

    const opsTodos: Todo[] = [];
    if (ecmAlerts) opsTodos.push({ icon: "notification_important", tone: "red", text: `${ecmAlerts} call${ecmAlerts === 1 ? "" : "s"} with no check-in — check for a missed visit`, href: "/ecm" });
    if (assessDue.overdue) opsTodos.push({ icon: "assignment_late", tone: "red", text: `${assessDue.overdue} client${assessDue.overdue === 1 ? "" : "s"} with an assessment or review overdue`, href: "/clients" });
    else if (assessDue.dueSoon) opsTodos.push({ icon: "event_repeat", tone: "amber", text: `${assessDue.dueSoon} client${assessDue.dueSoon === 1 ? "" : "s"} with a review due soon`, href: "/clients" });
    if (gaps.length) opsTodos.push({ icon: "event_busy", tone: "red", text: `${gaps.length} uncovered call${gaps.length === 1 ? "" : "s"} today need a carer`, href: "/roster" });
    if (sick.length) opsTodos.push({ icon: "sick", tone: "red", text: `${sick.length} carer sick / no-show call${sick.length === 1 ? "" : "s"} to re-cover`, href: "/call-log" });
    if (followUps.length) opsTodos.push({ icon: "call", tone: "amber", text: `${followUps.length} call event${followUps.length === 1 ? "" : "s"} to follow up`, href: "/call-log" });
    if (isOnCall && paused.length) opsTodos.push({ icon: "pause_circle", tone: "blue", text: `${paused.length} client${paused.length === 1 ? "" : "s"} paused (hospital / hold) — check for resume`, href: "/ecm" });

    return (
      <>
        {header}
        <div className="body fade">
          <DashboardHero
            eyebrow={`${isOnCall ? "Out of hours" : "Today"} · ${weekday}`}
            actions={opsTodos}
            stats={[
              { n: visits.length, label: `Visits today (${weekday})`, href: "/ecm" },
              { n: gaps.length, label: isOnCall ? "Uncovered now" : "Gaps to cover", tone: gaps.length ? "red" : "green", href: "/roster" },
              { n: followUps.length, label: "Calls to follow up", tone: followUps.length ? "amber" : "green", href: "/call-log" },
              { n: isOnCall ? paused.length : active, label: isOnCall ? "Paused (hosp / hold)" : "Active clients", tone: isOnCall && paused.length ? "blue" : undefined, href: "/ecm" },
            ]}
            clearText={isOnCall ? "Quiet on call" : "You're all clear"}
            clearSub={isOnCall ? "Nothing live out-of-hours right now." : "Every visit today is covered and nothing's waiting."}
          />

          {/* full working list */}
          <TodoBoard title={isOnCall ? "Live out-of-hours" : "To do today"} systemTodos={opsTodos} todos={personalTodos} presets={todoPresets} depts={shareDepts} myDept={myDept} refGroups={todoRefGroups} emptyText="All calls covered" />

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
              {gaps.length > 6 && <Link href="/roster" className="muted" style={{ fontSize: 12, marginTop: 6, display: "inline-block" }}>+{gaps.length - 6} more in rostering →</Link>}
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
  const hcaTodos: Todo[] = [];
  if (total - done > 0) hcaTodos.push({ icon: "school", tone: "amber", text: `${total - done} training course${total - done === 1 ? "" : "s"} to complete`, href: "/training" });

  return (
    <>
      {header}
      <div className="body fade">
        <DashboardHero
          eyebrow="Your training · today"
          actions={hcaTodos}
          stats={total > 0 ? [
            { n: `${pct}%`, label: "Training compliance", tone: pct >= 90 ? "green" : pct >= 70 ? "amber" : "red" },
            { n: `${done}/${total}`, label: "Courses completed" },
            { n: total - done, label: "Outstanding", tone: total - done ? "amber" : "green" },
          ] : []}
          clearText="You're all caught up"
          clearSub={total > 0 ? "All your assigned training is complete." : "No training assigned yet — the hub is ready when courses are pushed to you."}
        />
        <TodoBoard title="To do" emptyText="Nothing outstanding" systemTodos={hcaTodos} todos={personalTodos} presets={todoPresets} depts={shareDepts} myDept={myDept} refGroups={todoRefGroups} />
        {total > 0 ? (
          <>
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
