"use client";

import { useState } from "react";
import Empty from "@/components/Empty";
import Link from "next/link";

export type AttentionPill = { short: string; label: string; tone: string; phrase: string; priority?: boolean };
export type CarerRow = { id: string; name: string; homeArea: string; blocked: boolean; worst: string; attention: AttentionPill[] };
export type ClientRow = { id: string; su: string; area: string; coordinator: string; worst: string; attention: AttentionPill[] };
export type Tile = { n: number; label: string; tone: string; icon: string };

function Tiles({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="grid cols-4" style={{ marginBottom: 22 }}>
      {tiles.map((t) => (
        <div key={t.label} className="card metric">
          <div className="flex" style={{ gap: 8, alignItems: "center" }}>
            <span className="ms" style={{ fontSize: 18, color: t.tone === "grey" ? "var(--text-2)" : `var(--${t.tone}-fg)` }}>{t.icon}</span>
            <div className="num" style={{ color: t.tone === "grey" ? undefined : `var(--${t.tone}-fg)` }}>{t.n}</div>
          </div>
          <div className="lbl">{t.label}</div>
        </div>
      ))}
    </div>
  );
}

function Pills({ items }: { items: AttentionPill[] }) {
  // Cap the visible pills so a carer missing many credentials doesn't blow up
  // the row height and misalign the Open button — the rest fold into "+N more".
  const shown = items.slice(0, 3);
  const extra = items.length - shown.length;
  return (
    <div className="flex wrap" style={{ gap: 5 }}>
      {shown.map((p, i) => (
        <span key={i} className={`pill tone-${p.tone}`} style={{ fontSize: 10.5 }} title={`${p.label} — ${p.phrase}`}>
          {p.priority && <span className="ms" style={{ fontSize: 12 }}>priority_high</span>}
          {p.short} · {p.phrase}
        </span>
      ))}
      {extra > 0 && (
        <span
          className="pill tone-grey"
          style={{ fontSize: 10.5 }}
          title={items.slice(3).map((p) => `${p.label} — ${p.phrase}`).join("\n")}
        >
          +{extra} more
        </span>
      )}
    </div>
  );
}

function worstPill(worst: string, blocked: boolean) {
  if (blocked) return <span className="pill tone-red" style={{ fontSize: 11 }}><span className="ms" style={{ fontSize: 13 }}>block</span>Not cleared</span>;
  const map: Record<string, { label: string; tone: string }> = {
    expired: { label: "Expired", tone: "red" }, overdue: { label: "Overdue", tone: "red" },
    missing: { label: "Missing", tone: "grey" }, not_done: { label: "Not done", tone: "grey" },
    expiring: { label: "Expiring", tone: "amber" }, due_soon: { label: "Due soon", tone: "amber" },
  };
  const m = map[worst] ?? { label: "OK", tone: "green" };
  return <span className={`pill tone-${m.tone}`} style={{ fontSize: 11 }}>{m.label}</span>;
}

export default function ComplianceHub({
  carerRows, clientRows, carerTiles, clientTiles, carerClear, clientClear, carerTotal, clientTotal, canOpenCarers, canOpenClients,
}: {
  carerRows: CarerRow[];
  clientRows: ClientRow[];
  carerTiles: Tile[];
  clientTiles: Tile[];
  carerClear: number;
  clientClear: number;
  carerTotal: number;
  clientTotal: number;
  canOpenCarers: boolean;
  canOpenClients: boolean;
}) {
  const [tab, setTab] = useState<"carers" | "clients">("carers");
  const carersNeeding = carerRows.filter((r) => r.attention.length > 0);
  const clientsNeeding = clientRows.filter((r) => r.attention.length > 0);

  return (
    <>
      <div className="seg" role="tablist" style={{ marginBottom: 18 }}>
        <button role="tab" aria-selected={tab === "carers"} className={`seg-btn${tab === "carers" ? " active" : ""}`} onClick={() => setTab("carers")}>
          <span className="ms" style={{ fontSize: 15 }}>badge</span>Carer credentials
        </button>
        <button role="tab" aria-selected={tab === "clients"} className={`seg-btn${tab === "clients" ? " active" : ""}`} onClick={() => setTab("clients")}>
          <span className="ms" style={{ fontSize: 15 }}>fact_check</span>Client assessments &amp; reviews
        </button>
      </div>

      {tab === "carers" ? (
        <>
          <Tiles tiles={carerTiles} />
          <div className="flex between wrap" style={{ gap: 8, alignItems: "baseline", marginBottom: 10 }}>
            <div className="section-title" style={{ margin: 0 }}>Action needed</div>
            <span className="muted" style={{ fontSize: 12 }}>{carerClear} of {carerTotal} carers fully in date</span>
          </div>
          {carersNeeding.length === 0 ? (
            <Empty icon="verified" title="All credentials in date" hint="Every active carer’s mandatory credentials are current." />
          ) : (
            <div className="card" style={{ padding: 0, overflowX: "auto" }}>
              <table className="tbl">
                <thead><tr><th>Carer</th><th>Home area</th><th>Status</th><th>Needs attention</th>{canOpenCarers && <th></th>}</tr></thead>
                <tbody>
                  {carersNeeding.map((r) => (
                    <tr key={r.id}>
                      <td><div style={{ fontWeight: 700 }}>{r.name}</div><div className="code" style={{ display: "inline-block", marginTop: 2 }}>{r.id}</div></td>
                      <td className="muted">{r.homeArea || "—"}</td>
                      <td>{worstPill(r.worst, r.blocked)}</td>
                      <td><Pills items={r.attention} /></td>
                      {canOpenCarers && <td style={{ textAlign: "right" }}><Link href={`/carers/${r.id}`} className="btn" style={{ padding: "5px 11px", fontSize: 12.5 }}>Open</Link></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          <Tiles tiles={clientTiles} />
          <div className="flex between wrap" style={{ gap: 8, alignItems: "baseline", marginBottom: 10 }}>
            <div className="section-title" style={{ margin: 0 }}>Assessments &amp; care-plan reviews due</div>
            <span className="muted" style={{ fontSize: 12 }}>{clientClear} of {clientTotal} clients fully up to date</span>
          </div>
          {clientsNeeding.length === 0 ? (
            <Empty icon="verified" title="All reviews up to date" hint="Every client’s assessments and care-plan reviews are current." />
          ) : (
            <div className="card" style={{ padding: 0, overflowX: "auto" }}>
              <table className="tbl">
                <thead><tr><th>Client</th><th>Area</th><th>Coordinator</th><th>Status</th><th>Needs attention</th>{canOpenClients && <th></th>}</tr></thead>
                <tbody>
                  {clientsNeeding.map((r) => (
                    <tr key={r.id}>
                      <td><span className="code">{r.su}</span></td>
                      <td className="muted">{r.area}</td>
                      <td className="muted">{r.coordinator || "—"}</td>
                      <td>{worstPill(r.worst, false)}</td>
                      <td><Pills items={r.attention} /></td>
                      {canOpenClients && <td style={{ textAlign: "right" }}><Link href={`/clients/${r.id}`} className="btn" style={{ padding: "5px 11px", fontSize: 12.5 }}>Open</Link></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
