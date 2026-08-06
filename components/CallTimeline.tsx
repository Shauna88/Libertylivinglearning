import Link from "next/link";
import CallCapture from "@/components/CallCapture";

/**
 * Live calls seen from BOTH perspectives at once: the planned visit window and
 * the actual clock-in / clock-out laid over it on one timeline, so a coordinator
 * can read lateness, overrun and "still on site" at a glance.
 *
 * Presentational only — all times are minutes-since-midnight (Europe/Dublin),
 * computed by the caller. `checkoutMin === null` while `checkinMin` is set means
 * the carer is on site now.
 */
export type CallRow = {
  clientId: string;
  su: string;
  maskedName: string;
  carer: string;
  type: string;
  area: string;
  time: string;
  startMin: number;
  durMin: number;
  checkinMin: number | null;
  checkoutMin: number | null;
  state: string; // raw ECM state for capture controls
  stateLabel: string;
  tone: string;
  unassigned: boolean;
};

function hm(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = ((min % 60) + 60) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function fmtMin(mins: number): string {
  const h = Math.floor(mins / 60), m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

/** Planned-vs-actual variance summary for one call. */
function variance(r: CallRow, nowMin: number): { text: string; tone: string } {
  const pStart = r.startMin;
  const pEnd = r.startMin + r.durMin;
  if (r.unassigned) return { text: "Unassigned", tone: "red" };
  if (r.checkinMin == null) {
    if (nowMin > pEnd) return { text: "No clock-in", tone: "red" };
    if (nowMin >= pStart) return { text: "Awaiting clock-in", tone: "amber" };
    return { text: "Not started", tone: "grey" };
  }
  const lateIn = r.checkinMin - pStart;
  const inLabel = lateIn > 2 ? `${lateIn}m late in` : lateIn < -2 ? `${-lateIn}m early in` : "on time in";
  if (r.checkoutMin == null) return { text: `On site · ${inLabel}`, tone: "green" };
  const delivered = Math.max(0, r.checkoutMin - r.checkinMin);
  const deltaDur = delivered - r.durMin;
  const durLabel = deltaDur > 2 ? `${deltaDur}m over` : deltaDur < -2 ? `${-deltaDur}m short` : "full duration";
  return { text: `${inLabel} · ${durLabel}`, tone: deltaDur < -5 || lateIn > 15 ? "amber" : "grey" };
}

export default function CallTimeline({ rows, nowMin, canCapture = false }: { rows: CallRow[]; nowMin: number; canCapture?: boolean }) {
  return (
    <div className="card" style={{ padding: 0, overflowX: "auto" }}>
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: 60 }}>Time</th>
            <th>Client</th>
            <th>Carer</th>
            <th style={{ minWidth: 240 }}>Planned vs actual</th>
            <th style={{ width: 150 }}>Variance</th>
            <th style={{ width: 140 }}>State</th>
            {canCapture && <th style={{ width: 150 }}>Capture</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const pStart = r.startMin;
            const pEnd = r.startMin + r.durMin;
            const aIn = r.checkinMin;
            const onsite = aIn != null && r.checkoutMin == null;
            const aOut = r.checkoutMin ?? (onsite ? Math.max(nowMin, aIn!) : null);
            const lo = Math.min(pStart, aIn ?? pStart);
            const hi = Math.max(pEnd, aOut ?? pEnd);
            const pad = Math.max(6, Math.round((hi - lo) * 0.12));
            const winLo = lo - pad, winHi = hi + pad;
            const span = Math.max(1, winHi - winLo);
            const pct = (x: number) => Math.max(0, Math.min(100, ((x - winLo) / span) * 100));
            const v = variance(r, nowMin);
            const delivered = aIn != null && r.checkoutMin != null ? Math.max(0, r.checkoutMin - aIn) : null;
            const nowInWin = nowMin >= winLo && nowMin <= winHi;

            return (
              <tr key={`${r.clientId}|${r.time}`}>
                <td><span className="code">{r.time}</span></td>
                <td>
                  <Link href={`/clients/${r.clientId}?tab=schedule`} style={{ fontWeight: 600 }}>{r.maskedName}</Link>
                  <div className="code" style={{ display: "inline-block", marginLeft: 6 }}>{r.su}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{r.type} · {r.area}</div>
                </td>
                <td className="muted">{r.unassigned ? <span className="pill tone-red" style={{ fontSize: 10.5 }}>Unassigned</span> : r.carer}</td>
                <td>
                  <Link href={`/clients/${r.clientId}?tab=schedule`} title="Open this client's weekly roster with actual clock-ins" style={{ display: "block", color: "inherit" }}>
                  <div className="ctl-track">
                    <div className="ctl-plan" style={{ left: `${pct(pStart)}%`, width: `${Math.max(2, pct(pEnd) - pct(pStart))}%` }} />
                    {aIn != null && aOut != null && (
                      <div
                        className={`ctl-actual${onsite ? " onsite" : ""}`}
                        style={{ left: `${pct(aIn)}%`, width: `${Math.max(2, pct(aOut) - pct(aIn))}%`, background: `var(--${r.tone}-fg)` }}
                      />
                    )}
                    {nowInWin && <div className="ctl-now" style={{ left: `${pct(nowMin)}%` }} />}
                  </div>
                  <div className="flex between wrap" style={{ gap: 8, marginTop: 4, fontSize: 11 }}>
                    <span className="muted">Plan {hm(pStart)}–{hm(pEnd)} ({fmtMin(r.durMin)})</span>
                    <span style={{ color: aIn != null ? "var(--text)" : "var(--text-2)" }}>
                      {aIn != null
                        ? <>Actual in {hm(aIn)}{r.checkoutMin != null ? ` · out ${hm(r.checkoutMin)}` : onsite ? " · on site" : ""}{delivered != null ? ` · ${fmtMin(delivered)}` : ""}</>
                        : "No clock-in yet"}
                    </span>
                  </div>
                  </Link>
                </td>
                <td><span className={`pill tone-${v.tone}`} style={{ fontSize: 11 }}>{v.text}</span></td>
                <td><span className={`pill tone-${r.tone}`}>{r.stateLabel}</span></td>
                {canCapture && <td style={{ textAlign: "right" }}><CallCapture clientId={r.clientId} time={r.time} carer={r.carer} state={r.state} /></td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
