"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CarePlanReader from "@/components/CarePlanReader";
import type { CarePlanExtract } from "@/lib/careplan";

const FUNDING = ["HSE HSAS", "HSE Home Support", "Private", "Other"];
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
  const [aiMsg, setAiMsg] = useState("");

  // Pre-fill the form from an AI-read care-delivery form. Only overwrite a field
  // when the reader found a value, so it never clears something already typed.
  function applyExtract(x: CarePlanExtract) {
    const p = x.profile;
    setF((s) => ({
      ...s,
      firstName: p.firstName || s.firstName,
      surname: p.surname || s.surname,
      pref: p.pref || s.pref,
      dob: p.dob || s.dob,
      sex: p.sex || s.sex,
      phone: p.phone || s.phone,
      mobile: p.mobile || s.mobile,
      eircode: p.eircode || s.eircode,
      addr: p.addr || s.addr,
      area: p.area || s.area,
      conditions: x.clinical.conditions.length ? x.clinical.conditions.join(", ") : s.conditions,
      mobility: x.clinical.mobility || s.mobility,
      allergies: x.clinical.allergies || s.allergies,
      gpName: x.gp.name || s.gpName,
      gpPractice: x.gp.practice || s.gpPractice,
      gpPhone: x.gp.phone || s.gpPhone,
      nokName: x.nok[0]?.name || s.nokName,
      nokRel: x.nok[0]?.rel || s.nokRel,
      nokPhone: x.nok[0]?.phone || s.nokPhone,
      keysafe: x.access.keysafe || s.keysafe,
      access: x.access.access || s.access,
    }));
    const sched = x.schedule.reduce((n, d) => n + d.visits.length, 0);
    setAiMsg(
      `Form filled from the care plan. Review every field before saving.` +
        (sched > 0 || x.carePlan.length > 0
          ? ` The ${x.carePlan.length} care domain(s) and ${sched} visit(s) it found are built into the Schedule of Service on the client's record after you create the referral.`
          : "")
    );
  }
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

      <CarePlanReader onApply={applyExtract} applyLabel="Fill the form" context="new referral" />
      {aiMsg && (
        <div className="card" style={{ borderColor: "var(--accent)", background: "var(--accent-bg, var(--bg-2))", marginBottom: 12, fontSize: 12.5, display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span className="ms" style={{ color: "var(--accent)" }} aria-hidden="true">auto_awesome</span>
          <span>{aiMsg}</span>
        </div>
      )}

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
