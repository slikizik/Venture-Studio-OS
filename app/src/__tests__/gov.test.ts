// TEST-GOV-003 — Record project versions and change summaries.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, cleanupStrayTestDbs } from "./testdb";

const db = setupTestDb("gov");

async function load() {
  const versions = await import("../lib/versions");
  const proj = await import("../lib/projects");
  const audit = await import("../lib/audit");
  const { prisma } = await import("../lib/prisma");
  return { versions, proj, audit, prisma };
}
let api: Awaited<ReturnType<typeof load>>;

beforeAll(async () => { api = await load(); });
afterAll(() => { teardownTestDb(db); cleanupStrayTestDbs(); });

describe("TEST-GOV-003: project versions and change summaries", () => {
  it("seeds an initial DEVELOPMENT version on project creation", async () => {
    const p = await api.proj.createProject({ name: "Gov1", ownerName: "Owner" });
    const versions = await api.versions.listVersions(p.id);
    expect(versions.length).toBe(1);
    expect(versions[0].type).toBe("DEVELOPMENT");
    expect(versions[0].label).toBeTruthy();
    expect(versions[0].changeSummary).toBeTruthy();
  });

  it("records a new version with a change summary", async () => {
    const p = await api.proj.createProject({ name: "Gov2", ownerName: "Owner" });
    const v = await api.versions.recordVersion({
      projectId: p.id, versionLabel: "v0.2.0", versionType: "OFFICIAL",
      changeSummary: "Added deliverables module", createdBy: "Owner",
    });
    expect(v.versionLabel).toBe("v0.2.0");
    expect(v.changeSummary).toBe("Added deliverables module");
    const versions = await api.versions.listVersions(p.id);
    expect(versions.some((x) => x.id === v.id)).toBe(true);
  });

  it("rejects invalid version input without persisting", async () => {
    const p = await api.proj.createProject({ name: "Gov3", ownerName: "Owner" });
    await expect(api.versions.recordVersion({ projectId: p.id, versionLabel: "", versionType: "OFFICIAL", createdBy: "Owner" })).rejects.toThrow();
    const versions = await api.versions.listVersions(p.id);
    expect(versions.length).toBe(1); // only the seeded one
  });

  it("records an audit event for version creation", async () => {
    const p = await api.proj.createProject({ name: "Gov4", ownerName: "Owner" });
    const v = await api.versions.recordVersion({ projectId: p.id, versionLabel: "v0.3.0", versionType: "TEST", changeSummary: "x", createdBy: "Owner" });
    const trail = await api.audit.listAuditForProject(p.id, 10);
    expect(trail.some((a) => a.entityId === v.id && a.action === "VERSION_RECORDED")).toBe(true);
  });
});
