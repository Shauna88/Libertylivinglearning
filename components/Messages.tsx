"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MessageRow } from "@/lib/db";

function fmt(s: string) {
  return new Date(s).toLocaleString("en-IE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function Messages({
  inbox,
  sent,
  myDept,
  depts,
}: {
  inbox: MessageRow[];
  sent: MessageRow[];
  myDept: string;
  depts: readonly string[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [compose, setCompose] = useState(false);
  const [reply, setReply] = useState<MessageRow | null>(null);

  const [toDept, setToDept] = useState(depts[0]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [meeting, setMeeting] = useState(false);
  const [meetingAt, setMeetingAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function openCompose(r?: MessageRow) {
    setErr("");
    if (r) {
      setReply(r);
      setToDept(r.from_dept || depts[0]);
      setSubject(r.subject.startsWith("Re:") ? r.subject : `Re: ${r.subject}`);
      setMeeting(false); setMeetingAt(""); setBody("");
    } else {
      setReply(null);
      setToDept(depts[0]); setSubject(""); setBody(""); setMeeting(false); setMeetingAt("");
    }
    setCompose(true);
  }

  async function send() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toDept, subject, body, kind: meeting ? "meeting" : "message", meetingAt, parentId: reply?.id ?? null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data.error ?? "Could not send."); return; }
      setCompose(false);
      router.refresh();
    } catch {
      setErr("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  const list = tab === "inbox" ? inbox : sent;

  return (
    <>
      <div className="flex between wrap" style={{ gap: 10, marginBottom: 14, alignItems: "center" }}>
        <div className="flex" style={{ gap: 6 }}>
          <button className={`chip${tab === "inbox" ? " active" : ""}`} onClick={() => setTab("inbox")}>Inbox · {inbox.length}</button>
          <button className={`chip${tab === "sent" ? " active" : ""}`} onClick={() => setTab("sent")}>Sent · {sent.length}</button>
        </div>
        <button className="btn btn-primary" onClick={() => openCompose()}>
          <span className="ms" style={{ fontSize: 18 }}>edit</span>New message
        </button>
      </div>
      {tab === "inbox" && <p className="muted" style={{ fontSize: 12, marginTop: -4, marginBottom: 12 }}>Messages addressed to <strong>{myDept}</strong> or all staff.</p>}

      {list.length === 0 ? (
        <div className="card muted" style={{ fontSize: 13 }}>{tab === "inbox" ? "No messages for your department." : "You haven't sent any messages."}</div>
      ) : (
        <div className="grid" style={{ gap: 10 }}>
          {list.map((m) => (
            <div key={m.id} className="card" style={{ borderLeft: `4px solid var(--${m.kind === "meeting" ? "blue" : "grey"}-fg)` }}>
              <div className="flex between wrap" style={{ gap: 8, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <div className="flex wrap" style={{ gap: 8, alignItems: "center" }}>
                    {m.kind === "meeting" && <span className="pill tone-blue"><span className="ms" style={{ fontSize: 13 }}>event</span>Meeting request</span>}
                    <strong style={{ fontSize: 14 }}>{m.subject}</strong>
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                    {tab === "inbox" ? <>From <strong>{m.from_name}</strong> ({m.from_dept || m.from_role})</> : <>To <strong>{m.to_dept}</strong></>} · {fmt(m.created_at)}
                  </div>
                  {m.body && <p style={{ fontSize: 13, margin: "8px 0 0" }}>{m.body}</p>}
                  {m.meeting_at && <div style={{ fontSize: 12.5, marginTop: 6 }}><span className="ms" style={{ fontSize: 14, verticalAlign: "middle", marginRight: 4, color: "var(--blue-fg)" }}>schedule</span>Proposed: <strong>{m.meeting_at}</strong></div>}
                </div>
                {tab === "inbox" && (
                  <button className="mini" onClick={() => openCompose(m)}><span className="ms" style={{ fontSize: 14, marginRight: 3 }}>reply</span>Reply</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {compose && (
        <div className="modal-backdrop" onClick={() => !busy && setCompose(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="flex between" style={{ marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 17 }}>{reply ? "Reply" : "New message"}</h2>
              <button className="mini" onClick={() => setCompose(false)} disabled={busy}>Close</button>
            </div>
            {err && <div className="card" style={{ borderColor: "var(--red-fg)", color: "var(--red-fg)", marginBottom: 10 }}>{err}</div>}
            <div className="fld"><span>To department</span>
              <select className="input" value={toDept} onChange={(e) => setToDept(e.target.value)}>
                {depts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <label className="fld" style={{ marginTop: 10 }}><span>Subject</span>
              <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
            </label>
            <label className="fld" style={{ marginTop: 10 }}><span>Message</span>
              <textarea className="input" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message…" />
            </label>
            <label className="flex" style={{ gap: 8, marginTop: 12, fontSize: 13, alignItems: "center" }}>
              <input type="checkbox" checked={meeting} onChange={(e) => setMeeting(e.target.checked)} />
              Request a meeting
            </label>
            {meeting && (
              <label className="fld" style={{ marginTop: 8 }}><span>Suggested date / time</span>
                <input className="input" value={meetingAt} onChange={(e) => setMeetingAt(e.target.value)} placeholder="e.g. 18 Jul 2026, 14:00" />
              </label>
            )}
            <div className="flex" style={{ gap: 8, marginTop: 16 }}>
              <button className="btn btn-primary" disabled={busy || subject.trim().length < 2} onClick={send}>{busy ? "Sending…" : reply ? "Send reply" : "Send"}</button>
              <button className="btn" onClick={() => setCompose(false)} disabled={busy}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
