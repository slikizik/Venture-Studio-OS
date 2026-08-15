// Phase 09 acceptance tests — ENV-001/002, VER-003, QLT-004, NFR-007.
import { describe, it, expect, beforeAll } from "vitest";
import { setupTestDb } from "./testdb";
import { prisma } from "../lib/prisma";
import { recordAudit } from "../lib/audit";
import {
  registerEnvironment,
  updateEnvironment,
  listEnvironments,
  getEnvironment,
  registeredEnvironmentConfigs,
} from "../lib/environments";
import {
  recordRelease,
  decideRelease,
  listReleases,
  evaluateReleaseReadiness,
  getReleaseReadiness,
  deriveReadinessState,
  signOffCommercial,
} from "../lib/release";
import { evaluateAudit, runDependencyAudit } from "../lib/vulnAudit";

beforeAll(async () => {
  await setupTestDb("p9");
});

function uniq(suffix: string) {
  return `${suffix}-${Math.random().toString(36).slice(2, 9)}`;
}

describe("ENV-001 — register isolated environments", () => {
  it("registers an environment with branch/worktree/port/db/storage/log/status", async () => {
    const envId = uniq("dev");
    const rec = await registerEnvironment({
      envId,
      name: "Development",
      branch: "develop",
      worktreePath: "/repo/dev",
      port: 3001,
      dbPath: "/data/dev.db",
      storageDir: "/store/dev",
      logPath: "/logs/dev.log",
      status: "UP",
    });
    expect(rec.envId).toBe(envId);
    expect(rec.status).toBe("UP");
    expect(rec.dbPath).toBe("/data/dev.db");
    expect(rec.port).toBe(3001);

    const fetched = await getEnvironment(envId);
    expect(fetched?.branch).toBe("develop");
  });

  it("upserts on duplicate envId", async () => {
    const envId = uniq("staging");
    await registerEnvironment({ envId, name: "S1", status: "REGISTERED" });
    const updated = await registerEnvironment({ envId, name: "S1", status: "UP", port: 3002 });
    expect(updated.status).toBe("UP");
    expect(updated.port).toBe(3002);
    const all = await listEnvironments();
    expect(all.filter((e) => e.envId === envId)).toHaveLength(1);
  });
});

describe("ENV-002 — record environment status", () => {
  it("records live status and lists by status", async () => {
    const envId = uniq("qa");
    await registerEnvironment({ envId, name: "QA", status: "REGISTERED" });
    const rec = await updateEnvironment(envId, { status: "DOWN" });
    expect(rec.status).toBe("DOWN");
    expect(rec.lastSeenAt).not.toBeNull();

    const downs = await listEnvironments("DOWN");
    expect(downs.some((e) => e.envId === envId)).toBe(true);
  });

  it("exposes registered envs as isolation configs (ENV-003 integration)", async () => {
    const envId = uniq("iso");
    await registerEnvironment({
      envId,
      name: "Iso",
      dbPath: "/data/iso.db",
      storageDir: "/store/iso",
      logPath: "/logs/iso.log",
    });
    const configs = await registeredEnvironmentConfigs();
    const cfg = configs.find((c) => c.id === envId);
    expect(cfg).toBeDefined();
    expect(cfg?.dbPath).toBe("/data/iso.db");
  });
});

describe("VER-003 — release record comparison/approval/merge readiness", () => {
  it("records a candidate version comparison and merge readiness", async () => {
    const projectId = (await prisma.project.create({ data: { name: uniq("P-VER"), ownerName: "tester" } })).id;
    const rec = await recordRelease({
      projectId,
      versionLabel: "v1.2.0",
      baseVersionLabel: "v1.1.0",
      comparison: JSON.stringify({ added: 3, removed: 1 }),
      mergeReadiness: "READY",
      mergeBlockers: [],
    });
    expect(rec.versionLabel).toBe("v1.2.0");
    expect(rec.mergeReadiness).toBe("READY");
    expect(JSON.parse(rec.comparison).added).toBe(3);
  });

  it("requires an explicit approval decision; REJECTED is recorded", async () => {
    const projectId = (await prisma.project.create({ data: { name: uniq("P-VER2"), ownerName: "tester" } })).id;
    const rec = await recordRelease({ projectId, versionLabel: "v2.0.0", baseVersionLabel: "v1.2.0" });
    expect(rec.approvalStatus).toBe("PENDING");

    const decided = await decideRelease(rec.id, { approvedBy: "owner", decision: "REJECTED" });
    expect(decided.approvalStatus).toBe("REJECTED");
    expect(decided.approvedBy).toBeNull();

    const approved = await decideRelease(rec.id, { approvedBy: "owner", decision: "APPROVED" });
    expect(approved.approvalStatus).toBe("APPROVED");
    expect(approved.approvedBy).toBe("owner");
    expect(approved.approvedAt).not.toBeNull();
  });

  it("lists releases per project", async () => {
    const projectId = (await prisma.project.create({ data: { name: uniq("P-VER3"), ownerName: "tester" } })).id;
    await recordRelease({ projectId, versionLabel: "v3.0.0" });
    const list = await listReleases(projectId);
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.every((r) => r.projectId === projectId)).toBe(true);
  });
});

