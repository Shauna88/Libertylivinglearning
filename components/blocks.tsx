/* Presentational renderers for lesson content blocks and SOP steps.
   No hooks — safe to use from both server and client components. */
import type { Block, Lesson, SopStep } from "@/lib/content";

export function BlockView({ block }: { block: Block }) {
  switch (block.k) {
    case "t":
      return <p>{block.t}</p>;
    case "l":
      return (
        <ul>
          {block.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      );
    case "tip":
      return (
        <div className="callout tip">
          <span className="k">Good practice</span>
          {block.t}
        </div>
      );
    case "warn":
      return (
        <div className="callout warn">
          <span className="k">Important</span>
          {block.t}
        </div>
      );
    case "scn":
      return (
        <div className="scn">
          <h4>{block.title}</h4>
          <div className="row">
            <b>Situation.</b> {block.situation}
          </div>
          <div className="row">
            <b>Action.</b> {block.action}
          </div>
          <div className="row muted">
            <b>Why.</b> {block.why}
          </div>
        </div>
      );
    case "flow":
      return (
        <ol style={{ paddingLeft: 20, margin: "0 0 14px" }}>
          {block.steps.map((s, i) => (
            <li key={i} style={{ margin: "5px 0", color: "var(--text-3)" }}>
              {s}
            </li>
          ))}
        </ol>
      );
    default:
      return null;
  }
}

export function LessonBody({ lesson }: { lesson: Lesson }) {
  return (
    <div className="prose">
      {lesson.b.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </div>
  );
}

export function SopStepList({ steps }: { steps: SopStep[] }) {
  return (
    <ul className="steps">
      {steps.map((s) => (
        <li key={s.n}>
          <div className="step-n">{s.n}</div>
          <div>
            <div>{s.action}</div>
            <div className="step-meta">
              <span className="m">
                <span className="ms">badge</span>
                {s.role}
              </span>
              <span className="m">
                <span className="ms">schedule</span>
                {s.tf}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
