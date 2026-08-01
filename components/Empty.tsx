/** A friendly empty state — an icon, a line, and an optional hint. */
export default function Empty({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
  return (
    <div className="empty">
      <span className="ms empty-icon" aria-hidden="true">{icon}</span>
      <div className="empty-title">{title}</div>
      {hint && <div className="empty-hint">{hint}</div>}
    </div>
  );
}
