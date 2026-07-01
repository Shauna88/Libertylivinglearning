"use client";

import { useState } from "react";
import { doStepsFor, type Situation, type FlRole } from "@/lib/frontline";

export default function FrontlineGuide({
  situations,
  roles,
}: {
  situations: Situation[];
  roles: FlRole[];
}) {
  const [roleKey, setRoleKey] = useState(roles[0]?.key ?? "hca");
  const [openId, setOpenId] = useState<string | null>(situations[0]?.id ?? null);
  const role = roles.find((r) => r.key === roleKey)!;

  return (
    <div className="fade">
      {/* role switcher */}
      <div className="section-title" style={{ marginTop: 0 }}>
        Choose your seat — the same situations, your part in each
      </div>
      <div className="flex wrap" style={{ gap: 10, marginBottom: 16 }}>
        {roles.map((r) => {
          const sel = r.key === roleKey;
          return (
            <button
              key={r.key}
              onClick={() => setRoleKey(r.key)}
              className="card"
              style={{
                flex: "1 1 220px",
                display: "flex",
                alignItems: "center",
                gap: 11,
                cursor: "pointer",
                borderColor: sel ? "var(--accent)" : "var(--border)",
                background: sel ? "var(--accent-tint)" : "#fff",
                padding: "13px 15px",
              }}
            >
              <span className="ms" style={{ fontSize: 22, color: "var(--accent-dark)" }}>
                {r.icon}
              </span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 13.5, fontWeight: 800 }}>{r.short}</div>
                <div className="muted" style={{ fontSize: 11 }}>
                  {r.label}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* mission + emergency */}
      <div className="flex wrap" style={{ gap: 14, marginBottom: 20 }}>
        <div
          style={{
            flex: "1.4 1 300px",
            background: "var(--sidebar)",
            color: "#fff",
            borderRadius: 14,
            padding: "18px 20px",
          }}
        >
          <div className="flex" style={{ gap: 9, marginBottom: 8 }}>
            <span className="ms" style={{ fontSize: 20, color: "var(--accent)" }}>
              {role.icon}
            </span>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{role.label}</div>
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.55, color: "#c6dbce", marginBottom: 13 }}>
            {role.mission}
          </div>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: "var(--accent)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 7,
            }}
          >
            What you own
          </div>
          {role.owns.map((o, i) => (
            <div key={i} className="flex" style={{ alignItems: "flex-start", gap: 8, padding: "2px 0", fontSize: 12, color: "#dceae1" }}>
              <span className="ms" style={{ fontSize: 15, color: "var(--accent)", flex: "0 0 15px" }}>
                check
              </span>
              {o}
            </div>
          ))}
        </div>
        <div
          style={{
            flex: "1 1 260px",
            background: "var(--red-bg)",
            border: "1px solid #f2d5cd",
            borderRadius: 14,
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#f6cfc5", display: "grid", placeItems: "center", flex: "0 0 48px" }}>
            <span className="ms" style={{ fontSize: 26, color: "var(--red-fg)" }}>
              emergency
            </span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#9a3322", marginBottom: 3 }}>
              Anyone in immediate danger?
            </div>
            <div style={{ fontSize: 12.5, color: "#7a4438", lineHeight: 1.5 }}>
              Call <strong>999 / 112</strong>
              {" first. Then the supervisor or on-call manager. If it can't wait until morning, it can't wait."}
            </div>
          </div>
        </div>
      </div>

      {/* situations accordion */}
      {situations.map((s) => {
        const isOpen = openId === s.id;
        const doSteps = doStepsFor(s, roleKey);
        return (
          <div key={s.id} className="card" style={{ marginBottom: 10, padding: 0, overflow: "hidden" }}>
            <button
              onClick={() => setOpenId(isOpen ? null : s.id)}
              style={{ width: "100%", textAlign: "left", background: "#fff", border: "none", padding: 16, display: "flex", alignItems: "center", gap: 12 }}
            >
              <span className={`pill tone-${s.tone}`} style={{ flex: "0 0 auto" }}>
                <span className="ms" style={{ fontSize: 15 }}>
                  {s.icon}
                </span>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{s.name}</div>
                <div className="muted" style={{ fontSize: 11.5 }}>
                  {s.cat} · {s.policy}
                </div>
              </div>
              <span className="ms" style={{ fontSize: 22, color: "var(--text-2)" }}>
                {isOpen ? "expand_less" : "expand_more"}
              </span>
            </button>

            {isOpen && (
              <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
                <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
                  {s.whatItIs}
                </p>

                <div className="grid cols-2" style={{ gap: 16, marginTop: 8 }}>
                  <div>
                    <div className="section-title" style={{ margin: "0 0 8px" }}>
                      <span className="ms" style={{ fontSize: 15, color: "var(--accent)", marginRight: 4 }}>
                        visibility
                      </span>
                      Spot it
                    </div>
                    <ul className="prose" style={{ margin: 0 }}>
                      {s.lookFor.map((x, i) => (
                        <li key={i} style={{ fontSize: 12.5 }}>
                          {x}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="section-title" style={{ margin: "0 0 8px" }}>
                      <span className="ms" style={{ fontSize: 15, color: "var(--accent)", marginRight: 4 }}>
                        bolt
                      </span>
                      Do it — {role.short}
                    </div>
                    <ol style={{ paddingLeft: 18, margin: 0 }}>
                      {doSteps.map((x, i) => (
                        <li key={i} style={{ fontSize: 12.5, color: "var(--text-3)", margin: "4px 0" }}>
                          {x}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                <div className="grid cols-2" style={{ gap: 16, marginTop: 8 }}>
                  <div>
                    <div className="section-title" style={{ margin: "0 0 6px" }}>
                      <span className="ms" style={{ fontSize: 15, color: "var(--accent)", marginRight: 4 }}>
                        campaign
                      </span>
                      Tell someone
                    </div>
                    <div className="flex wrap" style={{ gap: 6 }}>
                      {s.whoTell.map((x, i) => (
                        <span key={i} className="pill tone-grey">
                          {x}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="section-title" style={{ margin: "0 0 6px" }}>
                      <span className="ms" style={{ fontSize: 15, color: "var(--accent)", marginRight: 4 }}>
                        edit_note
                      </span>
                      Record
                    </div>
                    <ul className="prose" style={{ margin: 0 }}>
                      {s.whatRecord.map((x, i) => (
                        <li key={i} style={{ fontSize: 12.5 }}>
                          {x}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className={`callout ${s.tone === "red" ? "warn" : "tip"}`} style={{ marginTop: 14, marginBottom: 0 }}>
                  <span className="k">Remember</span>
                  {s.remember}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
