// DAT-004 — Create backups before destructive migrations and imports.
//
// A "destructive migration" is any operation that can irreversibly change or
// remove persisted data: Prisma migrate/reset, raw SQL that drops/alters data,
// or a bulk import that overwrites/merges existing records.
//
// This service is the SINGLE place that performs such operations. Every entry
// point (a) creates a timestamped copy of the live SQLite database (and, when
// present, the migration journal) into a retention-managed backup directory,
// (b) records an ActivityRecord of the backup, then (c) performs the
// destructive operation. If the backup fails, the destructive operation is
// REFUSED — there is no path that mutates data without a successful backup.

import { promises as fs } from "fs";
import path from "path";
import { prisma } from "./prisma";
import { backupRequestSchema, type BackupRequest } from "./validation";

export interface BackupResult {
  backupFilePath: string;
  backupMetaPath: string;
  timestamp: string;
  bytes: number;
}

const DEFAULT_RETENTION = 10;

function timestamp(): string {
  // UTC, filesystem-safe, sortable.
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

function isSqliteFile(p: string): boolean {
  return p.toLowerCase().endsWith(".db") || p.toLowerCase().endsWith(".sqlite") || p.toLowerCase().endsWith(".sqlite3");
}

/**
 * Copy the live database (and any sibling SQLite shm/wal/journal files) to the
 * backup directory. Returns the size of the primary db copy in bytes.
 */
async function copyDbWithCompanions(sourceDbPath: string, destDbPath: string): Promise<number> {
  const dir = path.dirname(sourceDbPath);
  const base = path.basename(sourceDbPath);
  const companions = [base + "-shm", base + "-wal", base + "-journal"];
  await fs.mkdir(path.dirname(destDbPath), { recursive: true });
  await fs.copyFile(sourceDbPath, destDbPath);
  const bytes = (await fs.stat(destDbPath)).size;
  for (const c of companions) {
    const src = path.join(dir, c);
    try {
      await fs.copyFile(src, path.join(path.dirname(destDbPath), c));
    } catch {
      // companion files are optional
    }
  }
  return bytes;
}

/**
 * Create a backup of the live database before a destructive operation.
 * Throws if the backup cannot be created — in which case callers MUST NOT
 * proceed with the destructive operation.
 */
export async function createBackup(req: BackupRequest): Promise<BackupResult> {
  const { sourceDbPath, backupDir } = backupRequestSchema.parse(req);

  if (!isSqliteFile(sourceDbPath)) {
    throw new Error(`Refusing to back up non-SQLite path: ${sourceDbPath}`);
  }

  const stat = await fs.stat(sourceDbPath).catch(() => null);
  if (!stat) {
    throw new Error(`Source database not found: ${sourceDbPath}`);
  }

  await ensureDir(backupDir);
  const ts = timestamp();
  const baseName = path.basename(sourceDbPath);
  const backupFilePath = path.join(backupDir, `${ts}__${baseName}`);
  const bytes = await copyDbWithCompanions(sourceDbPath, backupFilePath);

  const meta = {
    timestamp: new Date().toISOString(),
    trigger: req.trigger,
    reason: req.reason,
    sourceDbPath,
    backupFilePath,
    bytes,
  };
  const backupMetaPath = backupFilePath + ".meta.json";
  await fs.writeFile(backupMetaPath, JSON.stringify(meta, null, 2), "utf-8");

  // Audit record of the backup itself (DATA_MODEL audit requirement).
  try {
    await prisma.activityRecord.create({
      data: {
        actor: "system",
        action: "BACKUP_CREATED",
        entityType: "Database",
        entityId: sourceDbPath,
        summary: `Pre-${req.trigger.toLowerCase()} backup created before destructive operation: ${req.reason}`,
        metadata: JSON.stringify({ backupFilePath, bytes }),
      },
    });
  } catch {
    // Activity logging must not block the backup, but the file copy already succeeded.
  }

  return { backupFilePath, backupMetaPath, timestamp: ts, bytes };
}

/**
 * Thin wrapper: run a destructive operation only after a successful backup.
 * Used by migration/import callers. If the backup throws, the operation is
 * never invoked.
 */
export async function withBackup<T>(
  req: BackupRequest,
  destructiveOp: () => Promise<T>,
): Promise<{ backup: BackupResult; result: T }> {
  const backup = await createBackup(req); // throws if backup fails
  const result = await destructiveOp();
  return { backup, result };
}

/** Retention: keep the most recent N backups, delete older ones. */
export async function pruneBackups(backupDir: string, retention = DEFAULT_RETENTION): Promise<string[]> {
  await ensureDir(backupDir);
  const files = (await fs.readdir(backupDir)).filter((f) => f.endsWith(".db") || f.toLowerCase().endsWith(".sqlite"));
  const withTime = files
    .map((f) => ({ f, mtime: 0 }))
    .sort(); // name-prefixed with sortable timestamp
  // Re-stat for true mtime ordering as a safety net.
  const detailed = [];
  for (const { f } of withTime) {
    const p = path.join(backupDir, f);
    const s = await fs.stat(p).catch(() => null);
    if (s) detailed.push({ f, mtime: s.mtimeMs });
  }
  detailed.sort((a, b) => b.mtime - a.mtime);
  const toDelete = detailed.slice(retention);
  const removed: string[] = [];
  for (const d of toDelete) {
    await fs.rm(path.join(backupDir, d.f), { force: true });
    await fs.rm(path.join(backupDir, d.f + ".meta.json"), { force: true }).catch(() => {});
    removed.push(d.f);
  }
  return removed;
}
