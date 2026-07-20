# Handoff: Liberty Living HomeCare — Operations Platform (CRM + QMS + Training + Finance + HR)

## Overview

This package hands off a complete, working **design prototype** for Liberty Living HomeCare's internal operations platform. It began as a Quality Management System + staff Training Hub and has grown into a full **home-care operations platform** spanning five domains:

1. **CRM / Care Delivery** — service-user (client) register, referral intake, scheduling, daily & carer rosters, live call monitor, care plans, care notes, per-client documents.
2. **Quality Management (QMS)** — policy & procedure library, forms & templates, KPIs, audits & QIP, and the Complaints / Incidents / Safeguarding registers.
3. **Improvement & Training hubs** — role-scoped workbenches (HR and Quality) that review issues, sign them off with an outcome, **route them to the department that should own the fix**, and push corrective training / SOPs to teams or named individuals — plus the staff-facing Training Hub where staff actually complete courses.
4. **Finance** — client invoicing, rate schemes by CHO area, HCA pay & payroll hours.
5. **Workforce / HR** — training compliance, onboarding gateways, qualification pathways, recruitment pipeline, and governance.

The whole thing is **role-aware**: one codebase, nine roles, each sees a tailored navigation and dashboard (see "Roles & access").

The goal for the developer is to turn this prototype into a **real, hosted, multi-user web application** with authentication, a database, and per-user server-side records. **What the prototype does NOT have — and what this build must add — is a back end.** Today every piece of live state (clients, rosters, submissions, sign-offs, training progress) is stored in the browser's `localStorage`; it is not shared, not secure, and not auditable. That mechanism must be **replaced** by real accounts and a database.

---

## About the Design Files

The files in this bundle are **design references authored in HTML** — a high-fidelity prototype showing the intended look, content, and behaviour. **They are not production code to ship directly.** The task is to **recreate these designs in a real application stack** (see "Recommended architecture"), using that stack's established patterns, component library, auth, and database — not to host the HTML as-is.

The prototype is built as a single "Design Component" HTML file plus plain-JS data modules. It uses React (via an internal runtime in `support.js`) with an unusual template dialect. **Do not try to reuse `support.js` or the `.dc.html` template syntax** — treat them as a spec. Read the data modules (`training-content.js`, `training-sops.js`) directly: they contain real content to migrate into a database. Read the `.dc.html` logic class (`class Component extends DCLogic`) as the behavioural spec — it is plain JavaScript and every seed dataset, storage key, and interaction is legible there.

## Fidelity

**High-fidelity (hifi).** Colours, typography, spacing, layout, copy, and interactions are all final and intentional. Recreate the UI faithfully using the target stack's component library, matching the design tokens below. The content (course text, quiz questions, SOP steps, policy text, glossary definitions, playbooks) is real and should be migrated verbatim.

---

## Recommended architecture

This app holds **service-user (client) personal & health data and staff personal & training data** → it has significant **GDPR obligations** (EU data residency, access control, retention, audit trail, data-subject access, and special-category health data safeguards). Liberty has a DPO inbox (`dpo@libertyhomecare.ie`) — involve them from day one. Note the prototype already models a **"reveal identifiable data" gate with a reason prompt and an access log** (`llh_pii_log`) — carry that principle into the real app as row-level access + audit logging.

A sensible, conventional stack (developer may substitute equivalents):

- **Framework:** Next.js (React) or Remix — the prototype is React-shaped, so components port cleanly.
- **Auth:** an established provider (Auth.js/NextAuth, Clerk, or Supabase Auth). Email accounts, password + 2FA (enforce 2FA for manager/director roles). **Roles/claims** drive access.
- **Database:** Postgres (Supabase, Neon, or RDS) in an **EU region**.
- **Hosting:** Vercel/Netlify (EU region) or a managed EU container host.
- **Files/PDF:** policies, SOPs and per-client documents (care plans, risk assessments) will become real uploaded PDFs — plan an access-controlled storage bucket.

### Core data model (minimum)

**People & orgs**
- `staff` — id (`HCA-###` etc.), name, email, phone, role, CHO area/region, employment status, qualification pathway, created_at.
- `clients` (service users) — id (`CL-###` / `SU-####`), name, area, eircode, funder (HSE HSAS / Fair Deal / Private), weekly hours, start date, coordinator, status (see client statuses), care-package details, next of kin. **Special-category data — restrict + audit.**

