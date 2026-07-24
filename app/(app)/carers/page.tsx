import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CRM_ROLES, WORKFORCE_ROLES, listCarers, type Role } from "@/lib/db";
import { CARER_DIRECTORY } from "@/lib/carers";
import CarerAdmin from "@/components/CarerAdmin";

const CAN_VIEW: Role[] = [...new Set([...CRM_ROLES, ...WORKFORCE_ROLES])] as Role[];

export default async function CarersPage() {
  const session = await auth();
  const role = session!.user.role as Role;
  if (!CAN_VIEW.includes(role)) redirect("/dashboard");

  const carers = await listCarers();
  const active = carers.filter((c) => c.status === "active").length;
  const canEdit = CAN_VIEW.includes(role); // same gate can edit

  return (
    <>
      <header className="header">
        <h1>Carer directory</h1>
        <p>
          {active} active {active === 1 ? "carer" : "carers"} · home area, travel radius, skills and weekly hours.
          These records power the <strong>carer-matching suggestions</strong> when you assign carers to a client.
        </p>
      </header>
      <div className="body fade">
        <CarerAdmin carers={carers} skills={CARER_DIRECTORY.skills} areas={CARER_DIRECTORY.areas} canEdit={canEdit} />
      </div>
    </>
  );
}
