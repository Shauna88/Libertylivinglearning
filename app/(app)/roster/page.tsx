import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CRM_ROLES, OVERSIGHT_ROLES, listClients, coverMap, coverReasons, listPermReqs, listCarers, type Role } from "@/lib/db";
import {
  deriveTodayVisits,
  carerPool,
  nowParts,
  isUnassignedCarer,
  unassignedCalls,
  carerBusyMap,
  committedMinutes,
  freeNearbyCarers,
} from "@/lib/schedule";
import { CARER_DIRECTORY, carerAvailability } from "@/lib/carers";
import RosterBoard, { type RosterVisit, type PendingReq } from "@/components/RosterBoard";
import PlanningBoard, { type PlanCall, type PlanCarer, type PlanCandidate } from "@/components/PlanningBoard";

export const dynamic = "force-dynamic";

const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; view?: string; area?: string }>;
}) {
  const session = await auth();
  if (!CRM_ROLES.includes(session!.user.role as Role)) redirect("/dashboard");
  const isCsm = OVERSIGHT_ROLES.includes(session!.user.role as Role);

  const now = new Date();
  const { weekday: today, nowMin } = nowParts(now);
  const sp = await searchParams;
  const view = sp.view === "day" ? "day" : "planner";

  const [clients, cover] = await Promise.all([listClients(), coverMap()]);

  const toggle = (
    <div className="seg" role="group" aria-label="Rostering view" style={{ marginBottom: 8 }}>
      <Link href="/roster?view=planner" className={`seg-btn${view === "planner" ? " active" : ""}`} aria-pressed={view === "planner"}>
        <span className="ms" style={{ fontSize: 15 }}>calendar_month</span>Week planner
      </Link>
      <Link href="/roster?view=day" className={`seg-btn${view === "day" ? " active" : ""}`} aria-pressed={view === "day"}>
        <span className="ms" style={{ fontSize: 15 }}>today</span>Day board
      </Link>
    </div>
  );

  // ---------------- Week planner (coordinator-led demand vs supply) ----------------
  if (view === "planner") {
    const areaKeys = CARER_DIRECTORY.areas.map((a) => a.key);
    const region = session!.user.region ?? "";
    const area = sp.area && areaKeys.includes(sp.area) ? sp.area : areaKeys.includes(region) ? region : areaKeys[0];

    const carers = await listCarers();
    const busy = carerBusyMap(clients, cover);

    // Demand: every uncovered call in the selected area this week.
    const demandRaw = unassignedCalls(clients, cover, [area]);
    const demand: PlanCall[] = demandRaw.map((c) => ({
      key: `${c.clientId}|${c.day}|${c.time}`,
      clientId: c.clientId,
      su: c.su,
      maskedName: c.maskedName,
      area: c.area,
      day: c.day,
      time: c.time,
      dur: c.dur,
      durMin: c.durMin,
      startMin: c.startMin,
      type: c.type,
    }));

    // For each uncovered call, the carers who cover the area, are declared-available
    // for the slot, and have no clash — ranked by real spare hours.
    const candidatesByCall: Record<string, PlanCandidate[]> = {};
    for (const c of demand) {
      const free = freeNearbyCarers(carers, busy, { area: c.area, day: c.day, time: c.time, dur: c.dur });
      candidatesByCall[c.key] = free.map((f) => {
        const rec = carers.find((r) => r.name === f.name);
        return { name: f.name, freeHours: f.freeHours, areaFit: (rec && rec.homeArea === area ? "home" : "radius") as "home" | "radius" };
      });
    }

    // Supply: active carers who cover the area, with real load + working days.
    const supply: PlanCarer[] = carers
      .filter((c) => c.status === "active" && (c.homeArea === area || c.covers.includes(area)))
      .map((c) => {
        const committedH = Math.round(committedMinutes(busy, c.name) / 60);
        const days = busy.get(c.name);
        const callsThisWeek = days ? [...days.values()].reduce((n, ivs) => n + ivs.length, 0) : 0;
        return {
          id: c.id,
          name: c.name,
          homeArea: c.homeArea,
          covers: c.covers,
          capacityHours: c.capacityHours,
          committedHours: committedH,
          spareHours: Math.max(0, c.capacityHours - committedH),
          workDays: Object.keys(carerAvailability(c)),
          callsThisWeek,
        };
      })
      .sort((a, b) => b.spareHours - a.spareHours);

    return (
      <>
        <header className="header">
          {toggle}
          <h1>Rostering — week planner</h1>
          <p>Match this week&apos;s uncovered calls to carers who cover the area, are available, and have spare hours. Drive the uncovered count to zero.</p>
        </header>
        <PlanningBoard area={area} areas={areaKeys} demand={demand} carers={supply} candidatesByCall={candidatesByCall} isCsm={isCsm} />
      </>
    );
  }

  // ---------------- Day board (existing live single-day roster) ----------------
  const day = WEEK.includes(sp.day ?? "") ? (sp.day as string) : today;
  const isToday = day === today;

  const [reasons, pending] = await Promise.all([coverReasons(), listPermReqs("pending")]);
  const visitsRaw = deriveTodayVisits(clients, day, isToday ? nowMin : 0, cover);

  const visits: RosterVisit[] = visitsRaw.map((v) => ({
    key: `${v.clientId}|${v.day}|${v.time}`,
    clientId: v.clientId,
    su: v.su,
    area: v.area,
    maskedName: v.maskedName,
    day: v.day,
    time: v.time,
    startMin: v.startMin,
    durMin: v.durMin,
    type: v.type,
    carer: v.carer,
    baseCarer: v.baseCarer,
    overridden: v.overridden,
    unassigned: isUnassignedCarer(v.carer),
    unassignReason: reasons[`${v.clientId}|${v.day}|${v.time}`] ?? null,
    statusLabel: isToday ? v.statusLabel : "Scheduled",
    tone: isToday ? v.tone : "grey",
  }));

  const pendingReqs: PendingReq[] = pending.map((r) => ({
    id: r.id,
    clientId: r.client_id,
    day: r.day,
    time: r.time,
    carer: r.carer,
    note: r.note,
    requestedBy: r.requested_by,
  }));

  const pool = carerPool(clients);
  const gaps = visits.filter((v) => v.unassigned).length;
  const dateLabel = now.toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <header className="header">
        {toggle}
        <h1>Rostering — day board</h1>
        <p>
          Allocate, reassign and cover visits. {isToday ? `Today — ${dateLabel}. ` : `${day}. `}
          {gaps > 0 ? `${gaps} visit${gaps > 1 ? "s" : ""} to cover.` : "All visits covered."}
        </p>
      </header>
      <RosterBoard
        day={day}
        today={today}
        week={WEEK}
        visits={visits}
        carerPool={pool}
        pending={pendingReqs}
        isCsm={isCsm}
      />
    </>
  );
}
