"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const DEMO_ACCOUNTS = [
  { email: "manager@libertyhomecare.ie", role: "Executive / PIC (all areas)" },
  { email: "quality@libertyhomecare.ie", role: "Director of Quality" },
  { email: "hr@libertyhomecare.ie", role: "Director of HR" },
  { email: "csm@libertyhomecare.ie", role: "Client Service Manager" },
  { email: "finance@libertyhomecare.ie", role: "Director of Finance" },
  { email: "recruit@libertyhomecare.ie", role: "Recruitment Manager" },
  { email: "coordinator@libertyhomecare.ie", role: "Care Coordinator" },
  { email: "oncall@libertyhomecare.ie", role: "On-Call Manager" },
  { email: "admin@libertyhomecare.ie", role: "Office Administrator" },
  { email: "hca@libertyhomecare.ie", role: "Healthcare Assistant" },
  { email: "family@libertyhomecare.ie", role: "Client / Family portal" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setBusy(false);
    if (res?.error) {
      setError("Email or password not recognised.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit} autoComplete="off">
        <div className="brand">
          <div className="brand-tile">
            <span className="ms">eco</span>
          </div>
          <div>
            <div className="brand-name">Liberty Living</div>
            <div className="brand-sub" style={{ color: "var(--text-2)" }}>
              Quality & Training Hub
            </div>
          </div>
        </div>
        <h1>Sign in</h1>
        <p className="sub">Access your training, SOPs and quality dashboards.</p>

        {error && <div className="error">{error}</div>}

        <div className="field">
          <label htmlFor="email">Work email</label>
          <input
            id="email"
            name="ll-user"
            className="input"
            type="email"
            autoComplete="off"
            data-lpignore="true"
            data-1p-ignore
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="ll-pass"
            className="input"
            type="password"
            autoComplete="new-password"
            data-lpignore="true"
            data-1p-ignore
            readOnly
            onFocus={(e) => e.currentTarget.removeAttribute("readonly")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <div className="demo-note">
          <b>Staff accounts</b> — click to fill the email, then enter your password:
          <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => {
                  setEmail(a.email);
                }}
              >
                {a.email} — {a.role}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
