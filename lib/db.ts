/**
 * Data-access layer (better-sqlite3).
 *
 * A deliberately small, isolated module so the storage engine can be swapped
 * for Postgres in production (see README "Production / GDPR"). The whole app
 * touches the database only through the typed helpers exported here.
 *
 * On first import the schema is created and seeded (idempotently) from the
 * migrated QMS content in lib/content.ts.
 */
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import bcrypt from "bcryptjs";
import {
  COURSES,
  SOPS,
  PATHWAYS,
  getPathwayByRole,
  type Course,
} from "./content";

const SEED_VERSION = "4";
const DEMO_PASSWORD = "liberty"; // demo accounts only; see README

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

// ---- singleton connection (survives Next.js dev hot-reload) ----
const g = globalThis as unknown as { __llhDb?: Database.Database };

function connect(): Database.Database {
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const db = new Database(path.join(dir, "qms.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  seed(db);
  return db;
}

export function getDb(): Database.Database {
  if (!g.__llhDb) g.__llhDb = connect();
  return g.__llhDb;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      region TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id),
      assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
      due_at TEXT,
      status TEXT NOT NULL DEFAULT 'assigned',
      UNIQUE (user_id, course_id)
    );
    CREATE TABLE IF NOT EXISTS completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id),
      completed_at TEXT NOT NULL DEFAULT (datetime('now')),
      score INTEGER NOT NULL,
      passed INTEGER NOT NULL,
      attempt_no INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_completions_user ON completions(user_id);
    CREATE INDEX IF NOT EXISTS idx_completions_course ON completions(course_id);
  `);
}

function seed(db: Database.Database) {
  const current = db.prepare("SELECT value FROM meta WHERE key='seed_version'").get() as
    | { value: string }
    | undefined;
  if (current?.value === SEED_VERSION) return;

  const tx = db.transaction(() => {
    // ---- content: courses ----
    db.prepare("DELETE FROM courses").run();
    const insCourse = db.prepare(`
      INSERT INTO courses (id,title,cat,policy,duration,format,summary,objectives_json,lessons_json,quiz_json)
      VALUES (@id,@title,@cat,@policy,@duration,@format,@summary,@objectives_json,@lessons_json,@quiz_json)
    `);
    for (const [id, c] of Object.entries(COURSES) as [string, Course][]) {
      insCourse.run({
        id,
        title: c.title,
        cat: c.cat,
        policy: c.policy,
        duration: c.duration,
        format: c.format,
        summary: c.summary,
        objectives_json: JSON.stringify(c.objectives),
        lessons_json: JSON.stringify(c.lessons),
        quiz_json: JSON.stringify(c.quiz),
      });
    }

    // ---- content: sops ----
    db.prepare("DELETE FROM sops").run();
    const insSop = db.prepare(
      "INSERT INTO sops (id,title,purpose,steps_json) VALUES (@id,@title,@purpose,@steps_json)"
    );
    for (const s of Object.values(SOPS)) {
      insSop.run({
        id: s.id,
        title: s.title,
        purpose: s.purpose,
        steps_json: JSON.stringify(s.steps),
      });
    }

    // ---- content: pathways ----
    db.prepare("DELETE FROM pathways").run();
    const insPath = db.prepare(
      "INSERT INTO pathways (role,icon,people,focus,modules_json) VALUES (@role,@icon,@people,@focus,@modules_json)"
    );
    for (const p of PATHWAYS) {
      insPath.run({
        role: p.role,
        icon: p.icon,
        people: p.people,
        focus: p.focus,
        modules_json: JSON.stringify(p.modules),
      });
    }

    // ---- demo users (dev only; replace with real accounts in production) ----
    db.prepare("DELETE FROM completions").run();
    db.prepare("DELETE FROM enrollments").run();
    db.prepare("DELETE FROM users").run();
    const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
    const demo: Array<{ name: string; email: string; role: Role; region: string }> = [
      { name: "Mary James", email: "coordinator@libertyhomecare.ie", role: "Care Coordinator", region: "Offaly" },
      { name: "Sinead Kelly", email: "admin@libertyhomecare.ie", role: "Office Administrator", region: "Laois" },
      { name: "Tom Brennan", email: "oncall@libertyhomecare.ie", role: "On-Call Manager", region: "Kildare" },
      { name: "Ana Lyons", email: "csm@libertyhomecare.ie", role: "Client Service Manager", region: "Offaly" },
      { name: "Laura Souza", email: "manager@libertyhomecare.ie", role: "Manager", region: "All regions" },
    ];
    const insUser = db.prepare(
      "INSERT INTO users (name,email,password_hash,role,region) VALUES (@name,@email,@hash,@role,@region)"
    );
    const insEnroll = db.prepare(
      "INSERT INTO enrollments (user_id,course_id,status) VALUES (?,?,?)"
    );
    const insCompletion = db.prepare(
      "INSERT INTO completions (user_id,course_id,score,passed,attempt_no,completed_at) VALUES (?,?,?,?,?,datetime('now',?))"
    );

    for (const u of demo) {
      const info = insUser.run({ ...u, hash });
      const uid = Number(info.lastInsertRowid);
      const pathway = getPathwayByRole(u.role);
      // Managers are oversight-only — no learner pathway, so no enrollments.
      const enrolls = pathway?.modules ?? [];
      let offset = 0;
      for (const [courseId, status] of enrolls) {
        if (!COURSES[courseId]) continue;
        const done = status === "C";
        insEnroll.run(uid, courseId, done ? "completed" : "assigned");
        // Seed a realistic completion history for modules marked complete.
        if (done) {
          offset += 3;
          const score = 80 + ((uid + offset) % 5) * 4; // 80–96
          insCompletion.run(uid, courseId, score, 1, 1, `-${offset} days`);
        }
      }
    }

    db.prepare(
      "INSERT INTO meta (key,value) VALUES ('seed_version',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
    ).run(SEED_VERSION);
  });
  tx();
}

// ---------------- query helpers ----------------

export function getUserByEmail(email: string): UserRow | undefined {
  return getDb().prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase()) as
    | UserRow
    | undefined;
}

export function getUserById(id: number): UserRow | undefined {
  return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
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

export function enrollmentsForUser(userId: number): EnrollmentView[] {
  return getDb()
    .prepare(
      `SELECT e.course_id, e.status, e.assigned_at, e.due_at,
              MAX(c.score) AS best_score,
              MAX(c.passed) AS passed,
              COUNT(c.id) AS attempts
       FROM enrollments e
       LEFT JOIN completions c ON c.user_id = e.user_id AND c.course_id = e.course_id
       WHERE e.user_id = ?
       GROUP BY e.course_id
       ORDER BY e.assigned_at`
    )
    .all(userId) as EnrollmentView[];
}

export function completionsForUser(userId: number): CompletionRow[] {
  return getDb()
    .prepare("SELECT * FROM completions WHERE user_id = ? ORDER BY completed_at DESC")
    .all(userId) as CompletionRow[];
}

/**
 * Record a server-scored completion. attempt_no is derived server-side.
 * If passed, the matching enrollment is marked completed.
 */
export function recordCompletion(
  userId: number,
  courseId: string,
  score: number,
  passed: boolean
): CompletionRow {
  const db = getDb();
  const tx = db.transaction(() => {
    const prev = db
      .prepare("SELECT COUNT(*) AS n FROM completions WHERE user_id=? AND course_id=?")
      .get(userId, courseId) as { n: number };
    const attempt = prev.n + 1;
    const info = db
      .prepare(
        "INSERT INTO completions (user_id,course_id,score,passed,attempt_no) VALUES (?,?,?,?,?)"
      )
      .run(userId, courseId, score, passed ? 1 : 0, attempt);
    if (passed) {
      db.prepare(
        "UPDATE enrollments SET status='completed' WHERE user_id=? AND course_id=?"
      ).run(userId, courseId);
    }
    return db.prepare("SELECT * FROM completions WHERE id=?").get(info.lastInsertRowid) as CompletionRow;
  });
  return tx();
}

export function isEnrolled(userId: number, courseId: string): boolean {
  const row = getDb()
    .prepare("SELECT 1 FROM enrollments WHERE user_id=? AND course_id=?")
    .get(userId, courseId);
  return !!row;
}

// ---------------- manager monitor ----------------

export type CourseComplianceRow = {
  course_id: string;
  enrolled: number;
  completed: number;
};

export function courseCompliance(): CourseComplianceRow[] {
  return getDb()
    .prepare(
      `SELECT e.course_id AS course_id,
              COUNT(DISTINCT e.user_id) AS enrolled,
              COUNT(DISTINCT CASE WHEN e.status='completed' THEN e.user_id END) AS completed
       FROM enrollments e
       GROUP BY e.course_id`
    )
    .all() as CourseComplianceRow[];
}

export type StaffComplianceRow = {
  id: number;
  name: string;
  role: string;
  region: string;
  assigned: number;
  completed: number;
};

export function staffCompliance(): StaffComplianceRow[] {
  return getDb()
    .prepare(
      `SELECT u.id, u.name, u.role, u.region,
              COUNT(e.id) AS assigned,
              COUNT(CASE WHEN e.status='completed' THEN 1 END) AS completed
       FROM users u
       LEFT JOIN enrollments e ON e.user_id = u.id
       GROUP BY u.id
       ORDER BY u.name`
    )
    .all() as StaffComplianceRow[];
}

export function overallCompliance(): { assigned: number; completed: number } {
  return getDb()
    .prepare(
      `SELECT COUNT(*) AS assigned,
              COUNT(CASE WHEN status='completed' THEN 1 END) AS completed
       FROM enrollments`
    )
    .get() as { assigned: number; completed: number };
}
