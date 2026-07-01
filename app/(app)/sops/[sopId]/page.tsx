import Link from "next/link";
import { notFound } from "next/navigation";
import { getSop } from "@/lib/content";
import { SopStepList } from "@/components/blocks";

export default async function SopDetailPage({
  params,
}: {
  params: Promise<{ sopId: string }>;
}) {
  const { sopId } = await params;
  const sop = getSop(sopId);
  if (!sop) notFound();

  return (
    <>
      <header className="header">
        <div className="flex" style={{ gap: 10, marginBottom: 6 }}>
          <Link href="/sops" className="muted flex" style={{ gap: 4, fontSize: 12.5, fontWeight: 600 }}>
            <span className="ms" style={{ fontSize: 16 }}>
              arrow_back
            </span>
            SOP Library
          </Link>
          <span className="code">{sop.id}</span>
        </div>
        <h1>{sop.title}</h1>
      </header>
      <div className="body fade">
        <div className="card" style={{ maxWidth: 820 }}>
          <div className="section-title" style={{ margin: "0 0 6px" }}>
            Purpose
          </div>
          <p className="muted" style={{ marginTop: 0 }}>
            {sop.purpose}
          </p>
          <div className="section-title">Procedure</div>
          <SopStepList steps={sop.steps} />
        </div>
      </div>
    </>
  );
}
