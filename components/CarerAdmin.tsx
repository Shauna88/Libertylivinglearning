"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CarerRecord, CarerSkill, CarerArea } from "@/lib/carers";

const BLANK = {
  id: "",
  name: "",
  homeArea: "",
  covers: [] as string[],
  skills: [] as string[],
  pathway: "",
  transport: "Own car",
  capacityHours: 37,
  committedHours: 0,
  status: "active",
  note: "",
};
type Draft = typeof BLANK;

const PATHWAYS = [
  "Qualified existing staff",
  "New entrant — relevant experience",
  "New entrant — no experience",
  "Unqualified existing staff",
  "Equivalent / alternative qualification",
];
const TRANSPORT = ["Own car", "Public transport", "Cycles / walks"];

export default function CarerAdmin({
  carers,
  skills,
  areas,
  canEdit,
}: {
  carers: CarerRecord[];
  skills: CarerSkill[];
  areas: CarerArea[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [area, setArea] = useState("ALL");
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const skillLabel = (k: string) => skills.find((s) => s.key === k)?.label ?? k;

  const areaCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of carers) m.set(c.homeArea, (m.get(c.homeArea) ?? 0) + 1);
    return m;
  }, [carers]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return carers.filter((c) => {
      if (area !== "ALL" && c.homeArea !== area) return false;
      if (!term) return true;
      return (c.name + " " + c.id + " " + c.homeArea + " " + c.skills.map(skillLabel).join(" ")).toLowerCase().includes(term);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carers, area, q]);

  function open(c?: CarerRecord) {
    setErr("");
    setDraft(c ? { ...BLANK, ...c } : { ...BLANK });
  }
  function set<K extends keyof Draft>(k: K, v: Draft[K]) {
    setDraft((d) => (d ? { ...d, [k]: v } : d));
  }
  function toggle(list: "covers" | "skills", key: string) {
    setDraft((d) => {
      if (!d) return d;
      const has = d[list].includes(key);
      return { ...d, [list]: has ? d[list].filter((x) => x !== key) : [...d[list], key] };
    });
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/carers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data.error ?? "Could not save."); return; }
      setDraft(null);
      router.refresh();
    } catch {
      setErr("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex between wrap" style={{ gap: 12, marginBottom: 14 }}>
        <div className="flex" style={{ position: "relative", flex: "1 1 300px" }}>
          <span className="ms" style={{ position: "absolute", left: 12, top: 10, color: "var(--text-2)", fontSize: 20 }}>search</span>
          <input className="input" style={{ paddingLeft: 40 }} placeholder="Search carer, area or skill…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => open()}>
            <span className="ms" style={{ fontSize: 18 }}>person_add</span>
            Add carer
          </button>
        )}
      </div>

      <div className="flex wrap" style={{ gap: 8, marginBottom: 14 }}>
        <button className={`chip${area === "ALL" ? " active" : ""}`} onClick={() => setArea("ALL")}>All areas · {carers.length}</button>
        {areas.map((a) => (
          <button key={a.key} className={`chip${area === a.key ? " active" : ""}`} onClick={() => setArea(a.key)}>
            {a.key} · {areaCounts.get(a.key) ?? 0}
          </button>
        ))}
      </div>

      <div className="grid cols-2">
        {filtered.map((c) => {
          const free = Math.max(0, c.capacityHours - c.committedHours);
          const pct = c.capacityHours ? Math.min(100, Math.round((c.committedHours / c.capacityHours) * 100)) : 0;
          const load = pct >= 100 ? "red" : pct >= 85 ? "amber" : "green";
          return (
            <div key={c.id} className="card" style={{ opacity: c.status === "active" ? 1 : 0.6 }}>
              <div className="flex between" style={{ gap: 8, alignItems: "flex-start" }}>
                <div>
                  <div className="flex" style={{ gap: 8, alignItems: "center" }}>
                    <strong style={{ fontSize: 14.5 }}>{c.name}</strong>
                    {c.status !== "active" && <span className="pill tone-grey">Inactive</span>}
                  </div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                    <span className="code">{c.id}</span> · {c.homeArea || "No area"} · {c.transport || "—"}
                  </div>
                </div>
                {canEdit && (
                  <button className="mini" onClick={() => open(c)}>
                    <span className="ms" style={{ fontSize: 14, marginRight: 3 }}>edit</span>Edit
                  </button>
                )}
              </div>

              <div className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>{c.pathway || "Pathway not set"}</div>

              <div className="flex wrap" style={{ gap: 5, marginTop: 8 }}>
                {c.skills.length === 0 ? <span className="muted" style={{ fontSize: 11.5 }}>No skills recorded</span> :
                  c.skills.map((k) => <span key={k} className="pill tone-blue" style={{ fontSize: 10.5 }}>{skillLabel(k)}</span>)}
              </div>

              {c.covers.length > 0 && (
                <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
                  <span className="ms" style={{ fontSize: 13, verticalAlign: "middle" }}>pin_drop</span> Covers {c.covers.join(", ")}
                </div>
              )}

              <div style={{ marginTop: 10 }}>
                <div className="flex between" style={{ fontSize: 11 }}>
                  <span className="muted">This week: {c.committedHours}h of {c.capacityHours}h</span>
                  <span className={`pill tone-${load}`} style={{ fontSize: 10.5 }}>{free}h free</span>
                </div>
                <div style={{ height: 6, background: "var(--line)", borderRadius: 4, marginTop: 4, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: load === "red" ? "var(--red-fg)" : load === "amber" ? "var(--amber-fg,#c98a00)" : "var(--green-fg,#1c7c3f)" }} />
                </div>
              </div>

              {c.note && <div className="muted" style={{ fontSize: 11.5, marginTop: 8, fontStyle: "italic" }}>{c.note}</div>}
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && <p className="muted">No carers match.</p>}

      {draft && (
        <div className="modal-backdrop" onClick={() => !busy && setDraft(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="flex between" style={{ marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 17 }}>{draft.id ? `Edit ${draft.name || "carer"}` : "Add a carer"}</h2>
              <button className="mini" onClick={() => setDraft(null)} disabled={busy}>Close</button>
            </div>
            {err && <div className="card" style={{ borderColor: "var(--red-fg)", color: "var(--red-fg)", marginBottom: 10 }}>{err}</div>}

            <div className="grid cols-2" style={{ gap: 10 }}>
              <label className="fld"><span>Name</span>
                <input className="input" value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Full name" />
              </label>
              <label className="fld"><span>Home area</span>
                <select className="input" value={draft.homeArea} onChange={(e) => set("homeArea", e.target.value)}>
                  <option value="">Select area…</option>
                  {areas.map((a) => <option key={a.key} value={a.key}>{a.key}</option>)}
                </select>
              </label>
            </div>

            <div className="fld" style={{ marginTop: 10 }}><span>Also travels to (radius)</span>
              <div className="flex wrap" style={{ gap: 6, marginTop: 4 }}>
                {areas.map((a) => {
                  const on = draft.covers.includes(a.key) || a.key === draft.homeArea;
                  const home = a.key === draft.homeArea;
                  return (
                    <button key={a.key} type="button" disabled={home} className={`chip${on ? " active" : ""}`} onClick={() => toggle("covers", a.key)} style={home ? { opacity: 0.7 } : undefined}>
                      {a.key}{home ? " (home)" : ""}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="fld" style={{ marginTop: 10 }}><span>Skills &amp; competencies</span>
              <div className="flex wrap" style={{ gap: 6, marginTop: 4 }}>
                {skills.map((s) => (
                  <button key={s.key} type="button" className={`chip${draft.skills.includes(s.key) ? " active" : ""}`} onClick={() => toggle("skills", s.key)}>{s.label}</button>
                ))}
              </div>
            </div>

            <div className="grid cols-2" style={{ gap: 10, marginTop: 10 }}>
              <label className="fld"><span>Qualification pathway</span>
                <select className="input" value={draft.pathway} onChange={(e) => set("pathway", e.target.value)}>
                  <option value="">Select…</option>
                  {PATHWAYS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label className="fld"><span>Transport</span>
                <select className="input" value={draft.transport} onChange={(e) => set("transport", e.target.value)}>
                  {TRANSPORT.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="fld"><span>Contracted hours / week</span>
                <input className="input" type="number" min={0} max={60} value={draft.capacityHours} onChange={(e) => set("capacityHours", Number(e.target.value))} />
              </label>
              <label className="fld"><span>Committed hours this week</span>
                <input className="input" type="number" min={0} max={draft.capacityHours} value={draft.committedHours} onChange={(e) => set("committedHours", Number(e.target.value))} />
              </label>
            </div>

            <div className="grid cols-2" style={{ gap: 10, marginTop: 10 }}>
              <label className="fld"><span>Status</span>
                <select className="input" value={draft.status} onChange={(e) => set("status", e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className="fld"><span>Note (optional)</span>
                <input className="input" value={draft.note} onChange={(e) => set("note", e.target.value)} placeholder="e.g. Dementia lead" />
              </label>
            </div>

            <div className="flex" style={{ gap: 8, marginTop: 16 }}>
              <button className="btn btn-primary" disabled={busy || draft.name.trim().length < 2} onClick={save}>
                {busy ? "Saving…" : draft.id ? "Save changes" : "Add carer"}
              </button>
              <button className="btn" onClick={() => setDraft(null)} disabled={busy}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
