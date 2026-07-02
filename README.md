# Liberty Living HomeCare — Quality Management System & Staff Training Hub

A web application that turns Liberty Living's QMS/Training Hub design prototype into a
real, working app with **individual staff logins**, **server-side tracked training
completions** (auditable for HSE / HIQA inspection), and **role-based access**.

Built from the design handoff (`Quality_management_system_build.zip`). The training
content — **22 courses, 70 SOPs, 4 role pathways** — is migrated verbatim from the
prototype data modules.

![Dashboard](docs/screenshots/dashboard.png)

---

## What's implemented

**Foundations & training (handoff phases 1–2):**

- **Authentication** — email + password (Auth.js / NextAuth), JWT sessions, role in the session.
- **Role-based access** — Coordinator/Admin/On-Call learn; Manager & Client Service Manager also see oversight dashboards.
- **Staff dashboard** — the signed-in user's assigned pathway, compliance %, and outstanding courses.
- **Staff Training Hub** — full catalogue of 22 courses grouped by category.
- **Course player** — lesson pages → the linked **SOP procedure** steps → a **knowledge check**.
  - The quiz is **scored on the server** (pass mark **70%**); the client never sees the answer key and never decides pass/fail.
  - Each submission writes an auditable `completions` row (with attempt number).
- **Certificates** — printable certificate of completion (print / save-as-PDF) once a course is passed.
- **Manager Monitor** — live completion data by course and by staff member, read from the real `completions`/`enrollments` tables (oversight roles only).

**Reference & operational modules:**

- **SOP Library** — all 70 Standard Operating Procedures, searchable and category-filtered, each with numbered steps (action / responsible role / timeframe).
- **Front-line Guide** — the 13 field situations, viewable from three role lenses (HCA / Care Coordinator / Client Service Manager) — spot it / do it / tell someone / record.
- **Policy Library** — 42 controlled documents, searchable, 6 category filters, status (current / review-due / overdue), and a document control-record reader.
- **Forms & Templates** — 22 controlled forms grouped by care-journey stage, with search and filter.
- **KPIs & Performance** — HSE Authorisation Scheme quality indicators (service delivery / clinical safety / experience / workforce), RAG bars with target-vs-current-vs-previous; documents-within-review computed live from the register.
- **Governance** — leadership team, assurance reporting cycle (EMT / CGC / Board / Annual), and key contacts & escalation.
- **Risk & Safety registers** — live, DB-backed **Complaints (QA-03)**, **Incidents (QA-13)** and **Safeguarding (HS-23)** intake with server-validated forms, auto-generated references, RAG severities, and real open-item badge counts in the nav.
- **Workforce & Training** (oversight roles) — HR/manager view: training-compliance KPIs, readiness mix, onboarding gateways (HSE Specs 17.x), the mandatory-training catalogue, qualification pathways, and a per-HCA register with a drill-down competency matrix (vetting, gateways, training statuses).

### Deferred (phase 2+)

The Audits & QIP register and GDPR hardening (retention, audit log, data-subject
access) remain follow-ups.

---

## Tech stack

| Concern    | Choice | Notes |
|------------|--------|-------|
| Framework  | **Next.js 16** (App Router, TypeScript) | The prototype is React-shaped, so it ports cleanly. |
| Auth       | **Auth.js / NextAuth v5** (Credentials) | Email + password, JWT session, role-based. |
| Database   | **Postgres** via `pg` | Schema + seed created idempotently on first use, under a Postgres advisory lock (safe for serverless cold starts). |
| Passwords  | **bcryptjs** | Hashed at rest. |
| Fonts      | **Self-hosted** Hanken Grotesk, IBM Plex Mono, Material Symbols | No third-party Google Fonts request (works offline; avoids leaking user IPs — a GDPR plus). |

The database is touched only through the small typed async helpers in `lib/db.ts`.
Set `DATABASE_URL` to any Postgres — a local instance in dev, an **EU-region Neon or
Supabase** in production.

---

## Running locally

```bash
# 1. Install
npm install

# 2. Environment
cp .env.example .env.local
#   set AUTH_SECRET (openssl rand -base64 32) and DATABASE_URL

# 3. Dev server
npm run dev
#   open http://localhost:3000
```

You need a Postgres to point `DATABASE_URL` at. Easiest options:

- **A free Neon/Supabase dev database** — paste its connection string into `DATABASE_URL` (works for both local dev and production).
- **A local Postgres via Docker:**
  ```bash
  docker run -d --name liberty-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=liberty -p 5432:5432 postgres:16
  # DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/liberty
  ```

