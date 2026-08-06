import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CRM_ROLES, OVERSIGHT_ROLES, listClients, coverMap, coverReasons, listPermReqs, listCarers, listTimeOff, type Role } from "@/lib/db";
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
import { weekDates, absencesFromTimeOff, offByCarerForWeek, isOffOnDay } from "@/lib/absence";
import { weekDates as weekdayDateMap } from "@/lib/schedule";
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
  // Default to the day board (used most); the week planner is a click away.
  const view = sp.view === "planner" ? "planner" : "day";
  const dateFor = weekdayDateMap(now);

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

    const [carers, timeOff] = await Promise.all([listCarers(), listTimeOff({ status: "approved" })]);
    const busy = carerBusyMap(clients, cover);

    // Effective availability: subtract approved time-off / sickness landing in
    // the current calendar week, so a carer who is away is not offered and their
    // calls surface as "cover needed".
    const week = weekDates(now);
    const off = offByCarerForWeek(absencesFromTimeOff(timeOff), week);

    const pTime = (t: string) => {
      const m = /^(\d{1,2}):(\d{2})/.exec(t);
      return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 0;
    };
    const pDur = (d: string) => {
      const m = /(\d+)/.exec(d);
      return m ? parseInt(m[1], 10) : 30;
    };

    // Demand part 1: genuinely unassigned calls in the area.
    const demandUnassigned: PlanCall[] = unassignedCalls(clients, cover, [area]).map((c) => ({
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

    // Demand part 2: at-risk calls — assigned, but the effective carer is off
    // this week (leave/sick), so they need re-covering.
    const atRisk: PlanCall[] = [];
    for (const cl of clients) {
      if (cl.area !== area) continue;
      if (cl.status === "hospital" || cl.status === "discharged" || cl.status === "deceased") continue;
      for (const dayObj of cl.schedule) {
        for (const v of dayObj.visits) {
          const key = `${cl.id}|${dayObj.day}|${v.time}`;
          const eff = cover[key] ?? v.carer;
          if (isUnassignedCarer(eff)) continue; // already counted above
          const offPart = String(eff).split("+").map((s) => s.trim()).find((p) => isOffOnDay(off, p, dayObj.day));
          if (!offPart) continue;
          const info = off.get(offPart)!;
          atRisk.push({
            key,
            clientId: cl.id,
            su: cl.su,
            maskedName: cl.su,
            area: cl.area,
            day: dayObj.day,
            time: v.time,
            dur: v.dur,
            durMin: pDur(v.dur),
            startMin: pTime(v.time),
            type: v.type,
            risk: { carer: offPart, kind: info.kind, label: info.label },
          });
        }
      }
    }
    const demand: PlanCall[] = [...demandUnassigned, ...atRisk];

    // Candidates per call: cover the area, declared-available, clash-free, and
    // NOT off this week — ranked by real spare hours.
    const candidatesByCall: Record<string, PlanCandidate[]> = {};
    for (const c of demand) {
      const free = freeNearbyCarers(carers, busy, { area: c.area, day: c.day, time: c.time, dur: c.dur });
      candidatesByCall[c.key] = free
        .filter((f) => !isOffOnDay(off, f.name, c.day))
        .map((f) => {
          const rec = carers.find((r) => r.name === f.name);
          return { name: f.name, freeHours: f.freeHours, areaFit: (rec && rec.homeArea === area ? "home" : "radius") as "home" | "radius" };
        });
    }

    // Supply: active carers who cover the area, with real load, working days,
    // and any approved absence this week. Away carers sort to the bottom.
    const supply: PlanCarer[] = carers
      .filter((c) => c.status === "active" && (c.homeArea === area || c.covers.includes(area)))
      .map((c) => {
        const committedH = Math.round(committedMinutes(busy, c.name) / 60);
        const days = busy.get(c.name);
        const callsThisWeek = days ? [...days.values()].reduce((n, ivs) => n + ivs.length, 0) : 0;
        const offInfo = off.get(c.name);
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
          off: offInfo ? { kind: offInfo.kind, label: offInfo.label, days: offInfo.days } : undefined,
        };
      })
      .sort((a, b) => Number(!!a.off) - Number(!!b.off) || b.spareHours - a.spareHours);

    const shortage = supply.filter((c) => c.off).map((c) => ({ name: c.name, kind: c.off!.kind, label: c.off!.label }));

    return (
      <>
        <header className="header">
          {toggle}
          <h1>Week planner</h1>
          <p>Match this week&apos;s uncovered calls to carers who cover the area, are available, and have spare hours. Calls whose carer is on leave or off sick are flagged for cover. Drive the uncovered count to zero.</p>
        </header>
        <PlanningBoard area={area} areas={areaKeys} demand={demand} carers={supply} candidatesByCall={candidatesByCall} shortage={shortage} isCsm={isCsm} />
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
        <h1>Day board</h1>
        <p>
          Flick through the week and allocate, reassign or cover visits — changes here are for that day only.
          {isToday ? ` Today — ${dateLabel}. ` : ` ${day}. `}
          {gaps > 0 ? `${gaps} visit${gaps > 1 ? "s" : ""} to cover.` : "All visits covered."}
        </p>
      </header>
      <RosterBoard
        day={day}
        today={today}
        week={WEEK}
        dateFor={dateFor}
        visits={visits}
        carerPool={pool}
        pending={pendingReqs}
        isCsm={isCsm}
      />
    </>
  );
}
