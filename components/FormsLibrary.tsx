"use client";

import { useMemo, useState } from "react";
import type { Form, FormCat } from "@/lib/modules";

export default function FormsLibrary({ forms, cats }: { forms: Form[]; cats: FormCat[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("ALL");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return forms.filter((f) => {
      if (cat !== "ALL" && f.cat !== cat) return false;
      if (!term) return true;
      return (f.name + " " + f.ref + " " + f.purpose + " " + f.links.join(" ")).toLowerCase().includes(term);
    });
  }, [q, cat, forms]);

  const groups = cats
    .map((c) => ({ ...c, list: filtered.filter((f) => f.cat === c.key) }))
    .filter((g) => g.list.length > 0);

  const count = (k: string) => (k === "ALL" ? forms.length : forms.filter((f) => f.cat === k).length);
  const isAppendix = (ref: string) => /^Appendix/i.test(ref);

  return (
    <div className="fade">
      <div className="flex" style={{ marginBottom: 14, position: "relative" }}>
        <span className="ms" style={{ position: "absolute", left: 12, color: "var(--text-2)", fontSize: 20 }}>
          search
        </span>
        <input
          className="input"
          style={{ paddingLeft: 40 }}
          placeholder="Search forms by name, reference or purpose…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="flex wrap" style={{ gap: 8, marginBottom: 8 }}>
        <button className={`chip${cat === "ALL" ? " active" : ""}`} onClick={() => setCat("ALL")}>
          All forms · {count("ALL")}
        </button>
        {cats.map((c) => (
          <button key={c.key} className={`chip${cat === c.key ? " active" : ""}`} onClick={() => setCat(c.key)}>
            {c.label} · {count(c.key)}
          </button>
        ))}
      </div>

      {groups.map((g) => (
        <section key={g.key}>
          <div className="section-title flex" style={{ gap: 8 }}>
            <span className="ms" style={{ fontSize: 16, color: "var(--accent)" }}>
              {g.icon}
            </span>
            {g.label}
          </div>
          <div className="grid cols-2">
            {g.list.map((f) => (
              <div key={f.name + f.ref} className="card">
                <div className="flex between" style={{ alignItems: "flex-start" }}>
                  <h3 style={{ margin: 0, fontSize: 14.5, maxWidth: "72%" }}>{f.name}</h3>
                  <span
                    className="pill"
                    style={
                      isAppendix(f.ref)
                        ? { color: "var(--accent-dark)", background: "var(--accent-tint)" }
                        : { color: "var(--blue-fg)", background: "var(--blue-bg)" }
                    }
                  >
                    {f.ref}
                  </span>
                </div>
                <p className="muted" style={{ fontSize: 12.5, margin: "8px 0 12px" }}>
                  {f.purpose}
                </p>
                <div className="flex wrap" style={{ gap: 10, fontSize: 11.5, color: "var(--text-2)" }}>
                  <span className="flex" style={{ gap: 4 }}>
                    <span className="ms" style={{ fontSize: 14 }}>
                      person
                    </span>
                    {f.owner}
                  </span>
                  <span className="flex" style={{ gap: 4 }}>
                    <span className="ms" style={{ fontSize: 14 }}>
                      folder
                    </span>
                    {f.systems}
                  </span>
                </div>
                <div className="flex wrap" style={{ gap: 6, marginTop: 10 }}>
                  {f.links.map((l) => (
                    <span key={l} className="code">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
      {groups.length === 0 && <p className="muted">No forms match your search.</p>}
    </div>
  );
}
