"use client";

import { useMemo, useState } from "react";
import {
  COMPLIANCE_ITEMS,
  complianceStatus,
  statusTone,
  statusLabel,
  daysPhrase,
  summariseCompliance,
  type ComplianceRecord,
} from "@/lib/compliance";

type Row = { held: boolean; expiry: string | null };

export default function CarerCompliance({
  carerId,
  records,
  canEdit,
}: {
  carerId: string;
  records: { itemKey: string; expiry: string | null }[];
  canEdit: boolean;
}) {
  const now = useMemo(() => new Date(), []);
  const initial = useMemo(() => {
    const m: Record<string, Row> = {};
    for (const it of COMPLIANCE_ITEMS) m[it.key] = { held: false, expiry: null };
    for (const r of records) m[r.itemKey] = { held: true, expiry: r.expiry };
    return m;
  }, [records]);

  const [state, setState] = useState<Record<string, Row>>(initial);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  const asRecords: ComplianceRecord[] = COMPLIANCE_ITEMS.filter((i) => state[i.key].held).map((i) => ({
    itemKey: i.key,
    held: true,
    expiry: state[i.key].expiry,
  }));
  const summary = summariseCompliance(asRecords, now);

  async function save(itemKey: string, next: Row) {
    setSaving(itemKey);
    setError("");
    const prev = state[itemKey];
    setState((s) => ({ ...s, [itemKey]: next }));
    try {
      const res = await fetch("/api/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carerId, itemKey, held: next.held, expiry: next.expiry }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Could not save");
      }
    } catch (e) {
      setState((s) => ({ ...s, [itemKey]: prev })); // revert
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="flex between wrap" style={{ gap: 8, alignItems: "center", marginBottom: 12 }}>
        <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 700 }}>
          Compliance &amp; credentials
        </div>
        <div className="flex wrap" style={{ gap: 6 }}>
          {summary.blockedFromRoster && (
            <span className="pill tone-red" style={{ fontSize: 11 }}>
              <span className="ms" style={{ fontSize: 13 }}>block</span>Not cleared to roster
            </span>
          )}
          {summary.expired > 0 && <span className="pill tone-red" style={{ fontSize: 11 }}>{summary.expired} expired</span>}
          {summary.expiring > 0 && <span className="pill tone-amber" style={{ fontSize: 11 }}>{summary.expiring} expiring</span>}
          {summary.missing > 0 && <span className="pill tone-grey" style={{ fontSize: 11 }}>{summary.missing} missing</span>}
          {summary.worst === "valid" && <span className="pill tone-green" style={{ fontSize: 11 }}>All in date</span>}
        </div>
      </div>

      {error && <div className="error" style={{ marginBottom: 10 }}>{error}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {COMPLIANCE_ITEMS.map((it) => {
          const row = state[it.key];
          const st = complianceStatus(row.held, row.expiry, now);
          return (
            <div
              key={it.key}
              className="flex between wrap"
              style={{ gap: 10, alignItems: "center", padding: "9px 0", borderTop: "1px solid var(--line)" }}
            >
              <div style={{ minWidth: 200, flex: "1 1 220px" }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {it.label}
                  {it.blocking && (
                    <span className="pill tone-grey" style={{ fontSize: 9.5, marginLeft: 6, padding: "1px 7px" }}>safety-critical</span>
                  )}
                </div>
                <div className="muted" style={{ fontSize: 11.5 }}>
                  {row.held ? (it.cadenceMonths ? `Renews every ${it.cadenceMonths} months` : "No expiry") : "Not recorded"}
                </div>
              </div>

              <div className="flex" style={{ gap: 10, alignItems: "center" }}>
                <span className={`pill tone-${statusTone(st.status)}`} style={{ fontSize: 11, minWidth: 74, justifyContent: "center" }}>
                  {statusLabel(st.status)}
                </span>
                <span className="muted" style={{ fontSize: 11.5, minWidth: 92, textAlign: "right" }}>{daysPhrase(st)}</span>

                {canEdit ? (
                  it.cadenceMonths === null ? (
                    // no-expiry item: a held toggle only
                    <label className="flex" style={{ gap: 5, alignItems: "center", fontSize: 12 }}>
                      <input
                        type="checkbox"
                        checked={row.held}
                        disabled={saving === it.key}
                        onChange={(e) => save(it.key, { held: e.target.checked, expiry: null })}
                      />
                      Held
                    </label>
                  ) : (
                    <input
                      type="date"
                      className="input"
                      style={{ width: 160, padding: "5px 8px", fontSize: 12.5 }}
                      value={row.expiry ?? ""}
                      disabled={saving === it.key}
                      onChange={(e) => save(it.key, { held: !!e.target.value, expiry: e.target.value || null })}
                    />
                  )
                ) : (
                  <span className="muted" style={{ fontSize: 12, minWidth: 100, textAlign: "right" }}>
                    {row.held ? (row.expiry ?? "held") : "—"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {canEdit && (
        <div className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>
          Set an expiry date to record a credential; clear the date (or untick a no-expiry item) to mark it missing. Changes save automatically and are logged.
        </div>
      )}
    </div>
  );
}
