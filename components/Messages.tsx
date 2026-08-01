"use client";

import { useState } from "react";
import Empty from "@/components/Empty";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MessageRow } from "@/lib/db";
import type { RefGroup } from "@/lib/refs";

function fmt(s: string) {
  return new Date(s).toLocaleString("en-IE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** A readable meeting time, and calendar links if the value is a real datetime. */
function meetingInfo(subject: string, body: string, meetingAt: string) {
  const start = new Date(meetingAt);
  if (Number.isNaN(start.getTime())) return { label: meetingAt, outlook: null as string | null, ics: null as string | null };
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const label = start.toLocaleString("en-IE", { weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const pad = (n: number) => String(n).padStart(2, "0");
  const isoLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  const floating = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const outlook =
    `https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent` +
    `&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body || "")}` +
    `&startdt=${encodeURIComponent(isoLocal(start))}&enddt=${encodeURIComponent(isoLocal(end))}`;
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Liberty Living//Messages//EN", "BEGIN:VEVENT",
    `UID:llh-${floating(start)}@libertyliving`, `DTSTAMP:${floating(new Date(start))}`,
    `DTSTART:${floating(start)}`, `DTEND:${floating(end)}`,
    `SUMMARY:${subject.replace(/\n/g, " ")}`, `DESCRIPTION:${(body || "").replace(/\n/g, " ")}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  return { label, outlook, ics };
}

function downloadIcs(ics: string, subject: string) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${subject.replace(/[^a-z0-9]+/gi, "-").slice(0, 40) || "meeting"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Messages({
  inbox,
  sent,
  myDept,
  depts,
  refGroups = [],
}: {
  inbox: MessageRow[];
  sent: MessageRow[];
  myDept: string;
  depts: readonly string[];
  refGroups?: RefGroup[];
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
  const [refHref, setRefHref] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const refLabels = new Map<string, string>();
  refGroups.forEach((g) => g.options.forEach((o) => refLabels.set(o.href, o.label)));

  function openCompose(r?: MessageRow) {
    setErr("");
    setRefHref(r?.ref_href ?? "");
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
        body: JSON.stringify({ toDept, subject, body, kind: meeting ? "meeting" : "message", meetingAt, parentId: reply?.id ?? null, refHref: refHref || null, refLabel: refHref ? refLabels.get(refHref) ?? null : null }),
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
    <div className="msg-wrap">
      <div className="msg-toolbar">
        <div className="flex" style={{ gap: 6 }}>
          <button className={`chip${tab === "inbox" ? " active" : ""}`} onClick={() => setTab("inbox")}>Inbox · {inbox.length}</button>
          <button className={`chip${tab === "sent" ? " active" : ""}`} onClick={() => setTab("sent")}>Sent · {sent.length}</button>
        </div>
        <button className="btn btn-primary" onClick={() => openCompose()}>
          <span className="ms" style={{ fontSize: 18 }}>edit</span>New message
        </button>
      </div>
      {tab === "inbox" && <p className="muted" style={{ fontSize: 12, margin: "0 0 10px" }}>Messages addressed to <strong>{myDept}</strong> or all staff.</p>}

      <div className="msg-scroll">
      {list.length === 0 ? (
        <Empty icon="forum" title={tab === "inbox" ? "No messages" : "Nothing sent yet"} hint={tab === "inbox" ? "Messages for your department appear here." : "Messages you send appear here."} />
      ) : (
        <div className="grid" style={{ gap: 10 }}>
          {list.map((m) => (
            <div key={m.id} className="card" style={{ borderLeft: `4px solid var(--${m.kind === "meeting" ? "blue" : "grey"}-fg)` }}>
              <div className="flex between wrap" style={{ gap: 8, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <div className="flex wrap" style={{ gap: 8, alignItems: "center" }}>
                    {m.kind === "meeting" && <span className="pill tone-blue"><span className="ms" style={{ fontSize: 13 }}>event</span>Meeting request</span>}
                    <strong style={{ fontSize: 14 }}>{m.subject}</strong>
                    {m.ref_href && m.ref_label && <Link href={m.ref_href} className="pill tone-teal" style={{ fontSize: 10.5 }} title={`Open ${m.ref_label}`}><span className="ms" style={{ fontSize: 12 }}>link</span>{m.ref_label}</Link>}
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                    {tab === "inbox" ? <>From <strong>{m.from_name}</strong> ({m.from_dept || m.from_role})</> : <>To <strong>{m.to_dept}</strong></>} · {fmt(m.created_at)}
                  </div>
                  {m.body && <p style={{ fontSize: 13, margin: "8px 0 0" }}>{m.body}</p>}
                  {m.meeting_at && (() => {
                    const mi = meetingInfo(m.subject, m.body, m.meeting_at);
                    return (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 12.5 }}>
                          <span className="ms" style={{ fontSize: 14, verticalAlign: "middle", marginRight: 4, color: "var(--blue-fg)" }}>schedule</span>
                          Proposed: <strong>{mi.label}</strong>
                        </div>
                        {mi.outlook && (
                          <div className="flex wrap" style={{ gap: 8, marginTop: 8 }}>
                            <a className="mini" href={mi.outlook} target="_blank" rel="noopener noreferrer">
                              <span className="ms" style={{ fontSize: 14, marginRight: 3 }}>event</span>Add to Microsoft calendar
                            </a>
                            <button className="mini" onClick={() => downloadIcs(mi.ics!, m.subject)}>
                              <span className="ms" style={{ fontSize: 14, marginRight: 3 }}>download</span>Download invite (.ics)
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
                {tab === "inbox" && (
                  <button className="mini" onClick={() => openCompose(m)}><span className="ms" style={{ fontSize: 14, marginRight: 3 }}>reply</span>Reply</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {compose && (
        <div className="modal-backdrop" onClick={() => !busy && setCompose(false)}>
          <div className="modal msg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="msg-modal-head">
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>{reply ? "Reply" : "New message"}</h2>
                <p className="muted" style={{ margin: "2px 0 0", fontSize: 12 }}>Send to a whole department, or request a meeting.</p>
              </div>
              <button className="icon-x" onClick={() => setCompose(false)} disabled={busy} title="Close"><span className="ms" style={{ fontSize: 20 }}>close</span></button>
            </div>

            <div className="msg-modal-body">
              {err && <div className="card" style={{ borderColor: "var(--red-fg)", color: "var(--red-fg)", marginBottom: 12 }}>{err}</div>}
              <div className="msg-form">
                <div className="grid cols-2" style={{ gap: 12 }}>
                  <label className="fld"><span>To department</span>
                    <select className="input" value={toDept} onChange={(e) => setToDept(e.target.value)}>
                      {depts.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </label>
                  {refGroups.length > 0 && (
                    <label className="fld"><span>Relates to (optional)</span>
                      <select className="input" value={refHref} onChange={(e) => setRefHref(e.target.value)}>
                        <option value="">No specific client / carer</option>
                        {refGroups.map((g) => (
                          <optgroup key={g.label} label={g.label}>
                            {g.options.map((o) => <option key={o.href} value={o.href}>{o.label}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
                <label className="fld"><span>Subject</span>
                  <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What's it about?" />
                </label>
                <label className="fld"><span>Message</span>
                  <textarea className="input msg-textarea" rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message…" />
                </label>

                <div className={`msg-meeting${meeting ? " on" : ""}`}>
                  <label className="flex" style={{ gap: 10, fontSize: 13.5, alignItems: "center", cursor: "pointer" }}>
                    <input type="checkbox" checked={meeting} onChange={(e) => setMeeting(e.target.checked)} />
                    <span className="ms" style={{ fontSize: 18, color: "var(--blue-fg)" }}>event</span>
                    <strong>Request a meeting</strong>
                    <span className="muted" style={{ fontSize: 12 }}>adds a calendar invite</span>
                  </label>
                  {meeting && (
                    <label className="fld" style={{ marginTop: 10 }}><span>Suggested date &amp; time</span>
                      <input className="input" type="datetime-local" value={meetingAt} onChange={(e) => setMeetingAt(e.target.value)} />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="msg-modal-foot">
              <button className="btn btn-primary" disabled={busy || subject.trim().length < 2 || (meeting && !meetingAt)} onClick={send}>
                <span className="ms" style={{ fontSize: 18 }}>send</span>{busy ? "Sending…" : reply ? "Send reply" : "Send"}
              </button>
              <button className="btn" onClick={() => setCompose(false)} disabled={busy}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
