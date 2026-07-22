# Developer handover — Liberty Living operations platform

Orientation for the developer taking this over. Deeper technical detail is in
[`README.md`](./README.md); the full engineering design and build roadmap are in
[`PLATFORM.md`](./PLATFORM.md). **This file is the "what it is / where it lives / what's
built / what's stuck / what to do first" summary — read it first.**

---

## 1. What it is

A **Next.js 16** (App Router, TypeScript, React 19) web application — Liberty Living
Homecare's internal operations platform. It has:

- **Auth.js (NextAuth v5)** credentials login, JWT sessions, **role-based access** enforced
  server-side.
- **Postgres** (via `pg`) as the only data store. All database access is isolated in
  **`lib/db.ts`**, and the schema **creates and seeds itself on first request** — there is
  **no migration step and no separate seed command**. Bump `SEED_VERSION` in `lib/db.ts` to
  force a reseed; schema changes to existing tables use `ALTER TABLE ... IF NOT EXISTS` so
  live databases migrate in place.
- **Server-scored** training quizzes (the answer key never reaches the browser).
- A **PII reveal-gate**: identifiable client (health) data is masked by default and only
  revealed through a logged API call.

The whole thing is one codebase; the left-hand nav and every page are gated by the logged-in
user's role.

## 2. What's built (all live on `main`)

| Domain | Route(s) | Who sees it |
|---|---|---|
| Staff Training Hub, SOP Library, Front-line Guide | `/training`, `/sops`, `/frontline` | all staff |
| Compliance: Policies, Forms, KPIs, Governance | `/policies`, `/forms`, `/kpis`, `/governance` | all staff |
| Risk registers: Complaints / Incidents / Safeguarding | `/complaints`, `/incidents`, `/safeguarding` | all staff (raise); oversight (review) |
| Manager Monitor, Workforce & Training | `/monitor`, `/workforce` | Manager, CSM |
| **CRM** — client register, client profile, PII gate + access log | `/clients`, `/clients/[id]`, `/access-log` | Coordinator, CSM, Manager |
| **CRM scheduling** — live visit monitor, carer roster, call log | `/live-monitor`, `/roster`, `/call-log` | CRM roles |
| **Improvement hub** — issue sign-off, department routing, training/SOP pushes | `/improvement` | Manager, CSM |
| **Finance** — overview, invoicing (+ drill-down), rate schemes, HCA pay | `/finance`, `/finance/*` | Manager, CSM |
| **Recruitment** — pipeline, vetting, onboarding gateways & checklist | `/recruitment` | Manager, CSM |
| **Client / family portal** — read-only own schedule + care team | `/portal` | Client / Family role |
| **Data protection** — access register, audit trail, DSAR export, retention schedule | `/data-protection` | Manager, CSM |

The design spec and original prototype are committed under [`design/`](./design/). The mapping
from that spec onto this codebase, plus what remains, is in [`PLATFORM.md`](./PLATFORM.md).

## 3. The three services (accounts the client already owns)

1. **GitHub** — the repository (`Shauna88/Libertylivinglearning`). **Production deploys from `main`.**
2. **Vercel** — hosting. **Auto-deploys on every push to `main`.** Custom domain:
   **libertylivinglearning.com**.
3. **Neon** — Postgres database (created via Vercel → Storage), **EU region** (chosen for
   GDPR). Managed from the Vercel Storage tab.

## 4. Environment variables

Set in **Vercel → Settings → Environment Variables** (and in `.env.local` for local dev — see
`.env.example`).

| Name | Value | Notes |
|---|---|---|
| `AUTH_SECRET` | a long random string | Signs the login session. Generate: `openssl rand -base64 32`. **Must be set for Production.** |
| `AUTH_TRUST_HOST` | `true` | Required for Auth.js behind Vercel's proxy. |
| `DATABASE_URL` *(or `POSTGRES_URL`)* | Postgres connection string | Injected by the Neon integration. Use the **pooled** string. The code accepts either name — see `resolveConnectionString()` in `lib/db.ts`. |

