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

const SEED_VERSION = "5";
const DEMO_PASSWORD = "liberty"; // demo accounts only; see README
const SEED_LOCK_KEY = 727274; // arbitrary advisory-lock id

export type Role =
  | "Care Coordinator"
  | "Office Administrator"
  | "On-Call Manager"
  | "Client Service Manager"
  | "Manager";

/** Roles allowed to view the manager Monitor / oversight dashboards. */
export const OVERSIGHT_ROLES: Role[] = ["Manager", "Client Service Manager"];

export type UserRow = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  region: string;
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
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
  `);
}

async function seed(client: PoolClient) {
  // ---- content: courses ----
  await client.query("DELETE FROM courses");
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
  await client.query("DELETE FROM sops");
  for (const s of Object.values(SOPS)) {
    await client.query("INSERT INTO sops (id,title,purpose,steps_json) VALUES ($1,$2,$3,$4)", [
      s.id,
      s.title,
      s.purpose,
      JSON.stringify(s.steps),
    ]);
  }

  // ---- content: pathways ----
  await client.query("DELETE FROM pathways");
  for (const p of PATHWAYS) {
    await client.query(
      "INSERT INTO pathways (role,icon,people,focus,modules_json) VALUES ($1,$2,$3,$4,$5)",
      [p.role, p.icon, p.people, p.focus, JSON.stringify(p.modules)]
    );
  }

  // ---- demo users (dev only; replace with real accounts in production) ----
  await client.query("DELETE FROM register_entries");
  await client.query("DELETE FROM completions");
  await client.query("DELETE FROM enrollments");
  await client.query("DELETE FROM users");
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const demo: Array<{ name: string; email: string; role: Role; region: string }> = [
    { name: "Mary James", email: "coordinator@libertyhomecare.ie", role: "Care Coordinator", region: "Offaly" },
    { name: "Sinead Kelly", email: "admin@libertyhomecare.ie", role: "Office Administrator", region: "Laois" },
    { name: "Tom Brennan", email: "oncall@libertyhomecare.ie", role: "On-Call Manager", region: "Kildare" },
    { name: "Ana Lyons", email: "csm@libertyhomecare.ie", role: "Client Service Manager", region: "Offaly" },
    { name: "Laura Souza", email: "manager@libertyhomecare.ie", role: "Manager", region: "All regions" },
  ];

  for (const u of demo) {
    const ins = await client.query(
      "INSERT INTO users (name,email,password_hash,role,region) VALUES ($1,$2,$3,$4,$5) RETURNING id",
      [u.name, u.email, hash, u.role, u.region]
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
    return ins.rows[0] as RegisterEntry;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
