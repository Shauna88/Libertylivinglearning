import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CRM_ROLES, type Role } from "@/lib/db";
import ImportWizard from "@/components/ImportWizard";

export default async function ImportClientsPage() {
  const session = await auth();
  if (!CRM_ROLES.includes(session!.user.role as Role)) redirect("/dashboard");

  return (
    <>
      <header className="header">
        <div className="flex" style={{ gap: 10, marginBottom: 6 }}>
          <Link href="/clients" className="muted flex" style={{ gap: 4, fontSize: 12.5, fontWeight: 600 }}>
            <span className="ms" style={{ fontSize: 16 }}>arrow_back</span>
            Client register
          </Link>
        </div>
        <h1>Bulk import clients</h1>
        <p>Upload or paste a CSV, map the columns, check the preview, then create the records.</p>
      </header>
      <div className="body fade">
        <ImportWizard />
      </div>
    </>
  );
}
