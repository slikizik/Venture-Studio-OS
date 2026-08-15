// TEST-DAT-001 / DAT-002 / DAT-003 / DAT-005 — Export, import, validation, and
// verified backup restore for project data portability and recovery.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, existsSync, writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { setupTestDb, teardownTestDb, cleanupStrayTestDbs } from "./testdb";

const db = setupTestDb("dat-p8");

async function load() {
  const proj = await import("../lib/projects");
  const port = await import("../lib/dataPort");
  const backup = await import("../lib/backup");
  const { prisma } = await import("../lib/prisma");
  return { proj, port, backup, prisma };
}
let api: Awaited<ReturnType<typeof load>>;

beforeAll(async () => {
  api = await load();
});
afterAll(() => {
  teardownTestDb(db);
  cleanupStrayTestDbs();
});

async function makeProjectWithData(name: string) {
  const p = await api.proj.createProject({ name, ownerName: "Owner" });
  await api.prisma.deliverable.create({
    data: { projectId: p.id, title: "d", type: "FEATURE", status: "PLANNED", order: 0 },
  });
  await api.prisma.workPacket.create({
    data: {
      projectId: p.id,
      title: "wp",
      objective: "o",
      scope: "s",
      exclusions: "x",
      expectedOutputs: "[\"out\"]",
      status: "IN_REVIEW",
    },
  });
  await api.prisma.riskRecord.create({
    data: { projectId: p.id, title: "risk", impact: "HIGH", likelihood: "POSSIBLE", status: "OPEN" },
  });
  await api.prisma.decisionRecord.create({
    data: {
      projectId: p.id,
      decisionId: `DEC-${name}`,
      title: "decide",
      context: "c",
      options: "[]",
      selectedOption: "a",
      rationale: "r",
      affectedRequirementIds: "[]",
      decidedBy: "Owner",
      decidedAt: new Date(),
    },
  });
  return p;
}

describe("TEST-DAT-001: export a complete project as a versioned package", () => {
  it("produces a versioned package containing the project and its relations", async () => {
    const p = await makeProjectWithData("dat-export");
    const pkg = await api.port.exportProject(p.id);
    expect(pkg.format).toBe("vso-project-package");
    expect(pkg.version).toBe(1);
    expect(((pkg.project as Record<string, unknown>).id as string)).toBe(p.id);
    expect(((pkg.project as Record<string, unknown>).name as string)).toBe("dat-export");
    expect((pkg.deliverables as unknown[]).length).toBe(1);
    expect((pkg.workPackets as unknown[]).length).toBe(1);
    expect((pkg.risks as unknown[]).length).toBe(1);
    expect((pkg.decisions as unknown[]).length).toBe(1);
  });

  it("serializes to valid JSON round-trippable", async () => {
    const p = await makeProjectWithData("dat-export-json");
    const str = await api.port.exportProjectString(p.id);
    const parsed = JSON.parse(str);
    expect(parsed.project.name).toBe("dat-export-json");
  });
});

describe("TEST-DAT-002: import a compatible project package transactionally", () => {
  it("creates a new project with remapped ids and all relations", async () => {
    const p = await makeProjectWithData("dat-import-src");
    const str = await api.port.exportProjectString(p.id);
    const before = await api.prisma.project.count();
    const { projectId } = await api.port.importProjectString(str);
    expect(projectId).not.toBe(p.id);
    const after = await api.prisma.project.count();
    expect(after).toBe(before + 1);
    const imported = await api.prisma.project.findUnique({
      where: { id: projectId },
      include: { deliverables: true, workPackets: true, risks: true, decisions: true },
    });
    expect(imported!.name).toBe("dat-import-src");
    expect(imported!.deliverables.length).toBe(1);
    expect(imported!.workPackets.length).toBe(1);
    expect(imported!.risks.length).toBe(1);
    expect(imported!.decisions.length).toBe(1);
    // remapped ids must not collide with the source
    expect(imported!.deliverables[0].id).not.toBe(
      (await api.prisma.deliverable.findFirst({ where: { projectId: p.id } }))!.id,
    );
  });

  it("imports into the same database repeatedly without collisions", async () => {
    const p = await makeProjectWithData("dat-import-repeat");
    const str = await api.port.exportProjectString(p.id);
    const a = await api.port.importProjectString(str);
    const b = await api.port.importProjectString(str);
    expect(a.projectId).not.toBe(b.projectId);
    const total = await api.prisma.project.count({ where: { name: "dat-import-repeat" } });
    expect(total).toBe(3); // 1 source + 2 imports
  });

  it("preserves referential integrity of foreign keys after remap", async () => {
    const p = await makeProjectWithData("dat-import-fk");
    const deliv = await api.prisma.deliverable.findFirstOrThrow({ where: { projectId: p.id } });
    const wp = await api.prisma.workPacket.create({
      data: {
        projectId: p.id,
        deliverableId: deliv.id,
        title: "wp2",
        objective: "o",
        scope: "s",
        exclusions: "x",
        expectedOutputs: "[\"out\"]",
        status: "DRAFT",
      },
    });
    const str = await api.port.exportProjectString(p.id);
    const { projectId } = await api.port.importProjectString(str);
    const newDeliv = await api.prisma.deliverable.findFirstOrThrow({ where: { projectId } });
    const newWp = await api.prisma.workPacket.findFirstOrThrow({
      where: { projectId, title: "wp2" },
    });
    expect(newWp.deliverableId).toBe(newDeliv.id);
    expect(newWp.deliverableId).not.toBe(wp.deliverableId);
  });
});

