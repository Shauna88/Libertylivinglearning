/**
 * Data-access layer (Postgres via node-postgres).
 *
 * A small, isolated module: the rest of the app touches the database only
 * through the typed async helpers exported here. On first use the schema is
 * created and seeded idempotently under a Postgres advisory lock, which is safe
 * for concurrent serverless cold starts (Vercel).
 *
 * Configuration: set DATABASE_URL to a Postgres connection string (an EU-region
 * Neon/Supabase pooled URL in production — see README).
 */
import { Pool, type PoolClient } from "pg";
import bcrypt from "bcryptjs";
import { COURSES, SOPS, PATHWAYS, getPathwayByRole, type Course } from "./content";
import { CLIENTS, type Client } from "./crm";
import { defaultDept } from "./improvement";

const SEED_VERSION = "10";
const DEMO_PASSWORD = "liberty"; // demo accounts only; see README
const SEED_LOCK_KEY = 727274; // arbitrary advisory-lock id

export type Role =
  | "Healthcare Assistant"
  | "Care Coordinator"
  | "Office Administrator"
  | "On-Call Manager"
  | "Client Service Manager"
  | "Manager"
  | "Client / Family";

/** The read-only client/family portal role. Sees only their own linked client. */
export const PORTAL_ROLE: Role = "Client / Family";

/** Roles allowed to view the manager Monitor / oversight dashboards. */
export const OVERSIGHT_ROLES: Role[] = ["Manager", "Client Service Manager"];

/** Roles allowed into the client CRM (service-user records). */
export const CRM_ROLES: Role[] = ["Care Coordinator", "Client Service Manager", "Manager"];

/** Roles allowed into the Improvement & Training hub (issue review + routing). */
export const IMPROVEMENT_ROLES: Role[] = ["Manager", "Client Service Manager"];

/** Roles allowed into Finance (invoicing, rate schemes, payroll). */
export const FINANCE_ROLES: Role[] = ["Manager", "Client Service Manager"];

/** Roles allowed into Recruitment (HR pipeline & onboarding). */
export const RECRUIT_ROLES: Role[] = ["Manager", "Client Service Manager"];

export type UserRow = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  region: string;
  /** For the Client / Family portal role: the client record this login may view. */
  client_id: string | null;
  created_at: string;
};

export type CompletionRow = {
  id: number;
  user_id: number;
  course_id: string;
  completed_at: string;
  score: number;
  passed: number;
  attempt_no: number;
};

// ---- singleton pool (survives Next.js hot-reload and warm serverless) ----
const g = globalThis as unknown as { __llhPool?: Pool; __llhReady?: Promise<void> };

/** Prefer a pooled connection string; accept the common provider var names. */
function resolveConnectionString(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL || // Vercel Postgres / Neon integration (pooled)
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING
  );
}

function getPool(): Pool {
  if (!g.__llhPool) {
    const connectionString = resolveConnectionString();
    if (!connectionString) {
      throw new Error(
        "No Postgres connection string found. Set DATABASE_URL (or POSTGRES_URL) — see README / .env.example."
      );
    }
    const isLocal = /localhost|127\.0\.0\.1|::1/.test(connectionString);
    g.__llhPool = new Pool({
      connectionString,
      max: 5,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
    });
  }
  return g.__llhPool;
}

/** Run a query, ensuring schema + seed exist first. */
async function q<T = unknown>(text: string, params: unknown[] = []): Promise<T[]> {
  await ensureReady();
  const res = await getPool().query(text, params);
  return res.rows as T[];
}

function ensureReady(): Promise<void> {
  if (!g.__llhReady) {
    g.__llhReady = initSchemaAndSeed().catch((err) => {
      // allow a later retry if init failed (e.g. transient connection error)
      g.__llhReady = undefined;
      throw err;
    });
  }
  return g.__llhReady;
}

