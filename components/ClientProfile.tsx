"use client";

import { useState } from "react";
import PiiRevealButton from "@/components/PiiRevealButton";
import type { Client, NextOfKin, RevealedIdentity } from "@/lib/crm";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 10, padding: "5px 0", fontSize: 13 }}>
      <div className="muted" style={{ fontSize: 12 }}>
        {label}
      </div>
      <div>{value}</div>
    </div>
  );
}

function riskTone(risk?: string) {
  return risk === "red" ? "red" : risk === "amber" ? "amber" : "green";
}

export default function ClientProfile({ client }: { client: Client }) {
  // `client` arrives with identifiers masked. Revealing swaps in the real values.
  const [identity, setIdentity] = useState<RevealedIdentity | null>(null);
  const id = identity;
  const nok: NextOfKin[] = id?.nok ?? client.nok;

  return (
    <div className="fade">
      {/* identity + reveal gate */}
      <div className="card">
        <div className="flex between wrap" style={{ gap: 10, marginBottom: 6 }}>
          <strong style={{ fontSize: 15 }}>Personal & contact details</strong>
          {identity ? (
            <span className="pill tone-amber">
              <span className="ms" style={{ fontSize: 14 }}>
                lock_open
              </span>
              Revealed — access logged
            </span>
          ) : (
            <PiiRevealButton scope="client" clientId={client.id} onReveal={(d) => setIdentity(d.identity as unknown as RevealedIdentity)} />
          )}
        </div>
        <Row label="Name" value={<strong>{id?.name ?? client.name}</strong>} />
        <Row label="Date of birth" value={`${id?.dob ?? client.dob}${client.age ? ` · age ${client.age}` : ""}`} />
        <Row label="Sex" value={client.sex} />
        <Row label="Address" value={id?.addr ?? client.addr} />
        <Row label="Eircode" value={<span className="code">{id?.eircode ?? client.eircode}</span>} />
        <Row label="Phone" value={id?.phone ?? client.phone} />
        {(id?.mobile ?? client.mobile) && <Row label="Mobile" value={id?.mobile ?? client.mobile} />}
        <Row
          label="GP"
          value={
            <>
              {client.gp.name} · {client.gp.practice} {client.gp.phone && <span className="code">{client.gp.phone}</span>}
            </>
          }
        />
        <Row
          label="Next of kin"
          value={
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {nok.map((n, i) => (
                <div key={i}>
                  <strong>{n.name}</strong> <span className="muted">— {n.rel}</span> {n.phone && <span className="code">{n.phone}</span>}
                </div>
              ))}
            </div>
          }
        />
      </div>

      {/* care summary */}
      <div className="section-title">Care package</div>
      <div className="grid cols-2">
        <div className="card">
          <Row label="Funder" value={client.funding} />
          <Row label="Package" value={client.pkg} />
          <Row label="Hours / week" value={client.hoursWk} />
          <Row label="Start date" value={client.startDate} />
          <Row label="Coordinator" value={client.csm} />
          <Row label="Last visit" value={client.lastVisit} />
        </div>
        <div className="card">
          <Row
            label="Review due"
            value={<span className={`pill tone-${client.reviewTone}`}>{client.reviewDue}</span>}
          />
          <Row label="Review note" value={client.reviewNote} />
          <Row label="Allergies" value={<span className="pill tone-red">{client.allergies}</span>} />
          <Row label="Mobility" value={client.mobility} />
          {client.flags.length > 0 && (
            <Row
              label="Flags"
              value={
                <div className="flex wrap" style={{ gap: 6 }}>
                  {client.flags.map((f, i) => (
                    <span key={i} className="pill tone-amber">
                      {f}
                    </span>
                  ))}
                </div>
              }
            />
          )}
        </div>
      </div>

      {/* clinical + home */}
      <div className="grid cols-2">
        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>
            Conditions
          </div>
          <div className="flex wrap" style={{ gap: 6 }}>
            {client.conditions.map((c, i) => (
              <span key={i} className="pill tone-grey">
                {c}
              </span>
            ))}
          </div>
          {client.requirements && client.requirements.length > 0 && (
            <>
              <div className="section-title">Requirements</div>
              <ul className="prose" style={{ margin: 0 }}>
                {client.requirements.map((r, i) => (
                  <li key={i} style={{ fontSize: 12.5 }}>
                    {r}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>
            Home & access
          </div>
          <Row label="Key safe" value={client.keysafe || "—"} />
          <Row label="Access" value={client.access || "—"} />
          {client.homeRisk.length > 0 && (
            <Row
              label="Home risks"
              value={
                <ul className="prose" style={{ margin: 0 }}>
                  {client.homeRisk.map((h, i) => (
                    <li key={i} style={{ fontSize: 12.5 }}>
                      {h}
                    </li>
                  ))}
                </ul>
              }
            />
          )}
        </div>
      </div>

      {/* care plan */}
      <div className="section-title">Care plan</div>
      <div className="grid cols-2">
        {client.carePlan.map((d) => (
          <div key={d.domain} className="card">
            <div className="flex between" style={{ alignItems: "flex-start" }}>
              <div className="flex" style={{ gap: 8 }}>
                {d.icon && (
                  <span className="ms" style={{ fontSize: 20, color: "var(--accent)" }}>
                    {d.icon}
                  </span>
                )}
                <strong style={{ fontSize: 14 }}>{d.domain}</strong>
              </div>
              {d.risk && <span className={`pill tone-${riskTone(d.risk)}`}>{d.risk} risk</span>}
            </div>
            {d.need && (
              <p className="muted" style={{ fontSize: 12.5, margin: "8px 0" }}>
                {d.need}
              </p>
            )}
            {d.tasks && d.tasks.length > 0 && (
              <ul className="prose" style={{ margin: 0 }}>
                {d.tasks.map((t, i) => (
                  <li key={i} style={{ fontSize: 12.5 }}>
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* special instructions */}
      {client.notes && client.notes.length > 0 && (
        <>
          <div className="section-title">Special instructions</div>
          <div className="card">
            <ul className="prose" style={{ margin: 0 }}>
              {client.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* documents */}
      {((client.chkExpired && client.chkExpired.length > 0) || (client.chkExpiring && client.chkExpiring.length > 0)) && (
        <>
          <div className="section-title">Documents</div>
          <div className="card">
            <div className="flex wrap" style={{ gap: 6 }}>
              {(client.chkExpired ?? []).map((d, i) => (
                <span key={"e" + i} className="pill tone-red">
                  <span className="ms" style={{ fontSize: 13 }}>
                    error
                  </span>
                  {d} — overdue
                </span>
              ))}
              {(client.chkExpiring ?? []).map((d, i) => (
                <span key={"x" + i} className="pill tone-amber">
                  <span className="ms" style={{ fontSize: 13 }}>
                    schedule
                  </span>
                  {d} — expiring
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* schedule */}
      <div className="section-title">Schedule of service</div>
      <div className="grid cols-2">
        {client.schedule.map((day) => (
          <div key={day.day} className="card">
            <strong style={{ fontSize: 14 }}>{day.day}</strong>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              {day.visits.map((v, i) => (
                <div key={i} style={{ borderLeft: "3px solid var(--accent)", paddingLeft: 10 }}>
                  <div className="flex" style={{ gap: 8, fontSize: 13 }}>
                    <span className="code">{v.time}</span>
                    <strong>{v.type}</strong>
                    <span className="muted">{v.dur}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 11.5 }}>
                    {v.carer}
                    {v.tasks.length > 0 && ` · ${v.tasks.join(", ")}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* carers */}
      {client.carers.length > 0 && (
        <>
          <div className="section-title">Care team</div>
          <div className="flex wrap" style={{ gap: 6 }}>
            {client.carers.map((c, i) => (
              <span key={i} className="pill tone-green">
                <span className="ms" style={{ fontSize: 14 }}>
                  badge
                </span>
                {c}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
