import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CRM_ROLES, OVERSIGHT_ROLES, listClients, coverMap, coverReasons, listPermReqs, type Role } from "@/lib/db";
import {
  deriveTodayVisits,
  carerPool,
  nowParts,
  isUnassignedCarer,
} from "@/lib/schedule";
import RosterBoard, { type RosterVisit, type PendingReq } from "@/components/RosterBoard";

export const dynamic = "force-dynamic";

const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const session = await auth();
  if (!CRM_ROLES.includes(session!.user.role as Role)) redirect("/dashboard");
  const isCsm = OVERSIGHT_ROLES.includes(session!.user.role as Role);

  const now = new Date();
  const { weekday: today, nowMin } = nowParts(now);
  const sp = await searchParams;
  const day = WEEK.includes(sp.day ?? "") ? (sp.day as string) : today;
  const isToday = day === today;

  const [clients, cover, reasons, pending] = await Promise.all([
    listClients(),
    coverMap(),
    coverReasons(),
    listPermReqs("pending"),
  ]);

  // For days other than today, statuses aren't time-relevant — derive with a
  // neutral clock so nothing shows as "overdue/done".
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
        <h1>Rostering</h1>
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