**Care delivery / CRM**
- `visits` / `schedule` — client_id, day, time, assigned carer, status (`upcoming`/`enroute`/`inprogress`/`done`/`overdue`/`missed`).
- `cover_assignments` — overrides of the base schedule (prototype key `llh_assign`, `clientId|day|time → carer`).
- `permanent_change_requests` — a coordinator's this-week cover promoted to permanent, approved by the CSM (`llh_permreq`).
- `care_plans` / `care_tasks` — per-client, keyed by care-plan domain (`llh_tasks`).
- `care_notes` / `diary` — per-client dated notes with category & tone (`llh_diary`).
- `client_documents` — per-client controlled docs with on-file/expiry state (`llh_client_docs`).
- `call_log` — missed/late/no-show call-monitor events.

**Quality & risk**
- `complaints`, `incidents`, `safeguarding_concerns` — registers. Each has an owning **department** and a status; QA-03 (complaints), QA-13 (incidents), HS-23 (safeguarding) govern SLAs.
- `issue_signoffs` — outcome, review note, corrective actions, signed-by, timestamp (prototype key `llh_signoffs`). **The auditable "we reviewed and acted on it" record.**
- `issue_routing` — which department currently owns an issue's fix (`llh_routes`, `kind:id → {dept, by, at}`). Overrides the issue's default department so it surfaces in that department's dashboard inbox.
- `staff_submissions` — staff-lodged complaints / incidents / safeguarding / holiday requests (`llh_submissions`). This is the intake feed into the registers.

**Training**
- `courses` / `course_content` — 21 courses: ordered lessons, linked SOP ids, quiz questions/options/answers/rationale (from `training-content.js`).
- `sops` — `SOP-001`…`SOP-070`, each `{ id, title, purpose, steps:[{ n, action, role, tf }] }` (from `training-sops.js`).
- `pathways` — role → required course ids (from `LLH_PATHMAP`).
- `enrollments` / `assignments` — course/SOP pushed to an audience or named individuals, with note & due date (`llh_assignments`).
- `completions` — user_id, course_id, completed_at, score, passed, attempt_no. **Server-scored, pass mark 70%. Never trust the client.**

**Finance**
- `rate_schemes` — by CHO area / funder, with weekday / Saturday / Sunday / bank-holiday rates.
- `invoices` — per client, from delivered visits × scheme rates.
- `pay_runs` — HCA payroll hours from worked visits.

**Cross-cutting**
- `pii_access_log` — who revealed identifiable data, when, and why (`llh_pii_log`).
- `audit_log` — general change/audit trail (recommended, not yet in prototype).

> **Migration note:** the prototype ships seed/sample data inline (clients, staff, registers, invoices). Migrate the *reference* content (courses, SOPs, policies, forms, glossaries, playbooks, rate schemes) verbatim; treat the sample *people/records* as demo data to discard or replace with a real import.

### Storage keys in the prototype (each maps to a table above)

`llh_clients` · `llh_custom_hcas` · `llh_assign` (cover) · `llh_permreq` · `llh_tasks` · `llh_diary` · `llh_client_docs` · `llh_cinfo` (client special instructions) · `llh_submissions` (staff-lodged intake) · `llh_signoffs` · `llh_routes` (department routing) · `llh_assignments` (training/SOP pushes) · `llh_pii_log` · `llh_training_v1` (course progress). These are the complete set of live-state stores — everything else is seed data in the code. **Replace all of them with authenticated server records.**

---

## Roles & access

One app, nine roles. Each role config carries a `nav` allowlist (which modules appear), a display identity, and an accent theme. Map these to auth roles/claims; the navigation and dashboards must be gated server-side, not just hidden client-side.

**Manager / director roles (office):**
- **Executive / PIC (`exec`)** — master oversight; sees every module and every register across all areas.
- **Director of Quality (`quality`)** — Claire Leavy. QMS: policies, KPIs, audits/QIP, the three registers, forms, governance, and the **Quality Improvement & Training** hub (org-wide issue review + department routing).
- **Director of HR (`hr`)** — Laura Souza. Workforce compliance, staff files, recruitment, governance, and the **HR Improvement & Training** hub (HR-owned issues + push training/SOPs).
- **Client Service Manager (`csm`)** — Mary James. Operational oversight of care packages: the full CRM, registers, team training.
- **Director of Finance (`finance`)** — Lawrenie De Souza. Finance module + client CRM (billing context).
- **Recruitment Manager (`recruit`)** — Karen McLoughlin. Recruitment pipeline, training, forms.

