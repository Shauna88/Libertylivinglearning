"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

export type DashCall = {
  clientId: string;
  su: string;
  area: string;
  day: string;
  time: string;
  baseTime: string;
  type: string;
};

/**
 * Assign an uncovered call to a carer straight from the dashboard — a last-minute
 * change for today only. Pushes the shift to the HCA to accept and notifies the
 * family portal (push: true), the same as the Live calls and Day boards.
 */
export default function DashCover({ calls, carers, max = 8 }: { calls: DashCall[]; carers: string[]; max?: number }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function assign(c: DashCall, carer: string) {
    const key = `${c.clientId}|${c.time}`;
    setBusy(key);
    try {
      const res = await fetch("/api/cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set", clientId: c.clientId, day: c.day, time: c.baseTime, carer, push: true }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { toast(j.error ?? "Could not assign", "error"); return; }
      toast(`${c.time} ${c.su} → ${carer}${j.offered ? " · shift offered" : ""}`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card" style={{ borderLeft: "4px solid var(--red-fg)" }}>
      {calls.slice(0, max).map((c) => {
        const key = `${c.clientId}|${c.time}`;
        return (
          <div key={key} className="dash-row" style={{ gap: 8 }}>
            <span className="code">{c.time}</span>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{c.type}</span>
            <span className="muted" style={{ fontSize: 12 }}>{c.su} · {c.area}</span>
            <div className="flex" style={{ gap: 6, marginLeft: "auto", alignItems: "center" }}>
              <select
                className="rv-select"
                defaultValue=""
                disabled={busy === key}
                onChange={(e) => { if (e.target.value) assign(c, e.target.value); }}
              >
                <option value="">Assign &amp; push…</option>
                {carers.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              <Link href="/roster" className="mini">Board</Link>
            </div>
          </div>
        );
      })}
      {calls.length > max && (
        <Link href="/roster" className="muted" style={{ fontSize: 12, marginTop: 6, display: "inline-block" }}>
          +{calls.length - max} more on the Day board →
        </Link>
      )}
    </div>
  );
}
