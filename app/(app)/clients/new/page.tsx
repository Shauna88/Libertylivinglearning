import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CRM_ROLES, listClients, type Role } from "@/lib/db";
import ReferralForm from "@/components/ReferralForm";

export const dynamic = "force-dynamic";

export default async function NewReferralPage() {
  const session = await auth();
  if (!CRM_ROLES.includes(session!.user.role as Role)) redirect("/dashboard");

  const clients = await listClients();
  const areas = [...new Set(clients.map((c) => c.area).filter(Boolean))].sort();
  const coordinators = [...new Set(clients.map((c) => c.csm).filter(Boolean))].sort();

  return (
    <>
      <header className="header">
        <div className="flex" style={{ gap: 10, marginBottom: 6 }}>
          <Link href="/clients" className="muted flex" style={{ gap: 4, fontSize: 12.5, fontWeight: 600 }}>
            <span className="ms" style={{ fontSize: 16 }}>arrow_back</span>
            Client register
          </Link>
        </div>
        <h1>New referral</h1>
        <p>Capture the referral details. You can complete the schedule and care plan on the client&rsquo;s record next.</p>
      </header>
      <div className="body">
        <ReferralForm areas={areas} coordinators={coordinators} />
      </div>
    </>
  );
}
