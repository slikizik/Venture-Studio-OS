// TEST-DAT-004 — Create backups before destructive migrations and imports.
// Verifies the backup service (src/lib/backup.ts) creates a timestamped copy
// BEFORE a destructive operation and REFUSES to proceed when the backup fails.
import { mkdirSync, mkdtempSync, writeFileSync, existsSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createBackup, withBackup, pruneBackups } from "../lib/backup";
import { backupRequestSchema } from "../lib/validation";

let workdir: string;

function seedDb(p: string) {
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, "SQLite format 3\x00 demo database contents", "binary"); // minimal sqlite header for test fixture
}

beforeEach(() => {
  workdir = mkdtempSync(path.join(tmpdir(), "vso-dat004-"));
});
afterEach(() => {
  rmSync(workdir, { recursive: true, force: true });
});

describe("TEST-DAT-004: backup before destructive operation", () => {
  it("creates a timestamped backup before running the destructive op", async () => {
    const db = path.join(workdir, "live.db");
    seedDb(db);
    const backupDir = path.join(workdir, "backups");

    let mutated = false;
    const { backup, result } = await withBackup(
      backupRequestSchema.parse({ trigger: "MIGRATION", reason: "schema v2", sourceDbPath: db, backupDir }),
      async () => {
        mutated = true; // simulate destructive migration
        return "MIGRATED";
      },
    );

    expect(mutated).toBe(true);
    expect(result).toBe("MIGRATED");
    expect(existsSync(backup.backupFilePath)).toBe(true);
    // backup content equals the pre-mutation source
    expect(readFileSync(backup.backupFilePath).equals(readFileSync(db))).toBe(true);
    // meta file records the trigger + reason
    const meta = JSON.parse(readFileSync(backup.backupMetaPath, "utf-8"));
    expect(meta.trigger).toBe("MIGRATION");
    expect(meta.reason).toBe("schema v2");
  });

  it("REFUSES the destructive op when backup creation fails", async () => {
    const missingDb = path.join(workdir, "does-not-exist.db");
    const backupDir = path.join(workdir, "backups");
    let mutated = false;

    await expect(
      withBackup(
        backupRequestSchema.parse({ trigger: "IMPORT", reason: "bulk import", sourceDbPath: missingDb, backupDir }),
        async () => {
          mutated = true; // must NOT run
          return "IMPORTED";
        },
      ),
    ).rejects.toThrow(/not found|refusing/i);

    expect(mutated).toBe(false); // destructive op was never invoked
  });

  it("refuses to back up non-SQLite paths", async () => {
    const csv = path.join(workdir, "data.csv");
    writeFileSync(csv, "a,b");
    await expect(
      createBackup(backupRequestSchema.parse({ trigger: "MANUAL", reason: "x", sourceDbPath: csv, backupDir: workdir })),
    ).rejects.toThrow(/non-SQLite/i);
  });

  it("prunes backups beyond retention", async () => {
    const db = path.join(workdir, "live.db");
    seedDb(db);
    const backupDir = path.join(workdir, "backups");
    for (let i = 0; i < 12; i++) {
      await createBackup(backupRequestSchema.parse({ trigger: "MANUAL", reason: `b${i}`, sourceDbPath: db, backupDir }));
    }
    const removed = await pruneBackups(backupDir, 10);
    expect(removed.length).toBe(2);
  });
});
