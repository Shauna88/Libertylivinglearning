"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Issue = {
  kind: string;
  entry_id: number;
  ref: string;
  category: string;
  severity: string;
  summary: string;
  detail: string;
  status: string;
  reporter_name: string;
  dept: string;
  routed: boolean;
  signoff_count: number;
  last_outcome: string | null;
};
type Assignment = {
  id: number;
  kind: string;
  ref_id: string;
  ref_title: string;
  audience: string;
  note: string;
  due: string | null;
  assigned_by: string;
  withdrawn: boolean;
  created_at: string;
};
type Opt = { id: string; title: string };

const KIND_TONE: Record<string, string> = { complaint: "teal", incident: "amber", safeguarding: "red" };

export default function ImprovementHub({
  issues,
  assignments,
  courses,
  sops,
  departments,
  outcomes,
  audiences,
}: {
  issues: Issue[];
  assignments: Assignment[];
  courses: Opt[];
  sops: Opt[];
  departments: string[];
  outcomes: string[];
  audiences: string[];
}) {
  const [tab, setTab] = useState<"issues" | "push" | "log">("issues");

  return (
    <div className="fade">
      <div className="flex wrap" style={{ gap: 8, marginBottom: 20 }}>
        {[
          { k: "issues", label: `Issues to action · ${issues.filter((i) => i.status !== "closed").length}`, icon: "rule" },
          { k: "push", label: "Push training & SOPs", icon: "model_training" },
          { k: "log", label: `Assignment log · ${assignments.length}`, icon: "history" },
        ].map((t) => (
          <button key={t.k} className={`chip${tab === t.k ? " active" : ""}`} onClick={() => setTab(t.k as typeof tab)}>
            <span className="ms" style={{ fontSize: 15, marginRight: 4, verticalAlign: "-3px" }}>
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "issues" && (
        <IssuesTab issues={issues} courses={courses} sops={sops} departments={departments} outcomes={outcomes} audiences={audiences} />
      )}
      {tab === "push" && <PushTab courses={courses} sops={sops} audiences={audiences} />}
      {tab === "log" && <LogTab assignments={assignments} />}
    </div>
  );
}

function IssuesTab({
  issues,
  courses,
  sops,
  departments,
  outcomes,
  audiences,
}: {
  issues: Issue[];
  courses: Opt[];
  sops: Opt[];
  departments: string[];
  outcomes: string[];
  audiences: string[];
}) {
  const [dept, setDept] = useState("ALL");
  const [open, setOpen] = useState<string | null>(null);

  const open_issues = issues.filter((i) => i.status !== "closed");
  const filtered = useMemo(
    () => (dept === "ALL" ? open_issues : open_issues.filter((i) => i.dept === dept)),
    [dept, open_issues]
  );

  return (
    <>
      <div className="flex wrap" style={{ gap: 8, marginBottom: 14 }}>
        <button className={`chip${dept === "ALL" ? " active" : ""}`} onClick={() => setDept("ALL")}>
          All departments · {open_issues.length}
        </button>
        {departments.map((d) => (
          <button key={d} className={`chip${dept === d ? " active" : ""}`} onClick={() => setDept(d)}>
            {d} · {open_issues.filter((i) => i.dept === d).length}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card muted">No open issues in this department.</div>
      ) : (
        <div className="grid" style={{ gap: 12 }}>
          {filtered.map((iss) => {
            const key = `${iss.kind}:${iss.entry_id}`;
            const isOpen = open === key;
            return (
              <div key={key} className="card">
                <div className="flex between wrap" style={{ gap: 8 }}>
                  <div className="flex wrap" style={{ gap: 8 }}>
                    <span className="code">{iss.ref}</span>
                    <span className={`pill tone-${KIND_TONE[iss.kind] ?? "grey"}`}>{iss.kind}</span>
                    <span className="pill tone-blue">
                      <span className="ms" style={{ fontSize: 13 }}>
                        {iss.routed ? "call_split" : "domain"}
                      </span>
                      {iss.dept}
                      {iss.routed ? " (routed)" : ""}
                    </span>
                  </div>
                  {iss.signoff_count > 0 && (
                    <span className="pill tone-grey">
                      {iss.signoff_count} review{iss.signoff_count > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <h3 style={{ margin: "10px 0 4px", fontSize: 15 }}>{iss.summary}</h3>
                <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
                  {iss.detail}
                </p>
                <div className="flex" style={{ gap: 8, marginTop: 10 }}>
                  <button className="btn btn-primary" style={{ padding: "6px 13px", fontSize: 12.5 }} onClick={() => setOpen(isOpen ? null : key)}>
                    <span className="ms" style={{ fontSize: 15 }}>
                      {isOpen ? "expand_less" : "gavel"}
                    </span>
                    {isOpen ? "Close" : "Review & sign off"}
                  </button>
                </div>
                {isOpen && (
                  <SignoffForm
                    issue={iss}
                    courses={courses}
                    sops={sops}
                    departments={departments}
                    outcomes={outcomes}
                    audiences={audiences}
                    onDone={() => setOpen(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function SignoffForm({
  issue,
  courses,
  sops,
  departments,
  outcomes,
  audiences,
  onDone,
}: {
  issue: Issue;
  courses: Opt[];
  sops: Opt[];
  departments: string[];
  outcomes: string[];
  audiences: string[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [outcome, setOutcome] = useState("");
  const [note, setNote] = useState("");
  const [routeDept, setRouteDept] = useState("");
  const [supervision, setSupervision] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [sopId, setSopId] = useState("");
  const [audience, setAudience] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const needsAudience = !!(courseId || sopId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/improvement/signoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: issue.kind,
          entryId: issue.entry_id,
          outcome,
          note,
          routeDept: routeDept || null,
          supervision,
          courseId: courseId || undefined,
          sopId: sopId || undefined,
          audience: audience || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Could not sign off.");
        return;
      }
      onDone();
      router.refresh();
    } catch {
      setErr("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 14, borderTop: "1px dashed var(--border)", paddingTop: 14 }}>
      <div className="grid cols-2" style={{ gap: 12 }}>
        <div className="field">
          <label>Outcome</label>
          <select className="input" value={outcome} onChange={(e) => setOutcome(e.target.value)} required>
            <option value="">Select…</option>
            {outcomes.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Route the fix to (optional)</label>
          <select className="input" value={routeDept} onChange={(e) => setRouteDept(e.target.value)}>
            <option value="">— keep with {issue.dept} —</option>
            {departments
              .filter((d) => d !== issue.dept)
              .map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label>Review note</label>
        <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} required style={{ resize: "vertical" }} />
      </div>

      <div className="section-title" style={{ margin: "4px 0 8px" }}>
        Corrective actions
      </div>
      <div className="grid cols-2" style={{ gap: 12 }}>
        <div className="field">
          <label>Assign refresher course</label>
          <select className="input" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">— none —</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Push an SOP to re-read</label>
          <select className="input" value={sopId} onChange={(e) => setSopId(e.target.value)}>
            <option value="">— none —</option>
            {sops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      {needsAudience && (
        <div className="field">
          <label>Send the training/SOP to</label>
          <select className="input" value={audience} onChange={(e) => setAudience(e.target.value)} required>
            <option value="">Select audience…</option>
            {audiences.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      )}
      <label className="flex" style={{ gap: 8, fontSize: 13, marginBottom: 12, cursor: "pointer" }}>
        <input type="checkbox" checked={supervision} onChange={(e) => setSupervision(e.target.checked)} />
        Schedule 1:1 supervision (HR-08)
      </label>

      {err && <div className="error">{err}</div>}
      <div className="flex" style={{ gap: 10 }}>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Signing off…" : "Confirm sign-off"}
        </button>
        <button type="button" className="btn" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function PushTab({ courses, sops, audiences }: { courses: Opt[]; sops: Opt[]; audiences: string[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<"course" | "sop">("course");
  const [refId, setRefId] = useState("");
  const [audience, setAudience] = useState("");
  const [note, setNote] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const opts = kind === "course" ? courses : sops;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/improvement/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, refId, audience, note, due: due || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Could not push.");
        return;
      }
      setOkMsg(`Pushed “${data.assignment.ref_title}” to ${data.assignment.audience}.`);
      setRefId("");
      setNote("");
      setDue("");
      router.refresh();
      setTimeout(() => setOkMsg(""), 6000);
    } catch {
      setErr("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" style={{ maxWidth: 640 }} onSubmit={submit}>
      <strong style={{ fontSize: 15 }}>Push training or an SOP</strong>
      <div className="grid cols-2" style={{ gap: 12, marginTop: 12 }}>
        <div className="field">
          <label>Type</label>
          <select className="input" value={kind} onChange={(e) => { setKind(e.target.value as "course" | "sop"); setRefId(""); }}>
            <option value="course">Course</option>
            <option value="sop">SOP</option>
          </select>
        </div>
        <div className="field">
          <label>Audience</label>
          <select className="input" value={audience} onChange={(e) => setAudience(e.target.value)} required>
            <option value="">Select…</option>
            {audiences.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label>{kind === "course" ? "Course" : "SOP"}</label>
        <select className="input" value={refId} onChange={(e) => setRefId(e.target.value)} required>
          <option value="">Select…</option>
          {opts.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title}
            </option>
          ))}
        </select>
      </div>
      <div className="grid cols-2" style={{ gap: 12 }}>
        <div className="field">
          <label>Note (optional)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="field">
          <label>Due (optional)</label>
          <input className="input" value={due} onChange={(e) => setDue(e.target.value)} placeholder="e.g. within 14 days" />
        </div>
      </div>
      {err && <div className="error">{err}</div>}
      {okMsg && <div className="pill tone-green" style={{ marginBottom: 10 }}>{okMsg}</div>}
      <button className="btn btn-primary" disabled={busy}>
        {busy ? "Pushing…" : "Push to audience"}
      </button>
    </form>
  );
}

function LogTab({ assignments }: { assignments: Assignment[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);

  async function withdraw(id: number) {
    setBusyId(id);
    try {
      await fetch("/api/improvement/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdraw: id }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (assignments.length === 0) return <div className="card muted">Nothing has been pushed yet.</div>;

  return (
    <div className="grid" style={{ gap: 10 }}>
      {assignments.map((a) => (
        <div key={a.id} className="card" style={a.withdrawn ? { opacity: 0.6 } : undefined}>
          <div className="flex between wrap" style={{ gap: 8 }}>
            <div className="flex wrap" style={{ gap: 8 }}>
              <span className={`pill tone-${a.kind === "course" ? "green" : "blue"}`}>{a.kind}</span>
              <strong style={{ fontSize: 14 }}>{a.ref_title}</strong>
            </div>
            {a.withdrawn ? (
              <span className="pill tone-grey">Withdrawn</span>
            ) : (
              <button className="btn" style={{ padding: "5px 11px", fontSize: 12 }} disabled={busyId === a.id} onClick={() => withdraw(a.id)}>
                {busyId === a.id ? "…" : "Withdraw"}
              </button>
            )}
          </div>
          <div className="flex wrap" style={{ gap: 10, fontSize: 11.5, color: "var(--text-2)", marginTop: 6 }}>
            <span>→ {a.audience}</span>
            {a.due && <span>· due {a.due}</span>}
            <span>· by {a.assigned_by}</span>
            {a.note && <span>· {a.note}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