describe("QLT-004 — release readiness state machine (technical vs commercial)", () => {
  it("deriveReadinessState never equates TECHNICALLY_READY with COMMERCIAL_READY", () => {
    expect(deriveReadinessState({ technicalReady: true, commercialReady: false, blockingChecks: [] })).toBe("TECHNICALLY_READY");
    expect(deriveReadinessState({ technicalReady: true, commercialReady: true, blockingChecks: [] })).toBe("COMMERCIAL_REVIEW");
    expect(deriveReadinessState({ technicalReady: false, commercialReady: false, blockingChecks: [] })).toBe("NOT_READY");
    expect(deriveReadinessState({ technicalReady: true, commercialReady: true, blockingChecks: ["license pending"] })).toBe("NOT_READY");
    expect(deriveReadinessState({ technicalReady: true, commercialReady: true, blockingChecks: [], releasedVersion: "v1.0.0" })).toBe("RELEASED");
  });

  it("evaluateReleaseReadiness derives and persists the state, never taking caller input verbatim", async () => {
    const projectId = (await prisma.project.create({ data: { name: uniq("P-QLT"), ownerName: "tester" } })).id;
    const rec = await evaluateReleaseReadiness(projectId, {
      technicalReady: true,
      commercialReady: false,
      technicalNotes: "tests green",
    });
    // Even if a caller tried to pass a misleading state, we derive it.
    expect(rec.readinessState).toBe("TECHNICALLY_READY");
    expect(rec.commercialReady).toBe(false);

    const both = await evaluateReleaseReadiness(projectId, {
      technicalReady: true,
      commercialReady: true,
      commercialNotes: "pricing approved",
    });
    expect(both.readinessState).toBe("COMMERCIAL_REVIEW");

    const fetched = await getReleaseReadiness(projectId);
    expect(fetched?.readinessState).toBe("COMMERCIAL_REVIEW");
  });
});

describe("NFR-007 — critical dependency vulnerability gate", () => {
  it("passes when no critical vulnerabilities", () => {
    const verdict = evaluateAudit({
      vulnerabilities: {
        lodash: { severity: "moderate", title: "proto", name: "lodash" },
      },
    });
    expect(verdict.critical).toBe(0);
    expect(verdict.blocked).toBe(false);
    expect(verdict.passed).toBe(true);
  });

  it("blocks production release when a critical vulnerability is unwaived", () => {
    const verdict = evaluateAudit({
      vulnerabilities: {
        leftpad: { severity: "critical", title: "rm -rf", name: "leftpad" },
        lodash: { severity: "high", title: "x", name: "lodash" },
      },
    });
    expect(verdict.critical).toBeGreaterThan(0);
    expect(verdict.blocked).toBe(true);
    expect(verdict.passed).toBe(false);
    expect(verdict.blockingAdvisories).toContain("leftpad");
  });

  it("supports waiving a specific critical advisory", () => {
    const verdict = evaluateAudit(
      { vulnerabilities: { leftpad: { severity: "critical", title: "x", name: "leftpad" } } },
      { waivedAdvisories: ["leftpad"] },
    );
    expect(verdict.blocked).toBe(false);
    expect(verdict.passed).toBe(true);
  });

  it("parses legacy npm `advisories` shape", () => {
    const verdict = evaluateAudit({
      advisories: { "1": { severity: "critical", module_name: "evil", title: "x" } },
    });
    expect(verdict.critical).toBe(1);
    expect(verdict.blocked).toBe(true);
  });

  it("runs the real npm audit against the app workspace without throwing", () => {
    // This exercises the actual `npm audit --json` invocation. A clean workspace
    // returns a structured verdict (passed may be false if real criticals exist).
    const verdict = runDependencyAudit({ cwd: process.cwd() });
    expect(verdict.ran).toBe(true);
    expect(typeof verdict.critical).toBe("number");
  });
});

// QLT-004 — commercial sign-off gate (explicit owner action; never silent).
describe("QLT-004 commercial sign-off", () => {
  it("rejects sign-off unless state is COMMERCIAL_REVIEW", async () => {
    const projectId = (await prisma.project.create({ data: { name: uniq("P-SIGNOFF"), ownerName: "tester" } })).id;
    // TECHNICALLY_READY, not COMMERCIAL_REVIEW.
    await evaluateReleaseReadiness(projectId, {
      technicalReady: true,
      commercialReady: false,
      blockingChecks: [],
    });
    await expect(
      signOffCommercial(projectId, { approvedBy: "owner@x", releasedVersion: "v1.7.0" }),
    ).rejects.toThrow(/COMMERCIAL_REVIEW/);
  });

  it("signs off from COMMERCIAL_REVIEW -> RELEASED with version + approver", async () => {
    const projectId = (await prisma.project.create({ data: { name: uniq("P-SIGNOFF2"), ownerName: "tester" } })).id;
    await evaluateReleaseReadiness(projectId, {
      technicalReady: true,
      commercialReady: true,
      blockingChecks: [],
    });
    const rec = await signOffCommercial(projectId, {
      approvedBy: "owner@x",
      releasedVersion: "v1.7.0",
      notes: "licensed + priced",
    });
    expect(rec.readinessState).toBe("RELEASED");
    expect(rec.commercialReady).toBe(true);
    expect(rec.releasedVersion).toBe("v1.7.0");
  });
});