**Front-line / staff roles:**
- **HCA (`hca`)** — field carer. Own dashboard (workday, timesheet), the Staff Training Hub, and the ability to **raise** complaints/incidents/safeguarding and **request** holiday. Cannot see other staff's records.
- **Care Coordinator (`coord`)** — office. As HCA-staff plus the CRM (cover board, live monitor, register, scheduling, rosters, call log, bulk import).
- **Client / family portal (`client`)** — read-only view of the service user's own weekly schedule and assigned carers.

Named individuals in the content are seed/configurable: **Claire Leavy — Director of Quality**; **Laura Souza — Director of HR**; **Mary James — Client Service Manager**; **Leah O'Brien — Complaints Officer / DSO**; **Ana Lyons — Clinical Lead, RN (NMBI)**; **DPO — dpo@libertyhomecare.ie**.

---

## Screens / Views

The app is a **left-sidebar shell (264px, dark green `#16352A`) + sticky header + main content area**. Sidebar nav is grouped; the visible groups/items depend on the signed-in role. Full nav vocabulary (managers see a filtered subset):

- **OVERVIEW** → Dashboard (role-specific)
- **CLIENT MANAGEMENT · CRM** → Cover board · Live monitor · Client register · Scheduling · Daily roster · By area · Carer roster · Call log · Bulk import
- **COMPLIANCE** → Policy Library · Forms & Templates · KPIs & Performance · Audits & QIP
- **RISK & SAFETY** → Complaints · Incidents · Safeguarding
- **HR MANAGEMENT / QUALITY MANAGEMENT** → Improvement & Training (label is role-aware: "HR MANAGEMENT" for HR, "QUALITY MANAGEMENT" for Quality)
- **WORKFORCE** → Workforce & Training · Staff Training Hub · Recruitment
- **FINANCE** → Finance overview · Client invoicing · Rate schemes · HCA pay & hours
- **GOVERNANCE** → Governance
- **DATA** → Data export (CSV/JSON + data dictionary)

### CRM / Care Delivery
- **Cover board** — today's gaps: uncovered visits, sick calls, lateness, no-shows; act-on-the-red triage landing.
- **Live monitor** — real-time visit states (on call now, en route, completed, awaiting start, overdue/missed).
- **Client register** — searchable service-user list with status chips (New referral, Active, On hold, In hospital, Care plan under review, Discharged, Deceased); drill into a **client profile**: overview, schedule of service, **care plan** (editable tasks by domain), **care notes/diary**, **documents** (on-file/expiring), carers, flags.
- **Scheduling / Daily roster / Carer roster / By area** — assign carers to visits; cover overrides; promote a temporary cover to permanent via a CSM approval.
- **Call log** — missed/late/no-show events feeding the cover board.
- **Bulk import** — CSV importer (clients or HCAs) with column-mapping steps and a downloadable template.
- **PII gate** — identifiable client data is masked until the user gives a reason; the reveal is logged (`llh_pii_log`).

### Quality Management
- **Policy & Procedure Library** — search + category chips (6 categories, each colour-coded); card grid; click opens a full document reader.
- **Forms & Templates** — searchable, category-grouped, code-pilled (Appendix vs form).
- **KPIs & Performance** — HSE Authorisation Scheme indicators: target vs current vs previous with green/amber/red tone.
- **Audits & QIP** — audit schedule + Quality Improvement Plan.
- **Complaints / Incidents / Safeguarding registers** — rows with themes, severity, owning department, status, quarterly KPIs, and a schema-driven record drawer capturing the full mandated fields (NIMS reference, proportionate category, open disclosure, external notification, etc.). Staff-lodged submissions flow in as new rows.

### Improvement & Training hubs (HR and Quality)
Two role-scoped instances of the same workbench, three tabs each:
- **Issues to action** — the complaints/incidents/safeguarding this role is responsible for. **HR** sees issues routed to HR; **Quality** sees *every* open issue across the whole service. Open the actual record to read full detail, then **Review & sign off**:
  - pick an outcome, write a review note;
  - issue corrective actions: assign a refresher mini-course, push an SOP to re-read, schedule 1:1 supervision (HR-08), and/or **route the issue to another department to own the fix** (Client Services / Care & Operations / HR / Finance / Quality) — which makes it appear in that department's dashboard inbox;
  - choose which teams the training/SOP goes to.
- **Push training & SOPs** — send any mini-course or SOP to whole audiences (All HCAs, Coordinators, CSMs, …) **and/or named individuals** (search + multi-select), with a note and due date.
- **Assignment log** — everything pushed, with withdraw.

