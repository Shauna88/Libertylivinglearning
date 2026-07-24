"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CLIENT_IMPORT_FIELDS,
  CLIENT_TEMPLATE,
  parseCsv,
  autoMap,
  extractRows,
  rowErrors,
} from "@/lib/import";

type Step = "input" | "map" | "done";

export default function ImportWizard() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [map, setMap] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  function parse() {
    setErr("");
    const parsed = parseCsv(text);
    if (parsed.length < 2) {
      setErr("Need a header row and at least one data row.");
      return;
    }
    const hdr = parsed[0].map((h) => h.trim());
    setHeaders(hdr);
    setRows(parsed);
    setMap(autoMap(hdr));
    setStep("map");
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.readAsText(f);
  }

  const preview = useMemo(() => {
    if (step !== "map") return [];
    return extractRows(rows, map).map((r) => ({ r, errs: rowErrors(r) }));
  }, [step, rows, map]);

  const validCount = preview.filter((p) => p.errs.length === 0).length;

  function downloadTemplate() {
    const blob = new Blob([CLIENT_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "client-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function submit() {
    setBusy(true);
    setErr("");
    try {
      const valid = extractRows(rows, map).filter((r) => rowErrors(r).length === 0);
      const res = await fetch("/api/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: valid }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Import failed.");
        return;
      }
      setResult({ created: data.created, skipped: data.skipped });
      setStep("done");
      router.refresh();
    } catch {
      setErr("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "done" && result) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "36px 24px" }}>
        <span className="ms" style={{ fontSize: 40, color: "var(--accent)" }}>task_alt</span>
        <h2 style={{ margin: "10px 0 4px" }}>Imported {result.created} client{result.created === 1 ? "" : "s"}</h2>
        <p className="muted" style={{ fontSize: 13 }}>
          {result.skipped > 0 ? `${result.skipped} row(s) were skipped for missing required fields. ` : ""}
          New clients are set to <strong>New referral</strong> — complete their care plan and schedule from the register.
        </p>
        <div className="flex" style={{ gap: 10, justifyContent: "center", marginTop: 14 }}>
          <Link className="btn btn-primary" href="/clients">Go to client register</Link>
          <button className="btn" onClick={() => { setStep("input"); setText(""); setResult(null); }}>Import more</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {err && <div className="card" style={{ borderColor: "var(--red-fg)", color: "var(--red-fg)", marginBottom: 12 }}>{err}</div>}

      {step === "input" && (
        <div className="card">
          <div className="flex between wrap" style={{ gap: 8, marginBottom: 10 }}>
            <strong style={{ fontSize: 15 }}>1 · Paste or upload CSV</strong>
            <div className="flex" style={{ gap: 8 }}>
              <button className="mini" onClick={downloadTemplate}>
                <span className="ms" style={{ fontSize: 14, marginRight: 4 }}>download</span>Template
              </button>
              <button className="mini" onClick={() => fileRef.current?.click()}>
                <span className="ms" style={{ fontSize: 14, marginRight: 4 }}>upload_file</span>Upload file
              </button>
              <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onFile} />
            </div>
          </div>
          <textarea
            className="input"
            rows={8}
            style={{ resize: "vertical", fontFamily: "var(--font-mono)", fontSize: 12.5 }}
            placeholder="Service User ID,Surname,First Name,Area,…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-primary" disabled={!text.trim()} onClick={parse}>Continue</button>
          </div>
        </div>
      )}

      {step === "map" && (
        <>
          <div className="card" style={{ marginBottom: 14 }}>
            <strong style={{ fontSize: 15 }}>2 · Match your columns</strong>
            <p className="muted" style={{ fontSize: 12.5, margin: "4px 0 12px" }}>
              We auto-matched where we could. Required fields are marked *.
            </p>
            <div className="grid cols-2" style={{ gap: 10 }}>
              {CLIENT_IMPORT_FIELDS.map((f) => (
                <div key={f.key} className="flex between" style={{ gap: 10, alignItems: "center" }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>
                    {f.label}{f.req && <span style={{ color: "var(--red-fg)" }}> *</span>}
                    {f.hint && <span className="muted" style={{ fontWeight: 400, fontSize: 11.5, display: "block" }}>{f.hint}</span>}
                  </label>
                  <select
                    className="input"
                    style={{ maxWidth: 190 }}
                    value={map[f.key] ?? -1}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setMap((m) => {
                        const next = { ...m };
                        if (v < 0) delete next[f.key];
                        else next[f.key] = v;
                        return next;
                      });
                    }}
                  >
                    <option value={-1}>— not mapped —</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex between" style={{ marginBottom: 8 }}>
            <div className="section-title" style={{ margin: 0 }}>3 · Preview — {validCount} of {preview.length} ready</div>
            <button className="btn" onClick={() => setStep("input")} style={{ padding: "6px 12px" }}>Back</button>
          </div>
          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>SU ID</th>
                  <th>Area</th>
                  <th>Funding</th>
                  <th>Hours</th>
                  <th>Issues</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 50).map((p, i) => {
                  const ok = p.errs.length === 0;
                  return (
                    <tr key={i} style={ok ? undefined : { background: "var(--red-bg)" }}>
                      <td>
                        <span className={`ms`} style={{ fontSize: 16, color: ok ? "var(--green-fg)" : "var(--red-fg)" }}>
                          {ok ? "check_circle" : "error"}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{`${p.r.firstName} ${p.r.surname}`.trim() || "—"}</td>
                      <td className="code">{p.r.su || "auto"}</td>
                      <td className="muted">{p.r.area || "—"}</td>
                      <td className="muted">{p.r.funding || "—"}</td>
                      <td className="muted">{p.r.hoursWk || "—"}</td>
                      <td className="muted" style={{ fontSize: 12, color: ok ? undefined : "var(--red-fg)" }}>
                        {ok ? "—" : `Missing: ${p.errs.join(", ")}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {preview.length > 50 && <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Showing first 50 of {preview.length} rows.</p>}

          <div style={{ marginTop: 14 }}>
            <button className="btn btn-primary" disabled={busy || validCount === 0} onClick={submit}>
              {busy ? "Importing…" : `Import ${validCount} client${validCount === 1 ? "" : "s"}`}
            </button>
          </div>
        </>
      )}
    </>
  );
}
