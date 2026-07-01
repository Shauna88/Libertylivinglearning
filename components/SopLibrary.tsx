"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type SopLite = { id: string; title: string; purpose: string };

export default function SopLibrary({ sops }: { sops: SopLite[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return sops;
    return sops.filter(
      (s) =>
        s.id.toLowerCase().includes(term) ||
        s.title.toLowerCase().includes(term) ||
        s.purpose.toLowerCase().includes(term)
    );
  }, [q, sops]);

  return (
    <>
      <div className="flex" style={{ marginBottom: 16, position: "relative" }}>
        <span
          className="ms"
          style={{ position: "absolute", left: 12, color: "var(--text-2)", fontSize: 20, pointerEvents: "none" }}
        >
          search
        </span>
        <input
          className="input"
          style={{ paddingLeft: 40 }}
          placeholder="Search 70 SOPs by code, title or purpose…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
        {filtered.length} of {sops.length} procedures
      </div>
      <div className="grid cols-2">
        {filtered.map((s) => (
          <Link key={s.id} href={`/sops/${s.id}`} className="card" style={{ display: "block" }}>
            <div className="flex" style={{ gap: 8, marginBottom: 6 }}>
              <span className="code">{s.id}</span>
            </div>
            <h3 style={{ margin: "0 0 6px", fontSize: 14.5 }}>{s.title}</h3>
            <p className="muted" style={{ fontSize: 12, margin: 0, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {s.purpose}
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}