### Staff Training Hub (the staff-facing training experience)
- **Assigned to you** — courses/SOPs a manager pushed to this person or their team.
- **Course player** — lessons → linked SOP procedure → knowledge check (multiple choice, pass ≥ 70%, rationale shown after submit); progress bar across the flow; completion marked on pass.
- **Front-line guide** — the same situations seen through three lenses (HCA / Coordinator-Admin / On-call) with "spot it / do it / tell someone" steps.
- **Reference tabs** — Qualification pathways, Scenarios, Admin how-to, HSE terminology, Phone guide, SOP Library (all 70), Glossary & roles, Monitor (manager compliance view — must read from `completions`).

### Workforce & Training / Recruitment / Finance / Governance
- **Workforce & Training** — HR/manager compliance view: KPIs, readiness mix, onboarding gateways (Induction, Shadowing, NCCA, Individual training plan — tied to HSE specs 17.x), per-HCA register drill-down.
- **Recruitment** — sourcing → vetting → references → right-to-work → onboarding-ready pipeline.
- **Finance** — invoicing (delivered visits × scheme rates), rate schemes by CHO area/funder (weekday/Sat/Sun/bank-holiday), HCA pay & payroll hours.
- **Governance** — leadership grid, clinical/management governance arrangements, emergency contacts.

---

## Interactions & Behaviour

- **Role switch** — the prototype has a role switcher (top-right) that swaps nav + dashboard + accent theme; in the real app this is who you logged in as. Switching resets `view` to a role-valid default.
- **Navigation** — clicking a sidebar item sets `view` (and for CRM/Finance, a sub-mode via `#hash`) and clears open detail panels. Active item highlighted (white text, translucent white bg, accent icon).
- **Tabs** — each module stores its active tab in its own state key (`wfTab`, `learnTab`, `improveTab`, `finMode`, `clientMode`); switching clears open detail.
- **Search + chips** — live client-side filtering in libraries; in the app, query the server for large datasets.
- **Course player** — linear paging with progress bar; quiz answers selectable until submit; then correct/incorrect + rationale; score computed (pass ≥ 70%).
- **Sign-off modal** — outcome + note + corrective-action checkboxes (course / SOP / supervision / **route to department**) + audience chips; on confirm, writes a sign-off, fires any pushes, records any routing, and shows a flash.
- **Department routing** — writes `llh_routes[kind:id] = {dept}`; the target department's dashboard **inbox** and its Improvement hub then show that issue (verified end-to-end in the prototype).
- **Detail panels / drawers** — open in place; close returns to the list.
- **Animations** — subtle: `qmsfade` (opacity + 6px translateY on enter), `growbar` (scaleX bar grow). Keep light.

## State Management

Prototype state is all client-side today. Map to: **server data** (all records above), **route/URL state** (`view`, CRM/Finance sub-mode), and **local UI state** (which tab, which search, which panel open, in-progress form/quiz). Key UI state keys: `view`, `role`, `clientMode`, `finMode`, `policyCat/policyQuery/activeCode`, `wfTab/activeHca`, `learnTab/flRole`, `activeCourse/coursePage/quizAnswers/quizSubmitted/quizScore`, `improveTab` + the `so*`/`asg*` sign-off & push draft fields, `activeClient`, `activeReg`. **Everything persisted to `localStorage` (the keys listed above) must become authenticated server records.**

## Data sources in this bundle

- **`training-content.js`** — `window.LLH_COURSES` (21 courses: lessons + linked SOP ids + quiz), `window.LLH_PATHMAP` (role → required courses + seeded completion), `window.LLH_STAFF` (sample staff for the monitor). Migrate courses & pathways to DB; discard sample staff/completions.
- **`training-sops.js`** — `window.LLH_SOPS`, 70 SOPs keyed `SOP-001`…`SOP-070`. Migrate verbatim.
- **`Liberty Living QMS.dc.html`** — the full UI + inline content (policies, registers, glossaries, playbooks, rate schemes, CRM seed data, all screens). Read the template for layout/copy and the logic class for data shapes, seed data, and behaviour.

## Design Tokens

