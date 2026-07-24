import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { CRM_ROLES, WORKFORCE_ROLES, getCarer, listClients, coverMap, type Role } from "@/lib/db";
import { CARER_DIRECTORY } from "@/lib/carers";
import { carerWeek } from "@/lib/schedule";
import CarerWeek from "@/components/CarerWeek";

const CAN_VIEW: Role[] = [...new Set([...CRM_ROLES, ...WORKFORCE_ROLES])] as Role[];

export default async function CarerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!CAN_VIEW.includes(session!.user.role as Role)) redirect("/dashboard");

  const { id } = await params;
  const carer = await getCarer(id);
  if (!carer) notFound();

  const [clients, cover] = await Promise.all([listClients(), coverMap()]);
  const week = carerWeek(clients, carer.name, cover);

  const skillLabel = (k: string) => CARER_DIRECTORY.skills.find((s) => s.key === k)?.label ?? k;
  const free = Math.max(0, carer.capacityHours - carer.committedHours);
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
        </div>
        <h1>{carer.name}</h1>
        <p>{carer.homeArea || "No area set"} · {carer.pathway || "Pathway not set"} · {carer.transport || "—"}</p>
      </header>
      <div className="body fade">
        {/* profile summary */}
        <div className="grid cols-3" style={{ marginBottom: 18 }}>
          <div className="card">
            <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 700 }}>Hours this week</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{carer.committedHours}<span className="muted" style={{ fontSize: 14, fontWeight: 500 }}> / {carer.capacityHours}h</span></div>
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

        {/* their working week */}
        <h2 style={{ fontSize: 16, marginBottom: 4 }}>Working week</h2>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 0, marginBottom: 12, maxWidth: "70ch" }}>
          {carer.name}&apos;s Schedule of Service across every client (base plan with this week&apos;s cover applied). Client names are masked.
        </p>
        <CarerWeek week={week} />
      </div>
    </>
  );
}
