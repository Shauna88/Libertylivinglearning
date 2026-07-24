"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FUNDING = ["HSE HSAS", "Fair Deal (NHSS)", "HSE Home Support", "Private", "Other"];
const SEX = ["", "Female", "Male", "Other / prefer not to say"];

type F = Record<string, string>;

// Defined at module level so inputs keep focus between keystrokes.
function TextField({
  label,
  value,
  onChange,
  type = "text",
  req = false,
  list,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  req?: boolean;
  list?: string;
  placeholder?: string;
}) {
  return (
    <div className="field">
      <label>{label}{req && <span style={{ color: "var(--red-fg)" }}> *</span>}</label>
      <input className="input" type={type} list={list} placeholder={placeholder} value={value} onChange={onChange} required={req} />
    </div>
  );
}

export default function ReferralForm({ areas, coordinators }: { areas: string[]; coordinators: string[] }) {
  const router = useRouter();
  const [f, setF] = useState<F>({ funding: "HSE HSAS" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));
  const tf = (label: string, k: string, opts: { type?: string; req?: boolean; list?: string; placeholder?: string } = {}) => (
    <TextField label={label} value={f[k] ?? ""} onChange={set(k)} {...opts} />
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/clients/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Could not create the referral.");
        return;
      }
      router.push(`/clients/${data.id}`);
    } catch {
      setErr("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="fade" onSubmit={submit}>
      {err && <div className="card" style={{ borderColor: "var(--red-fg)", color: "var(--red-fg)", marginBottom: 12 }}>{err}</div>}

      <datalist id="areas">{areas.map((a) => <option key={a} value={a} />)}</datalist>
      <datalist id="coordinators">{coordinators.map((c) => <option key={c} value={c} />)}</datalist>

      <div className="section-title" style={{ marginTop: 0 }}>Person</div>
      <div className="card">
        <div className="grid cols-3" style={{ gap: 12 }}>
          {tf("First name", "firstName", { req: true })}
          {tf("Surname", "surname", { req: true })}
          {tf("Preferred name", "pref", { placeholder: "e.g. what they like to be called" })}
          {tf("Date of birth", "dob", { type: "date" })}
          <div className="field">
            <label>Sex</label>
            <select className="input" value={f.sex ?? ""} onChange={set("sex")}>
              {SEX.map((x) => <option key={x} value={x}>{x || "—"}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="section-title">Contact & address</div>
      <div className="card">
        <div className="grid cols-3" style={{ gap: 12 }}>
          {tf("Phone", "phone")}
          {tf("Mobile", "mobile")}
          {tf("Eircode", "eircode")}
        </div>
        {tf("Address", "addr")}
      </div>

      <div className="section-title">Care package</div>
      <div className="card">
        <div className="grid cols-3" style={{ gap: 12 }}>
          {tf("Area / pod", "area", { req: true, list: "areas", placeholder: "e.g. Dublin North" })}
          <div className="field">
            <label>Funding stream</label>
            <select className="input" value={f.funding ?? ""} onChange={set("funding")}>
              {FUNDING.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          {tf("Weekly hours", "hoursWk", { placeholder: "e.g. 14h 00m" })}
          {tf("Requested start date", "startDate", { type: "date" })}
          {tf("Coordinator", "coordinator", { list: "coordinators" })}
        </div>
      </div>

      <div className="section-title">Clinical</div>
      <div className="card">
        <div className="grid cols-3" style={{ gap: 12 }}>
          {tf("Allergies", "allergies", { placeholder: "None recorded" })}
          {tf("Mobility", "mobility", { placeholder: "e.g. Zimmer frame, falls risk" })}
        </div>
        {tf("Conditions (comma-separated)", "conditions", { placeholder: "e.g. Dementia, Diabetes, COPD" })}
      </div>

      <div className="section-title">GP</div>
      <div className="card">
        <div className="grid cols-3" style={{ gap: 12 }}>
          {tf("GP name", "gpName")}
          {tf("Practice", "gpPractice")}
          {tf("GP phone", "gpPhone")}
        </div>
      </div>

      <div className="section-title">Next of kin</div>
      <div className="card">
        <div className="grid cols-3" style={{ gap: 12 }}>
          {tf("Name", "nokName")}
          {tf("Relationship", "nokRel", { placeholder: "e.g. Daughter" })}
          {tf("Phone", "nokPhone")}
        </div>
      </div>

      <div className="section-title">Home & access</div>
      <div className="card">
        <div className="grid cols-3" style={{ gap: 12 }}>
          {tf("Key safe", "keysafe", { placeholder: "e.g. Front porch — code on file" })}
          {tf("Access notes", "access")}
        </div>
      </div>

      <div className="section-title">Referral notes</div>
      <div className="card">
        <textarea className="input" rows={3} style={{ resize: "vertical" }} placeholder="Reason for referral, source, and anything the assessing coordinator should know…" value={f.referralNote ?? ""} onChange={set("referralNote")} />
      </div>

      <div className="flex" style={{ gap: 10, marginTop: 18 }}>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Creating…" : "Create referral"}
        </button>
        <button type="button" className="btn" onClick={() => router.push("/clients")}>Cancel</button>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        The client is created as a <strong>New referral</strong>. You&rsquo;ll go straight to their record to build the Schedule of Service and care plan.
      </p>
    </form>
  );
}
