import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CRM_ROLES, OVERSIGHT_ROLES, WORKFORCE_ROLES, listCarers, listClients, listNotifications, type Role } from "@/lib/db";
import NotificationCenter from "@/components/NotificationCenter";

export const dynamic = "force-dynamic";

const CAN_VIEW: Role[] = [...new Set([...CRM_ROLES, ...OVERSIGHT_ROLES, ...WORKFORCE_ROLES])] as Role[];

export default async function NotificationsPage() {
  const session = await auth();
  const role = session!.user.role as Role;
  if (!CAN_VIEW.includes(role)) redirect("/dashboard");

  const [carers, clients, log] = await Promise.all([listCarers(), listClients(), listNotifications()]);
  const activeCarers = carers.filter((c) => c.status === "active");
  const activeClients = clients.filter((c) => c.status === "active" || c.status === "review" || c.status === "new");

  const recipientGroups = [
    { label: "Groups", options: [
      { label: "All active carers", value: "All active carers" },
      { label: "All clients / families", value: "All clients / families" },
    ] },
    { label: "Carers", options: activeCarers.map((c) => ({ label: c.name, value: c.name })) },
    { label: "Clients (by SU)", options: activeClients.map((c) => ({ label: `${c.su} · ${c.area}`, value: c.su })) },
  ];

  const canSend = CAN_VIEW.includes(role);

  return (
    <>
      <header className="header">
        <div className="flex" style={{ gap: 8, marginBottom: 6 }}>
          <span className="pill tone-teal"><span className="ms" style={{ fontSize: 14 }}>notifications_active</span>Notifications</span>
        </div>
        <h1>Notifications · SMS &amp; email</h1>
        <p>Send roster updates, visit reminders and shift offers to carers and clients from templates. A delivery log records every message.</p>
      </header>
      <div className="body fade">
        <NotificationCenter recipientGroups={recipientGroups} log={log} canSend={canSend} />
      </div>
    </>
  );
}
