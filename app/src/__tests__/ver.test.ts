// TEST-VER-001..002 — Present understandable version labels; record official,
// development, test, and released versions.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, cleanupStrayTestDbs } from "./testdb";

const db = setupTestDb("ver");

async function load() {
  const versions = await import("../lib/versions");
  const proj = await import("../lib/projects");
  const { prisma } = await import("../lib/prisma");
  return { versions, proj, prisma };
}
let api: Awaited<ReturnType<typeof load>>;

beforeAll(async () => { api = await load(); });
afterAll(() => { teardownTestDb(db); cleanupStrayTestDbs(); });

describe("TEST-VER-001: present understandable version labels", () => {
  it("returns a human-readable label and type for each version", async () => {
    const p = await api.proj.createProject({ name: "Ver1", ownerName: "Owner" });
    await api.versions.recordVersion({ projectId: p.id, versionLabel: "v1.0.0-release", versionType: "RELEASED", changeSummary: "GA", createdBy: "Owner" });
    const versions = await api.versions.listVersions(p.id);
    const rel = versions.find((v) => v.type === "RELEASED")!;
    expect(rel.label).toBe("v1.0.0-release"); // presentable label (VER-001)
    expect(rel.type).toBe("RELEASED");
    expect(typeof rel.label).toBe("string");
  });
});

describe("TEST-VER-002: official development test released versions", () => {
  it("records each version type", async () => {
    const p = await api.proj.createProject({ name: "Ver2", ownerName: "Owner" });
    const types = ["OFFICIAL", "DEVELOPMENT", "TEST", "RELEASED"] as const;
    for (const t of types) {
      await api.versions.recordVersion({ projectId: p.id, versionLabel: `v-${t}`, versionType: t, changeSummary: t, createdBy: "Owner" });
    }
    const versions = await api.versions.listVersions(p.id);
    for (const t of types) {
      expect(versions.some((v) => v.type === t)).toBe(true);
    }
  });

  it("approves and releases a version, setting timestamps", async () => {
    const p = await api.proj.createProject({ name: "Ver3", ownerName: "Owner" });
    const v = await api.versions.recordVersion({ projectId: p.id, versionLabel: "v2.0.0", versionType: "OFFICIAL", changeSummary: "rc", createdBy: "Owner" });
    const approved = await api.versions.approveVersion(v.id);
    expect(approved.status).toBe("APPROVED");
    expect(approved.approvedAt).toBeTruthy();
    const released = await api.versions.releaseVersion(v.id);
    expect(released.status).toBe("RELEASED");
    expect(released.releasedAt).toBeTruthy();
  });

  it("rejects approving a non-existent version", async () => {
    await expect(api.versions.approveVersion("does-not-exist")).rejects.toThrow(/NOT_FOUND/i);
  });
});
