"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RegisterConfig } from "@/lib/registers";

export default function NewEntryForm({ cfg }: { cfg: RegisterConfig }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [location, setLocation] = useState("");
  const [summary, setSummary] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [okRef, setOkRef] = useState("");

  function reset() {
    setCategory("");
    setSeverity("");
    setLocation("");
    setSummary("");
    setDetail("");
    setErr("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/registers/${cfg.kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, severity, location, summary, detail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Could not log the entry.");
        return;
      }
      setOkRef(data.entry.ref);
      reset();
      setOpen(false);
      router.refresh();
      setTimeout(() => setOkRef(""), 6000);
    } catch {
      setErr("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="flex between wrap" style={{ marginBottom: 18, gap: 10 }}>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          <span className="ms" style={{ fontSize: 18 }}>
            add
          </span>
          Log a new {cfg.title.toLowerCase().replace(/s$/, "")}
        </button>
        {okRef && (
          <span className="pill tone-green">
            <span className="ms" style={{ fontSize: 14 }}>
              check_circle
            </span>
            Logged as {okRef}
          </span>
        )}
      </div>
    );
  }

  return (
    <form className="card" style={{ marginBottom: 20 }} onSubmit={submit}>
      <div className="flex between" style={{ marginBottom: 12 }}>
        <strong style={{ fontSize: 15 }}>Log a new {cfg.title.toLowerCase().replace(/s$/, "")}</strong>
        <button type="button" className="signout" style={{ color: "var(--text-2)" }} onClick={() => setOpen(false)}>
          <span className="ms">close</span>
        </button>
      </div>

      <div className="grid cols-2" style={{ gap: 12 }}>
        <div className="field">
          <label>{cfg.categoryLabel}</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)} required>
            <option value="">Select…</option>
            {cfg.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>{cfg.severityLabel}</label>
          <select className="input" value={severity} onChange={(e) => setSeverity(e.target.value)} required>
            <option value="">Select…</option>
            {cfg.severities.map((s) => (
              <option key={s.value} value={s.value}>
                {s.value}
              </option>
            ))}
          </select>
        </div>
      </div>

      {cfg.hasLocation && (
        <div className="field">
          <label>Location</label>
          <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Service User home / area" />
        </div>
      )}

      <div className="field">
        <label>Summary</label>
        <input className="input" value={summary} onChange={(e) => setSummary(e.target.value)} required placeholder="One line — what happened" />
      </div>

      <div className="field">
        <label>{cfg.detailLabel}</label>
        <textarea
          className="input"
          rows={4}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          required
          style={{ resize: "vertical" }}
        />
        <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
          {cfg.detailHint}
        </div>
      </div>

      {err && <div className="error">{err}</div>}

      <div className="flex" style={{ gap: 10 }}>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Logging…" : "Submit"}
        </button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
