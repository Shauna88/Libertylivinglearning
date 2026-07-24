import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { WORKFORCE_ROLES, type Role } from "@/lib/db";
import {
  WF_KPIS,
  READINESS,
  GATEWAYS,
  TRAINING_CAT,
  WF_PATHWAYS,
  HCA_RECORDS,
} from "@/lib/workforce";
import WorkforceView from "@/components/WorkforceView";

export default async function WorkforcePage() {
  const session = await auth();
  if (!WORKFORCE_ROLES.includes(session!.user.role as Role)) redirect("/dashboard");

  return (
    <>
      <header className="header">
        <h1>Workforce & Training</h1>
        <p>HR and manager view of workforce compliance — training, onboarding gateways, qualification pathways and the HCA register (HR-14 · HSE Specs 17.x).</p>
      </header>
      <div className="body">
        <WorkforceView
          kpis={WF_KPIS}
          readiness={READINESS}
          gateways={GATEWAYS}
          training={TRAINING_CAT}
          pathways={WF_PATHWAYS}
          hcas={HCA_RECORDS}
        />
      </div>
    </>
  );
}
