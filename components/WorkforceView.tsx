"use client";

import { useState } from "react";
import type {
  WfKpi,
  Readiness,
  Gateway,
  TrainingItem,
  Pathway,
  HcaRecord,
} from "@/lib/workforce";

type Tab = "compliance" | "gateways" | "catalog" | "pathways" | "register";
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "compliance", label: "Compliance", icon: "monitoring" },
  { key: "gateways", label: "Onboarding gateways", icon: "footprint" },
  { key: "catalog", label: "Training catalogue", icon: "checklist" },
  { key: "pathways", label: "Qualification pathways", icon: "route" },
  { key: "register", label: "HCA register", icon: "badge" },
];

export default function WorkforceView({
  kpis,
  readiness,
  gateways,
  training,
  pathways,
  hcas,
}: {
  kpis: WfKpi[];
  readiness: Readiness[];
  gateways: Gateway[];
  training: TrainingItem[];
  pathways: Pathway[];
  hcas: HcaRecord[];
}) {
  const [tab, setTab] = useState<Tab>("compliance");
  const [activeHca, setActiveHca] = useState<string | null>(null);

  return (
    <div className="fade">
      <div className="flex wrap" style={{ gap: 8, marginBottom: 20 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`chip${tab === t.key ? " active" : ""}`}
            onClick={() => {
              setTab(t.key);
              setActiveHca(null);
            }}
          >
            <span className="ms" style={{ fontSize: 15, marginRight: 4, verticalAlign: "-3px" }}>
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "compliance" && <Compliance kpis={kpis} readiness={readiness} />}
      {tab === "gateways" && <Gateways gateways={gateways} />}
      {tab === "catalog" && <Catalog training={training} />}
      {tab === "pathways" && <Pathways pathways={pathways} />}
      {tab === "register" && (
        <Register hcas={hcas} activeHca={activeHca} setActiveHca={setActiveHca} />
      )}
    </div>
  );
}

function pctTone(pct: number) {
  return pct >= 95 ? "green" : pct >= 90 ? "amber" : "red";
}

