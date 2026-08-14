// Shared test harness for Phase 02+ service tests.
// Each test file calls setupTestDb() BEFORE importing any @/lib module so the
// Prisma singleton binds to an isolated temp SQLite database.
//
// IMPORTANT: Prisma resolves a relative `file:./x.db` DATABASE_URL relative to
// the schema directory (app/prisma/), NOT the process cwd. So we place the test
// DB inside app/prisma/ and use the SAME relative path for both `prisma db push`
// and the runtime client, guaranteeing they hit the same file.
import { execFileSync } from "node:child_process";
import { rmSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";

const PRISMA_DIR = path.resolve(__dirname, "..", "..", "prisma");
const SCHEMA = path.join(PRISMA_DIR, "schema.prisma");

// Per-process session token embedded in every DB filename this process creates.
// This is the FIX for a real cross-worker bug: Vitest (pool: "forks") runs test
// files in separate worker processes. Each process's `afterAll` calls
// cleanupStrayTestDbs(), which (previously) scanned prisma/ for ALL _test_*.db
// files and deleted any not in its own process-local registry — including a
// sibling worker's still-running DB. That silently dropped tables mid-run
// ("main.Project does not exist", passing alone but failing in a suite).
// Embedding the session token means cleanupStrayTestDbs() can ONLY ever delete
// DBs owned by THIS process, so it can never touch a sibling worker's database.
const SESSION = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Process-local safety net (backs up the session-token scoping below).
const ACTIVE_TEST_DBS = new Set<string>();

export interface TestDb {
  fileName: string;
  // relative path used for DATABASE_URL (relative to prisma dir)
  relative: string;
}

/**
 * Push the schema to an isolated test DB inside app/prisma/.
 *
 * The Prisma CLI's SQLite writer can hit a transient "database is locked" when
 * several test workers push concurrently. Previously a failed push was hidden by
 * `stdio: "ignore"`, leaving a table-less .db and a confusing runtime error. We
 * now surface push failures and retry on transient engine-lock errors so the
 * outcome is deterministic: either a fully-pushed DB or a loud failure.
 */
function pushSchema(relative: string, attempt = 0): void {
  const maxAttempts = 4;
  try {
    execFileSync(
      "npx",
      ["prisma", "db", "push", "--skip-generate", "--accept-data-loss", "--schema", SCHEMA],
      {
        cwd: PRISMA_DIR,
        // capture stderr so a failed push is never silent
        stdio: ["ignore", "ignore", "pipe"],
        shell: true,
        env: { ...process.env, DATABASE_URL: `file:${relative}` },
      },
    );
  } catch (err) {
    if (attempt < maxAttempts - 1) {
      // transient engine-lock race: back off and retry
      execFileSync("node", ["-e", "setTimeout(()=>process.exit(0),600)"]);
      pushSchema(relative, attempt + 1);
      return;
    }
    throw new Error(
      `prisma db push failed after ${maxAttempts} attempts (DATABASE_URL=file:${relative}): ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

/**
 * Create an isolated test database inside app/prisma/ and push the schema.
 * Call BEFORE importing @/lib/* services (they read DATABASE_URL at module load).
 */
export function setupTestDb(name: string): TestDb {
  const fileName = `_test_${name}_${SESSION}.db`;
  const relative = `./${fileName}`; // resolved relative to prisma/ by Prisma
  process.env.DATABASE_URL = `file:${relative}`;
  pushSchema(relative);
  // Register so the same-process safety net never deletes this DB.
  ACTIVE_TEST_DBS.add(fileName);
  return { fileName, relative };
}

export async function teardownTestDb(db: TestDb) {
  // Must release the SQLite file handle (and WAL/shm) before unlinking,
  // otherwise Windows holds the file and unlink throws EBUSY.
  try {
    await prisma.$disconnect();
  } catch {
    /* ignore */
  }
  for (const ext of ["", "-journal", "-wal", "-shm"]) {
    const p = path.join(PRISMA_DIR, `${db.fileName}${ext}`);
    if (existsSync(p)) {
      try {
        rmSync(p, { force: true });
      } catch {
        /* retry ignored */
      }
    }
  }
}

/**
 * Safety net: remove ONLY orphaned _test_*.db files created by THIS process
 * session. We scope by SESSION (embedded in the filename) so a worker can never
 * delete a database another concurrently-running worker is still using — that
 * was the original source of "table does not exist" in subset/full runs.
 * Files from crashed runs (same session, not in ACTIVE_TEST_DBS) are cleaned.
 */
export function cleanupStrayTestDbs() {
  try {
    for (const f of readdirSync(PRISMA_DIR)) {
      if (!f.startsWith("_test_")) continue;
      if (!(f.endsWith(".db") || f.endsWith(".db-wal") || f.endsWith(".db-shm") || f.endsWith(".db-journal"))) continue;
      // Only ever touch databases this process session created.
      if (!f.includes(SESSION)) continue;
      const base = f.replace(/(\.db-wal|\.db-shm|\.db-journal|\.db)$/, ".db");
      if (ACTIVE_TEST_DBS.has(base)) continue; // still in use by a live test file in this process
      rmSync(path.join(PRISMA_DIR, f), { force: true });
    }
  } catch {
    /* ignore */
  }
}
