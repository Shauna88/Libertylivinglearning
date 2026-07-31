"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  NOTIFICATION_TEMPLATES,
  TEMPLATE_BY_KEY,
  CHANNEL_LABEL,
  statusMeta,
  type Channel,
} from "@/lib/notifications";
import type { NotificationRow } from "@/lib/db";

type Group = { label: string; options: { label: string; value: string }[] };

function when(iso: string) {
  return new Date(iso).toLocaleString("en-IE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function NotificationCenter({
  recipientGroups,
  log,
  canSend,
}: {
  recipientGroups: Group[];
  log: NotificationRow[];
  canSend: boolean;
}) {
  const router = useRouter();
  const [templateKey, setTemplateKey] = useState(NOTIFICATION_TEMPLATES[0].key);
  const tpl = TEMPLATE_BY_KEY[templateKey];
  const [channel, setChannel] = useState<Channel>(tpl.channels[0]);
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState(tpl.subject);
  const [text, setText] = useState(tpl.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  const recipientOptions = useMemo(() => recipientGroups, [recipientGroups]);

  function pickTemplate(key: string) {
    setTemplateKey(key);
    const t = TEMPLATE_BY_KEY[key];
    setSubject(t.subject);
    setText(t.body);
    setChannel(t.channels[0]);
    setFlash("");
  }

  async function send() {
    setBusy(true);
    setError("");
    setFlash("");
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: templateKey, channel, recipient, subject, body: text }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Could not queue");
      setFlash(`Queued to ${recipient} via ${CHANNEL_LABEL[channel]}. It will send once the ${CHANNEL_LABEL[channel]} gateway is connected.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not queue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="card" style={{ background: "var(--blue-bg)", borderColor: "var(--blue-fg)", fontSize: 12.5, marginBottom: 16 }}>
        <span className="ms" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 6, color: "var(--blue-fg)" }}>info</span>
        Messages are composed and <strong>queued</strong> here. Actual SMS / email delivery needs a gateway (e.g. Twilio / SendGrid)
        connected by the developer — until then nothing is sent, and every queued message is logged below.
      </div>

      {canSend && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-title" style={{ marginTop: 0 }}>Compose</div>
          <div className="grid cols-3" style={{ gap: 12, marginBottom: 12 }}>
            <label className="fld">
              <span>Template</span>
              <select className="input" value={templateKey} onChange={(e) => pickTemplate(e.target.value)}>
                {NOTIFICATION_TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </label>
            <label className="fld">
              <span>Channel</span>
              <select className="input" value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
                {tpl.channels.map((c) => <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>)}
              </select>
            </label>
            <label className="fld">
              <span>Recipient</span>
              <select className="input" value={recipient} onChange={(e) => setRecipient(e.target.value)}>
                <option value="">Select…</option>
                {recipientOptions.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>
          {channel !== "sms" && (
            <label className="fld" style={{ marginBottom: 12 }}>
              <span>Subject</span>
              <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </label>
          )}
          <label className="fld" style={{ marginBottom: 12 }}>
            <span>Message {channel === "sms" && <span className="muted">· {text.length} chars</span>}</span>
            <textarea className="input" style={{ minHeight: 90, resize: "vertical" }} value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          <div className="muted" style={{ fontSize: 11.5, marginBottom: 10 }}>
            Placeholders like <code className="code">{"{name}"}</code>, <code className="code">{"{date}"}</code>, <code className="code">{"{time}"}</code> are filled per recipient when sent.
          </div>
          {error && <div className="error" style={{ marginBottom: 10 }}>{error}</div>}
          {flash && <div className="card" style={{ background: "var(--green-bg)", borderColor: "var(--green-fg)", fontSize: 12.5, marginBottom: 10 }}>{flash}</div>}
          <button className="btn btn-primary" disabled={busy || !recipient || text.trim().length < 3} onClick={send}>
            <span className="ms" style={{ fontSize: 18 }}>send</span>{busy ? "Queuing…" : "Queue message"}
          </button>
        </div>
      )}

      <div className="section-title">Delivery log</div>
      {log.length === 0 ? (
        <div className="card muted">Nothing sent yet.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr><th>When</th><th>Recipient</th><th>Channel</th><th>Message</th><th style={{ width: 90 }}>Status</th></tr>
            </thead>
            <tbody>
              {log.map((n) => {
                const st = statusMeta(n.status);
                return (
                  <tr key={n.id}>
                    <td className="muted" style={{ whiteSpace: "nowrap", fontSize: 12 }}>{when(n.created_at)}</td>
                    <td style={{ fontWeight: 600 }}>{n.recipient}<div className="muted" style={{ fontSize: 11 }}>{TEMPLATE_BY_KEY[n.template]?.label ?? n.template}</div></td>
                    <td><span className="pill tone-grey" style={{ fontSize: 10.5 }}>{CHANNEL_LABEL[n.channel as Channel] ?? n.channel}</span></td>
                    <td className="muted" style={{ fontSize: 12.5, maxWidth: 460 }}>{n.subject && <strong>{n.subject} — </strong>}{n.body}</td>
                    <td><span className={`pill tone-${st.tone}`} style={{ fontSize: 10.5 }}>{st.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
