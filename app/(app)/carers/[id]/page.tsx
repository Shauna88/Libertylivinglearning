import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { CRM_ROLES, WORKFORCE_ROLES, OVERSIGHT_ROLES, getCarer, listClients, coverMap, listCarerCompliance, carerActivity, type Role } from "@/lib/db";
import { maskName } from "@/lib/crm";
import { CARER_DIRECTORY, carerAvailability } from "@/lib/carers";
import { carerWeek, unassignedCalls } from "@/lib/schedule";
import { summariseCompliance } from "@/lib/compliance";
import CarerWeek from "@/components/CarerWeek";
import CarerCompliance from "@/components/CarerCompliance";
import CarerTimeline from "@/components/CarerTimeline";

const CAN_VIEW: Role[] = [...new Set([...CRM_ROLES, ...WORKFORCE_ROLES])] as Role[];

export default async function CarerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!CAN_VIEW.includes(session!.user.role as Role)) redirect("/dashboard");

  const { id } = await params;
  const carer = await getCarer(id);
  if (!carer) notFound();

  const [clients, cover, complianceRows] = await Promise.all([listClients(), coverMap(), listCarerCompliance(id)]);
  const clientLabel = Object.fromEntries(clients.map((c) => [c.id, `${maskName(c.name)} · ${c.su}`]));
  const activity = await carerActivity(carer.name, clientLabel);
  const week = carerWeek(clients, carer.name, cover);
  const canEditCompliance = [...WORKFORCE_ROLES, ...OVERSIGHT_ROLES].includes(session!.user.role as Role);
  const complianceSummary = summariseCompliance(
    complianceRows.map((r) => ({ itemKey: r.item_key, held: true, expiry: r.expiry })),
    new Date()
  );
  // Unassigned calls within this carer's travel radius — the ones a coordinator
  // could drop this carer into from an open gap.
  const radius = carer.covers.length ? carer.covers : [carer.homeArea];
  const openCalls = carer.status === "active" ? unassignedCalls(clients, cover, radius) : [];
  const isApprover = OVERSIGHT_ROLES.includes(session!.user.role as Role);

  const skillLabel = (k: string) => CARER_DIRECTORY.skills.find((s) => s.key === k)?.label ?? k;
  // Committed hours are derived from the carer's actual booked calls this week
  // (single source of truth) rather than a hand-typed figure that drifts.
  const committedH = Math.round(week.reduce((n, d) => n + d.minutes, 0) / 60);
  const free = Math.max(0, carer.capacityHours - committedH);
  const availability = carerAvailability(carer);
  // Distinct clients this carer visits across the week.
  const clientsServed = [...new Map(week.flatMap((d) => d.visits).map((v) => [v.su, { su: v.su, area: v.area }])).values()];

  return (
    <>
      <header className="header">
        <div className="flex" style={{ gap: 10, marginBottom: 6, alignItems: "center" }}>
          <Link href="/carers" className="muted flex" style={{ gap: 4, fontSize: 12.5, fontWeight: 600 }}>
            <span className="ms" style={{ fontSize: 16 }}>arrow_back</span>
            Carer directory
          </Link>
          <span className="code">{carer.id}</span>
          {carer.status !== "active" && <span className="pill tone-grey">Inactive</span>}
          {complianceSummary.blockedFromRoster ? (
            <span className="pill tone-red"><span className="ms" style={{ fontSize: 14 }}>block</span>Not cleared to roster</span>
          ) : complianceSummary.expired > 0 ? (
            <span className="pill tone-red"><span className="ms" style={{ fontSize: 14 }}>warning</span>{complianceSummary.expired} credential{complianceSummary.expired === 1 ? "" : "s"} expired</span>
          ) : complianceSummary.expiring > 0 ? (
            <span className="pill tone-amber"><span className="ms" style={{ fontSize: 14 }}>schedule</span>{complianceSummary.expiring} expiring soon</span>
          ) : null}
        </div>
        <h1>{carer.name}</h1>
        <p>{carer.homeArea || "No area set"} · {carer.pathway || "Pathway not set"} · {carer.transport || "—"}</p>
      </header>
      <div className="body fade">
        {/* profile summary */}
        <div className="grid cols-3" style={{ marginBottom: 18 }}>
          <div className="card">
            <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 700 }}>Hours this week</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{committedH}<span className="muted" style={{ fontSize: 14, fontWeight: 500 }}> / {carer.capacityHours}h</span></div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{free}h available</div>
          </div>
          <div className="card">
            <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 700 }}>Travel radius</div>
            <div className="flex wrap" style={{ gap: 5, marginTop: 8 }}>
              {carer.covers.length === 0 ? <span className="muted" style={{ fontSize: 12.5 }}>Not set</span> :
                carer.covers.map((a) => <span key={a} className="pill tone-grey" style={{ fontSize: 11 }}>{a}{a === carer.homeArea ? " (home)" : ""}</span>)}
            </div>
          </div>
          <div className="card">
            <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 700 }}>Clients this week</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{clientsServed.length}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{clientsServed.map((c) => c.su).join(", ") || "None"}</div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 18 }}>
          <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 700, marginBottom: 8 }}>Skills &amp; competencies</div>
          <div className="flex wrap" style={{ gap: 5 }}>
            {carer.skills.length === 0 ? <span className="muted" style={{ fontSize: 12.5 }}>None recorded</span> :
              carer.skills.map((k) => <span key={k} className="pill tone-blue" style={{ fontSize: 11 }}>{skillLabel(k)}</span>)}
          </div>
          {carer.note && <div className="muted" style={{ fontSize: 12.5, marginTop: 10, fontStyle: "italic" }}>{carer.note}</div>}
          <div style={{ marginTop: 12 }}>
            <Link href="/carers" className="btn" style={{ padding: "6px 12px", fontSize: 12.5 }}>
              <span className="ms" style={{ fontSize: 16 }}>edit</span>Edit in directory
            </Link>
          </div>
        </div>

        {/* compliance & credentials */}
        <CarerCompliance
          carerId={carer.id}
          records={complianceRows.map((r) => ({ itemKey: r.item_key, expiry: r.expiry }))}
          canEdit={canEditCompliance}
        />

        {/* their working week */}
        <h2 style={{ fontSize: 16, marginBottom: 4 }}>Working week</h2>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 0, marginBottom: 12, maxWidth: "70ch" }}>
          {carer.name}&apos;s Schedule of Service across every client (base plan with this week&apos;s cover applied). Client names are masked.
        </p>
        <CarerWeek week={week} availability={availability} assign={{ carerName: carer.name, candidates: openCalls, isApprover }} />

        {/* activity log — clock-ins/outs, visit diary notes, cover picked up, system actions */}
        <h2 style={{ fontSize: 16, marginBottom: 4, marginTop: 24 }}>Activity log</h2>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 0, marginBottom: 12, maxWidth: "70ch" }}>
          {carer.name}&apos;s call clock-ins and clock-outs, the visit diary notes they log, cover they pick up, and
          system activity — newest first. Client names are masked.
        </p>
        <CarerTimeline events={activity} />
      </div>
    </>
  );
}
