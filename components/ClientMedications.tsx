"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Empty from "@/components/Empty";
import { useToast } from "@/components/Toast";
import { MED_STATUS, MED_OMIT_REASONS, medTimes, type MedStatus } from "@/lib/meds";
import type { MedRow, MedAdminRow } from "@/lib/db";

const RECORD: { status: MedStatus; label: string }[] = [
  { status: "given", label: "Given" },
  { status: "self", label: "Self" },
  { status: "refused", label: "Refused" },
  { status: "omitted", label: "Omitted" },
];

function todayIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
}
function shiftDate(iso: string, d: number) {
  return new Date(new Date(`${iso}T12:00:00Z`).getTime() + d * 86_400_000).toISOString().slice(0, 10);
}
function dayLabel(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "short" });
}

/**
 * eMAR — a client's medications and the day's administration record. Each due
 * dose is recorded Given / Self / Refused / Omitted (a reason is required when
 * refused or omitted). Everything is audit-logged; the record feeds the
 * Medication administration report.
 */
export default function ClientMedications({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [meds, setMeds] = useState<MedRow[]>([]);
  const [admins, setAdmins] = useState<Record<string, MedAdminRow>>({});
  const [date, setDate] = useState(todayIso());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", dose: "", route: "", freq: "", times: "", instructions: "", prn: false });
  const [reasonFor, setReasonFor] = useState<string | null>(null); // `${medId}|${time}`
  const [reason, setReason] = useState(MED_OMIT_REASONS[0]);
  const [reasonNote, setReasonNote] = useState("");
  const [pendingStatus, setPendingStatus] = useState<MedStatus>("refused");

  async function load(d: string) {
    setLoading(true);
    const [m, a] = await Promise.all([
      fetch(`/api/clients/${clientId}/meds`).then((r) => r.json()).catch(() => ({ meds: [] })),
      fetch(`/api/clients/${clientId}/meds/admin?date=${d}`).then((r) => r.json()).catch(() => ({ admins: {} })),
    ]);
    setMeds(m.meds ?? []);
    setAdmins(a.admins ?? {});
    setLoading(false);
  }
  useEffect(() => {
    let live = true;
    Promise.all([
      fetch(`/api/clients/${clientId}/meds`).then((r) => r.json()).catch(() => ({ meds: [] })),
      fetch(`/api/clients/${clientId}/meds/admin?date=${date}`).then((r) => r.json()).catch(() => ({ admins: {} })),
    ]).then(([m, a]) => { if (!live) return; setMeds(m.meds ?? []); setAdmins(a.admins ?? {}); setLoading(false); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const goDate = (d: string) => { setDate(d); setReasonFor(null); load(d); };

  async function post(body: Record<string, unknown>, ok?: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/meds`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { toast(j.error ?? "Something went wrong", "error"); return false; }
      if (ok) toast(ok);
      await load(date);
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function record(medId: number, time: string, status: MedStatus) {
    if (status === "refused" || status === "omitted") {
      setReasonFor(`${medId}|${time}`); setPendingStatus(status); setReason(MED_OMIT_REASONS[0]); setReasonNote("");
      return;
    }
    await post({ action: "record", medId, schedTime: time, status, serviceDate: date });
  }
  async function confirmReason(medId: number, time: string) {
    const r = reason === "Other" ? reasonNote.trim() : reasonNote.trim() ? `${reason} — ${reasonNote.trim()}` : reason;
    if (!r) { toast("Add a reason", "error"); return; }
    const okDone = await post({ action: "record", medId, schedTime: time, status: pendingStatus, reason: r, serviceDate: date }, "Recorded");
    if (okDone) setReasonFor(null);
  }

  async function addMed() {
    if (form.name.trim().length < 2) { toast("Name the medication", "error"); return; }
    const okDone = await post({ action: "add_med", ...form }, "Medication added");
    if (okDone) { setForm({ name: "", dose: "", route: "", freq: "", times: "", instructions: "", prn: false }); setAddOpen(false); }
  }

  const isToday = date === todayIso();
  const active = meds.filter((m) => m.active);

  if (loading) return <div className="card" style={{ textAlign: "center", padding: 24 }}><span className="muted">Loading medications…</span></div>;

  return (
    <div>
      {/* date navigator */}
      <div className="att-nav">
        <button className="btn" style={{ padding: "6px 10px" }} disabled={busy} onClick={() => goDate(shiftDate(date, -1))} aria-label="Previous day"><span className="ms">chevron_left</span></button>
        <div className="att-nav-week"><div style={{ fontWeight: 800, fontSize: 14 }}>{dayLabel(date)}</div><div className="muted" style={{ fontSize: 11.5 }}>Medication round</div></div>
        <button className="btn" style={{ padding: "6px 10px" }} disabled={busy || isToday} onClick={() => goDate(shiftDate(date, 1))} aria-label="Next day"><span className="ms">chevron_right</span></button>
        {!isToday && <button className="btn" style={{ padding: "6px 12px", fontSize: 12.5 }} onClick={() => goDate(todayIso())}>Today</button>}
        <a className="btn btn-primary" style={{ padding: "6px 12px", fontSize: 12.5, marginLeft: "auto" }} href={`/api/reports/medication?id=${clientId}`}>
          <span className="ms" style={{ fontSize: 16 }}>download</span>MAR report
        </a>
        {canEdit && <button className="btn" style={{ padding: "6px 12px", fontSize: 12.5 }} onClick={() => setAddOpen((o) => !o)}><span className="ms" style={{ fontSize: 16 }}>add</span>Add medication</button>}
      </div>

      {addOpen && canEdit && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="grid cols-3" style={{ gap: 8 }}>
            <input className="input" placeholder="Medication name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="Dose (e.g. 5mg)" value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} />
            <input className="input" placeholder="Route (e.g. Oral)" value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} />
            <input className="input" placeholder="Frequency (e.g. Twice daily)" value={form.freq} onChange={(e) => setForm({ ...form, freq: e.target.value })} />
            <input className="input" placeholder="Times (e.g. 08:00, 20:00)" value={form.times} onChange={(e) => setForm({ ...form, times: e.target.value })} disabled={form.prn} />
            <label className="flex" style={{ gap: 6, alignItems: "center", fontSize: 12.5 }}>
              <input type="checkbox" checked={form.prn} onChange={(e) => setForm({ ...form, prn: e.target.checked })} /> PRN (as needed)
            </label>
          </div>
          <input className="input" placeholder="Instructions / special notes" style={{ marginTop: 8 }} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
          <div className="flex" style={{ gap: 8, marginTop: 10 }}>
            <button className="btn btn-primary" style={{ padding: "6px 12px", fontSize: 12.5 }} disabled={busy} onClick={addMed}>Add medication</button>
            <button className="btn" style={{ padding: "6px 12px", fontSize: 12.5 }} onClick={() => setAddOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      {active.length === 0 ? (
        <Empty icon="medication" title="No medications recorded" hint={canEdit ? "Add this client's medications above to start the MAR chart." : undefined} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {active.map((m) => {
            const times = m.prn ? ["PRN"] : medTimes(m.times);
            return (
              <div key={m.id} className="card">
                <div className="flex between wrap" style={{ gap: 8, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: 14 }}>{m.name}</strong>{m.dose && <span className="muted" style={{ fontSize: 12.5 }}> · {m.dose}</span>}
                    {m.prn && <span className="pill tone-blue" style={{ fontSize: 10.5, marginLeft: 6 }}>PRN</span>}
                    <div className="muted" style={{ fontSize: 12 }}>{[m.route, m.freq].filter(Boolean).join(" · ")}{m.instructions ? ` — ${m.instructions}` : ""}</div>
                  </div>
                  {canEdit && <button className="mini" disabled={busy} onClick={() => post({ action: "set_active", medId: m.id, active: false }, "Medication stopped")}>Stop</button>}
                </div>

                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  {times.map((t) => {
                    const key = `${m.id}|${t === "PRN" ? "" : t}`;
                    const rec = admins[key];
                    const meta = rec && rec.status in MED_STATUS ? MED_STATUS[rec.status as MedStatus] : null;
                    const openReason = reasonFor === `${m.id}|${t}`;
                    return (
                      <div key={t} className="sched-visit" style={{ padding: 10 }}>
                        <div className="flex between wrap" style={{ gap: 8, alignItems: "center" }}>
                          <span className="flex" style={{ gap: 8, alignItems: "center" }}>
                            <span className="code">{t}</span>
                            {meta && <span className={`pill tone-${meta.tone}`}><span className="ms" style={{ fontSize: 13 }}>{meta.icon}</span>{meta.label}</span>}
                            {rec?.reason && <span className="muted" style={{ fontSize: 11.5 }}>— {rec.reason}</span>}
                            {rec && <span className="muted" style={{ fontSize: 11 }}>· {rec.by_name}</span>}
                          </span>
                          <span className="flex" style={{ gap: 5 }}>
                            {RECORD.map((r) => (
                              <button key={r.status} className={`chip${rec?.status === r.status ? " active" : ""}`} disabled={busy} onClick={() => record(m.id, t === "PRN" ? "" : t, r.status)}>{r.label}</button>
                            ))}
                          </span>
                        </div>
                        {openReason && (
                          <div className="perm-form" style={{ marginTop: 8 }}>
                            <select className="rv-select" value={reason} onChange={(e) => setReason(e.target.value)}>
                              {MED_OMIT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <input className="input" style={{ fontSize: 12.5, padding: "6px 9px" }} placeholder={reason === "Other" ? "Describe the reason…" : "Add a note (optional)…"} value={reasonNote} onChange={(e) => setReasonNote(e.target.value)} />
                            <div className="flex" style={{ gap: 8 }}>
                              <button className="mini primary" disabled={busy || (reason === "Other" && reasonNote.trim().length < 3)} onClick={() => confirmReason(m.id, t === "PRN" ? "" : t)}>Record {pendingStatus}</button>
                              <button className="mini" onClick={() => setReasonFor(null)}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>
        Every dose is recorded against the carer and time and kept in the audit trail. Refused / omitted doses need a reason. The record feeds the Medication administration report.
      </p>
    </div>
  );
}