## 5. ⚠️ Known blocker — fix this FIRST

**Login on the live site returns a "server error".** The app is otherwise deployed and the
database is connected; the cause is almost certainly that **`AUTH_SECRET` is missing (or was
set but not applied with a redeploy)**. Diagnose in this order:

1. Open **`https://libertylivinglearning.com/api/health`**. It returns
   `{"status":"ok","seeded":true,...}` when the DB is reachable and seeded, or an error with
   the reason.
2. **Health `ok` but login still errors** → `AUTH_SECRET`. Confirm it's set for the
   **Production** environment, then **redeploy** — environment-variable changes only take
   effect on a fresh deployment (Vercel → Deployments → ⋯ → Redeploy).
3. **Health errors** → check `DATABASE_URL` / `POSTGRES_URL` and that the Neon integration is
   attached to this project. Vercel → Deployments → open the failing deployment → **Runtime
   Logs** shows the exact exception.

## 6. Demo accounts (seeded automatically)

Password for **all**: `liberty`.

| Email | Role |
|---|---|
| `manager@libertyhomecare.ie` | Manager (full oversight) |
| `csm@libertyhomecare.ie` | Client Service Manager |
| `coordinator@libertyhomecare.ie` | Care Coordinator |
| `hca@libertyhomecare.ie` | Healthcare Assistant |
| `admin@libertyhomecare.ie` | Office Administrator |
| `oncall@libertyhomecare.ie` | On-Call Manager |
| `family@libertyhomecare.ie` | Client / Family portal (read-only, linked to client `CL-001`) |

**These are demo logins — replace them and change the password before real staff use.** They
are created in the `seed()` function in `lib/db.ts` (the `demo` array). All client and staff
*records* are demo data too.

## 7. Local development

```bash
npm install
cp .env.example .env.local     # set AUTH_SECRET + DATABASE_URL
npm run dev                    # http://localhost:3000
```

Point `DATABASE_URL` at any Postgres (a Neon dev branch, or a local Postgres). On first
request the schema is created and seeded automatically. Useful checks:

```bash
npx tsc --noEmit    # types
npx eslint .        # lint
npm run build       # production build
```

## 8. Suggested first jobs (in order)

1. **Get login working** — apply/redeploy `AUTH_SECRET` (§5). Nothing else in production
   matters until this is done.
2. **Rotate `AUTH_SECRET`** to a fresh value and **replace the demo accounts + change the
   password** (edit the `demo` array in `seed()`; wire real staff onboarding to create `users`
   + pathway `enrollments`).
3. **Take over the GDPR-hardening roadmap** (the operational items the app can't do by itself),
   shown on `/data-protection` and listed in `PLATFORM.md` phase 7:
   - **2FA** for manager/director logins.
   - **Encrypted EU-region backups** + a tested restore (Neon supports this).
   - **Automated retention purge** against the schedule in `lib/retention.ts`.
   - **Annual access review** against the access register on `/data-protection`.
   - **DPO sign-off** of the retention policy — DPO: `dpo@libertyhomecare.ie`.
4. **Deferred feature:** the Audits & QIP register (noted in the README).

## 9. How to make changes safely

- Branch off `main`, open a PR, let it build, merge. Vercel deploys `main` automatically.
- Keep all data access in `lib/db.ts`. When you add or change a table, use
  `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and bump
  `SEED_VERSION` if the seed data changes — this keeps the live database migrating itself with
  no manual step.
- Role gates live at the top of each server component (`redirect("/dashboard")`) and in the
  role constants in `lib/db.ts` (`OVERSIGHT_ROLES`, `CRM_ROLES`, `FINANCE_ROLES`,
  `RECRUIT_ROLES`, `PORTAL_ROLE`). Add new roles to the `Role` union there.
