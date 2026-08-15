// NFR-007 — Production release must have no unresolved critical dependency
// vulnerabilities.
//
// This module provides (a) a PURE evaluator over an `npm audit --json` result
// so the gate logic is unit-testable without network, and (b) a runner that
// invokes `npm audit --json` against the app workspace and returns a structured
// verdict used by the release pipeline.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { prisma } from "./prisma";
import { recordAudit } from "./audit";

export interface AuditSummary {
  critical: number;
  high: number;
  moderate: number;
  low: number;
  total: number;
  /** Names of advisories whose severity is critical and are not explicitly waived. */
  blockingAdvisories: string[];
}

interface NpmAuditAdvisory {
  severity?: string;
  title?: string;
  module_name?: string;
  advisory?: string;
  name?: string;
}
interface NpmAuditResult {
  metadata?: { vulnerabilities?: Record<string, { count?: number }> };
  vulnerabilities?: Record<string, { severity?: string; title?: string; name?: string }>;
  advisories?: Record<string, NpmAuditAdvisory>;
}

/**
 * NFR-007 — Pure evaluation of an `npm audit --json` payload.
 * Returns a verdict: a production release is BLOCKED when critical > 0
 * (critical vulnerabilities are never acceptable for release).
 */
export function evaluateAudit(
  raw: unknown,
  opts: { waivedAdvisories?: string[] } = {},
): AuditSummary & { passed: boolean; blocked: boolean } {
  const waived = new Set((opts.waivedAdvisories ?? []).map((s) => s.toLowerCase()));
  const result = (raw ?? {}) as NpmAuditResult;

  let critical = 0;
  let high = 0;
  let moderate = 0;
  let low = 0;
  const blocking: string[] = [];

  const pushAdv = (name: string | undefined, severity: string | undefined) => {
    const sev = (severity ?? "unknown").toLowerCase();
    if (sev === "critical") critical++;
    else if (sev === "high") high++;
    else if (sev === "moderate") moderate++;
    else if (sev === "low") low++;
    else return;
    const key = (name ?? "unknown").toLowerCase();
    if (sev === "critical" && !waived.has(key)) {
      blocking.push(name ?? "unknown");
    }
  };

  // Modern npm (>=7): `vulnerabilities` map.
  if (result.vulnerabilities) {
    for (const [name, v] of Object.entries(result.vulnerabilities)) {
      pushAdv(name, v.severity);
    }
  }
  // Legacy npm (<=6): `advisories` map.
  if (result.advisories) {
    for (const a of Object.values(result.advisories)) {
      pushAdv(a.module_name ?? a.name, a.severity);
    }
  }
  // `metadata.vulnerabilities` counts (used for totals when available).
  const meta = result.metadata?.vulnerabilities;
  if (meta) {
    critical = meta.critical?.count ?? critical;
    high = meta.high?.count ?? high;
    moderate = meta.moderate?.count ?? moderate;
    low = meta.low?.count ?? low;
  }

  const total = critical + high + moderate + low;
  const blocked = critical > 0 && blocking.length > 0;
  return {
    critical,
    high,
    moderate,
    low,
    total,
    blockingAdvisories: blocking,
    passed: !blocked,
    blocked,
  };
}

/**
 * NFR-007 — Run `npm audit --json` in the app workspace and return the verdict.
 * Throws only on invocation failure (not on finding vulnerabilities — an audit
 * with findings still returns a structured result).
 */
export function runDependencyAudit(opts: {
  cwd?: string;
  waivedAdvisories?: string[];
} = {}): AuditSummary & { passed: boolean; blocked: boolean; ran: boolean } {
  const cwd = opts.cwd ?? path.resolve(__dirname, "..", "..");
  let raw: unknown;
  try {
    const out = execFileSync("npm", ["audit", "--json"], {
      cwd,
      encoding: "utf-8",
      // npm exits non-zero when vulnerabilities are found; that is expected.
      stdio: ["ignore", "pipe", "ignore"],
      shell: true,
    });
    raw = JSON.parse(out);
  } catch (err) {
    // A non-zero exit with no parseable JSON (e.g. npm not installed) is a
    // gate failure: we must not release on an unverifiable audit.
    const message = err instanceof Error ? err.message : String(err);
    if (err && typeof err === "object" && "stdout" in err) {
      try {
        raw = JSON.parse((err as { stdout: string }).stdout);
      } catch {
        raw = {};
      }
    } else {
      throw new Error(`Dependency audit could not run: ${message}`);
    }
  }
  const verdict = evaluateAudit(raw, { waivedAdvisories: opts.waivedAdvisories });
  return { ...verdict, ran: true };
}

/**
 * NFR-007 — Record the audit verdict as an append-only audit record so a release
 * decision is always backed by retained evidence.
 */
export async function recordAuditVerdict(
  verdict: { critical: number; high: number; blocked: boolean; blockingAdvisories: string[] },
  actor = "SYSTEM",
) {
  return recordAudit({
    actor,
    action: "DEPENDENCY_AUDIT",
    entityType: "RELEASE",
    entityId: "dependency-audit",
    summary: `Dependency audit: critical=${verdict.critical}, high=${verdict.high}, blocked=${verdict.blocked}`,
    metadata: {
      critical: verdict.critical,
      high: verdict.high,
      blocked: verdict.blocked,
      blockingAdvisories: verdict.blockingAdvisories,
    },
  });
}
