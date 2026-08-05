"use client";

import { useState } from "react";
import type { CarePlanExtract } from "@/lib/careplan";

const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * AI care-plan reader panel. Paste a care-delivery form (Referral Record, Needs
 * Assessment, Home Support Care Plan, risk assessments…) and it extracts a
 * structured intake, which the parent applies via `onApply`.
 *
 * The pasted text is health data — it is sent for extraction and not stored; the
 * server records only that a read happened.
 */
export default function CarePlanReader({
  onApply,
  applyLabel = "Use this",
  context,
  hint,
}: {
  onApply: (extract: CarePlanExtract) => void;
  applyLabel?: string;
  context?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [notConfigured, setNotConfigured] = useState(false);
  const [extract, setExtract] = useState<CarePlanExtract | null>(null);

  async function read() {
    setBusy(true);
    setErr("");
    setNotConfigured(false);
    setExtract(null);
    try {
      const res = await fetch("/api/careplan/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, context }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.notConfigured) setNotConfigured(true);
        setErr(data.error ?? "The reader could not process that document.");
        return;
      }
      setExtract(data.extract as CarePlanExtract);
    } catch {
      setErr("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  function apply() {
    if (extract) onApply(extract);
    reset();
  }
  function reset() {
    setOpen(false);
    setText("");
    setExtract(null);
    setErr("");
    setNotConfigured(false);
  }

  if (!open) {
    return (
      <button type="button" className="btn cp-open" onClick={() => setOpen(true)}>
        <span className="ms" aria-hidden="true">auto_awesome</span>
        Read a care plan with AI
      </button>
    );
  }

  const p = extract?.profile;
  const scheduleDays = (extract?.schedule ?? []).slice().sort((a, b) => WEEK.indexOf(a.day) - WEEK.indexOf(b.day));

  return (
    <div className="card cp-reader" style={{ marginBottom: 16, borderColor: "var(--accent)" }}>
      <div className="flex between" style={{ alignItems: "center", marginBottom: 8 }}>
        <strong style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
          <span className="ms" style={{ color: "var(--accent)" }} aria-hidden="true">auto_awesome</span>
          Read a care plan with AI
        </strong>
        <button type="button" className="mini" onClick={reset}>Close</button>
      </div>

      {!extract ? (
        <>
          <p className="muted" style={{ fontSize: 12.5, margin: "0 0 8px" }}>
            {hint ?? "Paste a Referral Record, Needs Assessment, Home Support Care Plan or risk assessment. The reader pulls out the profile, conditions, care tasks and Schedule of Service for you to review."}
          </p>
          <textarea
            className="input"
            rows={7}
            style={{ resize: "vertical", fontFamily: "inherit" }}
            placeholder="Paste the care-delivery form text here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {err && (
            <div className="card" style={{ borderColor: notConfigured ? "var(--amber-fg)" : "var(--red-fg)", background: notConfigured ? "var(--amber-bg)" : undefined, color: notConfigured ? "var(--text)" : "var(--red-fg)", marginTop: 10, fontSize: 12.5 }}>
              {err}
            </div>
          )}
          <div className="flex between wrap" style={{ gap: 10, marginTop: 10, alignItems: "center" }}>
            <span className="muted" style={{ fontSize: 11.5, maxWidth: "46ch" }}>
              <span className="ms" style={{ fontSize: 13, verticalAlign: "-2px" }} aria-hidden="true">lock</span>{" "}
              The document is read to extract details and <strong>isn&apos;t stored</strong>; only that a read happened is logged.
            </span>
            <button type="button" className="btn btn-primary" disabled={busy || text.trim().length < 40} onClick={read}>
              {busy ? "Reading…" : "Read with AI"}
            </button>
          </div>
        </>
      ) : (
        <>
          {extract.summary && <p style={{ fontSize: 12.5, margin: "0 0 10px" }}>{extract.summary}</p>}

          <div className="cp-review">
            {p && (p.firstName || p.surname || p.addr || p.area) && (
              <div className="cp-block">
                <div className="cp-block-t">Person</div>
                <div className="cp-kv">
                  {[
                    ["Name", [p.firstName, p.surname].filter(Boolean).join(" ")],
                    ["Preferred", p.pref],
                    ["DOB", p.dob],
                    ["Area", p.area],
                    ["Address", p.addr],
                    ["Eircode", p.eircode],
                    ["Phone", [p.phone, p.mobile].filter(Boolean).join(" / ")],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k}><span className="muted">{k}:</span> {v}</div>
                  ))}
                </div>
              </div>
            )}

            {(extract.clinical.conditions.length > 0 || extract.clinical.mobility || extract.clinical.allergies) && (
              <div className="cp-block">
                <div className="cp-block-t">Clinical</div>
                {extract.clinical.conditions.length > 0 && (
                  <div className="flex wrap" style={{ gap: 5, marginBottom: 6 }}>
                    {extract.clinical.conditions.map((c, i) => <span key={i} className="pill tone-blue" style={{ fontSize: 11 }}>{c}</span>)}
                  </div>
                )}
                <div className="cp-kv">
                  {extract.clinical.mobility && <div><span className="muted">Mobility:</span> {extract.clinical.mobility}</div>}
                  {extract.clinical.allergies && <div><span className="muted">Allergies:</span> {extract.clinical.allergies}</div>}
                </div>
              </div>
            )}

            {extract.carePlan.length > 0 && (
              <div className="cp-block">
                <div className="cp-block-t">Care tasks · {extract.carePlan.length} domain{extract.carePlan.length === 1 ? "" : "s"}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {extract.carePlan.map((d, i) => (
                    <div key={i}>
                      <strong style={{ fontSize: 12.5 }}>{d.domain}</strong>
                      {d.need && <span className="muted" style={{ fontSize: 12 }}> — {d.need}</span>}
                      {d.tasks.length > 0 && (
                        <ul style={{ margin: "3px 0 0 18px", fontSize: 12 }}>
                          {d.tasks.map((t, j) => <li key={j}>{t}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {scheduleDays.length > 0 && (
              <div className="cp-block">
                <div className="cp-block-t">Schedule of Service · {scheduleDays.reduce((n, d) => n + d.visits.length, 0)} visit(s)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {scheduleDays.map((d) => (
                    <div key={d.day} style={{ fontSize: 12.5 }}>
                      <strong>{d.day.slice(0, 3)}</strong>{" "}
                      {d.visits.map((v, i) => (
                        <span key={i} className="muted">
                          {i > 0 ? " · " : ""}<span className="code">{v.time}</span> {v.type} ({v.dur})
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {err && <div className="card" style={{ borderColor: "var(--red-fg)", color: "var(--red-fg)", marginTop: 10, fontSize: 12.5 }}>{err}</div>}

          <div className="flex" style={{ gap: 10, marginTop: 12 }}>
            <button type="button" className="btn btn-primary" onClick={apply}>
              <span className="ms" aria-hidden="true">check</span>{applyLabel}
            </button>
            <button type="button" className="btn" onClick={() => { setExtract(null); }}>Read another</button>
            <span className="muted" style={{ fontSize: 11.5, alignSelf: "center" }}>Review everything before saving — the AI can miss or misread details.</span>
          </div>
        </>
      )}
    </div>
  );
}
