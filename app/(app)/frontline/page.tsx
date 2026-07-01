import { SITUATIONS, FL_ROLES } from "@/lib/frontline";
import FrontlineGuide from "@/components/FrontlineGuide";

export default function FrontlinePage() {
  return (
    <>
      <header className="header">
        <h1>Front-line field guide</h1>
        <p>{`The ${SITUATIONS.length} situations you're most likely to face — spot it, do the right thing, tell the right person. Switch the lens to see your part in each.`}</p>
      </header>
      <div className="body">
        <FrontlineGuide situations={SITUATIONS} roles={FL_ROLES} />
      </div>
    </>
  );
}