function Compliance({ kpis, readiness }: { kpis: WfKpi[]; readiness: Readiness[] }) {
  const total = readiness.reduce((s, r) => s + r.count, 0);
  return (
    <>
      <div className="section-title" style={{ marginTop: 0 }}>
        Training-compliance indicators
      </div>
      <div className="grid cols-3">
        {kpis.map((k) => {
          const v = parseInt(k.value) || 0;
          return (
            <div key={k.name} className="card">
              <div className="flex between" style={{ alignItems: "flex-start" }}>
                <strong style={{ fontSize: 13.5, maxWidth: "72%" }}>{k.name}</strong>
                <span className={`pill tone-${k.tone}`}>{k.value}</span>
              </div>
              <div className={`bar ${k.tone === "green" ? "" : k.tone}`} style={{ marginTop: 12 }}>
                <span style={{ width: `${v}%` }} />
              </div>
              <div className="flex between" style={{ marginTop: 8, fontSize: 11.5, color: "var(--text-2)" }}>
                <span>Target {k.target}</span>
                <span>prev {k.prev}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="section-title">Workforce readiness mix — {total} staff</div>
      <div className="grid cols-2">
        {readiness.map((r) => (
          <div key={r.label} className="card">
            <div className="flex between" style={{ alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{r.count}</div>
                <strong style={{ fontSize: 14 }}>{r.label}</strong>
              </div>
              <span className={`pill tone-${r.tone}`}>{Math.round((r.count / total) * 100)}%</span>
            </div>
            <p className="muted" style={{ fontSize: 12.5, margin: "8px 0 0" }}>
              {r.desc}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

function Gateways({ gateways }: { gateways: Gateway[] }) {
  return (
    <>
      <div className="section-title" style={{ marginTop: 0 }}>
        Onboarding & competency gateways (HR-14 · HSE Specs 17.x)
      </div>
      <div className="grid cols-2">
        {gateways.map((g) => (
          <div key={g.name} className="card">
            <div className="flex between" style={{ alignItems: "flex-start" }}>
              <div className="flex" style={{ gap: 10 }}>
                <span className="ms" style={{ fontSize: 22, color: "var(--accent)" }}>
                  {g.icon}
                </span>
                <div>
                  <strong style={{ fontSize: 14.5 }}>{g.name}</strong>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {g.gate}
                  </div>
                </div>
              </div>
              <span className="code">Spec {g.spec}</span>
            </div>
            <p style={{ fontSize: 12.5, margin: "10px 0 6px", color: "var(--text-3)" }}>{g.evidence}</p>
            <div className={`bar ${pctTone(g.pct) === "green" ? "" : pctTone(g.pct)}`}>
              <span style={{ width: `${g.pct}%` }} />
            </div>
            <div className="flex between" style={{ marginTop: 8, fontSize: 11.5, color: "var(--text-2)" }}>
              <span>Refresh: {g.refresh}</span>
              <span className={`pill tone-${pctTone(g.pct)}`}>{g.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Catalog({ training }: { training: TrainingItem[] }) {
  return (
    <>
      <div className="section-title" style={{ marginTop: 0 }}>
        Mandatory & service-specific training
      </div>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Training</th>
              <th>Why</th>
              <th>Refresh</th>
              <th style={{ width: 160 }}>Compliance</th>
              <th style={{ width: 70 }}>Due</th>
              <th style={{ width: 70 }}>Expired</th>
            </tr>
          </thead>
          <tbody>
            {training.map((t) => (
              <tr key={t.key}>
                <td style={{ fontWeight: 600 }}>{t.name}</td>
                <td className="muted">{t.why}</td>
                <td className="muted">{t.refresh}</td>
                <td>
                  <div className="flex" style={{ gap: 8 }}>
                    <div className={`bar ${t.tone === "green" ? "" : t.tone}`} style={{ flex: 1 }}>
                      <span style={{ width: `${t.pct}%` }} />
                    </div>
                    <span className={`pill tone-${t.tone}`}>{t.pct}%</span>
                  </div>
                </td>
                <td>{t.due || "—"}</td>
                <td>{t.exp ? <span className="pill tone-red">{t.exp}</span> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Pathways({ pathways }: { pathways: Pathway[] }) {
  return (
    <>
      <div className="section-title" style={{ marginTop: 0 }}>
        Qualification pathways (evaluator view)
      </div>
      <div className="grid cols-2">
        {pathways.map((p) => (
          <div key={p.key} className="card">
            <div className="flex between" style={{ alignItems: "flex-start" }}>
              <h3 style={{ margin: 0, fontSize: 15 }}>{p.name}</h3>
              <span className={`pill tone-${p.tone}`}>{p.count} staff</span>
            </div>
            <div className="muted" style={{ fontSize: 12, margin: "4px 0 10px" }}>
              e.g. {p.example}
            </div>
            <Field label="Minimum requirement" value={p.min} />
            <Field label="Core modules" value={p.core} />
            <Field label="Evidence" value={p.evidence} />
            <Field label="Dementia allocation" value={p.dementia} />
          </div>
        ))}
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-2)" }}>
        {label}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>{value}</div>
    </div>
  );
}

function Register({
  hcas,
  activeHca,
  setActiveHca,
}: {
  hcas: HcaRecord[];
  activeHca: string | null;
  setActiveHca: (id: string | null) => void;
}) {
  const hca = hcas.find((h) => h.id === activeHca);

  if (hca) {
    return (
      <div className="fade">
        <button className="btn" onClick={() => setActiveHca(null)} style={{ marginBottom: 16 }}>
          <span className="ms" style={{ fontSize: 17 }}>
            arrow_back
          </span>
          HCA register
        </button>
        <div className="card">
          <div className="flex between wrap" style={{ gap: 10 }}>
            <div>
              <div className="flex" style={{ gap: 8 }}>
                <span className="code">{hca.id}</span>
                <span className={`pill tone-${hca.statusKey === "green" ? "green" : hca.statusKey}`}>{hca.status}</span>
              </div>
              <h2 style={{ margin: "8px 0 2px", fontSize: 18 }}>{hca.pathway}</h2>
              <div className="muted" style={{ fontSize: 12.5 }}>
                {hca.area} · started {hca.start} · {hca.band}
              </div>
            </div>
            <div className="metric" style={{ textAlign: "right" }}>
              <div className="num" style={{ color: `var(--${hca.statusKey === "green" ? "green" : hca.statusKey}-fg)` }}>
                {hca.compliancePct}%
              </div>
              <div className="lbl">Training compliance</div>
            </div>
          </div>

          <div className="grid cols-2" style={{ marginTop: 8 }}>
            <Field label="Qualification / award" value={hca.award} />
            <Field label="QQI status" value={hca.qqi} />
            <Field label="Target" value={hca.target} />
            <Field label="Dementia allocation" value={hca.dementia} />
          </div>
        </div>

        <div className="section-title">Vetting & compliance checks</div>
        <div className="card" style={{ padding: 0 }}>
          <table className="tbl">
            <tbody>
              {hca.vetting.map((v) => (
                <tr key={v.k}>
                  <td style={{ fontWeight: 600 }}>{v.k}</td>
                  <td>
                    <span className={`pill tone-${v.ok ? "green" : "red"}`}>{v.v}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="section-title">Onboarding gateways</div>
        <div className="grid cols-2">
          {hca.gateways.map((g) => (
            <div key={g.k} className="card flex between" style={{ alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{g.k}</span>
              <span className={`pill tone-${g.tone}`}>{g.v}</span>
            </div>
          ))}
        </div>

        <div className="section-title">Training matrix</div>
        <div className="grid cols-3">
          {hca.training.map((t) => (
            <div key={t.key} className="card flex between" style={{ alignItems: "center", padding: "12px 14px" }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, maxWidth: "64%" }}>{t.name}</span>
              <span className={`pill tone-${t.tone}`}>{t.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflowX: "auto" }}>
      <table className="tbl">
        <thead>
          <tr>
            <th>HCA</th>
            <th>Area</th>
            <th>Pathway</th>
            <th style={{ width: 80 }}>Due</th>
            <th style={{ width: 80 }}>Gaps</th>
            <th style={{ width: 130 }}>Compliance</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {hcas.map((h) => (
            <tr key={h.id} style={{ cursor: "pointer" }} onClick={() => setActiveHca(h.id)}>
              <td style={{ fontWeight: 700 }}>{h.id}</td>
              <td className="muted">{h.area}</td>
              <td className="muted">{h.pathwayShort}</td>
              <td>{h.due || "—"}</td>
              <td>{h.exp ? <span className="pill tone-red">{h.exp}</span> : "—"}</td>
              <td>
                <span className={`pill tone-${h.statusKey === "green" ? "green" : h.statusKey}`}>
                  {h.compliancePct}% · {h.status}
                </span>
              </td>
              <td style={{ textAlign: "right" }}>
                <span className="ms" style={{ color: "var(--text-2)" }}>
                  chevron_right
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
