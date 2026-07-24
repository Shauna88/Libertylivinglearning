"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PiiRevealButton from "@/components/PiiRevealButton";
import ScheduleEditor from "@/components/ScheduleEditor";
import { CARE_NOTE_CATEGORIES, DOC_STATUS, type Client, type NextOfKin, type RevealedIdentity } from "@/lib/crm";

export type CareNote = { id: number; category: string; tone: string; note: string; author: string; created_at: string };
export type ClientDoc = { id: number; name: string; status: string; expiry: string | null; added_by: string };

function fmtWhen(s: string) {
  return new Date(s).toLocaleString("en-IE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

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

export default function ClientProfile({
  client,
  notes = [],
  docs = [],
  carers = [],
  editable = false,
}: {
  client: Client;
  notes?: CareNote[];
  docs?: ClientDoc[];
  carers?: string[];
  editable?: boolean;
}) {
  // `client` arrives with identifiers masked. Revealing swaps in the real values.
  const [identity, setIdentity] = useState<RevealedIdentity | null>(null);
  const id = identity;
  const nok: NextOfKin[] = id?.nok ?? client.nok;

  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [taskDraft, setTaskDraft] = useState<Record<string, string>>({});
  const [noteCat, setNoteCat] = useState(CARE_NOTE_CATEGORIES[0].key);
  const [noteText, setNoteText] = useState("");
  const [docName, setDocName] = useState("");
  const [docStatus, setDocStatus] = useState("on_file");
  const [docExpiry, setDocExpiry] = useState("");

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

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
                    <span className="flex between" style={{ gap: 8, alignItems: "flex-start" }}>
                      <span>{t}</span>
                      {editable && (
                        <button
                          className="task-x"
                          title="Remove task"
                          disabled={busy}
                          onClick={() => act({ action: "del_task", domain: d.domain, task: t })}
                        >
                          <span className="ms" style={{ fontSize: 15 }}>close</span>
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {editable && (
              <div className="flex" style={{ gap: 6, marginTop: 10 }}>
                <input
                  className="input"
                  style={{ fontSize: 12.5, padding: "6px 9px" }}
                  placeholder="Add a task…"
                  value={taskDraft[d.domain] ?? ""}
                  onChange={(e) => setTaskDraft((s) => ({ ...s, [d.domain]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (taskDraft[d.domain] ?? "").trim().length > 1) {
                      act({ action: "add_task", domain: d.domain, task: taskDraft[d.domain].trim() });
                      setTaskDraft((s) => ({ ...s, [d.domain]: "" }));
                    }
                  }}
                />
                <button
                  className="mini primary"
                  disabled={busy || (taskDraft[d.domain] ?? "").trim().length < 2}
                  onClick={() => {
                    act({ action: "add_task", domain: d.domain, task: (taskDraft[d.domain] ?? "").trim() });
                    setTaskDraft((s) => ({ ...s, [d.domain]: "" }));
                  }}
                >
                  Add
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* care notes / diary */}
      <div className="section-title">Care notes &amp; diary</div>
      {editable && (
        <div className="card" style={{ marginBottom: 10 }}>
          <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
            <select className="input" style={{ maxWidth: 170 }} value={noteCat} onChange={(e) => setNoteCat(e.target.value)}>
              {CARE_NOTE_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.key}</option>
              ))}
            </select>
            <input
              className="input"
              style={{ flex: 1, minWidth: 200 }}
              placeholder="Add a dated care note…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <button
              className="mini primary"
              disabled={busy || noteText.trim().length < 3}
              onClick={() => {
                act({ action: "add_note", category: noteCat, note: noteText.trim() });
                setNoteText("");
              }}
            >
              Add note
            </button>
          </div>
        </div>
      )}
      {notes.length === 0 ? (
        <div className="card muted" style={{ fontSize: 13 }}>No care notes yet.</div>
      ) : (
        <div className="grid" style={{ gap: 8 }}>
          {notes.map((n) => (
            <div key={n.id} className="card" style={{ borderLeft: `3px solid var(--${n.tone}-fg)` }}>
              <div className="flex between wrap" style={{ gap: 8 }}>
                <span className={`pill tone-${n.tone}`}>{n.category}</span>
                <span className="muted" style={{ fontSize: 11.5 }}>{fmtWhen(n.created_at)} · {n.author}</span>
              </div>
              <p style={{ fontSize: 13, margin: "8px 0 0" }}>{n.note}</p>
            </div>
          ))}
        </div>
      )}

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
      <div className="section-title">Documents</div>
      {((client.chkExpired && client.chkExpired.length > 0) || (client.chkExpiring && client.chkExpiring.length > 0)) && (
        <div className="card" style={{ marginBottom: 10 }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Flagged in record</div>
          <div className="flex wrap" style={{ gap: 6 }}>
            {(client.chkExpired ?? []).map((d, i) => (
              <span key={"e" + i} className="pill tone-red">
                <span className="ms" style={{ fontSize: 13 }}>error</span>
                {d} — overdue
              </span>
            ))}
            {(client.chkExpiring ?? []).map((d, i) => (
              <span key={"x" + i} className="pill tone-amber">
                <span className="ms" style={{ fontSize: 13 }}>schedule</span>
                {d} — expiring
              </span>
            ))}
          </div>
        </div>
      )}
      {editable && (
        <div className="card" style={{ marginBottom: 10 }}>
          <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
            <input
              className="input"
              style={{ flex: 1, minWidth: 180 }}
              placeholder="Document name…"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
            />
            <select className="input" style={{ maxWidth: 140 }} value={docStatus} onChange={(e) => setDocStatus(e.target.value)}>
              {Object.entries(DOC_STATUS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <input
              className="input"
              type="date"
              style={{ maxWidth: 160 }}
              value={docExpiry}
              onChange={(e) => setDocExpiry(e.target.value)}
              title="Expiry (optional)"
            />
            <button
              className="mini primary"
              disabled={busy || docName.trim().length < 2}
              onClick={() => {
                act({ action: "add_doc", name: docName.trim(), status: docStatus, expiry: docExpiry || null });
                setDocName("");
                setDocExpiry("");
              }}
            >
              Add document
            </button>
          </div>
        </div>
      )}
      {docs.length > 0 && (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Document</th>
                <th>Status</th>
                <th>Expiry</th>
                <th>Added</th>
                {editable && <th></th>}
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => {
                const meta = DOC_STATUS[d.status] ?? { label: d.status, tone: "grey" };
                return (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600 }}>{d.name}</td>
                    <td><span className={`pill tone-${meta.tone}`}>{meta.label}</span></td>
                    <td className="muted">{d.expiry ?? "—"}</td>
                    <td className="muted" style={{ fontSize: 12 }}>{d.added_by}</td>
                    {editable && (
                      <td style={{ textAlign: "right" }}>
                        <button className="task-x" title="Remove" disabled={busy} onClick={() => act({ action: "del_doc", docId: d.id })}>
                          <span className="ms" style={{ fontSize: 15 }}>close</span>
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* schedule of service — the permanent weekly plan */}
      <div className="section-title">Schedule of service {editable && <span className="muted" style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: 12 }}>· the permanent weekly plan</span>}</div>
      {editable ? (
        <ScheduleEditor clientId={client.id} schedule={client.schedule} carers={carers} />
      ) : client.schedule.length === 0 ? (
        <div className="card muted" style={{ fontSize: 13 }}>No schedule set yet.</div>
      ) : (
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
      )}

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
