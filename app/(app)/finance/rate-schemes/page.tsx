import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { FINANCE_ROLES, type Role } from "@/lib/db";
import { RATE_SCHEMES, money } from "@/lib/finance";

export default async function RateSchemesPage() {
  const session = await auth();
  if (!FINANCE_ROLES.includes(session!.user.role as Role)) redirect("/dashboard");

  return (
    <>
      <header className="header">
        <h1>Rate schemes</h1>
        <p>The billing rates by CHO area and funder — weekday, Saturday, Sunday and bank-holiday.</p>
      </header>
      <div className="body fade">
        <div className="grid cols-2">
          {RATE_SCHEMES.map((s) => (
            <div key={s.id} className="card" style={{ borderTop: `4px solid ${s.color}` }}>
              <div className="flex between" style={{ alignItems: "flex-start" }}>
                <div>
                  <div className="flex" style={{ gap: 8 }}>
                    <span className="code">{s.code}</span>
                    <strong style={{ fontSize: 15 }}>{s.name}</strong>
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    {s.pod}
                  </div>
                </div>
                <span className="pill tone-blue">{s.funder}</span>
              </div>
              <div className="grid cols-2" style={{ gap: 8, marginTop: 14 }}>
                {[
                  ["Weekday", s.rates.wd],
                  ["Saturday", s.rates.sat],
                  ["Sunday", s.rates.sun],
                  ["Bank holiday", s.rates.bh],
                ].map(([label, rate]) => (
                  <div key={label as string} className="card" style={{ padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{money(rate as number)}</div>
                    <div className="muted" style={{ fontSize: 11 }}>
                      {label} /hr
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
