# Liberty Living — Operations Platform: design & build roadmap

This document is the detailed engineering design for evolving the app from a QMS/Training
Hub into the full **five-domain operations platform** described in the build-3 handoff.
The authoritative design spec and prototype live in [`design/`](./design/)
(`HANDOFF_SPEC.md`, `GETTING_STARTED_CLAUDE_CODE.md`, `Liberty Living QMS.dc.html`, and the
`training-*.js` data modules). This file maps that spec onto **our actual codebase** and
sequences the remaining work.

> **Status in one line:** the QMS + Training domains are built and deployed (Next.js +
> Postgres). The CRM, Finance, Recruitment, Improvement-hub-with-routing, full 9-role model
> and client portal are **designed here but not yet built** — they are the roadmap below.

---

## 1. What exists today (built & deployed)

| Area | Status |
|---|---|
| Auth (Auth.js credentials, JWT, roles) | ✅ built — `auth.ts`, `auth.config.ts` |
| Postgres data layer (idempotent seed) | ✅ built — `lib/db.ts` |
| Training Hub: 39 courses, 5 pathways, course player, **server-scored** completions, certificates | ✅ built |
| Manager Monitor (live completion) | ✅ built |
| SOP Library (70), Front-line Guide (role lenses) | ✅ built |
| Policy Library (42), Forms (22), KPIs, Governance | ✅ built |
| **Audits & QIP** — 6-audit annual programme (section checklists + triggers), live Quality Improvement Plan (`qip_actions`), audit lifecycle & principles | ✅ built |
| Risk registers — Complaints/Incidents/Safeguarding (intake + list) | ✅ built (basic) |
| Workforce & Training (HR view, HCA competency matrix) | ✅ built |
| **CRM core** — client register (status chips, search, masked names), **editable client profile** (identity, care package, **editable care-plan tasks**, **care notes/diary**, **documents register**, schedule), **PII reveal-gate + `pii_access_log`** | ✅ built |
| **CRM scheduling** — live visit monitor (time-classified), **interactive rostering** (allocate / reassign / unallocate, cover overrides, temp→permanent change with **CSM approval**), call log | ✅ built |
| **Improvement hub** — issue review + **sign-off**, **department routing**, corrective training/SOP pushes, assignment log | ✅ built |
| **Finance** — rate schemes, client invoicing (from delivered visits × scheme rates, with drill-down), HCA pay & hours, margin | ✅ built |
| **Recruitment** — hiring KPIs, pipeline funnel, candidate tracker (by initials), vetting & checks (Garda/NVB, references, RTW), onboarding-training gateways, onboarding checklist template | ✅ built |
| **Client / family portal** — read-only `/portal` (own weekly schedule, care team, care summary), standalone shell, `client`-role login linked to a client record | ✅ built |
| **Data protection hub** — `/data-protection` (oversight): access register, general `audit_log` (logins, PII reveals, sign-offs, assignments, register/call events), DSAR export (per-client JSON, logged), retention schedule, DPO + hardening roadmap | ✅ built |

**The full nine-role model is built** (`lib/roles.ts`): Executive/PIC, Director of Quality,
Director of HR, Client Service Manager, Director of Finance, Recruitment Manager, Care
Coordinator, Healthcare Assistant, and the read-only Client / Family portal role — plus
Office Administrator and On-Call Manager. Each role has a **capability set** and a
**department**; the gate arrays, sidebar, Improvement-hub scope and dashboard all derive from
it. See §3.

---

## 2. Target architecture (unchanged direction, wider surface)

- **Next.js 16** App Router + TypeScript. **Auth.js** credentials + **2FA for manager/director roles** (to add).
- **Postgres** (EU region) — everything through `lib/db.ts` async helpers.
- **File storage bucket** (EU, access-controlled) for per-client documents & policy/SOP PDFs (to add — e.g. Supabase Storage / S3).
- **Row-level access + audit logging** for special-category (health) data — the prototype's
  **PII reveal-gate** (`llh_pii_log`) becomes real: mask identifiable client data until a
  reason is given, and log every reveal.

---

## 3. Roles & access (9 roles)

One codebase; nav + dashboard gated **server-side** by role. Map to an `AppRole` claim.

