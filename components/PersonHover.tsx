"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

export type HoverLine = { icon: string; text: string; tone?: string };

export type PersonHoverData = {
  title: string; // display name (may be masked)
  kind?: "Client" | "Carer"; // small badge
  code?: string; // SU code / HCA id
  lines: HoverLine[]; // area, phone, live status…
  href?: string; // optional click-through
};

type Coords = { left: number; top: number; flip: boolean };

/**
 * Wraps a name and reveals a small card on hover / focus (and tap on touch) with
 * the person's area, phone and live status. The card is positioned with
 * position:fixed from the trigger's rect, so it never gets clipped by a card's
 * overflow — making it safe to drop onto any name, anywhere.
 */
export default function PersonHover({ data, children }: { data: PersonHoverData; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  const place = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const flip = r.bottom > window.innerHeight * 0.62;
    const left = Math.min(Math.max(8, r.left), window.innerWidth - 288);
    const top = flip ? r.top - 6 : r.bottom + 6;
    setCoords({ left, top, flip });
  }, []);

  const show = open || pinned;

  // While shown, keep it anchored on scroll/resize; close pinned on outside/Esc.
  useEffect(() => {
    if (!show) return;
    place();
    const onMove = () => place();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      const insideTrigger = ref.current && ref.current.contains(t);
      const insidePopover = t.closest && t.closest(".phv-pop");
      if (!insideTrigger && !insidePopover) { setPinned(false); setOpen(false); }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setPinned(false); setOpen(false); } };
    if (pinned) {
      document.addEventListener("pointerdown", onDown);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [show, pinned, place]);

  return (
    <span
      ref={ref}
      className="phv"
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
      {show && coords && typeof document !== "undefined" && createPortal(
        <span
          className={`phv-pop${coords.flip ? " flip" : ""}`}
          role="tooltip"
          style={{ left: coords.left, top: coords.top }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
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
        </span>,
        document.body
      )}
    </span>
  );
}
