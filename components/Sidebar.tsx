"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";

type Item = { label: string; icon: string; href?: string; badge?: string; soon?: boolean; exact?: boolean };
type Group = { label: string; items: Item[] };

export default function Sidebar({
  name,
  role,
  region,
  isOversight,
  isCrm = false,
  isFinance = false,
  isRecruit = false,
  isImprovement = false,
  isWorkforce = false,
  isQualityMgmt = false,
  isDemo = false,
  canSeeAllRegisters = true,
  hubLabel = "Improvement & Training",
  openCounts = {},
}: {
  name: string;
  role: string;
  region: string;
  isOversight: boolean;
  isCrm?: boolean;
  isFinance?: boolean;
  isRecruit?: boolean;
  isImprovement?: boolean;
  isWorkforce?: boolean;
  isQualityMgmt?: boolean;
  isDemo?: boolean;
  canSeeAllRegisters?: boolean;
  hubLabel?: string;
  openCounts?: Record<string, number>;
}) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleGroup = (label: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  const badge = (kind: string) => {
    const n = openCounts[kind];
    return n ? String(n) : undefined;
  };

  // The shareable team-demo login gets a curated, read-only tour — only the
  // areas we want to show, nothing else.
  const demoGroups: Group[] = [
    {
      label: "Overview",
      items: [
        { label: "Daily dashboard", icon: "space_dashboard", href: "/dashboard" },
        { label: "Questions & answers", icon: "help", href: "/demo-guide" },
      ],
    },
    {
      label: "Learning",
      items: [
        { label: "Front-line Guide", icon: "health_and_safety", href: "/frontline" },
        { label: "Staff Training Hub", icon: "school", href: "/training" },
        { label: "SOP Library", icon: "menu_book", href: "/sops" },
      ],
    },
    {
      label: "Risk & Safety",
      items: [
        { label: "Complaints", icon: "forum", href: "/complaints", badge: badge("complaint") },
        { label: "Incidents", icon: "crisis_alert", href: "/incidents", badge: badge("incident") },
      ],
    },
  ];

  const overviewItems: Item[] = [{ label: "Dashboard", icon: "space_dashboard", href: "/dashboard" }];
  if (role === "Healthcare Assistant") overviewItems.push({ label: "My working week", icon: "calendar_month", href: "/my-week" });
  overviewItems.push({ label: "Messages", icon: "forum", href: "/messages" });
  if (isCrm || isOversight || isWorkforce) overviewItems.push({ label: "Notifications", icon: "notifications_active", href: "/notifications" });
  overviewItems.push({ label: "Time off", icon: "beach_access", href: "/time-off" });

  const groups: Group[] = [
    { label: "Overview", items: overviewItems },
    {
      label: "Learning",
      items: [
        { label: "Staff Training Hub", icon: "school", href: "/training" },
        { label: "Front-line Guide", icon: "health_and_safety", href: "/frontline" },
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
      label: canSeeAllRegisters ? "Risk & Safety" : "Raise a concern",
      items: [
        ...(canSeeAllRegisters ? [{ label: "Master log", icon: "inventory_2", href: "/registers" }] : []),
        { label: canSeeAllRegisters ? "Complaints" : "Raise a complaint", icon: "forum", href: "/complaints", badge: badge("complaint") },
        { label: canSeeAllRegisters ? "Incidents" : "Report an incident", icon: "crisis_alert", href: "/incidents", badge: badge("incident") },
        { label: "Safeguarding", icon: "shield", href: "/safeguarding", badge: badge("safeguarding") },
      ],
    },
    {
      label: "Governance",
      items: [{ label: "Governance", icon: "account_balance", href: "/governance" }],
    },
  ];

  // Workforce group — recruitment and/or the HR compliance view.
  const workforceItems: Item[] = [];
  if (isWorkforce) workforceItems.push({ label: "Workforce & Training", icon: "groups", href: "/workforce" });
  // Carer directory + compliance: shown to workforce roles here, or to CRM roles in the CRM group below.
  if (isWorkforce && !isCrm) {
    workforceItems.push({ label: "Carer directory", icon: "badge", href: "/carers" });
    workforceItems.push({ label: "Compliance & reviews", icon: "verified_user", href: "/compliance" });
  }
  if (isRecruit) workforceItems.push({ label: "Recruitment", icon: "person_search", href: "/recruitment" });
  if (workforceItems.length) groups.push({ label: "Workforce", items: workforceItems });

  if (isFinance) {
    groups.push({
      label: "Finance",
      items: [
        ...(!isOversight ? [{ label: "Analytics", icon: "query_stats", href: "/analytics" }] : []),
        { label: "Finance overview", icon: "account_balance_wallet", href: "/finance", exact: true },
        { label: "Client invoicing", icon: "receipt_long", href: "/finance/invoicing" },
        { label: "Rate schemes", icon: "payments", href: "/finance/rate-schemes" },
        { label: "HCA pay & hours", icon: "wallet", href: "/finance/pay" },
      ],
    });
  }

  if (isCrm) {
    groups.splice(1, 0, {
      label: "Client Management · CRM",
      items: [
        { label: "Live monitor", icon: "sensors", href: "/live-monitor" },
        { label: "Live calls · ECM", icon: "how_to_reg", href: "/ecm" },
        { label: "Client register", icon: "contacts", href: "/clients" },
        { label: "Rostering", icon: "edit_calendar", href: "/roster" },
        { label: "Carer directory", icon: "badge", href: "/carers" },
        { label: "Compliance & reviews", icon: "verified_user", href: "/compliance" },
        { label: "Call log", icon: "phone_missed", href: "/call-log" },
        { label: "Bulk import", icon: "upload_file", href: "/clients/import" },
      ],
    });
  }

  // Management group — the Improvement & Training hub (label is role-aware) and
  // the oversight tools, each shown only to roles that hold the capability.
  const mgmtItems: Item[] = [];
  if (isImprovement) mgmtItems.push({ label: "Improvement & Training", icon: "model_training", href: "/improvement" });
  // Audits & QIP is a Quality-department function (not HR).
  if (isQualityMgmt) mgmtItems.push({ label: "Audits & QIP", icon: "fact_check", href: "/audits" });
  if (isOversight) {
    mgmtItems.push({ label: "Analytics", icon: "query_stats", href: "/analytics" });
    mgmtItems.push({ label: "Monitor", icon: "insights", href: "/monitor" });
    mgmtItems.push({ label: "PII access log", icon: "policy", href: "/access-log" });
    mgmtItems.push({ label: "Data protection", icon: "encrypted", href: "/data-protection" });
  }
  if (mgmtItems.length) {
    groups.splice(isCrm ? 3 : 2, 0, { label: hubLabel, items: mgmtItems });
  }

  const navGroups = isDemo ? demoGroups : groups;

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <header className="mobile-topbar">
        <button className="hamburger" aria-label="Open menu" onClick={() => setNavOpen(true)}>
          <span className="ms" aria-hidden="true">menu</span>
        </button>
        <div className="mobile-topbar-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/liberty-living-logo.png" alt="Liberty Living Homecare" />
        </div>
      </header>
      <div className={`sidebar-overlay${navOpen ? " show" : ""}`} onClick={() => setNavOpen(false)} />
      <aside className={`sidebar${navOpen ? " open" : ""}`} role="navigation" aria-label="Main">
        <div className="brand-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/liberty-living-logo.png" alt="Liberty Living Homecare" />
        </div>

      {navGroups.map((g) => {
        const isCollapsed = collapsed.has(g.label);
        // A group is "active" if the current page lives in it — never collapse that one visually.
        const groupActive = g.items.some((it) => it.href && (pathname === it.href || pathname.startsWith(it.href + "/")));
        return (
        <div className={`nav-group${isCollapsed && !groupActive ? " collapsed" : ""}`} key={g.label}>
          <button className="nav-label" onClick={() => toggleGroup(g.label)} aria-expanded={!isCollapsed || groupActive}>
            <span>{g.label}</span>
            <span className="ms nav-chevron" aria-hidden="true">{isCollapsed && !groupActive ? "expand_more" : "expand_less"}</span>
          </button>
          {(!isCollapsed || groupActive) && g.items.map((it) => {
            const active =
              it.href && (it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(it.href + "/"));
            const inner = (
              <>
                <span className="ms" aria-hidden="true">{it.icon}</span>
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
                <Link key={it.label} href={it.href} className={`nav-item${active ? " active" : ""}`} onClick={() => setNavOpen(false)}>
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
        );
      })}

      <div className="sidebar-foot">
        <div className="avatar">{initials}</div>
        <div style={{ minWidth: 0 }}>
          <div className="who">{name}</div>
          <div className="role">
            {role} · {region}
          </div>
        </div>
        <button className="signout" title="Sign out" aria-label="Sign out" onClick={() => signOut({ redirectTo: "/login" })}>
          <span className="ms" aria-hidden="true">logout</span>
        </button>
      </div>
      </aside>
    </>
  );
}
