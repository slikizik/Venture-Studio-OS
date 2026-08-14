// Shared test harness for Phase 02 service tests.
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

export interface TestDb {
  fileName: string;
  // relative path used for DATABASE_URL (relative to prisma dir)
  relative: string;
}

/**
 * Create an isolated test database inside app/prisma/ and push the schema.
 * Call BEFORE importing @/lib/* services (they read DATABASE_URL at module load).
 */
export function setupTestDb(name: string): TestDb {
  const fileName = `_test_${name}.db`;
  const relative = `./${fileName}`; // resolved relative to prisma/ by Prisma
  process.env.DATABASE_URL = `file:${relative}`;
  execFileSync(
    "npx",
    ["prisma", "db", "push", "--skip-generate", "--accept-data-loss", "--schema", path.join(PRISMA_DIR, "schema.prisma")],
    {
      cwd: PRISMA_DIR, // ensure relative file: resolves to prisma/
      stdio: "ignore",
      shell: true,
      env: { ...process.env, DATABASE_URL: `file:${relative}` },
    },
  );
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

/** Safety net: remove any leftover _test_*.db files in prisma/ (e.g. from a crashed run). */
export function cleanupStrayTestDbs() {
  try {
    for (const f of readdirSync(PRISMA_DIR)) {
      if (f.startsWith("_test_") && (f.endsWith(".db") || f.endsWith(".db-wal") || f.endsWith(".db-shm") || f.endsWith(".db-journal"))) {
        rmSync(path.join(PRISMA_DIR, f), { force: true });
      }
    }
  } catch {
    /* ignore */
  }
}
