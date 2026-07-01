"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type Item = { label: string; icon: string; href?: string; badge?: string; soon?: boolean };
type Group = { label: string; items: Item[] };

export default function Sidebar({
  name,
  role,
  region,
  isOversight,
}: {
  name: string;
  role: string;
  region: string;
  isOversight: boolean;
}) {
  const pathname = usePathname();

  const groups: Group[] = [
    { label: "Overview", items: [{ label: "Dashboard", icon: "space_dashboard", href: "/dashboard" }] },
    {
      label: "Learning",
      items: [
        { label: "Staff Training Hub", icon: "school", href: "/training" },
        { label: "SOP Library", icon: "menu_book", href: "/sops" },
      ],
    },
    {
      label: "Compliance",
      items: [
        { label: "Policy Library", icon: "menu_book", href: "/policies" },
        { label: "Forms & Templates", icon: "description", href: "/forms" },
        { label: "KPIs & Performance", icon: "monitoring", href: "/kpis" },
      ],
    },
    {
      label: "Risk & Safety",
      items: [
        { label: "Complaints", icon: "sms", badge: "3", soon: true },
        { label: "Incidents", icon: "crisis_alert", badge: "2", soon: true },
        { label: "Safeguarding", icon: "verified_user", badge: "2", soon: true },
      ],
    },
    {
      label: "Governance",
      items: [{ label: "Governance", icon: "account_balance", href: "/governance" }],
    },
  ];

  if (isOversight) {
    groups.splice(2, 0, {
      label: "Oversight",
      items: [{ label: "Monitor", icon: "insights", href: "/monitor" }],
    });
  }

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-tile">
          <span className="ms">eco</span>
        </div>
        <div>
          <div className="brand-name">Liberty Living</div>
          <div className="brand-sub">Quality & Training Hub</div>
        </div>
      </div>

      {groups.map((g) => (
        <div className="nav-group" key={g.label}>
          <div className="nav-label">{g.label}</div>
          {g.items.map((it) => {
            const active = it.href && pathname.startsWith(it.href);
            const inner = (
              <>
                <span className="ms">{it.icon}</span>
                <span>{it.label}</span>
                {it.badge && <span className="nav-badge">{it.badge}</span>}
                {it.soon && (
                  <span className="nav-badge" style={{ background: "rgba(255,255,255,0.14)", color: "#cfe0d4" }}>
                    soon
                  </span>
                )}
              </>
            );
            if (it.href) {
              return (
                <Link key={it.label} href={it.href} className={`nav-item${active ? " active" : ""}`}>
                  {inner}
                </Link>
              );
            }
            return (
              <div key={it.label} className="nav-item" style={{ opacity: 0.5, cursor: "default" }}>
                {inner}
              </div>
            );
          })}
        </div>
      ))}

      <div className="sidebar-foot">
        <div className="avatar">{initials}</div>
        <div style={{ minWidth: 0 }}>
          <div className="who">{name}</div>
          <div className="role">
            {role} · {region}
          </div>
        </div>
        <button className="signout" title="Sign out" onClick={() => signOut({ redirectTo: "/login" })}>
          <span className="ms">logout</span>
        </button>
      </div>
    </aside>
  );
}
