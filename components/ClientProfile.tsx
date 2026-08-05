"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PiiRevealButton from "@/components/PiiRevealButton";
import ScheduleEditor from "@/components/ScheduleEditor";
import ScheduleWeek, { type PendingReq } from "@/components/ScheduleWeek";
import ClientAssessments from "@/components/ClientAssessments";
import ClientTimeline from "@/components/ClientTimeline";
import Empty from "@/components/Empty";
import { useToast } from "@/components/Toast";
import type { CarerMatch } from "@/lib/carers";
import type { ActivityEvent } from "@/lib/db";
import { isUnassignedCarer, type FreeCarer } from "@/lib/schedule";
import { CARE_NOTE_CATEGORIES, DOC_STATUS, statusMeta, type Client, type NextOfKin, type RevealedIdentity } from "@/lib/crm";

export type CareNote = { id: number; category: string; tone: string; note: string; author: string; created_at: string };
export type ClientDoc = { id: number; name: string; status: string; expiry: string | null; added_by: string; has_file?: boolean; orig_name?: string | null; size_bytes?: number | null };

function fmtSize(n?: number | null) {
  if (!n) return "";
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`;
}

type TabKey = "overview" | "careplan" | "schedule" | "assessments" | "notes" | "documents" | "activity";

function fmtWhen(s: string) {
  return new Date(s).toLocaleString("en-IE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="cp-row">
      <div className="muted cp-row-label">{label}</div>
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
  assessments = [],
  activity = [],
  carers = [],
  pending = [],
  cover = {},
  reasons = {},
  isApprover = false,
  editable = false,
  suggestions = [],
  slotSuggest = {},
  reviewsOverdue = 0,
}: {
  client: Client;
  notes?: CareNote[];
  docs?: ClientDoc[];
  assessments?: { itemKey: string; completedOn: string | null; reviewDue: string | null }[];
  activity?: ActivityEvent[];
  carers?: string[];
  pending?: PendingReq[];
  cover?: Record<string, string>;
  reasons?: Record<string, string>;
  isApprover?: boolean;
  editable?: boolean;
  suggestions?: CarerMatch[];
  slotSuggest?: Record<string, FreeCarer[]>;
  reviewsOverdue?: number;
}) {
  // `client` arrives with identifiers masked. Revealing swaps in the real values.
  const [identity, setIdentity] = useState<RevealedIdentity | null>(null);
  const id = identity;
  const nok: NextOfKin[] = id?.nok ?? client.nok;

  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>("overview");
  const [busy, setBusy] = useState(false);
  const [taskDraft, setTaskDraft] = useState<Record<string, string>>({});
  const [noteCat, setNoteCat] = useState(CARE_NOTE_CATEGORIES[0].key);
  const [noteText, setNoteText] = useState("");
  const [docName, setDocName] = useState("");
  const [docStatus, setDocStatus] = useState("on_file");
  const [docExpiry, setDocExpiry] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileKey, setFileKey] = useState(0);

  async function saveDoc() {
    if (docFile) {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", docFile);
        fd.append("name", docName.trim() || docFile.name.replace(/\.pdf$/i, ""));
        fd.append("status", docStatus);
        if (docExpiry) fd.append("expiry", docExpiry);
        const res = await fetch(`/api/clients/${client.id}/documents`, { method: "POST", body: fd });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) { toast(j.error || "Upload failed", "error"); return; }
        toast("Document uploaded");
        setDocName(""); setDocExpiry(""); setDocFile(null); setFileKey((k) => k + 1);
        router.refresh();
      } catch {
        toast("Upload failed — please try again", "error");
      } finally {
        setUploading(false);
      }
    } else {
      act({ action: "add_doc", name: docName.trim(), status: docStatus, expiry: docExpiry || null }, "Document added");
      setDocName(""); setDocExpiry("");
    }
  }

  async function act(body: Record<string, unknown>, msg?: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        router.refresh();
        if (msg) toast(msg);
      } else {
        toast("Something went wrong — please try again", "error");
      }
    } finally {
      setBusy(false);
    }
  }

  const meta = statusMeta(client.status);

  // Header at-a-glance signals, derived from what's already loaded.
  const weekCalls = client.schedule.reduce((n, d) => n + d.visits.length, 0);
  const scheduleIsNew = weekCalls === 0;
  const unassignedCount = client.schedule.reduce(
    (n, d) => n + d.visits.filter((v) => isUnassignedCarer(cover[`${d.day}|${v.time}`] ?? v.carer)).length,
    0
  );
  const flaggedDocs = (client.chkExpired?.length ?? 0) + (client.chkExpiring?.length ?? 0);

  const TABS: { key: TabKey; label: string; icon: string; badge?: number; badgeTone?: string }[] = [
    { key: "overview", label: "Overview", icon: "badge" },
    { key: "careplan", label: "Care plan", icon: "assignment" },
    { key: "schedule", label: "Schedule", icon: "calendar_month", badge: unassignedCount || undefined, badgeTone: "red" },
    { key: "assessments", label: "Assessments", icon: "fact_check", badge: reviewsOverdue || undefined, badgeTone: "red" },
    { key: "notes", label: "Notes", icon: "sticky_note_2", badge: notes.length || undefined, badgeTone: "grey" },
    { key: "documents", label: "Documents", icon: "description", badge: flaggedDocs || undefined, badgeTone: "amber" },
    { key: "activity", label: "Activity", icon: "history" },
  ];

  return (
    <div className="fade">
      {/* ---- summary header ---- */}
      <div className="cp-hero">
        <div className="cp-hero-id">
          <div className="cp-avatar-lg"><span className="ms" aria-hidden="true">{identity ? "person" : "lock"}</span></div>
          <div style={{ minWidth: 0 }}>
            <div className="cp-name">{id?.name ?? client.name}</div>
            <div className="cp-sub">
              <span className="code">{client.su}</span>
              <span className={`pill tone-${meta.tone}`}>{meta.label}</span>
              <span className="cp-sub-dot">{client.area}</span>
              <span className="cp-sub-dot">{client.hoursWk}/wk</span>
              <span className="cp-sub-dot">Coord: {client.csm}</span>
            </div>
            {(unassignedCount > 0 || reviewsOverdue > 0 || pending.length > 0 || flaggedDocs > 0) && (
              <div className="cp-alerts">
                {unassignedCount > 0 && (
                  <button className="cp-alert tone-red" onClick={() => setTab("schedule")}>
                    <span className="ms" aria-hidden="true">person_alert</span>{unassignedCount} unassigned call{unassignedCount === 1 ? "" : "s"}
                  </button>
                )}
                {reviewsOverdue > 0 && (
                  <button className="cp-alert tone-red" onClick={() => setTab("assessments")}>
                    <span className="ms" aria-hidden="true">event_repeat</span>{reviewsOverdue} review{reviewsOverdue === 1 ? "" : "s"} overdue
                  </button>
                )}
                {pending.length > 0 && (
                  <button className="cp-alert tone-amber" onClick={() => setTab("schedule")}>
                    <span className="ms" aria-hidden="true">how_to_reg</span>{pending.length} change{pending.length === 1 ? "" : "s"} awaiting approval
                  </button>
                )}
                {flaggedDocs > 0 && (
                  <button className="cp-alert tone-amber" onClick={() => setTab("documents")}>
                    <span className="ms" aria-hidden="true">description</span>{flaggedDocs} document{flaggedDocs === 1 ? "" : "s"} flagged
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="cp-hero-actions">
          {identity ? (
            <span className="pill tone-amber"><span className="ms" style={{ fontSize: 14 }}>lock_open</span>Revealed — logged</span>
          ) : (
            <PiiRevealButton
              scope="client"
              clientId={client.id}
              onReveal={(d) => {
                setIdentity(d.identity as unknown as RevealedIdentity);
                toast("Details revealed — access logged", "info");
              }}
            />
          )}
        </div>
      </div>

      {/* ---- section tabs ---- */}
      <div className="cp-tabs" role="tablist" aria-label="Client record sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`cp-tab${tab === t.key ? " active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            <span className="ms" aria-hidden="true" style={{ fontSize: 17 }}>{t.icon}</span>
            <span>{t.label}</span>
            {t.badge ? <span className={`cp-tab-badge tone-${t.badgeTone}`}>{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {/* ================= OVERVIEW ================= */}
      {tab === "overview" && (
        <div className="cp-panel">
          {/* identity + contact */}
          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>Personal &amp; contact details</div>
            <Row label="Name" value={<strong>{id?.name ?? client.name}</strong>} />
            <Row label="Date of birth" value={`${id?.dob ?? client.dob}${client.age ? ` · age ${client.age}` : ""}`} />
            <Row label="Sex" value={client.sex} />
            <Row label="Address" value={id?.addr ?? client.addr} />
            <Row label="Eircode" value={<span className="code">{id?.eircode ?? client.eircode}</span>} />
            <Row label="Phone" value={id?.phone ?? client.phone} />
            {(id?.mobile ?? client.mobile) && <Row label="Mobile" value={id?.mobile ?? client.mobile} />}
            <Row
              label="GP"
              value={<>{client.gp.name} · {client.gp.practice} {client.gp.phone && <span className="code">{client.gp.phone}</span>}</>}
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

          {/* care package */}
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
              <Row label="Review due" value={<span className={`pill tone-${client.reviewTone}`}>{client.reviewDue}</span>} />
              <Row label="Review note" value={client.reviewNote} />
              <Row label="Allergies" value={<span className="pill tone-red">{client.allergies}</span>} />
              <Row label="Mobility" value={client.mobility} />
              {client.flags.length > 0 && (
                <Row
                  label="Flags"
                  value={
                    <div className="flex wrap" style={{ gap: 6 }}>
                      {client.flags.map((f, i) => (<span key={i} className="pill tone-amber">{f}</span>))}
                    </div>
                  }
                />
              )}
            </div>
          </div>

          {/* clinical + home */}
          <div className="grid cols-2">
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>Conditions</div>
              <div className="flex wrap" style={{ gap: 6 }}>
                {client.conditions.map((c, i) => (<span key={i} className="pill tone-grey">{c}</span>))}
              </div>
              {client.requirements && client.requirements.length > 0 && (
                <>
                  <div className="section-title">Requirements</div>
                  <ul className="prose" style={{ margin: 0 }}>
                    {client.requirements.map((r, i) => (<li key={i} style={{ fontSize: 12.5 }}>{r}</li>))}
                  </ul>
                </>
              )}
            </div>
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>Home &amp; access</div>
              <Row label="Key safe" value={client.keysafe || "—"} />
              <Row label="Access" value={client.access || "—"} />
              {client.homeRisk.length > 0 && (
                <Row
                  label="Home risks"
                  value={
                    <ul className="prose" style={{ margin: 0 }}>
                      {client.homeRisk.map((h, i) => (<li key={i} style={{ fontSize: 12.5 }}>{h}</li>))}
                    </ul>
                  }
                />
              )}
            </div>
          </div>

          {/* special instructions */}
          {client.notes && client.notes.length > 0 && (
            <>
              <div className="section-title">Special instructions</div>
              <div className="card">
                <ul className="prose" style={{ margin: 0 }}>
                  {client.notes.map((n, i) => (<li key={i}>{n}</li>))}
                </ul>
              </div>
            </>
          )}

          {/* care team */}
          {client.carers.length > 0 && (
            <>
              <div className="section-title">Care team</div>
              <div className="flex wrap" style={{ gap: 6 }}>
                {client.carers.map((c, i) => (
                  <span key={i} className="pill tone-green">
                    <span className="ms" style={{ fontSize: 14 }}>badge</span>{c}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ================= CARE PLAN ================= */}
      {tab === "careplan" && (
        <div className="cp-panel">
          <div className="grid cols-2">
            {client.carePlan.map((d) => (
              <div key={d.domain} className="card">
                <div className="flex between" style={{ alignItems: "flex-start" }}>
                  <div className="flex" style={{ gap: 8 }}>
                    {d.icon && <span className="ms" style={{ fontSize: 20, color: "var(--accent)" }}>{d.icon}</span>}
                    <strong style={{ fontSize: 14 }}>{d.domain}</strong>
                  </div>
                  {d.risk && <span className={`pill tone-${riskTone(d.risk)}`}>{d.risk} risk</span>}
                </div>
                {d.need && <p className="muted" style={{ fontSize: 12.5, margin: "8px 0" }}>{d.need}</p>}
                {d.tasks && d.tasks.length > 0 && (
                  <ul className="prose" style={{ margin: 0 }}>
                    {d.tasks.map((t, i) => (
                      <li key={i} style={{ fontSize: 12.5 }}>
                        <span className="flex between" style={{ gap: 8, alignItems: "flex-start" }}>
                          <span>{t}</span>
                          {editable && (
                            <button className="task-x" title="Remove task" disabled={busy} onClick={() => act({ action: "del_task", domain: d.domain, task: t }, "Task removed")}>
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
                          act({ action: "add_task", domain: d.domain, task: taskDraft[d.domain].trim() }, "Task added");
                          setTaskDraft((s) => ({ ...s, [d.domain]: "" }));
                        }
                      }}
                    />
                    <button
                      className="mini primary"
                      disabled={busy || (taskDraft[d.domain] ?? "").trim().length < 2}
                      onClick={() => {
                        act({ action: "add_task", domain: d.domain, task: (taskDraft[d.domain] ?? "").trim() }, "Task added");
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
        </div>
      )}

      {/* ================= SCHEDULE ================= */}
      {tab === "schedule" && (
        <div className="cp-panel">
          {editable ? (
            <>
              {scheduleIsNew && isApprover && (
                <div className="card" style={{ marginBottom: 10, borderColor: "var(--accent)", background: "var(--accent-tint)" }}>
                  <div className="flex" style={{ gap: 8, alignItems: "center" }}>
                    <span className="ms" style={{ fontSize: 18, color: "var(--accent)" }}>upload_file</span>
                    <strong style={{ fontSize: 13.5 }}>Set up this client&apos;s original Schedule of Service</strong>
                  </div>
                  <p className="muted" style={{ fontSize: 12.5, margin: "6px 0 0" }}>
                    This client has no schedule yet. Use <strong>Set up the schedule</strong> below to add each weekly call — day, time, duration, task and carer. Suggested carers for this client&apos;s area and needs appear in the carer dropdowns once calls exist.
                  </p>
                </div>
              )}
              {scheduleIsNew && !isApprover && (
                <div className="card muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
                  No Schedule of Service set up yet. A CSM needs to enter this client&apos;s original weekly schedule before calls can be rostered.
                </div>
              )}
              <ScheduleWeek clientId={client.id} schedule={client.schedule} carers={carers} pending={pending} cover={cover} reasons={reasons} isApprover={isApprover} suggestions={suggestions} slotSuggest={slotSuggest} />
              {isApprover && (
                <details className="card" style={{ marginTop: 12 }} open={scheduleIsNew}>
                  <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                    {scheduleIsNew ? "Set up the schedule — add each weekly call, time & task" : "Edit plan structure — add / remove calls, times & tasks"}
                  </summary>
                  <div style={{ marginTop: 12 }}>
                    <ScheduleEditor clientId={client.id} schedule={client.schedule} carers={carers} suggestions={suggestions} />
                  </div>
                </details>
              )}
            </>
          ) : client.schedule.length === 0 ? (
            <Empty icon="event_busy" title="No schedule set yet" hint="A coordinator sets up this client's weekly Schedule of Service before calls can be rostered." />
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
                          {v.carer}{v.tasks.length > 0 && ` · ${v.tasks.join(", ")}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= ASSESSMENTS ================= */}
      {tab === "assessments" && (
        <div className="cp-panel">
          <ClientAssessments clientId={client.id} records={assessments} canEdit={editable} />
        </div>
      )}

      {/* ================= NOTES ================= */}
      {tab === "notes" && (
        <div className="cp-panel">
          {editable && (
            <div className="card" style={{ marginBottom: 10 }}>
              <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
                <select className="input" style={{ maxWidth: 170 }} value={noteCat} onChange={(e) => setNoteCat(e.target.value)}>
                  {CARE_NOTE_CATEGORIES.map((c) => (<option key={c.key} value={c.key}>{c.key}</option>))}
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
                    act({ action: "add_note", category: noteCat, note: noteText.trim() }, "Care note added");
                    setNoteText("");
                  }}
                >
                  Add note
                </button>
              </div>
            </div>
          )}
          {notes.length === 0 ? (
            <Empty icon="sticky_note_2" title="No care notes yet" hint={editable ? "Add a dated diary note above — visits, welfare, family contact, incidents." : undefined} />
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
        </div>
      )}

      {/* ================= DOCUMENTS ================= */}
      {tab === "documents" && (
        <div className="cp-panel">
          {((client.chkExpired && client.chkExpired.length > 0) || (client.chkExpiring && client.chkExpiring.length > 0)) && (
            <div className="card" style={{ marginBottom: 10 }}>
              <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Flagged in record</div>
              <div className="flex wrap" style={{ gap: 6 }}>
                {(client.chkExpired ?? []).map((d, i) => (
                  <span key={"e" + i} className="pill tone-red"><span className="ms" style={{ fontSize: 13 }}>error</span>{d} — overdue</span>
                ))}
                {(client.chkExpiring ?? []).map((d, i) => (
                  <span key={"x" + i} className="pill tone-amber"><span className="ms" style={{ fontSize: 13 }}>schedule</span>{d} — expiring</span>
                ))}
              </div>
            </div>
          )}
          {editable && (
            <div className="card" style={{ marginBottom: 10 }}>
              <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
                <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="Document name…" value={docName} onChange={(e) => setDocName(e.target.value)} />
                <select className="input" style={{ maxWidth: 140 }} value={docStatus} onChange={(e) => setDocStatus(e.target.value)}>
                  {Object.entries(DOC_STATUS).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
                </select>
                <input className="input" type="date" style={{ maxWidth: 160 }} value={docExpiry} onChange={(e) => setDocExpiry(e.target.value)} title="Expiry (optional)" />
                <button
                  className="mini primary"
                  disabled={busy || uploading || (docName.trim().length < 2 && !docFile)}
                  onClick={saveDoc}
                >
                  {uploading ? "Uploading…" : docFile ? "Upload PDF" : "Add document"}
                </button>
              </div>
              <div className="flex" style={{ gap: 10, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
                <label className="mini" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span className="ms" style={{ fontSize: 16 }}>attach_file</span>
                  {docFile ? "Change PDF" : "Attach a PDF"}
                  <input
                    key={fileKey}
                    type="file"
                    accept="application/pdf,.pdf"
                    style={{ display: "none" }}
                    onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {docFile ? (
                  <span className="muted" style={{ fontSize: 12 }}>
                    {docFile.name} · {fmtSize(docFile.size)}
                    <button className="task-x" title="Remove file" style={{ marginLeft: 6, verticalAlign: "-3px" }} onClick={() => { setDocFile(null); setFileKey((k) => k + 1); }}>
                      <span className="ms" style={{ fontSize: 14 }}>close</span>
                    </button>
                  </span>
                ) : (
                  <span className="muted" style={{ fontSize: 11.5 }}>PDF up to 4 MB. Leave the file empty to record a document reference only.</span>
                )}
              </div>
            </div>
          )}
          {docs.length > 0 ? (
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
                    const dm = DOC_STATUS[d.status] ?? { label: d.status, tone: "grey" };
                    return (
                      <tr key={d.id}>
                        <td style={{ fontWeight: 600 }}>
                          {d.has_file ? (
                            <a href={`/api/clients/${client.id}/documents/${d.id}`} target="_blank" rel="noopener" className="flex" style={{ gap: 5, alignItems: "center", color: "var(--accent)" }}>
                              <span className="ms" style={{ fontSize: 16 }}>picture_as_pdf</span>{d.name}
                              <span className="muted" style={{ fontWeight: 400, fontSize: 11 }}>{fmtSize(d.size_bytes)}</span>
                            </a>
                          ) : d.name}
                        </td>
                        <td><span className={`pill tone-${dm.tone}`}>{dm.label}</span></td>
                        <td className="muted">{d.expiry ?? "—"}</td>
                        <td className="muted" style={{ fontSize: 12 }}>{d.added_by}</td>
                        {editable && (
                          <td style={{ textAlign: "right" }}>
                            <button className="task-x" title="Remove" disabled={busy} onClick={() => act({ action: "del_doc", docId: d.id }, "Document removed")}>
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
          ) : (
            <Empty icon="folder_open" title="No documents on file" hint={editable ? "Add care plans, consent forms, risk assessments and their review dates above." : undefined} />
          )}
        </div>
      )}

      {/* ================= ACTIVITY ================= */}
      {tab === "activity" && (
        <div className="cp-panel">
          {activity.length === 0 ? (
            <Empty icon="history" title="No activity recorded yet" hint="Visits, note entries, schedule changes and reveals appear here as they happen." />
          ) : (
            <ClientTimeline events={activity} />
          )}
        </div>
      )}
    </div>
  );
}
