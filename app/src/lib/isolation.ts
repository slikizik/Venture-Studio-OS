// ENV-003 — Prevent runtime data sharing between isolated environments.
//
// VSO supports multiple registered software-development environments (see
// ENV-001/002). Each environment MUST own a distinct database file, a distinct
// storage directory, and distinct secret/configuration sources. This module is
// the single place that enforces that boundary at configuration time so two
// environments can never read or write each other's runtime data.
//
// It deliberately performs NO I/O against other environments — it only compares
// declared configuration. The runtime data store (Prisma DATABASE_URL) is bound
// once at process start, so a valid config that passes validateEnvironmentIsolation
// guarantees physical isolation.

export interface EnvironmentConfig {
  id: string;
  name: string;
  /** Absolute path to this environment's SQLite database file. */
  dbPath: string;
  /** Absolute path to this environment's private storage directory. */
  storageDir: string;
  /** Source of secrets/config (e.g. a .env file path). Must be env-specific. */
  secretSource: string;
}

function normalize(p: string): string {
  // Resolve to a canonical absolute form for comparison.
  return p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

/**
 * ENV-003 — Validate that a set of environments do not share runtime data.
 * Throws on the first detected collision. Returns true when isolated.
 */
export function assertNoCrossEnvLeak(environments: EnvironmentConfig[]): true {
  const byDb = new Map<string, string>();
  const byStorage = new Map<string, string>();
  const bySecret = new Map<string, string>();

  for (const env of environments) {
    if (!env.id || !env.name) {
      throw new Error("Environment config requires id and name");
    }
    const db = normalize(env.dbPath);
    const storage = normalize(env.storageDir);
    const secret = normalize(env.secretSource);

    if (byDb.has(db)) {
      throw new Error(
        `ENV-003 isolation violation: environments "${byDb.get(db)}" and "${env.id}" share database path "${env.dbPath}"`,
      );
    }
    if (byStorage.has(storage)) {
      throw new Error(
        `ENV-003 isolation violation: environments "${byStorage.get(storage)}" and "${env.id}" share storage directory "${env.storageDir}"`,
      );
    }
    if (bySecret.has(secret)) {
      throw new Error(
        `ENV-003 isolation violation: environments "${bySecret.get(secret)}" and "${env.id}" share secret source "${env.secretSource}"`,
      );
    }
    byDb.set(db, env.id);
    byStorage.set(storage, env.id);
    bySecret.set(secret, env.id);
  }
  return true;
}

/**
 * ENV-003 — Given the active environment and a candidate alternate, confirm the
 * active runtime is bound to data that the alternate environment cannot reach.
 */
export function isEnvIsolatedFrom(
  active: EnvironmentConfig,
  other: EnvironmentConfig,
): boolean {
  try {
    assertNoCrossEnvLeak([active, other]);
    return true;
  } catch {
    return false;
  }
}
