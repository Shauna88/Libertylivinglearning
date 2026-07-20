# Developer handover — Liberty Living QMS & Training Hub

A quick orientation for the developer taking this over. Full technical detail is in
[`README.md`](./README.md); this file is the "what/where/who has access/what's stuck" summary.

## What it is
A Next.js 16 (App Router, TypeScript) web app — the Liberty Living Quality Management
System & Staff Training Hub. Auth.js credentials login, role-based access, Postgres
(via `pg`), server-scored training completions. All DB access is isolated in `lib/db.ts`;
the schema **creates and seeds itself on first request** (no migration step).

See the README for the full module list and the "Deploying to Vercel + EU Postgres" section.

## Bigger picture — the operations platform
The client's latest handoff (build 3) expands the scope from a QMS/Training hub into a full
**five-domain operations platform** (CRM, QMS, Improvement & Training, Finance, HR/Recruitment,
9 roles). The authoritative spec + prototype are committed under [`design/`](./design/), and
the engineering design that maps that spec onto this codebase — with the target data model,
the 9-role access model, module specs, and a **phased build roadmap** — is in
[`PLATFORM.md`](./PLATFORM.md). The Training + QMS domains are built; CRM/Finance/Recruitment/
Improvement-routing/full-RBAC are the roadmap. Treat it as phased delivery, not one build.

## The three services
1. **GitHub** — the repository (`Shauna88/Libertylivinglearning`). Production deploys from `main`.
2. **Vercel** — hosting. Auto-deploys on push to `main`. Custom domain: **libertylivinglearning.com**.
3. **Neon** — Postgres database (created via Vercel → Storage), EU region. Managed from the Vercel Storage tab.

## Environment variables (set in Vercel → Settings → Environment Variables)
| Name | Purpose | Notes |
|---|---|---|
| `AUTH_SECRET` | Signs the login session (Auth.js) | **Rotate this** — generate a fresh one: `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` | Required for Auth.js on Vercel |
| `DATABASE_URL` *(or `POSTGRES_URL`)` | Postgres connection | Injected by the Neon integration. Use the **pooled** string. Code accepts either name (see `resolveConnectionString` in `lib/db.ts`). |

## Current status (as of handover)
- ✅ Deployed to **libertylivinglearning.com** via Vercel; Neon Postgres connected.
- ⚠️ **Login returns a "server error"** — needs diagnosis. Start here:
  - Open **`/api/health`** (`https://libertylivinglearning.com/api/health`). It returns
    `{"status":"ok","seeded":true,...}` when the DB is reachable and seeded, or
    `{"status":"error","message":"..."}` with the reason.
  - If health is `ok` but login still errors → almost certainly **`AUTH_SECRET` missing or
    not applied**. Confirm it's set for **Production**, then **redeploy** (env changes only
    take effect on a fresh deploy).
  - If health errors → check the `DATABASE_URL`/`POSTGRES_URL` value and that the Neon
    integration is connected to this project. Vercel → Deployments → open the failing
    deployment → **Runtime Logs** shows the exact exception.

## Demo accounts (seeded automatically)
Password for all: `liberty`. Roles: `manager@`, `csm@`, `coordinator@`, `admin@`,
`oncall@` `libertyhomecare.ie`. **Replace these + change the password before real staff use**
(remove the demo block in `seed()` in `lib/db.ts`).

## Local development
```bash
npm install
cp .env.example .env.local     # set AUTH_SECRET + DATABASE_URL
npm run dev                    # http://localhost:3000
```
Point `DATABASE_URL` at any Postgres (a Neon dev branch, or local Docker — see README).

## First jobs, suggested
1. Get login working (see "Current status" above).
2. Rotate `AUTH_SECRET` and change/replace the demo accounts.
3. Wire real staff onboarding (create `users` + pathway `enrollments`) to replace the seed.
4. GDPR hardening before go-live: retention, audit log, data-subject access, backups (DPO: dpo@libertyhomecare.ie).
5. Deferred feature: the Audits & QIP register.
