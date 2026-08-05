"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Empty from "@/components/Empty";
import { useToast } from "@/components/Toast";
import { DOC_STATUS } from "@/lib/crm";

export type CarerDoc = {
  id: number;
  name: string;
  status: string;
  expiry: string | null;
  added_by: string;
  has_file?: boolean;
  size_bytes?: number | null;
};

function fmtSize(n?: number | null) {
  if (!n) return "";
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`;
}

/**
 * Carer (HCA) documents — upload PDFs (contracts, Garda vetting, training
 * certs, references) onto the carer's record, with a download link per file.
 */
export default function CarerDocuments({ carerId, docs, editable }: { carerId: string; docs: CarerDoc[]; editable: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [status, setStatus] = useState("on_file");
  const [expiry, setExpiry] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileKey, setFileKey] = useState(0);

  async function upload() {
    if (!file) { toast("Attach a PDF to upload", "error"); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", name.trim() || file.name.replace(/\.pdf$/i, ""));
      fd.append("status", status);
      if (expiry) fd.append("expiry", expiry);
      const res = await fetch(`/api/carers/${carerId}/documents`, { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { toast(j.error || "Upload failed", "error"); return; }
      toast("Document uploaded");
      setName(""); setExpiry(""); setFile(null); setFileKey((k) => k + 1);
      router.refresh();
    } catch {
      toast("Upload failed — please try again", "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setBusy(true);
    try {
      const res = await fetch(`/api/carers/${carerId}/documents/${id}`, { method: "DELETE" });
      if (!res.ok) { toast("Could not remove", "error"); return; }
      toast("Document removed");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {editable && (
        <div className="card" style={{ marginBottom: 10 }}>
          <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
            <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="Document name…" value={name} onChange={(e) => setName(e.target.value)} />
            <select className="input" style={{ maxWidth: 140 }} value={status} onChange={(e) => setStatus(e.target.value)}>
              {Object.entries(DOC_STATUS).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
            </select>
            <input className="input" type="date" style={{ maxWidth: 160 }} value={expiry} onChange={(e) => setExpiry(e.target.value)} title="Expiry (optional)" />
            <button className="mini primary" disabled={busy || !file} onClick={upload}>
              {busy ? "Uploading…" : "Upload PDF"}
            </button>
          </div>
          <div className="flex" style={{ gap: 10, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label className="mini" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span className="ms" style={{ fontSize: 16 }}>attach_file</span>
              {file ? "Change PDF" : "Attach a PDF"}
              <input key={fileKey} type="file" accept="application/pdf,.pdf" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            {file ? (
              <span className="muted" style={{ fontSize: 12 }}>
                {file.name} · {fmtSize(file.size)}
                <button className="task-x" title="Remove file" style={{ marginLeft: 6, verticalAlign: "-3px" }} onClick={() => { setFile(null); setFileKey((k) => k + 1); }}>
                  <span className="ms" style={{ fontSize: 14 }}>close</span>
                </button>
              </span>
            ) : (
              <span className="muted" style={{ fontSize: 11.5 }}>Contracts, Garda vetting, training certs, references. PDF up to 4 MB.</span>
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
                        <a href={`/api/carers/${carerId}/documents/${d.id}`} target="_blank" rel="noopener" className="flex" style={{ gap: 5, alignItems: "center", color: "var(--accent)" }}>
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
                        <button className="task-x" title="Remove" disabled={busy} onClick={() => remove(d.id)}>
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
        <Empty icon="folder_open" title="No documents on file" hint={editable ? "Upload contracts, Garda vetting, training certificates and references above." : undefined} />
      )}
    </>
  );
}
