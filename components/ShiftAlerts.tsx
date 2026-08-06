"use client";

import { useEffect } from "react";

export type AlertOffer = { id: number; day: string; time: string; type: string; kind: string; note: string };

const SEEN_KEY = "ll-shift-alert-seen";

function seenSet(): Set<number> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]") as number[]);
  } catch {
    return new Set();
  }
}
function remember(ids: number[]) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...new Set(ids)].slice(-100)));
  } catch {}
}

/**
 * Show a device pop-up for each offer the carer hasn't been alerted about yet.
 * `force` re-notifies every offer (used right after they turn alerts on, so they
 * get immediate confirmation). No-op unless notification permission is granted.
 */
export function fireShiftNotifications(offers: AlertOffer[], force = false): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const seen = seenSet();
  const fresh = force ? offers : offers.filter((o) => !seen.has(o.id));
  for (const o of fresh) {
    const kindLabel = o.kind === "time" ? "Time change" : "New shift";
    const body = `${o.day} ${o.time} · ${o.type || "Visit"}${o.note ? ` — ${o.note}` : ""}\nTap to accept or decline.`;
    try {
      const n = new Notification(`${kindLabel} offered to you`, {
        body,
        icon: "/liberty-living-logo.png",
        badge: "/liberty-living-logo.png",
        tag: `ll-shift-${o.id}`,
        requireInteraction: true,
      });
      n.onclick = () => {
        window.focus();
        window.location.href = "/my-week";
        n.close();
      };
    } catch {
      /* construction can throw on some mobile browsers — ignore */
    }
  }
  remember([...seen, ...offers.map((o) => o.id)]);
}

/**
 * Silent, safe on every page — fires a device pop-up for shift offers this carer
 * hasn't seen yet. The in-app badge and the offers card cover carers who haven't
 * allowed pop-ups (or whose device is asleep).
 */
export default function ShiftAlerts({ offers }: { offers: AlertOffer[] }) {
  useEffect(() => {
    fireShiftNotifications(offers);
  }, [offers]);
  return null;
}
