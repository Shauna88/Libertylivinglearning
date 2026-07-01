"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type SopLite = { id: string; title: string; purpose: string; cat: string };
type Cat = { key: string; label: string; icon: string };

export default function SopLibrary({ sops, cats }: { sops: SopLite[]; cats: Cat[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("ALL");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return sops.filter((s) => {
      if (cat !== "ALL" && s.cat !== cat) return false;
      if (!term) return true;
      return (s.id + " " + s.title + " " + s.purpose).toLowerCase().includes(term);
    });
  }, [q, cat, sops]);

  const count = (k: string) => (k === "ALL" ? sops.length : sops.filter((s) => s.cat === k).length);

  return (
    <>
      <div className="flex" style={{ marginBottom: 14, position: "relative" }}>
        <span className="ms" style={{ position: "absolute", left: 12, color: "var(--text-2)", fontSize: 20, pointerEvents: "none" }}>
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
      <div className="flex wrap" style={{ gap: 8, marginBottom: 12 }}>
        <button className={`chip${cat === "ALL" ? " active" : ""}`} onClick={() => setCat("ALL")}>
          All · {count("ALL")}
        </button>
        {cats.map((c) => (
          <button key={c.key} className={`chip${cat === c.key ? " active" : ""}`} onClick={() => setCat(c.key)}>
            {c.label} · {count(c.key)}
          </button>
        ))}
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
      {filtered.length === 0 && <p className="muted">No procedures match your search.</p>}
    </>
  );
}
