import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { IMPROVEMENT_ROLES, listHubIssues, listAssignments, type Role } from "@/lib/db";
import { COURSES, SOPS } from "@/lib/content";
import { DEPARTMENTS, OUTCOMES, AUDIENCES } from "@/lib/improvement";
import ImprovementHub from "@/components/ImprovementHub";

export const dynamic = "force-dynamic";

export default async function ImprovementPage() {
  const session = await auth();
  if (!IMPROVEMENT_ROLES.includes(session!.user.role as Role)) redirect("/dashboard");

  const [issues, assignments] = await Promise.all([listHubIssues(), listAssignments()]);
  const courses = Object.entries(COURSES).map(([id, c]) => ({ id, title: c.title }));
  const sops = Object.values(SOPS).map((s) => ({ id: s.id, title: `${s.id} · ${s.title}` }));

  return (
    <>
      <header className="header">
        <h1>Improvement &amp; Training</h1>
        <p>
          Review complaints, incidents and safeguarding issues, sign them off with an outcome, route
          the fix to the department that owns it, and push corrective training.
        </p>
      </header>
      <div className="body">
        <ImprovementHub
          issues={issues}
          assignments={assignments}
          courses={courses}
          sops={sops}
          departments={[...DEPARTMENTS]}
          outcomes={[...OUTCOMES]}
          audiences={[...AUDIENCES]}
        />
      </div>
    </>
  );
}
