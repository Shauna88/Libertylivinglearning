import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CRM_ROLES, listRespite, listClients, type Role } from "@/lib/db";
import { maskName } from "@/lib/crm";
import RespiteRegister, { type RespiteItem } from "@/components/RespiteRegister";

export const dynamic = "force-dynamic";

export default async function RespitePage() {
  const session = await auth();
  const role = session!.user.role as Role;
  if (!CRM_ROLES.includes(role)) redirect("/dashboard");

  const [items, clients] = await Promise.all([listRespite(), listClients()]);
  const clientOpts = clients.map((c) => ({ id: c.id, label: `${maskName(c.name)} · ${c.su}` }));
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });

  return (
    <>
      <header className="header">
        <div className="flex" style={{ gap: 8, marginBottom: 6 }}>
          <span className="pill tone-teal"><span className="ms" style={{ fontSize: 14 }}>hotel</span>Respite register</span>
        </div>
        <h1>Respite &amp; short-term care</h1>
        <p>Clients temporarily away or on hold — respite, hospital admissions and holiday holds. Client names are masked.</p>
      </header>
      <div className="body fade">
        <RespiteRegister items={items as RespiteItem[]} clients={clientOpts} today={today} canEdit />
      </div>
    </>
  );
}
