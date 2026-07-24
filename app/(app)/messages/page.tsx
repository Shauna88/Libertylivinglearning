import { auth } from "@/auth";
import { listInbox, listSent, listClients, listCarers } from "@/lib/db";
import { MESSAGE_DEPTS, messagingDept } from "@/lib/roles";
import { buildRefGroups } from "@/lib/refs";
import Messages from "@/components/Messages";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const session = await auth();
  const role = session!.user.role;
  const userId = Number(session!.user.id);
  const myDept = messagingDept(role);

  const [inbox, sent, clients, carers] = await Promise.all([listInbox(myDept), listSent(userId), listClients(), listCarers()]);
  const refGroups = buildRefGroups(clients, carers);

  return (
    <div className="msg-screen">
      <header className="header">
        <h1>Messages</h1>
        <p>Send a message or request a meeting with another department. You receive anything addressed to <strong>{myDept}</strong> or all staff.</p>
      </header>
      <div className="msg-body fade">
        <Messages inbox={inbox} sent={sent} myDept={myDept} depts={MESSAGE_DEPTS} refGroups={refGroups} />
      </div>
    </div>
  );
}
