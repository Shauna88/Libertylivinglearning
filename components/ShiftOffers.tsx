"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { fireShiftNotifications, type AlertOffer } from "@/components/ShiftAlerts";
import { ensurePushSubscription } from "@/lib/pushClient";

// Read the browser's notification permission reactively (updates when we ask).
function permSubscribe(cb: () => void) {
  window.addEventListener("ll-perm", cb);
  return () => window.removeEventListener("ll-perm", cb);
}
function permSnapshot(): "unsupported" | NotificationPermission {
  return "Notification" in window ? Notification.permission : "unsupported";
}

export type Offer = {
  id: number;
  su: string;
  day: string;
  time: string;
  type: string;
  kind: string;
  note: string;
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
  // "unknown" on the server / first paint, then the real permission on the client.
  const perm = useSyncExternalStore(permSubscribe, permSnapshot, () => "unknown" as const);

  const alertOffers: AlertOffer[] = offers.map((o) => ({ id: o.id, day: o.day, time: o.time, type: o.type, kind: o.kind, note: o.note }));

  async function enableAlerts() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const res = await Notification.requestPermission();
    window.dispatchEvent(new Event("ll-perm")); // re-read permission everywhere
    if (res === "granted") {
      void ensurePushSubscription(); // register for locked-screen push
      fireShiftNotifications(alertOffers, true);
    }
  }

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
      <div className="flex between wrap" style={{ gap: 8, alignItems: "center", marginBottom: 10 }}>
        <div className="flex" style={{ gap: 8, alignItems: "center" }}>
          <span className="ms" style={{ fontSize: 20, color: "var(--amber-fg)" }}>notifications_active</span>
          <strong style={{ fontSize: 15 }}>
            {offers.length} shift{offers.length > 1 ? "s" : ""} offered to you
          </strong>
          <span className="muted" style={{ fontSize: 12 }}>Accept to add it to your week, or decline to send it back.</span>
        </div>
        {perm === "default" && (
          <button className="mini primary" onClick={enableAlerts}>
            <span className="ms" style={{ fontSize: 15, marginRight: 3 }}>notifications</span>Turn on shift alerts
          </button>
        )}
        {perm === "granted" && (
          <span className="pill tone-green" style={{ fontSize: 11 }}><span className="ms" style={{ fontSize: 13 }}>notifications_active</span>Alerts on</span>
        )}
        {perm === "denied" && (
          <span className="muted" style={{ fontSize: 11 }} title="Turn on notifications for this site in your browser settings">Alerts blocked in browser</span>
        )}
      </div>
      {err && <div className="card" style={{ borderColor: "var(--red-fg)", color: "var(--red-fg)", marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {offers.map((o) => (
          <div key={o.id} className="offer-row">
            <div style={{ minWidth: 0 }}>
              <div className="flex" style={{ gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600, fontSize: 13.5 }}>{o.day} · {o.time} — {o.type || "Visit"}</span>
                {o.kind === "time" && <span className="pill tone-blue" style={{ fontSize: 10 }}><span className="ms" style={{ fontSize: 12 }}>update</span>Time change</span>}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                <span className="code">{o.su}</span>
                {o.offeredBy ? ` · offered by ${o.offeredBy}` : ""}
              </div>
              {o.note && (
                <div className="offer-note">
                  <span className="ms" style={{ fontSize: 14 }}>format_quote</span>
                  <span>{o.note}</span>
                </div>
              )}
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
