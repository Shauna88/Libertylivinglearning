import { SOPS } from "@/lib/content";
import SopLibrary from "@/components/SopLibrary";

export default function SopsPage() {
  const sops = Object.values(SOPS).map((s) => ({
    id: s.id,
    title: s.title,
    purpose: s.purpose,
  }));

  return (
    <>
      <header className="header">
        <h1>SOP Library</h1>
        <p>All {sops.length} Standard Operating Procedures. Each sets out the numbered steps, responsible role and timeframe.</p>
      </header>
      <div className="body fade">
        <SopLibrary sops={sops} />
      </div>
    </>
  );
}
