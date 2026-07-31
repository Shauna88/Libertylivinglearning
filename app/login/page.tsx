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
  { email: "demo@libertyhomecare.ie", role: "Team demo (read-only tour)" },
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
        <div style={{ marginBottom: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/liberty-living-logo.png" alt="Liberty Living Homecare" style={{ height: 46, width: "auto", maxWidth: "100%" }} />
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
          <b>Staff accounts</b> — pick a department to fill the email, then enter your password:
          <select
            className="input"
            style={{ marginTop: 6 }}
            value={DEMO_ACCOUNTS.some((a) => a.email === email) ? email : ""}
            onChange={(e) => setEmail(e.target.value)}
          >
            <option value="">Select a department login…</option>
            {DEMO_ACCOUNTS.map((a) => (
              <option key={a.email} value={a.email}>
                {a.role} — {a.email}
              </option>
            ))}
          </select>
        </div>
      </form>
    </div>
  );
}
