import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PORTAL_ROLE } from "@/lib/db";
import PortalSignOut from "@/components/PortalSignOut";

/**
 * Standalone shell for the read-only client/family portal — deliberately NOT the
 * staff sidebar shell. Only the Client / Family role reaches it; staff logins are
 * bounced back to their dashboard.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== PORTAL_ROLE) redirect("/dashboard");

  return (
    <div className="portal">
      <header className="portal-top">
        <div className="portal-brand">
          <div className="brand-tile">
            <span className="ms">eco</span>
          </div>
          <div>
            <div className="brand-name">Liberty Living Homecare</div>
            <div className="brand-sub">Family & client portal</div>
          </div>
        </div>
        <PortalSignOut />
      </header>
      <main className="portal-wrap">{children}</main>
      <footer className="portal-foot">
        Liberty Living Homecare · This portal is read-only and shows only your own care.
      </footer>
    </div>
  );
}