async function initSchemaAndSeed(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [SEED_LOCK_KEY]);
    await createSchema(client);
    const r = await client.query("SELECT value FROM meta WHERE key='seed_version'");
    if (r.rows[0]?.value !== SEED_VERSION) {
      await seed(client);
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function createSchema(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      region TEXT NOT NULL DEFAULT '',
      client_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS client_id TEXT;
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      cat TEXT NOT NULL,
      policy TEXT NOT NULL,
      duration TEXT NOT NULL,
      format TEXT NOT NULL,
      summary TEXT NOT NULL,
      objectives_json TEXT NOT NULL,
      lessons_json TEXT NOT NULL,
      quiz_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sops (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      purpose TEXT NOT NULL,
      steps_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pathways (
      role TEXT PRIMARY KEY,
      icon TEXT NOT NULL,
      people INTEGER NOT NULL,
      focus TEXT NOT NULL,
      modules_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS enrollments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id),
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      due_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'assigned',
      UNIQUE (user_id, course_id)
    );
    CREATE TABLE IF NOT EXISTS completions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id),
      completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      score INTEGER NOT NULL,
      passed INTEGER NOT NULL,
      attempt_no INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_completions_user ON completions(user_id);
    CREATE INDEX IF NOT EXISTS idx_completions_course ON completions(course_id);
    CREATE TABLE IF NOT EXISTS register_entries (
      id SERIAL PRIMARY KEY,
      kind TEXT NOT NULL,
      ref TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      location TEXT,
      summary TEXT NOT NULL,
      detail TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reporter_name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_register_kind ON register_entries(kind);

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      su TEXT NOT NULL,
      name TEXT NOT NULL,
      area TEXT NOT NULL,
      status TEXT NOT NULL,
      coordinator TEXT NOT NULL DEFAULT '',
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

    CREATE TABLE IF NOT EXISTS pii_access_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      user_name TEXT NOT NULL,
      client_id TEXT,
      scope TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_pii_client ON pii_access_log(client_id);

    CREATE TABLE IF NOT EXISTS call_log (
      id SERIAL PRIMARY KEY,
      client_id TEXT,
      su TEXT,
      area TEXT,
      visit_time TEXT,
      kind TEXT NOT NULL,
      detail TEXT NOT NULL,
      logged_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_call_log_created ON call_log(created_at);

    CREATE TABLE IF NOT EXISTS issue_routing (
      kind TEXT NOT NULL,
      entry_id INTEGER NOT NULL REFERENCES register_entries(id) ON DELETE CASCADE,
      dept TEXT NOT NULL,
      routed_by TEXT NOT NULL,
      routed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (kind, entry_id)
    );
    CREATE TABLE IF NOT EXISTS issue_signoffs (
      id SERIAL PRIMARY KEY,
      kind TEXT NOT NULL,
      entry_id INTEGER NOT NULL REFERENCES register_entries(id) ON DELETE CASCADE,
      outcome TEXT NOT NULL,
      note TEXT NOT NULL,
      actions_json TEXT NOT NULL DEFAULT '[]',
      signed_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_signoffs_entry ON issue_signoffs(kind, entry_id);
    CREATE TABLE IF NOT EXISTS assignments (
      id SERIAL PRIMARY KEY,
      kind TEXT NOT NULL,
      ref_id TEXT NOT NULL,
      ref_title TEXT NOT NULL,
      audience TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      due TEXT,
      assigned_by TEXT NOT NULL,
      withdrawn BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      actor_id INTEGER,
      actor_name TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT,
      detail TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
  `);
}

async function seed(client: PoolClient) {
  // Tear down in FK-safe order (children before parents) so reseeds don't
  // violate foreign keys.
  await client.query("DELETE FROM audit_log");
  await client.query("DELETE FROM call_log");
  await client.query("DELETE FROM pii_access_log");
  await client.query("DELETE FROM assignments");
  await client.query("DELETE FROM issue_signoffs");
  await client.query("DELETE FROM issue_routing");
  await client.query("DELETE FROM register_entries");
  await client.query("DELETE FROM completions");
  await client.query("DELETE FROM enrollments");
  await client.query("DELETE FROM users");
  await client.query("DELETE FROM courses");
  await client.query("DELETE FROM sops");
  await client.query("DELETE FROM pathways");
  await client.query("DELETE FROM clients");

  // ---- content: courses ----
  for (const [id, c] of Object.entries(COURSES) as [string, Course][]) {
    await client.query(
      `INSERT INTO courses (id,title,cat,policy,duration,format,summary,objectives_json,lessons_json,quiz_json)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        id,
        c.title,
        c.cat,
        c.policy,
        c.duration,
        c.format,
        c.summary,
        JSON.stringify(c.objectives),
        JSON.stringify(c.lessons),
        JSON.stringify(c.quiz),
      ]
    );
  }

  // ---- content: sops ----
  for (const s of Object.values(SOPS)) {
    await client.query("INSERT INTO sops (id,title,purpose,steps_json) VALUES ($1,$2,$3,$4)", [
      s.id,
      s.title,
      s.purpose,
      JSON.stringify(s.steps),
    ]);
  }

  // ---- content: pathways ----
  for (const p of PATHWAYS) {
    await client.query(
      "INSERT INTO pathways (role,icon,people,focus,modules_json) VALUES ($1,$2,$3,$4,$5)",
      [p.role, p.icon, p.people, p.focus, JSON.stringify(p.modules)]
    );
  }

  // ---- demo users (dev only; replace with real accounts in production) ----
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const demo: Array<{ name: string; email: string; role: Role; region: string; clientId?: string }> = [
    { name: "Grace Nolan", email: "hca@libertyhomecare.ie", role: "Healthcare Assistant", region: "Tullamore" },
    { name: "Mary James", email: "coordinator@libertyhomecare.ie", role: "Care Coordinator", region: "Offaly" },
    { name: "Sinead Kelly", email: "admin@libertyhomecare.ie", role: "Office Administrator", region: "Laois" },
    { name: "Tom Brennan", email: "oncall@libertyhomecare.ie", role: "On-Call Manager", region: "Kildare" },
    { name: "Ana Lyons", email: "csm@libertyhomecare.ie", role: "Client Service Manager", region: "Offaly" },
    { name: "Laura Souza", email: "manager@libertyhomecare.ie", role: "Manager", region: "All regions" },
    // Read-only client/family portal login, linked to the client record it may view.
    { name: "Deirdre Conroy (family)", email: "family@libertyhomecare.ie", role: "Client / Family", region: "Dublin North", clientId: "CL-001" },
  ];

  for (const u of demo) {
    const ins = await client.query(
      "INSERT INTO users (name,email,password_hash,role,region,client_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
      [u.name, u.email, hash, u.role, u.region, u.clientId ?? null]
    );
    const uid = ins.rows[0].id as number;
    const pathway = getPathwayByRole(u.role);
    const enrolls = pathway?.modules ?? []; // managers are oversight-only
    let offset = 0;
    for (const [courseId, status] of enrolls) {
      if (!COURSES[courseId]) continue;
      const done = status === "C";
      await client.query("INSERT INTO enrollments (user_id,course_id,status) VALUES ($1,$2,$3)", [
        uid,
        courseId,
        done ? "completed" : "assigned",
      ]);
      if (done) {
        offset += 3;
        const score = 80 + ((uid + offset) % 5) * 4; // 80–96
        await client.query(
          `INSERT INTO completions (user_id,course_id,score,passed,attempt_no,completed_at)
           VALUES ($1,$2,$3,1,1, now() - make_interval(days => $4))`,
          [uid, courseId, score, offset]
        );
      }
    }
  }

  // ---- sample register entries ----
  const samples = [
    { kind: "incident", ref: "INC-2026-001", category: "Fall", severity: "Category 2 — Moderate", location: "Service User home — Tullamore", summary: "Unwitnessed fall, no apparent injury", detail: "SU found seated on floor on arrival; assisted up with safe handling; no visible injury; GP informed; falls risk assessment to be reviewed.", status: "open", reporter: "Mary James", age: 2 },
    { kind: "incident", ref: "INC-2026-002", category: "Medication error / near miss", severity: "Category 3 — Minor / Negligible", location: "Service User home — Portlaoise", summary: "Missed evening dose identified at next visit", detail: "Tablet left in blister pack for previous evening; SU well; GP notified; medication log updated; prompt schedule reviewed.", status: "closed", reporter: "Sinead Kelly", age: 9 },
    { kind: "complaint", ref: "COM-2026-014", category: "Phone — family / representative", severity: "Level 2 — moderate", location: null, summary: "Family unhappy about repeated late calls", detail: "Daughter reports morning calls arriving over 45 minutes late three times this week. Acknowledged same day; routed to CSM; roster reviewed.", status: "open", reporter: "Mary James", age: 1 },
    { kind: "complaint", ref: "COM-2026-013", category: "Verbal — Service User", severity: "Level 1 — low", location: null, summary: "Preference for consistent carer", detail: "SU would prefer to see the same carers each week. Logged and passed to Operations for continuity planning.", status: "closed", reporter: "Ana Lyons", age: 12 },
    { kind: "safeguarding", ref: "SAF-2026-004", category: "Financial abuse", severity: "Medium", location: null, summary: "Unexplained withdrawals reported by SU", detail: "SU stated 'money keeps going missing from the tin'. Recorded verbatim; not investigated; routed to DSO same day; CSM informed.", status: "open", reporter: "Tom Brennan", age: 3 },
    { kind: "safeguarding", ref: "SAF-2026-003", category: "Neglect / acts of omission", severity: "Low", location: null, summary: "Home conditions deteriorating", detail: "Food spoiling in fridge, SU appears to be skipping meals. Recorded; DSO and CSM informed; care plan review requested.", status: "closed", reporter: "Sinead Kelly", age: 15 },
  ];
  for (const s of samples) {
    await client.query(
      `INSERT INTO register_entries (kind,ref,category,severity,location,summary,detail,status,reporter_name,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now() - make_interval(days => $10))`,
      [s.kind, s.ref, s.category, s.severity, s.location, s.summary, s.detail, s.status, s.reporter, s.age]
    );
  }

  // ---- CRM: client (service-user) records ----
  for (const c of CLIENTS) {
    await client.query(
      "INSERT INTO clients (id,su,name,area,status,coordinator,data_json) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [c.id, c.su, c.name, c.area, c.status, c.csm ?? "", JSON.stringify(c)]
    );
  }

  // ---- CRM: sample call-monitor events ----
  const callSamples = [
    { client_id: "CL-004", su: "SU-4021", area: "Offaly", visit_time: "08:00", kind: "late", detail: "Carer running ~25 min late (traffic on N52); client and family notified.", logged_by: "Mary James", age: 0 },
    { client_id: "CL-006", su: "SU-4233", area: "Laois", visit_time: "13:00", kind: "missed", detail: "Lunch call could not be covered — carer called in sick; reallocation in progress.", logged_by: "Mary James", age: 0 },
  ];
  for (const s of callSamples) {
    await client.query(
      `INSERT INTO call_log (client_id,su,area,visit_time,kind,detail,logged_by,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, now() - make_interval(hours => $8))`,
      [s.client_id, s.su, s.area, s.visit_time, s.kind, s.detail, s.logged_by, s.age]
    );
  }

  await client.query(
    "INSERT INTO meta (key,value) VALUES ('seed_version',$1) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    [SEED_VERSION]
  );
}

// ---------------- health ----------------

/** Confirms the DB connection and that content seeded. Safe to expose (no secrets). */
export async function healthCheck(): Promise<{
  ok: boolean;
  courses: number;
  users: number;
  seeded: boolean;
}> {
  const rows = await q<{ courses: number; users: number }>(
    "SELECT (SELECT COUNT(*)::int FROM courses) AS courses, (SELECT COUNT(*)::int FROM users) AS users"
  );
  const r = rows[0];
  return { ok: true, courses: r.courses, users: r.users, seeded: r.courses > 0 };
}

// ---------------- query helpers ----------------

export async function getUserByEmail(email: string): Promise<UserRow | undefined> {
  const rows = await q<UserRow>("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  return rows[0];
}

export async function getUserById(id: number): Promise<UserRow | undefined> {
  const rows = await q<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0];
}

export type EnrollmentView = {
  course_id: string;
  status: string;
  assigned_at: string;
  due_at: string | null;
  best_score: number | null;
  passed: number;
  attempts: number;
};

export async function enrollmentsForUser(userId: number): Promise<EnrollmentView[]> {
  return q<EnrollmentView>(
    `SELECT e.course_id, e.status, e.assigned_at, e.due_at,
            MAX(c.score) AS best_score,
            COALESCE(MAX(c.passed), 0) AS passed,
            COUNT(c.id)::int AS attempts
     FROM enrollments e
     LEFT JOIN completions c ON c.user_id = e.user_id AND c.course_id = e.course_id
     WHERE e.user_id = $1
     GROUP BY e.course_id, e.status, e.assigned_at, e.due_at
     ORDER BY e.assigned_at`,
    [userId]
  );
}

export async function completionsForUser(userId: number): Promise<CompletionRow[]> {
  return q<CompletionRow>(
    "SELECT * FROM completions WHERE user_id = $1 ORDER BY completed_at DESC",
    [userId]
  );
}

/**
 * Record a server-scored completion. attempt_no is derived server-side.
 * If passed, the matching enrollment is marked completed.
 */
export async function recordCompletion(
  userId: number,
  courseId: string,
  score: number,
  passed: boolean
): Promise<CompletionRow> {
  await ensureReady();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const prev = await client.query(
      "SELECT COUNT(*)::int AS n FROM completions WHERE user_id=$1 AND course_id=$2",
      [userId, courseId]
    );
    const attempt = (prev.rows[0].n as number) + 1;
    const ins = await client.query(
      "INSERT INTO completions (user_id,course_id,score,passed,attempt_no) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [userId, courseId, score, passed ? 1 : 0, attempt]
    );
    if (passed) {
      await client.query("UPDATE enrollments SET status='completed' WHERE user_id=$1 AND course_id=$2", [
        userId,
        courseId,
      ]);
    }
    await client.query("COMMIT");
    return ins.rows[0] as CompletionRow;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function isEnrolled(userId: number, courseId: string): Promise<boolean> {
  const rows = await q("SELECT 1 FROM enrollments WHERE user_id=$1 AND course_id=$2", [userId, courseId]);
  return rows.length > 0;
}

// ---------------- manager monitor ----------------

export type CourseComplianceRow = { course_id: string; enrolled: number; completed: number };

export async function courseCompliance(): Promise<CourseComplianceRow[]> {
  return q<CourseComplianceRow>(
    `SELECT e.course_id AS course_id,
            COUNT(DISTINCT e.user_id)::int AS enrolled,
            COUNT(DISTINCT CASE WHEN e.status='completed' THEN e.user_id END)::int AS completed
     FROM enrollments e
     GROUP BY e.course_id`
  );
}

export type StaffComplianceRow = {
  id: number;
  name: string;
  role: string;
  region: string;
  assigned: number;
  completed: number;
};

export async function staffCompliance(): Promise<StaffComplianceRow[]> {
  return q<StaffComplianceRow>(
    `SELECT u.id, u.name, u.role, u.region,
            COUNT(e.id)::int AS assigned,
            COUNT(CASE WHEN e.status='completed' THEN 1 END)::int AS completed
     FROM users u
     LEFT JOIN enrollments e ON e.user_id = u.id
     GROUP BY u.id
     ORDER BY u.name`
  );
}

export async function overallCompliance(): Promise<{ assigned: number; completed: number }> {
  const rows = await q<{ assigned: number; completed: number }>(
    `SELECT COUNT(*)::int AS assigned,
            COUNT(CASE WHEN status='completed' THEN 1 END)::int AS completed
     FROM enrollments`
  );
  return rows[0];
}

// ---------------- Risk & Safety registers ----------------

export type RegisterEntry = {
  id: number;
  kind: string;
  ref: string;
  category: string;
  severity: string;
  location: string | null;
  summary: string;
  detail: string;
  status: string;
  reporter_id: number | null;
  reporter_name: string;
  created_at: string;
};

export async function listRegister(kind: string): Promise<RegisterEntry[]> {
  return q<RegisterEntry>(
    "SELECT * FROM register_entries WHERE kind = $1 ORDER BY created_at DESC, id DESC",
    [kind]
  );
}

export async function getRegisterEntry(kind: string, id: number): Promise<RegisterEntry | undefined> {
  const rows = await q<RegisterEntry>("SELECT * FROM register_entries WHERE kind = $1 AND id = $2", [
    kind,
    id,
  ]);
  return rows[0];
}

/** Open-item count per register kind, for the sidebar badges. */
export async function registerOpenCounts(): Promise<Record<string, number>> {
  const rows = await q<{ kind: string; n: number }>(
    "SELECT kind, COUNT(*)::int AS n FROM register_entries WHERE status='open' GROUP BY kind"
  );
  const out: Record<string, number> = {};
  for (const r of rows) out[r.kind] = r.n;
  return out;
}

export async function createRegisterEntry(input: {
  kind: string;
  prefix: string;
  year: number;
  category: string;
  severity: string;
  location: string | null;
  summary: string;
  detail: string;
  reporterId: number;
  reporterName: string;
}): Promise<RegisterEntry> {
  await ensureReady();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const cnt = await client.query("SELECT COUNT(*)::int AS n FROM register_entries WHERE kind = $1", [
      input.kind,
    ]);
    const ref = `${input.prefix}-${input.year}-${String((cnt.rows[0].n as number) + 1).padStart(3, "0")}`;
    const ins = await client.query(
      `INSERT INTO register_entries (kind,ref,category,severity,location,summary,detail,status,reporter_id,reporter_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'open',$8,$9) RETURNING *`,
      [
        input.kind,
        ref,
        input.category,
        input.severity,
        input.location,
        input.summary,
        input.detail,
        input.reporterId,
        input.reporterName,
      ]
    );
    await client.query("COMMIT");
    const entry = ins.rows[0] as RegisterEntry;
    await logAudit({
      actorId: input.reporterId,
      actorName: input.reporterName,
      action: `${input.kind}.create`,
      target: entry.ref,
      detail: entry.summary,
    });
    return entry;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// ---------------- CRM: clients + PII access log ----------------

export type ClientRow = {
  id: string;
  su: string;
  name: string;
  area: string;
  status: string;
  coordinator: string;
  data_json: string;
};

export async function listClients(): Promise<Client[]> {
  const rows = await q<ClientRow>("SELECT * FROM clients ORDER BY id");
  return rows.map((r) => JSON.parse(r.data_json) as Client);
}

export async function getClient(id: string): Promise<Client | undefined> {
  const rows = await q<ClientRow>("SELECT * FROM clients WHERE id = $1", [id]);
  return rows[0] ? (JSON.parse(rows[0].data_json) as Client) : undefined;
}

export type PiiLogRow = {
  id: number;
  user_id: number | null;
  user_name: string;
  client_id: string | null;
  scope: string;
  reason: string;
  created_at: string;
};

/** Record a PII reveal (who, which client/scope, why) — the GDPR access log. */
export async function logPiiReveal(input: {
  userId: number;
  userName: string;
  clientId: string | null;
  scope: "register" | "client";
  reason: string;
}): Promise<void> {
  await q(
    "INSERT INTO pii_access_log (user_id,user_name,client_id,scope,reason) VALUES ($1,$2,$3,$4,$5)",
    [input.userId, input.userName, input.clientId, input.scope, input.reason]
  );
  await logAudit({
    actorId: input.userId,
    actorName: input.userName,
    action: `pii.reveal.${input.scope}`,
    target: input.clientId,
    detail: input.reason,
  });
}

export async function listPiiLog(limit = 100): Promise<PiiLogRow[]> {
  return q<PiiLogRow>("SELECT * FROM pii_access_log ORDER BY created_at DESC, id DESC LIMIT $1", [
    limit,
  ]);
}

// ---------------- CRM: call log (missed / late / no-show) ----------------

export type CallLogRow = {
  id: number;
  client_id: string | null;
  su: string | null;
  area: string | null;
  visit_time: string | null;
  kind: string;
  detail: string;
  logged_by: string;
  created_at: string;
};

export async function listCallLog(limit = 100): Promise<CallLogRow[]> {
  return q<CallLogRow>("SELECT * FROM call_log ORDER BY created_at DESC, id DESC LIMIT $1", [limit]);
}

export async function createCallEvent(input: {
  clientId: string | null;
  su: string | null;
  area: string | null;
  visitTime: string | null;
  kind: string;
  detail: string;
  loggedBy: string;
}): Promise<CallLogRow> {
  const rows = await q<CallLogRow>(
    `INSERT INTO call_log (client_id,su,area,visit_time,kind,detail,logged_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [input.clientId, input.su, input.area, input.visitTime, input.kind, input.detail, input.loggedBy]
  );
  await logAudit({
    actorName: input.loggedBy,
    action: `call.${input.kind}`,
    target: input.clientId,
    detail: input.detail,
  });
  return rows[0];
}

// ---------------- Improvement hub: sign-offs, routing, assignments ----------------

export type HubIssue = {
  kind: string;
  entry_id: number;
  ref: string;
  category: string;
  severity: string;
  summary: string;
  detail: string;
  status: string;
  reporter_name: string;
  created_at: string;
  dept: string; // effective owning department (routed or default)
  routed: boolean;
  signoff_count: number;
  last_outcome: string | null;
};

/** All register issues with their effective owning department + sign-off state. */
export async function listHubIssues(): Promise<HubIssue[]> {
  const entries = await q<RegisterEntry>("SELECT * FROM register_entries ORDER BY created_at DESC");
  const routes = await q<{ kind: string; entry_id: number; dept: string }>(
    "SELECT kind, entry_id, dept FROM issue_routing"
  );
  const signoffs = await q<{ kind: string; entry_id: number; n: number; last_outcome: string }>(
    `SELECT kind, entry_id, COUNT(*)::int AS n,
            (ARRAY_AGG(outcome ORDER BY created_at DESC))[1] AS last_outcome
     FROM issue_signoffs GROUP BY kind, entry_id`
  );
  const routeMap = new Map(routes.map((r) => [`${r.kind}:${r.entry_id}`, r.dept]));
  const soMap = new Map(signoffs.map((s) => [`${s.kind}:${s.entry_id}`, s]));

  return entries.map((e) => {
    const key = `${e.kind}:${e.id}`;
    const routedDept = routeMap.get(key);
    const so = soMap.get(key);
    return {
      kind: e.kind,
      entry_id: e.id,
      ref: e.ref,
      category: e.category,
      severity: e.severity,
      summary: e.summary,
      detail: e.detail,
      status: e.status,
      reporter_name: e.reporter_name,
      created_at: e.created_at,
      dept: routedDept ?? defaultDept(e.kind),
      routed: !!routedDept,
      signoff_count: so?.n ?? 0,
      last_outcome: so?.last_outcome ?? null,
    };
  });
}

export type SignoffRow = {
  id: number;
  kind: string;
  entry_id: number;
  outcome: string;
  note: string;
  actions_json: string;
  signed_by: string;
  created_at: string;
};

export async function listSignoffs(kind: string, entryId: number): Promise<SignoffRow[]> {
  return q<SignoffRow>(
    "SELECT * FROM issue_signoffs WHERE kind=$1 AND entry_id=$2 ORDER BY created_at DESC",
    [kind, entryId]
  );
}

export type PushInput = {
  kind: "course" | "sop";
  refId: string;
  refTitle: string;
  audience: string;
  note: string;
  due: string | null;
};

/**
 * Record an issue review: writes the sign-off, optionally re-routes the issue
 * to another department, fires any training/SOP pushes, and closes the issue.
 * All in one transaction.
 */
export async function recordSignoff(input: {
  kind: string;
  entryId: number;
  outcome: string;
  note: string;
  actions: string[];
  routeDept: string | null;
  pushes: PushInput[];
  close: boolean;
  signedBy: string;
}): Promise<void> {
  await ensureReady();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO issue_signoffs (kind,entry_id,outcome,note,actions_json,signed_by) VALUES ($1,$2,$3,$4,$5,$6)",
      [input.kind, input.entryId, input.outcome, input.note, JSON.stringify(input.actions), input.signedBy]
    );
    if (input.routeDept) {
      await client.query(
        `INSERT INTO issue_routing (kind,entry_id,dept,routed_by) VALUES ($1,$2,$3,$4)
         ON CONFLICT (kind,entry_id) DO UPDATE SET dept=excluded.dept, routed_by=excluded.routed_by, routed_at=now()`,
        [input.kind, input.entryId, input.routeDept, input.signedBy]
      );
    }
    for (const p of input.pushes) {
      await client.query(
        "INSERT INTO assignments (kind,ref_id,ref_title,audience,note,due,assigned_by) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [p.kind, p.refId, p.refTitle, p.audience, p.note, p.due, input.signedBy]
      );
    }
    if (input.close) {
      await client.query("UPDATE register_entries SET status='closed' WHERE id=$1", [input.entryId]);
    }
    await client.query("COMMIT");
    await logAudit({
      actorName: input.signedBy,
      action: `${input.kind}.signoff`,
      target: `${input.kind}#${input.entryId}`,
      detail: `${input.outcome}${input.routeDept ? ` · routed to ${input.routeDept}` : ""}${input.close ? " · closed" : ""}`,
    });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export type AssignmentRow = {
  id: number;
  kind: string;
  ref_id: string;
  ref_title: string;
  audience: string;
  note: string;
  due: string | null;
  assigned_by: string;
  withdrawn: boolean;
  created_at: string;
};

export async function listAssignments(): Promise<AssignmentRow[]> {
  return q<AssignmentRow>("SELECT * FROM assignments ORDER BY created_at DESC");
}

export async function createAssignment(input: PushInput & { assignedBy: string }): Promise<AssignmentRow> {
  const rows = await q<AssignmentRow>(
    `INSERT INTO assignments (kind,ref_id,ref_title,audience,note,due,assigned_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [input.kind, input.refId, input.refTitle, input.audience, input.note, input.due, input.assignedBy]
  );
  await logAudit({
    actorName: input.assignedBy,
    action: `assign.${input.kind}`,
    target: input.refId,
    detail: `${input.refTitle} → ${input.audience}`,
  });
  return rows[0];
}

export async function withdrawAssignment(id: number): Promise<void> {
  await q("UPDATE assignments SET withdrawn=true WHERE id=$1", [id]);
  await logAudit({ actorName: "system", action: "assign.withdraw", target: `assignment#${id}` });
}

// ---------------- audit log (general accountability trail) ----------------

export type AuditRow = {
  id: number;
  actor_id: number | null;
  actor_name: string;
  action: string;
  target: string | null;
  detail: string;
  created_at: string;
};

/**
 * Append a general audit event. Best-effort accountability trail (GDPR Art. 5(2))
 * — never let an audit-write failure break the underlying action.
 */
export async function logAudit(input: {
  actorId?: number | null;
  actorName: string;
  action: string;
  target?: string | null;
  detail?: string;
}): Promise<void> {
  try {
    await q(
      "INSERT INTO audit_log (actor_id,actor_name,action,target,detail) VALUES ($1,$2,$3,$4,$5)",
      [input.actorId ?? null, input.actorName, input.action, input.target ?? null, input.detail ?? ""]
    );
  } catch {
    // swallow — auditing must not break the primary operation
  }
}

export async function listAuditLog(limit = 200): Promise<AuditRow[]> {
  return q<AuditRow>("SELECT * FROM audit_log ORDER BY created_at DESC, id DESC LIMIT $1", [limit]);
}

// ---------------- access register + data-subject access (DSAR) ----------------

export type AccessUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  region: string;
  client_id: string | null;
};

/** All logins with role/region + any linked client — the access register. */
export async function listAccessUsers(): Promise<AccessUser[]> {
  return q<AccessUser>(
    "SELECT id, name, email, role, region, client_id FROM users ORDER BY role, name"
  );
}

export type DsarBundle = {
  generatedAt: string;
  client: Client;
  callEvents: CallLogRow[];
  accessHistory: PiiLogRow[];
};

/**
 * Assemble everything held about one client for a data-subject access request
 * (GDPR Art. 15 / 20): the full record plus related call events and the log of
 * who accessed their identifiable data.
 */
export async function buildClientDsar(clientId: string): Promise<DsarBundle | undefined> {
  const client = await getClient(clientId);
  if (!client) return undefined;
  const callEvents = await q<CallLogRow>(
    "SELECT * FROM call_log WHERE client_id = $1 ORDER BY created_at DESC",
    [clientId]
  );
  const accessHistory = await q<PiiLogRow>(
    "SELECT * FROM pii_access_log WHERE client_id = $1 ORDER BY created_at DESC",
    [clientId]
  );
  return {
    generatedAt: new Date().toISOString(),
    client,
    callEvents,
    accessHistory,
  };
}

/** Count of DSAR exports recorded in the audit log. */
export async function dsarExportCount(): Promise<number> {
  const rows = await q<{ n: number }>(
    "SELECT COUNT(*)::int AS n FROM audit_log WHERE action = 'dsar.export'"
  );
  return rows[0]?.n ?? 0;
}