| Role key | Person (seed) | Sees |
|---|---|---|
| `exec` | Executive / PIC | Everything, all areas |
| `quality` | Claire Leavy (Dir. Quality) | QMS, 3 registers, KPIs, audits/QIP, forms, governance, **Quality Improvement & Training hub** (org-wide issue review + routing) |
| `hr` | Laura Souza (Dir. HR) | Workforce, staff files, recruitment, governance, **HR Improvement & Training hub** |
| `csm` | Mary James (Client Service Mgr) | Full CRM, registers, team training |
| `finance` | Lawrenie De Souza (Dir. Finance) | Finance + client CRM (billing context) |
| `recruit` | Karen McLoughlin | Recruitment pipeline, training, forms |
| `hca` | field carer | Own dashboard + Training Hub; can **raise** complaints/incidents/safeguarding + **request** holiday; no other staff's records |
| `coord` | Care Coordinator | HCA-staff + CRM (cover board, monitor, scheduling, rosters, call log, bulk import) |
| `client` | client/family | **Read-only** portal: own weekly schedule + assigned carers |

Implementation: extend the `Role` union in `lib/db.ts`, add a `nav allowlist` per role
(a `ROLE_NAV: Record<AppRole, NavKey[]>` map), gate each route in its server component
(pattern already used by `/monitor` and `/workforce`), and drive the sidebar from the
allowlist. Note: **training pathway role** (learner pathway) and **app role** (access) are
distinct concepts — keep them separate.

---

## 4. Data model (target)

Every prototype `localStorage` key maps to a real table. Reference content is seeded from
the data modules / prototype; sample people/records are demo data.

**People & orgs**
- `staff` — `HCA-###`, name, email, phone, app_role, pathway_role, CHO area, employment status, created_at.
- `clients` (service users) — `CL-###`/`SU-####`, name, pref, dob, sex, address, eircode, phones, area, funder (HSE HSAS / Fair Deal / Private), package, weekly hours, start date, coordinator (`csm`), status, GP, next-of-kin[], keysafe/access, home-risk[], conditions[], mobility, allergies, carers[], flags[], review due/tone. **Special-category — restrict + audit.**

**Care delivery / CRM** (prototype keys → tables)
- `visits`/`schedule` — client_id, day, time, dur, type, carer, tasks[], status (`upcoming/enroute/inprogress/done/overdue/missed`).
- `cover_assignments` (`llh_assign`) — `clientId|day|time → carer` overrides.
- `permanent_change_requests` (`llh_permreq`) — coordinator cover promoted to permanent, CSM-approved.
- `care_plans`/`care_tasks` (`llh_tasks`) — per-client, by care domain.
- `care_notes` (`llh_diary`) — dated notes, category + tone.
- `client_documents` (`llh_client_docs`) — on-file/expiring controlled docs.
- `client_special_instructions` (`llh_cinfo`).
- `call_log` — missed/late/no-show events (feeds Cover board + Live monitor).

**Quality & risk**
- `complaints` / `incidents` / `safeguarding_concerns` — each with owning **department** + status + SLA (QA-03/QA-13/HS-23). *(Registers exist; add department + schema-driven record drawer.)*
- `issue_signoffs` (`llh_signoffs`) — outcome, review note, corrective actions, signed_by, ts. **The auditable "reviewed & acted" record.**
- `issue_routing` (`llh_routes`) — `kind:id → {dept, by, at}`; overrides default dept so it surfaces in that dept's inbox.
- `staff_submissions` (`llh_submissions`) — staff-lodged complaints/incidents/safeguarding/holiday. Intake feed into registers.

**Training** (built)
- `courses`/`course_content`, `sops`, `pathways`, `enrollments`/`assignments` (`llh_assignments` — pushes to audiences/individuals + note + due), `completions` (server-scored, ≥70%).

**Finance**
- `rate_schemes` — by CHO area/funder: weekday/Sat/Sun/bank-holiday rates.
- `invoices` — per client, delivered visits × scheme rates.
- `pay_runs` — HCA payroll hours from worked visits.

**Cross-cutting**
- `pii_access_log` (`llh_pii_log`) — who revealed identifiable data, when, why.
- `audit_log` — general change trail (recommended).

---

## 5. Module specs (target screens)

Sidebar shell (264px dark-green `#16352A`) + sticky header; nav groups filtered by role.

