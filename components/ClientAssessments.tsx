"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ASSESSMENT_ITEMS,
  assessmentStatus,
  assessmentTone,
  assessmentLabel,
  reviewPhrase,
  summariseAssessments,
  type AssessmentRecord,
} from "@/lib/assessments";

type Row = { done: boolean; completedOn: string | null; reviewDue: string | null };

export default function ClientAssessments({
  clientId,
  records,
  canEdit,
}: {
  clientId: string;
  records: { itemKey: string; completedOn: string | null; reviewDue: string | null }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const now = useMemo(() => new Date(), []);
  const initial = useMemo(() => {
    const m: Record<string, Row> = {};
    for (const it of ASSESSMENT_ITEMS) m[it.key] = { done: false, completedOn: null, reviewDue: null };
    for (const r of records) m[r.itemKey] = { done: true, completedOn: r.completedOn, reviewDue: r.reviewDue };
    return m;
  }, [records]);

  const [state, setState] = useState<Record<string, Row>>(initial);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  const asRecords: AssessmentRecord[] = ASSESSMENT_ITEMS.filter((i) => state[i.key].done).map((i) => ({
    itemKey: i.key,
    reviewDue: state[i.key].reviewDue,
  }));
  const summary = summariseAssessments(asRecords, now);

  async function save(itemKey: string, next: Row) {
    setSaving(itemKey);
    setError("");
    const prev = state[itemKey];
    setState((s) => ({ ...s, [itemKey]: next }));
    try {
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, itemKey, done: next.done, completedOn: next.completedOn, reviewDue: next.reviewDue }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Could not save");
      }
      router.refresh();
    } catch (e) {
      setState((s) => ({ ...s, [itemKey]: prev }));
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="flex between wrap" style={{ gap: 8, alignItems: "center", marginBottom: 12 }}>
        <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 700 }}>
          Assessments &amp; care-plan reviews
        </div>
        <div className="flex wrap" style={{ gap: 6 }}>
          {summary.overdue > 0 && <span className="pill tone-red" style={{ fontSize: 11 }}>{summary.overdue} overdue</span>}
          {summary.dueSoon > 0 && <span className="pill tone-amber" style={{ fontSize: 11 }}>{summary.dueSoon} due soon</span>}
          {summary.notDone > 0 && <span className="pill tone-grey" style={{ fontSize: 11 }}>{summary.notDone} not done</span>}
          {summary.worst === "in_date" && <span className="pill tone-green" style={{ fontSize: 11 }}>All up to date</span>}
        </div>
      </div>

      {error && <div className="error" style={{ marginBottom: 10 }}>{error}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {ASSESSMENT_ITEMS.map((it) => {
          const row = state[it.key];
          const st = assessmentStatus(row.done, row.reviewDue, it.cadenceMonths, now);
          const oneOff = it.cadenceMonths === null;
          return (
            <div key={it.key} className="flex between wrap" style={{ gap: 10, alignItems: "center", padding: "9px 0", borderTop: "1px solid var(--line)" }}>
              <div style={{ minWidth: 200, flex: "1 1 240px" }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{it.label}</div>
                <div className="muted" style={{ fontSize: 11.5 }}>
                  {oneOff ? "One-off" : `Review every ${it.cadenceMonths} months`}
                  {row.done && row.completedOn ? ` · last done ${row.completedOn}` : ""}
                </div>
              </div>

              <div className="flex" style={{ gap: 10, alignItems: "center" }}>
                <span className={`pill tone-${assessmentTone(st.status)}`} style={{ fontSize: 11, minWidth: 74, justifyContent: "center" }}>
                  {assessmentLabel(st.status)}
                </span>
                <span className="muted" style={{ fontSize: 11.5, minWidth: 108, textAlign: "right" }}>{reviewPhrase(st)}</span>

                {canEdit ? (
                  oneOff ? (
                    <label className="flex" style={{ gap: 5, alignItems: "center", fontSize: 12 }}>
                      <input
                        type="checkbox"
                        checked={row.done}
                        disabled={saving === it.key}
                        onChange={(e) => save(it.key, { done: e.target.checked, completedOn: e.target.checked ? new Date().toISOString().slice(0, 10) : null, reviewDue: null })}
                      />
                      Done
                    </label>
                  ) : (
                    <label className="flex" style={{ gap: 5, alignItems: "center", fontSize: 11.5 }} title="Next review due">
                      <span className="muted">next review</span>
                      <input
                        type="date"
                        className="input"
                        style={{ width: 150, padding: "5px 8px", fontSize: 12.5 }}
                        value={row.reviewDue ?? ""}
                        disabled={saving === it.key}
                        onChange={(e) => save(it.key, { done: !!e.target.value, completedOn: row.completedOn ?? new Date().toISOString().slice(0, 10), reviewDue: e.target.value || null })}
                      />
                    </label>
                  )
                ) : (
                  <span className="muted" style={{ fontSize: 12, minWidth: 100, textAlign: "right" }}>
                    {row.done ? (oneOff ? "done" : row.reviewDue ?? "—") : "—"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {canEdit && (
        <div className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>
          Set the next review date to record an assessment; clear it (or untick the initial assessment) to mark it not done. Saves automatically and is logged.
        </div>
      )}
    </div>
  );
}
