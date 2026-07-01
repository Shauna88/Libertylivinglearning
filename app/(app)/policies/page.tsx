import { POLICIES, POLICY_CATS } from "@/lib/modules";
import PolicyLibrary from "@/components/PolicyLibrary";

export default function PoliciesPage() {
  return (
    <>
      <header className="header">
        <h1>Policy & Procedure Library</h1>
        <p>{POLICIES.length} controlled documents across six categories. Search or filter, then open a document for its control record.</p>
      </header>
      <div className="body">
        <PolicyLibrary policies={POLICIES} cats={POLICY_CATS} />
      </div>
    </>
  );
}
