// TEST-QLT-001 — Quality Profile
// QLT-001 create/version/list/update/delete a Quality Profile per project.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, cleanupStrayTestDbs } from "./testdb";
import { ProjectTypeId } from "../lib/validation";

const db = setupTestDb("qlt");

async function load() {
  const { createProject } = await import("../lib/projects");
  const {
    createQualityProfile,
    listQualityProfiles,
    getLatestQualityProfile,
    updateQualityProfile,
    versionQualityProfile,
    deleteQualityProfile,
  } = await import("../lib/quality");
  const { prisma } = await import("../lib/prisma");
  return { createProject, createQualityProfile, listQualityProfiles, getLatestQualityProfile, updateQualityProfile, versionQualityProfile, deleteQualityProfile, prisma };
}

let api: Awaited<ReturnType<typeof load>>;

beforeAll(async () => {
  api = await load();
});
afterAll(() => { teardownTestDb(db); cleanupStrayTestDbs(); });

const base = {
  projectTypeId: "STANDARD_VENTURE" as ProjectTypeId,
  name: "Standard Venture Quality",
  dimensions: [{ id: "FUNC", name: "Functional" }],
  mandatoryDimensions: ["FUNC"],
  targetLevels: ["COMMERCIAL" as const],
  status: "DRAFT" as const,
};

describe("TEST-QLT-001: quality profile lifecycle", () => {
  it("creates a quality profile seeded at version 1.0.0", async () => {
    const p = await api.createProject({ name: "QP Project", ownerName: "Owner" });
    const qp = await api.createQualityProfile(p.id, base);
    expect(qp.version).toBe("1.0.0");
    expect(qp.isLatest).toBe(true);
    expect(qp.projectTypeId).toBe("STANDARD_VENTURE");
    expect(JSON.parse(qp.dimensions).length).toBe(1);
  });

  it("creating a second profile supersedes the first (isLatest)", async () => {
    const p = await api.createProject({ name: "QP Project 2", ownerName: "Owner" });
    const a = await api.createQualityProfile(p.id, base);
    const b = await api.createQualityProfile(p.id, { ...base, name: "v2" });
    const latest = await api.getLatestQualityProfile(p.id);
    expect(latest!.id).toBe(b.id);
    const all = await api.listQualityProfiles(p.id);
    expect(all.length).toBe(2);
    // only the latest is flagged
    expect(all.filter((x) => x.isLatest).length).toBe(1);
  });

  it("updateQualityProfile creates a new immutable version", async () => {
    const p = await api.createProject({ name: "QP Project 3", ownerName: "Owner" });
    await api.createQualityProfile(p.id, base);
    const updated = await api.updateQualityProfile(p.id, {
      name: "Standard Venture Quality (revised)",
      dimensions: [{ id: "FUNC", name: "Functional" }],
    });
    expect(updated.version).toBe("1.0.1");
    expect(updated.isLatest).toBe(true);
    const latest = await api.getLatestQualityProfile(p.id);
    expect(latest!.name).toBe("Standard Venture Quality (revised)");
  });

  it("versionQualityProfile can promote a historical version to latest", async () => {
    const p = await api.createProject({ name: "QP Project 4", ownerName: "Owner" });
    await api.createQualityProfile(p.id, base);
    await api.createQualityProfile(p.id, { ...base, name: "v2" });
    const all = await api.listQualityProfiles(p.id);
    const v100 = all.find((x) => x.version === "1.0.0")!;
    const promoted = await api.versionQualityProfile(p.id, "1.0.0");
    expect(promoted.id).toBe(v100.id);
    expect(promoted.isLatest).toBe(true);
    const latest = await api.getLatestQualityProfile(p.id);
    expect(latest!.id).toBe(v100.id);
  });

  it("deleteQualityProfile removes it", async () => {
    const p = await api.createProject({ name: "QP Project 5", ownerName: "Owner" });
    const qp = await api.createQualityProfile(p.id, base);
    await api.deleteQualityProfile(qp.id);
    const all = await api.listQualityProfiles(p.id);
    expect(all.length).toBe(0);
  });

  it("rejects an invalid projectType in the profile", async () => {
    const p = await api.createProject({ name: "QP Project 6", ownerName: "Owner" });
    await expect(
      api.createQualityProfile(p.id, { ...base, projectTypeId: "BOGUS" as ProjectTypeId }),
    ).rejects.toThrow();
  });
});