**Colours**
- App background `#EEF2EC`; card white `#fff`; light border `#DEE7DF`.
- Sidebar dark green `#16352A`; sidebar text `#CFE0D4`, muted `#7FA38E`.
- Primary accent (leaf green) `#2E8B5E`; dark `#1E6F49`; tint `#E2F1E8`. Alternate role accents: teal `#1F7A87` (dark `#155C66`, tint `#DCEFF1`, sidebar `#10333A`) and blue `#3F6FB0` (dark `#2F5790`, tint `#E6EEF8`, sidebar `#16294A`).
- Text primary `#1B2A22` / `#15241C`; secondary `#647568`.
- Category colours: Governance blue `#2F6DB0`; Care green `#2E8B5E`; HR purple `#8A5AB0`; Health/Safety red `#C2452F`; Info-mgmt teal `#1F7A87`; Quality amber `#9A6A10`.
- Semantic tones: green `#1E6F49` on `#E2F1E8`; amber `#9A6A10` on `#FBEFD3`; red `#B23A22` on `#FBE3DD`; blue `#2F6DB0` on `#E5EEF8`; grey `#5E7268` on `#ECF1EC`; mint `#1E6F49` on `#E0F0E7`.

**Typography**
- UI/body: **Hanken Grotesk** (400/500/600/700/800), fallback `system-ui, sans-serif`.
- Monospace (codes, IDs, times, badges): **IBM Plex Mono** (400/500/600).
- Icons: **Material Symbols Rounded** (class `.ms`).
- Scale: section labels ~10.5px/700/uppercase/letter-spacing 0.04–0.1em; nav 13.5px/600; body 12.5–14px; metric numbers 24–28px/800; headings 17–26px/800, letter-spacing -0.02em.

**Radius:** cards/panels 9–14px; pills/badges 999px; logo tile 12px. **Shadows:** subtle (logo tile `0 2px 8px rgba(0,0,0,0.25)`; cards lean on borders). **Sidebar:** 264px fixed, sticky, full-height, scrollable.

## Assets

- **Fonts:** Google Fonts — Hanken Grotesk, IBM Plex Mono, Material Symbols Rounded (loaded via `<link>`; self-host or use the framework font loader in the app).
- **Icons:** Material Symbols Rounded glyph names throughout (`eco`, `space_dashboard`, `groups`, `sensors`, `event_seat`, `crisis_alert`, `shield`, `model_training`, `account_balance_wallet`, `person_search`, …).
- **No raster images / logos embedded** — the brand mark is the `eco` glyph on an accent tile. Swap in a real Liberty logo if available.
- **Source documents:** the project `policies/`, `policies_src/`, and `supporting/` folders and the SOP `.docx` packs are the authoritative source; text is already extracted into the data modules.

## Files in this bundle

- `Liberty Living QMS.dc.html` — full UI + content + behaviour spec (all screens, all roles).
- `training-content.js` — courses, pathways, sample staff (`LLH_COURSES` / `LLH_PATHMAP` / `LLH_STAFF`).
- `training-sops.js` — 70 SOPs (`LLH_SOPS`).
- `Liberty Living Safety Statement Completion Pack.dc.html` — related deliverable (Safety Statement / Part B risk assessments). Reference-only unless the app should surface it.
- `support.js` — **prototype runtime only.** Included solely so the `.dc.html` renders when opened in a browser. **Do not port it or the `.dc.html` template dialect into the app** — rebuild the UI in the chosen framework.
- `README.md` — this document. `GETTING_STARTED_CLAUDE_CODE.md` — a plainer-language starting guide.

## Suggested build phases

1. **Foundation:** stack + auth + Postgres (EU) + roles. Seed reference data (courses, SOPs, policies, forms, rate schemes, pathways) from the modules/prototype.
2. **CRM core:** clients, scheduling, rosters, live monitor, cover overrides + CSM approval, care plans/notes/documents, PII gate + access log, bulk import.
3. **Registers + Improvement hubs:** live Complaints/Incidents/Safeguarding intake (from staff submissions) → sign-off, corrective actions, **department routing**, and training pushes; the auditable `issue_signoffs` record.
4. **Training Hub:** login → assigned pathway → course player (lessons → SOP → quiz) → server-scored `completions`; manager monitoring from real records.
5. **Finance:** rate schemes, invoicing from delivered visits, HCA pay & hours.
6. **Reference + governance:** Policy Library, Forms, SOP Library, glossaries, playbooks, Front-line guide, Recruitment, Governance.
7. **GDPR hardening:** retention, audit log, access reviews, data-subject access, backups, health-data safeguards — sign off with the DPO.

> This is a substantial, multi-domain platform, not a single-screen tool. Recommend scoping it as phased delivery with the client, and confirming which domains are in the first release.
