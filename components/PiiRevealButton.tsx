"use client";

import { useState } from "react";

/**
 * The reveal-gate control: prompts for a reason, POSTs it (which logs the access
 * server-side), and hands the returned identifiable data to `onReveal`.
 */
export default function PiiRevealButton({
  scope,
  clientId,
  onReveal,
  size = "sm",
}: {
  scope: "register" | "client";
  clientId?: string;
  onReveal: (data: { names?: Record<string, string>; identity?: Record<string, unknown> }) => void;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/pii/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, clientId, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Could not reveal.");
        return;
      }
      onReveal(data);
      setOpen(false);
      setReason("");
    } catch {
      setErr("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className={size === "md" ? "btn btn-primary" : "btn"}
        onClick={() => setOpen(true)}
        style={size === "sm" ? { padding: "6px 12px", fontSize: 12.5 } : undefined}
      >
        <span className="ms" style={{ fontSize: size === "md" ? 17 : 15 }}>
          visibility
        </span>
        Reveal identifiable data
      </button>

      {open && (
        <div
          className="noprint"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(21,36,28,0.45)",
            display: "grid",
            placeItems: "center",
            zIndex: 50,
            padding: 20,
          }}
          onClick={() => !busy && setOpen(false)}
        >
          <form
            className="card"
            style={{ maxWidth: 440, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
          >
            <div className="flex" style={{ gap: 10, marginBottom: 8 }}>
              <span className="ms" style={{ fontSize: 22, color: "var(--red-fg)" }}>
                privacy_tip
              </span>
              <strong style={{ fontSize: 16 }}>Reveal identifiable data</strong>
            </div>
            <p className="muted" style={{ fontSize: 12.5, marginTop: 0 }}>
              This client&apos;s personal details are special-category data. Your name, the time,
              and the reason below are recorded in the access log.
            </p>
            <div className="field">
              <label htmlFor="pii-reason">Reason for access</label>
              <input
                id="pii-reason"
                className="input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Preparing today's visit / updating care plan"
                autoFocus
                required
              />
            </div>
            {err && <div className="error">{err}</div>}
            <div className="flex" style={{ gap: 10 }}>
              <button className="btn btn-primary" disabled={busy || reason.trim().length < 3}>
                {busy ? "Logging…" : "Reveal & log"}
              </button>
              <button type="button" className="btn" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