- **CRM** — Cover board (today's gaps/red triage), Live monitor (visit states), **Client register** (grouped **By area** with card view + Table toggle, area & status facets, search, PII gate → client profile: overview / schedule / care plan tasks by domain / care notes / documents / carers / flags), **New referral intake** (`/clients/new`), Scheduling + Daily/Carer roster + By area (cover overrides → CSM approval), **Carer directory** (`/carers` — DB-backed carer records with home area, travel radius, skills, hours; add/edit; powers carer-matching; **open a carer → `/carers/[id]`** for their profile + hours/clients summary + full **working week** across every client, cards + table), Call log, Bulk import (CSV + column mapping + template), **PII gate**.
- **Front-line (HCA)** — **My working week** (`/my-week`) — the carer's own Schedule of Service across every client (base + cover overrides), as day cards and a Time × Mon–Sun **table overview**; cover-only calls badged; client names masked.
- **QMS** — Policy Library, Forms, KPIs, Audits & QIP, the 3 registers with schema-driven record drawer (NIMS ref, proportionate category, open disclosure, external notification).
- **Improvement & Training hubs** (HR + Quality instances of one workbench, 3 tabs): *Issues to action* (HR sees HR-routed; Quality sees all open) → **Review & sign off** (outcome + note + corrective actions: refresher course / push SOP / schedule HR-08 supervision / **route to department**) ; *Push training & SOPs* (audiences and/or named individuals + note + due) ; *Assignment log* (with withdraw).
- **Staff Training Hub** (built) + *Assigned to you* feed from pushes.
- **Workforce** (built) + **Recruitment** (sourcing → vetting → references → RTW → onboarding-ready; checklist template in prototype `recruitChecklistTemplate()`).
- **Finance** — overview, client invoicing, rate schemes, HCA pay & hours.
- **Governance** (built), **Data export** (CSV/JSON + data dictionary).

---

## 6. Build roadmap (phased)

Ordered for incremental, shippable delivery. Each phase = its own PR, verified against Postgres.

1. **9-role foundation** — ✅ **built.** `lib/roles.ts` is the single source of truth: each role has a **capability set** (`crm` / `oversight` / `finance` / `recruit` / `improvement` / `workforce`), a **department**, and a **hub scope**. The gate arrays (`CRM_ROLES`, `OVERSIGHT_ROLES`, `FINANCE_ROLES`, `RECRUIT_ROLES`, `IMPROVEMENT_ROLES`, `WORKFORCE_ROLES`) derive from it; the sidebar is capability-driven with a **role-aware hub label** ("HR Management" vs "Quality Management"); the **Improvement hub is department-scoped** (Quality/Exec/CSM see every open issue, Director of HR sees only HR-routed issues — verified: routing an incident to HR makes it appear in the HR director's inbox); and the dashboard shows each role's remit, quick-links and a department issue inbox. One demo login per role is seeded.
2. **CRM core** — ✅ **built.** `clients` + `pii_access_log` tables; Client register (`/clients` — status chips, search, PII-masked names); **editable** client profile (`/clients/[id]` — identity, care package, schedule, plus the **Schedule of Service as a weekly overview** with a **Cards / Table view toggle** (the Table view is a roster-style Time × Mon–Sun grid). **Temporary changes need no approval:** a coordinator can **reassign a call to another carer for this week only**, or **unassign it with a required reason** (sick / no-show / cancelled / hospital / reallocating cover / staffing change / other) — both applied via `cover_assignments` and reverting to the base plan next week. **Only a permanent (ongoing) carer change needs CSM sign-off:** a coordinator sends a request with a justification (`permanent_change_requests`, shown "awaiting CSM") and the CSM approves/declines inline; an approval rewrites the base Schedule of Service (`set_schedule_carer`) and clears the one-week cover slot. **Carer matching** ranks the carer directory (`data/qms-carers.json`, `lib/carers.ts`) for each client by **travel radius**, **skills matched to the client's conditions**, and **hours free this week**, with reasons/warnings; the best-matched carers surface as a "Suggested carers" card and as a "Suggested" group (with % match) in every carer dropdown. A client with **no schedule yet** gets a "Set up the original Schedule of Service" prompt with the structural editor opened; CSM/managers also get an "Edit plan structure" editor to add/remove calls and change times/tasks; saving recomputes the care team — **editable care-plan tasks by domain**, a DB-backed **care notes/diary** (`care_notes`, category + tone) and a **documents register** (`client_documents`, status + expiry), all via `/api/clients/[id]` and audited); **PII reveal-gate** (`/api/pii/reveal`) + **access log** (`/access-log`, oversight-only). Seeded from the prototype `buildClients()` (`data/qms-clients.json`).
3. **CRM scheduling** — ✅ **built.** Live visit monitor (`/live-monitor` — today's visits derived from schedules, statuses classified live against the clock, cover overrides applied), and an **interactive rostering cockpit** (`/roster`): day tabs, gaps-to-cover triage, By-carer / By-area / All-visits views, and inline **allocate / reassign / unallocate** of every visit (`cover_assignments` via `/api/cover`). The view follows the prototype's design: summary tiles, an **unassigned-calls** section with **"free now" carer suggestions**, a **timeline** (time axis + a red Unassigned lane + one lane per carer with positioned call blocks), and a **staff-availability** panel showing each carer's spare capacity. A coordinator can promote a temporary cover to permanent, which raises a **CSM approval** request (`permanent_change_requests` via `/api/perm-req`); on approval the change is folded into the base Schedule of Service. The **call log** (`/call-log`) carries the full event model — missed (with cause: carer no-show / sick / late), cancelled (client / office), extra visit, and hospital / respite **pauses** (date ranges) — each with a follow-up state (resolve / reopen / delete) and the default billing/pay treatment (`lib/callevents.ts`). *Still to add: CSV bulk import.*
4. **Registers + Improvement hubs** — ✅ **built.** `/improvement` (oversight): issues-to-action with department filter, **Review & sign off** (`issue_signoffs`) with outcome/note, **department routing** (`issue_routing`) that moves the issue into a department's inbox, corrective training/SOP pushes (`assignments`), and an assignment log with withdraw. The three registers now carry a **schema-driven regulatory record drawer** (`lib/recordfields.ts`, stored in `register_entries.record_json`): the mandated fields per kind — incidents (NIMS reference, proportionate category, open disclosure, external notification, review level), complaints (how received, severity grade, 5-day acknowledgement, outcome, ombudsman, QIP), safeguarding (category of abuse, preliminary screening, HSE SPT / Gardaí / HIQA notification, designated officer, safeguarding plan) — with a per-record completeness count, editable by `IMPROVEMENT_ROLES` via `PATCH /api/registers/[kind]`. The HR-scoped hub instance is also live (see §3).
5. **Finance** — ✅ **built.** `/finance` (overview: billed / payroll / margin + per-scheme breakdown), `/finance/rate-schemes` (6 CHO/funder schemes), `/finance/invoicing` (+ per-client drill-down with weekly lines), `/finance/pay` (HCA pay & hours with weekend/BH premiums). Computed live from client schedules × rate cards (`lib/finance.ts`), `FINANCE_ROLES`-gated.
6. **Recruitment + client portal** — ✅ **built.** *Recruitment:* `/recruitment` (`RECRUIT_ROLES`-gated): hiring KPIs, pipeline funnel, candidate tracker (initials only), vetting & checks (Garda/NVB, references ×2, right-to-work), onboarding-training gateways before first shift, and the onboarding checklist template (HR-05 · SOP-055–058 · HR-14) with gate badges (`lib/recruitment.ts`, `data/qms-recruitment.json`). *Client/family portal:* `/portal` — a standalone read-only shell (not the staff sidebar) for the new **`Client / Family`** role. A portal login is linked to one client record (`users.client_id`); the page shows only that client's own weekly schedule, care team and care summary. Staff logins are bounced to `/dashboard`; portal logins are bounced out of the staff shell to `/portal`.
7. **GDPR hardening** — 🟡 **partly built.** `/data-protection` (oversight) now provides: a general **`audit_log`** (logins, PII reveals, issue sign-offs, training/SOP assignments, register + call events — best-effort, never breaks the primary action) with a viewer; **DSAR export** (`/api/dsar/[clientId]` — full per-client JSON bundle: record, related call events and access history, logged to audit + PII log); the **access register** (each login × the data classes it can reach, from `ROLE_DATA_ACCESS`); and the **retention schedule** (`lib/retention.ts`). DPO contact + safeguards shown. *Still operational/roadmap: 2FA for manager/director logins, encrypted EU-region backups + restore test, annual access review, automated retention purge, and DPO sign-off of the policy.*

---

## 7. Design tokens (reference)

Background `#EEF2EC`; card `#fff`; border `#DEE7DF`. Sidebar `#16352A`, text `#CFE0D4`.
Accent leaf-green `#2E8B5E` (dark `#1E6F49`, tint `#E2F1E8`); alternate role accents teal
`#1F7A87` and blue `#3F6FB0`. Category colours: Governance `#2F6DB0`, Care `#2E8B5E`, HR
`#8A5AB0`, Health/Safety `#C2452F`, Info `#1F7A87`, Quality `#9A6A10`. Fonts: Hanken Grotesk
(UI), IBM Plex Mono (codes), Material Symbols Rounded (icons) — all self-hosted in
`public/fonts/`. These are already implemented in `app/globals.css`.
