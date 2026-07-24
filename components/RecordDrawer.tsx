"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RegisterKind } from "@/lib/registers";
import { RECORD_FIELDS, recordGroups, recordComplete, type RecordField } from "@/lib/recordfields";

export default function RecordDrawer({
  kind,
  id,
  record,
  canEdit,
}: {
  kind: RegisterKind;
  id: number;
  record: Record<string, string>;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rec, setRec] = useState<Record<string, string>>(record);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);

  const fields = RECORD_FIELDS[kind];
  const groups = recordGroups(kind);
  const { done, total } = recordComplete(kind, rec);

  const set = (k: string, v: string) => {
    setRec((s) => ({ ...s, [k]: v }));
    setDirty(true);
    setSaved(false);
  };

  async function save() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/registers/${kind}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, record: rec }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Could not save the record."); return; }
      setDirty(false);
      setSaved(true);
      router.refresh();
    } catch {
      setErr("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  function Input({ f }: { f: RecordField }) {
    const v = rec[f.key] ?? "";
    if (!canEdit) {
      return <div style={{ fontSize: 13, fontWeight: 600 }}>{v || <span className="muted" style={{ fontWeight: 400 }}>—</span>}</div>;
    }
    if (f.type === "textarea") {
      return <textarea className="input" rows={2} style={{ resize: "vertical", fontSize: 12.5 }} value={v} onChange={(e) => set(f.key, e.target.value)} />;
    }
    if (f.type === "select" || f.type === "bool") {
      const opts = f.type === "bool" ? ["", "Yes", "No"] : f.options ?? [""];
      return (
        <select className="input" style={{ fontSize: 12.5 }} value={v} onChange={(e) => set(f.key, e.target.value)}>
          {opts.map((o) => <option key={o} value={o}>{o || "—"}</option>)}
        </select>
      );
    }
    return <input className="input" style={{ fontSize: 12.5 }} type={f.type === "date" ? "date" : "text"} value={v} onChange={(e) => set(f.key, e.target.value)} />;
  }

  return (
    <div style={{ marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
      <button className="linkish" onClick={() => setOpen((s) => !s)} aria-expanded={open}>
        <span className="ms" style={{ fontSize: 16 }}>{open ? "expand_more" : "chevron_right"}</span>
        Regulatory record
        <span className="muted" style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: 11.5, marginLeft: 4 }}>
          · {done} of {total} fields{done === total && total > 0 ? " ✓" : ""}
        </span>
      </button>

      {open && (
        <div style={{ marginTop: 10 }}>
          {err && <div className="card" style={{ borderColor: "var(--red-fg)", color: "var(--red-fg)", marginBottom: 10 }}>{err}</div>}
          {groups.map((g) => (
            <div key={g} style={{ marginBottom: 12 }}>
              <div className="muted" style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>{g}</div>
              <div className="grid cols-3" style={{ gap: 10 }}>
                {fields.filter((f) => f.group === g).map((f) => (
                  <div key={f.key} className="field" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 11.5 }}>{f.label}{f.hint && <span className="muted" style={{ fontWeight: 400 }}> · {f.hint}</span>}</label>
                    <Input f={f} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {canEdit && (
            <div className="flex" style={{ gap: 8, alignItems: "center", marginTop: 4 }}>
              <button className="btn btn-primary" style={{ padding: "7px 14px" }} disabled={busy || !dirty} onClick={save}>
                {busy ? "Saving…" : "Save record"}
              </button>
              {saved && <span className="pill tone-green">Saved</span>}
              {dirty && <span className="pill tone-amber">Unsaved changes</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
