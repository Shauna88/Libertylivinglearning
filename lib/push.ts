import webpush from "web-push";
import { getUserByName, listPushSubscriptions, deletePushSubscription } from "@/lib/db";

/** True once VAPID keys are configured — the whole feature is dormant without them. */
export function pushEnabled(): boolean {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let configured = false;
function ensureConfigured(): boolean {
  if (!pushEnabled()) return false;
  if (!configured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:coordinator@libertyhomecare.ie",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
      process.env.VAPID_PRIVATE_KEY as string
    );
    configured = true;
  }
  return true;
}

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

/** Push to every device a user has subscribed; prune subscriptions the push service has dropped. */
export async function sendPushToUser(userId: number, payload: PushPayload): Promise<number> {
  if (!ensureConfigured()) return 0;
  const subs = await listPushSubscriptions(userId);
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        );
        sent++;
      } catch (err: unknown) {
        // 404/410 = the subscription is gone (uninstalled / expired) — drop it.
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) await deletePushSubscription(s.endpoint);
      }
    })
  );
  return sent;
}

/** Send a locked-screen push for a shift offered to a carer (best-effort, no-op without keys). */
export async function sendShiftOfferPush(
  carer: string,
  o: { day: string; time: string; type: string; kind: string; note?: string }
): Promise<void> {
  if (!ensureConfigured()) return;
  const user = await getUserByName(carer);
  if (!user) return;
  const title = o.kind === "time" ? "Time change offered to you" : "New shift offered to you";
  const body = `${o.day} ${o.time} · ${o.type || "Visit"}${o.note ? ` — ${o.note}` : ""} · Tap to accept or decline.`;
  await sendPushToUser(user.id, { title, body, url: "/my-week", tag: "ll-shift" });
}
