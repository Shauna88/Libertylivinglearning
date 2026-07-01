import { SERVICE_KPIS, WF_KPIS, POLICIES, type ServiceKpi } from "@/lib/modules";

function KpiRow({ name, target, current, prev, tone, sub }: {
  name: string;
  target: string;
  current: string;
  prev: string;
  tone: string;
  sub?: string;
}) {
  const pct = parseFloat(current);
  const barPct = Number.isFinite(pct) ? Math.max(4, Math.min(100, pct)) : 60;
  const trend = (() => {
    const c = parseFloat(current), p = parseFloat(prev);
    if (!Number.isFinite(c) || !Number.isFinite(p) || c === p) return null;
    return c > p ? "up" : "down";
  })();
  return (
    <div className="card">
      <div className="flex between" style={{ alignItems: "flex-start" }}>
        <div style={{ maxWidth: "70%" }}>
          <strong style={{ fontSize: 14 }}>{name}</strong>
          {sub && <div className="muted" style={{ fontSize: 11.5 }}>{sub}</div>}
        </div>
        <span className={`pill tone-${tone}`}>{current}</span>
      </div>
      <div className={`bar ${tone === "green" ? "" : tone}`} style={{ marginTop: 12 }}>
        <span style={{ width: `${barPct}%` }} />
      </div>
      <div className="flex between" style={{ marginTop: 8, fontSize: 11.5, color: "var(--text-2)" }}>
        <span>Target {target}</span>
        <span className="flex" style={{ gap: 4 }}>
          {trend && (
            <span className="ms" style={{ fontSize: 14 }}>
              {trend === "up" ? "trending_up" : "trending_down"}
            </span>
          )}
          prev {prev}
        </span>
      </div>
    </div>
  );
}

export default function KpisPage() {
  // live governance KPI computed from the policy register
  const currentDocs = POLICIES.filter((p) => p.status === "current").length;
  const docCompliance = Math.round((currentDocs / POLICIES.length) * 100);

  const groups = [...new Set(SERVICE_KPIS.map((k) => k.group))];
  const byGroup = (g: string): ServiceKpi[] => SERVICE_KPIS.filter((k) => k.group === g);

  const green = SERVICE_KPIS.filter((k) => k.tone === "green").length;
  const amber = SERVICE_KPIS.filter((k) => k.tone === "amber").length;
  const red = SERVICE_KPIS.filter((k) => k.tone === "red").length;

  return (
    <>
      <header className="header">
        <h1>KPIs & Performance</h1>
        <p>HSE Authorisation Scheme quality indicators — target vs current vs previous. Green / amber / red against ratified thresholds.</p>
      </header>
      <div className="body fade">
        <div className="grid cols-3">
          <div className="card metric">
            <div className="num" style={{ color: "var(--green-fg)" }}>{green}</div>
            <div className="lbl">On target (green)</div>
          </div>
          <div className="card metric">
            <div className="num" style={{ color: "var(--amber-fg)" }}>{amber}</div>
            <div className="lbl">Watch (amber)</div>
          </div>
          <div className="card metric">
            <div className="num" style={{ color: "var(--red-fg)" }}>{red}</div>
            <div className="lbl">Off target (red)</div>
          </div>
        </div>

        {groups.map((g) => (
          <section key={g}>
            <div className="section-title">{g}</div>
            <div className="grid cols-3">
              {byGroup(g).map((k) => (
                <KpiRow key={k.name} name={k.name} target={k.target} current={k.current} prev={k.prev} tone={k.tone} sub={`${k.owner}`} />
              ))}
            </div>
          </section>
        ))}

        <div className="section-title">Workforce & training</div>
        <div className="grid cols-3">
          <div className="card metric">
            <div className="num" style={{ color: docCompliance >= 95 ? "var(--green-fg)" : "var(--amber-fg)" }}>
              {docCompliance}%
            </div>
            <div className="lbl">Documents within review date</div>
            <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
              {currentDocs} of {POLICIES.length} controlled documents current
            </div>
          </div>
          {WF_KPIS.map((k) => (
            <KpiRow key={k.name} name={k.name} target={k.target} current={k.value} prev={k.prev} tone={k.tone} />
          ))}
        </div>

        <p className="muted" style={{ fontSize: 11.5, marginTop: 24 }}>
          Targets and thresholds are Liberty Living&apos;s ratified figures (KPI Targets &amp; Baselines). Current and
          previous values shown here are illustrative pending the live CRM / HR data feed; the Documents-within-review
          metric is computed live from the Policy Library register.
        </p>
      </div>
    </>
  );
}