describe("TEST-DAT-003: reject invalid or unsupported import packages safely", () => {
  it("rejects a package with an unknown format", async () => {
    await expect(api.port.importProjectPackage({ format: "other", version: 1, project: { id: "00000000-0000-0000-0000-000000000000", name: "x" } })).rejects.toThrow(/format/i);
  });
  it("rejects an unsupported version", async () => {
    await expect(api.port.importProjectPackage({ format: "vso-project-package", version: 99, project: { id: "00000000-0000-0000-0000-000000000000", name: "x" } })).rejects.toThrow(/version/i);
  });
  it("rejects a package missing a valid project id", async () => {
    await expect(api.port.importProjectPackage({ format: "vso-project-package", version: 1, project: { id: "not-a-uuid", name: "x" } })).rejects.toThrow(/UUID/i);
  });
  it("rejects non-JSON input", async () => {
    await expect(api.port.importProjectString("{not json")).rejects.toThrow(/JSON/i);
  });
  it("does not write anything when validation fails", async () => {
    const before = await api.prisma.project.count();
    await expect(api.port.importProjectPackage({ format: "other" })).rejects.toThrow();
    expect(await api.prisma.project.count()).toBe(before);
  });
});

describe("TEST-DAT-005: restore a verified backup with integrity checks", () => {
  it("restores a valid backup and verifies the data returns", async () => {
    const p = await makeProjectWithData("dat-backup-src");
    const dir = mkdtempSync(path.join(tmpdir(), "vso-bk-"));
    try {
      // The live test DB path is derived from DATABASE_URL (file:./<name>.db
      // resolved relative to app/prisma/).
      const liveUrl = (process.env.DATABASE_URL || "").replace(/^file:/, "");
      const live = path.join(__dirname, "..", "..", "prisma", liveUrl.replace(/^\.\//, ""));
      const res = await api.backup.createBackup({ sourceDbPath: live, backupDir: dir, trigger: "IMPORT", reason: "test" });
      expect(existsSync(res.backupFilePath)).toBe(true);
      // mutate live data, then restore
      await api.prisma.project.update({ where: { id: p.id }, data: { name: "dat-backup-mutated" } });
      const restored = await api.backup.restoreBackup({
        backupFilePath: res.backupFilePath,
        liveDbPath: live,
        backupMetaPath: res.backupMetaPath,
      });
      expect(restored.bytes).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses to restore a backup whose size does not match its manifest", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "vso-bk2-"));
    try {
      const backupPath = path.join(dir, "bad.db");
      writeFileSync(backupPath, "SQLite format 3 garbage that is non-empty but wrong size");
      const metaPath = backupPath + ".meta.json";
      writeFileSync(metaPath, JSON.stringify({ bytes: 999999 }));
      const liveUrl = (process.env.DATABASE_URL || "").replace(/^file:/, "");
      const live = path.join(__dirname, "..", "..", "prisma", liveUrl.replace(/^\.\//, ""));
      await expect(api.backup.restoreBackup({ backupFilePath: backupPath, liveDbPath: live, backupMetaPath: metaPath })).rejects.toThrow(/integrity/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
