"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type Offer = {
  id: number;
  su: string;
  day: string;
  time: string;
  type: string;
  offeredBy: string;
};

/**
 * Shifts a coordinator has pushed to this HCA for a last-minute change. The
 * carer accepts or declines here and it flows straight back to the dispatch
 * board — a decline hands the call back to the office to re-cover.
 */
export default function ShiftOffers({ offers }: { offers: Offer[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState("");

  if (offers.length === 0) return null;

  async function decide(id: number, action: "accept" | "decline") {
    setBusy(id);
    setErr("");
    try {
      const res = await fetch("/api/shift-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data.error ?? "Something went wrong."); return; }
      router.refresh();
    } catch {
      setErr("Network error — please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card offer-card" style={{ marginBottom: 16 }}>
      <div className="flex" style={{ gap: 8, alignItems: "center", marginBottom: 10 }}>
        <span className="ms" style={{ fontSize: 20, color: "var(--amber-fg)" }}>notifications_active</span>
        <strong style={{ fontSize: 15 }}>
          {offers.length} shift{offers.length > 1 ? "s" : ""} offered to you
        </strong>
        <span className="muted" style={{ fontSize: 12 }}>Accept to add it to your week, or decline to send it back.</span>
      </div>
      {err && <div className="card" style={{ borderColor: "var(--red-fg)", color: "var(--red-fg)", marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {offers.map((o) => (
          <div key={o.id} className="offer-row">
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                {o.day} · {o.time} — {o.type || "Visit"}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                <span className="code">{o.su}</span>
                {o.offeredBy ? ` · offered by ${o.offeredBy}` : ""}
              </div>
            </div>
            <div className="flex" style={{ gap: 8 }}>
              <button className="mini primary" disabled={busy === o.id} onClick={() => decide(o.id, "accept")}>
                <span className="ms" style={{ fontSize: 15, marginRight: 3 }}>check</span>{busy === o.id ? "…" : "Accept"}
              </button>
              <button className="mini" disabled={busy === o.id} onClick={() => decide(o.id, "decline")}>
                <span className="ms" style={{ fontSize: 15, marginRight: 3 }}>close</span>Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