The schema is **created and seeded automatically** on first request (idempotent).
The seed inserts the demo accounts, their enrollments/completions and sample register
entries; bump `SEED_VERSION` in `lib/db.ts` to force a reseed.

### Demo accounts

All demo accounts use the password **`liberty`** (click any account on the login screen to autofill):

| Email | Role | Sees |
|-------|------|------|
| `manager@libertyhomecare.ie` | Manager | Monitor (oversight) |
| `csm@libertyhomecare.ie` | Client Service Manager | Learner pathway + Monitor |
| `coordinator@libertyhomecare.ie` | Care Coordinator | Learner pathway |
| `admin@libertyhomecare.ie` | Office Administrator | Learner pathway |
| `oncall@libertyhomecare.ie` | On-Call Manager | Learner pathway |

> Demo users, their enrollments and seeded completion history exist so the app is
> immediately explorable. Replace them with real accounts before going live.

---

## Project structure

```
app/
  layout.tsx                 root layout (self-hosted fonts)
  page.tsx                   redirect -> /dashboard or /login
  login/                     credentials login (client)
  api/
    auth/[...nextauth]/      NextAuth route handler (Node runtime)
    complete/                POST: server-scores a quiz -> writes completion
  (app)/                     authenticated area (sidebar shell)
    dashboard/               staff landing: pathway + compliance
    training/                course catalogue
    training/[courseId]/     course player (server) -> CoursePlayer (client)
    certificate/[courseId]/  printable certificate
    monitor/                 manager compliance dashboards (oversight only)
    sops/ , sops/[sopId]/    SOP library + detail
components/                  Sidebar, CoursePlayer, blocks, SopLibrary, PrintButton
lib/
  content.ts                 typed access to migrated content + client-safe projections
  db.ts                      Postgres (pg) schema, seed, and all query helpers
  scoring.ts                 authoritative server-side quiz scoring
  auth.config.ts / auth.ts   NextAuth config (edge-safe base + Node credentials)
data/qms-content.json        migrated content: 22 courses, 70 SOPs, 4 pathways
documents/                   original QMS source documents (.docx / .xlsx)
public/fonts/                self-hosted web fonts
```

### Data model

`users`, `courses`, `sops`, `pathways`, `enrollments`, and — the reason the build exists —
`completions` (`user_id, course_id, completed_at, score, passed, attempt_no`).
Courses link to SOPs via the `SOP-nnn` codes in each course's policy reference.

---

## Deploying to Vercel + EU Postgres

The app is Vercel-ready (Next.js, `pg` driver, seed-on-first-use).

1. **Create an EU-region Postgres.**
   - **Neon** — new project, region *Europe (Frankfurt)*; copy the **pooled** connection string.
   - or **Supabase** — new project in an EU region; use the **Transaction** pooler connection string (port `6543`).
2. **Import the repo into Vercel** (New Project → pick this GitHub repo). It auto-detects as Next.js.
3. **Set environment variables** in Vercel (Production + Preview):
   - `DATABASE_URL` = the pooled Postgres string from step 1
   - `AUTH_SECRET` = output of `openssl rand -base64 32`
   - `AUTH_TRUST_HOST` = `true`
4. **Deploy.** On the first request the schema is created and seeded automatically — no
   migration step to run. You'll get a URL like `https://liberty-qms.vercel.app`.

> Use the **pooled** connection string on serverless — it keeps connection counts sane.

## Production / GDPR

This app holds **staff personal data and training records**, so it has GDPR obligations
(EU data residency, access control, retention, audit trail, right-of-access). Involve the
DPO (`dpo@libertyhomecare.ie`) early. Before go-live:

1. **Real accounts** — remove the demo seed; wire onboarding to create `users` + pathway `enrollments`.
2. **Harden** — retention policy, audit log, access reviews, data-subject access, backups; sign off with the DPO.
3. Keep hosting and the database in an **EU region** (the steps above put both in the EU).

Fonts are already self-hosted, so there is **no third-party font request** leaking user IPs.

---

## Content provenance

All course text, SOP steps, and quiz questions/rationale are migrated verbatim from the
Liberty Living design handoff, which was itself grounded in Liberty's approved policies
(GOV/CARE/HS/QA/IM series) and Irish statutory frameworks (HSE Incident Management
Framework, Patient Safety Act 2023, Children First Act 2015, Assisted Decision-Making
(Capacity) Act 2015). The original documents are retained under `documents/`.
