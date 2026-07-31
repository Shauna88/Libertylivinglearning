import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CRM_ROLES, WORKFORCE_ROLES, OVERSIGHT_ROLES, listCarers, listAllCompliance, listClients, listAllAssessments, type Role } from "@/lib/db";
import {
  COMPLIANCE_ITEMS, complianceStatus, summariseCompliance, statusTone, daysPhrase, EXPIRING_WINDOW_DAYS,
} from "@/lib/compliance";
import {
  ASSESSMENT_ITEMS, assessmentStatus, summariseAssessments, assessmentTone, reviewPhrase,
} from "@/lib/assessments";
import ComplianceHub, { type CarerRow, type ClientRow, type Tile } from "@/components/ComplianceHub";

const CAN_VIEW: Role[] = [...new Set([...CRM_ROLES, ...WORKFORCE_ROLES, ...OVERSIGHT_ROLES])] as Role[];

export default async function CompliancePage() {
  const session = await auth();
  const role = session!.user.role as Role;
  if (!CAN_VIEW.includes(role)) redirect("/dashboard");

  const now = new Date();
  const [carers, allCompliance, clients, allAssessments] = await Promise.all([
    listCarers(), listAllCompliance(), listClients(), listAllAssessments(),
  ]);

  // ---- carer credentials ----
  const byCarer = new Map<string, { itemKey: string; expiry: string | null }[]>();
  for (const r of allCompliance) {
    if (!byCarer.has(r.carer_id)) byCarer.set(r.carer_id, []);
    byCarer.get(r.carer_id)!.push({ itemKey: r.item_key, expiry: r.expiry });
  }
  const activeCarers = carers.filter((c) => c.status === "active");
  const carerRows: CarerRow[] = activeCarers.map((c) => {
    const held = byCarer.get(c.id) ?? [];
    const summary = summariseCompliance(held.map((h) => ({ itemKey: h.itemKey, held: true, expiry: h.expiry })), now);
    const heldMap = new Map(held.map((h) => [h.itemKey, h.expiry]));
    const attention = COMPLIANCE_ITEMS.map((it) => ({ it, st: complianceStatus(heldMap.has(it.key), heldMap.get(it.key) ?? null, now) }))
      .filter((x) => x.st.status !== "valid")
      .map(({ it, st }) => ({ short: it.short, label: it.label, tone: statusTone(st.status), phrase: st.status === "missing" ? "missing" : daysPhrase(st), priority: it.blocking && st.status !== "expiring" }));
    return { id: c.id, name: c.name, homeArea: c.homeArea, blocked: summary.blockedFromRoster, worst: summary.worst, attention };
  }).sort((a, b) => (a.blocked !== b.blocked ? (a.blocked ? -1 : 1) : b.attention.length - a.attention.length));

  const cTotals = carerRows.reduce((t, r) => {
    r.attention.forEach((p) => { if (/red/.test(p.tone)) t.expired++; else if (/amber/.test(p.tone)) t.expiring++; else t.missing++; });
    if (r.blocked) t.blocked++;
    return t;
  }, { blocked: 0, expired: 0, expiring: 0, missing: 0 });
  const carerTiles: Tile[] = [
    { n: cTotals.blocked, label: "Not cleared to roster", tone: cTotals.blocked ? "red" : "green", icon: "block" },
    { n: cTotals.expired, label: "Credentials expired", tone: cTotals.expired ? "red" : "green", icon: "event_busy" },
    { n: cTotals.expiring, label: `Expiring ≤ ${EXPIRING_WINDOW_DAYS} days`, tone: cTotals.expiring ? "amber" : "green", icon: "schedule" },
    { n: cTotals.missing, label: "Not recorded", tone: cTotals.missing ? "grey" : "green", icon: "help" },
  ];
  const carerClear = carerRows.filter((r) => r.attention.length === 0).length;

  // ---- client assessments & reviews ----
  const byClient = new Map<string, { itemKey: string; reviewDue: string | null }[]>();
  for (const r of allAssessments) {
    if (!byClient.has(r.client_id)) byClient.set(r.client_id, []);
    byClient.get(r.client_id)!.push({ itemKey: r.item_key, reviewDue: r.review_due });
  }
  const trackedClients = clients.filter((c) => c.status === "active" || c.status === "review" || c.status === "new");
  const clientRows: ClientRow[] = trackedClients.map((c) => {
    const held = byClient.get(c.id) ?? [];
    const summary = summariseAssessments(held.map((h) => ({ itemKey: h.itemKey, reviewDue: h.reviewDue })), now);
    const heldMap = new Map(held.map((h) => [h.itemKey, h.reviewDue]));
    const attention = ASSESSMENT_ITEMS.map((it) => ({ it, st: assessmentStatus(heldMap.has(it.key), heldMap.get(it.key) ?? null, it.cadenceMonths, now) }))
      .filter((x) => x.st.status !== "in_date" && x.st.status !== "completed")
      .map(({ it, st }) => ({ short: it.short, label: it.label, tone: assessmentTone(st.status), phrase: st.status === "not_done" ? "not done" : reviewPhrase(st) }));
    return { id: c.id, su: c.su, area: c.area, coordinator: c.csm, worst: summary.worst, attention };
  }).sort((a, b) => b.attention.length - a.attention.length);

  const aTotals = clientRows.reduce((t, r) => {
    if (r.worst === "overdue") t.overdue++;
    r.attention.forEach((p) => { if (p.phrase === "not done") t.notDone++; });
    if (r.attention.some((p) => /amber/.test(p.tone))) t.dueSoon++;
    return t;
  }, { overdue: 0, dueSoon: 0, notDone: 0 });
  const clientTiles: Tile[] = [
    { n: clientRows.filter((r) => r.worst === "overdue").length, label: "Clients with an overdue review", tone: aTotals.overdue ? "red" : "green", icon: "assignment_late" },
    { n: clientRows.filter((r) => r.worst === "due_soon").length, label: "Reviews due soon", tone: aTotals.dueSoon ? "amber" : "green", icon: "event_repeat" },
    { n: aTotals.notDone, label: "Assessments not done", tone: aTotals.notDone ? "grey" : "green", icon: "help" },
    { n: trackedClients.length, label: "Clients tracked", tone: "grey", icon: "groups" },
  ];
  const clientClear = clientRows.filter((r) => r.attention.length === 0).length;

  const canOpenCarers = [...CRM_ROLES, ...WORKFORCE_ROLES].includes(role);
  const canOpenClients = CRM_ROLES.includes(role);

  return (
    <>
      <header className="header">
        <div className="flex" style={{ gap: 8, marginBottom: 6 }}>
          <span className="pill tone-teal"><span className="ms" style={{ fontSize: 14 }}>verified_user</span>Compliance oversight</span>
        </div>
        <h1>Compliance &amp; assessments</h1>
        <p>
          One place for all compliance: carer credentials (Garda vetting, mandatory training, right-to-work, insurance)
          and client assessments &amp; care-plan reviews. Flagged before they lapse; safety-critical carer credentials
          that expire stop the carer being cleared to roster.
        </p>
      </header>
      <div className="body fade">
        <ComplianceHub
          carerRows={carerRows} clientRows={clientRows}
          carerTiles={carerTiles} clientTiles={clientTiles}
          carerClear={carerClear} clientClear={clientClear}
          carerTotal={activeCarers.length} clientTotal={trackedClients.length}
          canOpenCarers={canOpenCarers} canOpenClients={canOpenClients}
        />
      </div>
    </>
  );
}
