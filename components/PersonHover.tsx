"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import Link from "next/link";

export type HoverLine = { icon: string; text: string; tone?: string };

export type PersonHoverData = {
  title: string; // display name (may be masked)
  kind?: "Client" | "Carer"; // small badge
  code?: string; // SU code / HCA id
  lines: HoverLine[]; // area, phone, live status…
  href?: string; // optional click-through
};

/**
 * Wraps a name and reveals a small card on hover / focus (and tap on touch) with
 * the person's area, phone and live status. Reusable across every screen a name
 * appears on. Opens on hover for mouse users and on click for keyboard / touch.
 */
export default function PersonHover({ data, children }: { data: PersonHoverData; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false); // click/focus keeps it open
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!pinned) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setPinned(false); setOpen(false); }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setPinned(false); setOpen(false); } };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [pinned]);

  const show = open || pinned;

  return (
    <span
      ref={ref}
      className={`phv${show ? " open" : ""}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* a span (not a button) so it can nest inside links/cards anywhere */}
      <span
        className="phv-trigger"
        role="button"
        tabIndex={0}
        aria-expanded={show}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPinned((p) => !p); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setPinned((p) => !p); } }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </span>
      <span className="phv-pop" role="tooltip">
        <span className="phv-head">
          <span className="phv-name">{data.title}</span>
          {data.kind && <span className={`phv-kind phv-kind-${data.kind.toLowerCase()}`}>{data.kind}</span>}
          {data.code && <span className="phv-code">{data.code}</span>}
        </span>
        <span className="phv-lines">
          {data.lines.map((l, i) => (
            <span key={i} className="phv-line">
              <span className={`ms phv-ic${l.tone ? ` tone-fg-${l.tone}` : ""}`} aria-hidden="true">{l.icon}</span>
              {l.text}
            </span>
          ))}
        </span>
        {data.href && (
          <Link href={data.href} className="phv-foot" onClick={() => { setPinned(false); setOpen(false); }}>
            Open record <span className="ms" aria-hidden="true" style={{ fontSize: 13 }}>arrow_forward</span>
          </Link>
        )}
      </span>
    </span>
  );
}
