import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { IMPROVEMENT_ROLES, listHubIssues, listAssignments, type Role } from "@/lib/db";
import { COURSES, SOPS } from "@/lib/content";
import { DEPARTMENTS, OUTCOMES, AUDIENCES } from "@/lib/improvement";
import { hubLabel, hubScopeOf, deptOf } from "@/lib/roles";
import ImprovementHub from "@/components/ImprovementHub";

export const dynamic = "force-dynamic";

export default async function ImprovementPage() {
  const session = await auth();
  const role = session!.user.role;
  if (!IMPROVEMENT_ROLES.includes(role as Role)) redirect("/dashboard");

  const [allIssues, assignments] = await Promise.all([listHubIssues(), listAssignments()]);

  // Scope the issue list to what this role owns: "all" (Quality / Exec / CSM)
  // sees every issue; "dept" (e.g. Director of HR) sees only issues whose
  // effective owning department is theirs.
  const scope = hubScopeOf(role);
  const dept = deptOf(role);
  const issues = scope === "dept" && dept ? allIssues.filter((i) => i.dept === dept) : allIssues;

  const courses = Object.entries(COURSES).map(([id, c]) => ({ id, title: c.title }));
  const sops = Object.values(SOPS).map((s) => ({ id: s.id, title: `${s.id} · ${s.title}` }));

  const scopeNote =
    scope === "dept" && dept
      ? `Issues routed to ${dept}. Review, sign off, route the fix, and push corrective training.`
      : "Every open complaint, incident and safeguarding issue across the service. Review, sign off, route the fix to the owning department, and push corrective training.";

  return (
    <>
      <header className="header">
        <h1>{hubLabel(role)}</h1>
        <p>{scopeNote}</p>
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
