// TEST-DSG-002 — Requirement registry + mapping to deliverables/work packets
// with exclusions, dependency detail, and evidence expectations.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, cleanupStrayTestDbs } from "./testdb";

const db = setupTestDb("dsg2");

async function load() {
  const proj = await import("../lib/projects");
  const wp = await import("../lib/workpackets");
  const req = await import("../lib/requirements");
  return { proj, wp, req };
}
let api: Awaited<ReturnType<typeof load>>;
beforeAll(async () => { api = await load(); });
afterAll(() => { teardownTestDb(db); cleanupStrayTestDbs(); });

async function project() { return api.proj.createProject({ name: "DSG", ownerName: "O" }); }
async function packet(p) {
  return api.wp.createWorkPacket({ projectId: p.id, title: "WP", objective: "o", scope: "s", exclusions: "e", expectedOutputs: ["x"] });
}

describe("TEST-DSG-002: requirement registry + mapping", () => {
  it("creates a requirement and links it to a work packet with an evidence expectation", async () => {
    const p = await project();
    const w = await packet(p);
    const r = await api.req.createRequirement({
      projectId: p.id,
      code: "WPK-001",
      title: "Packets submit for review",
      description: "Every work packet must be submittable for review.",
    });
    expect(r.code).toBe("WPK-001");
    const link = await api.req.linkRequirement({
      requirementId: r.id,
      projectId: p.id,
      targetType: "WORK_PACKET",
      workPacketId: w.id,
      expectedEvidence: "Approved review record present",
    });
    expect(link.targetType).toBe("WORK_PACKET");
    expect(link.evidenceExpectation).toBe("Approved review record present");
  });

  it("flags an exclusions link (isExclusion) without a work packet", async () => {
    const p = await project();
    const r = await api.req.createRequirement({
      projectId: p.id,
      code: "WPK-002",
      title: "Out of scope: auth",
      description: "Authentication is out of scope for the MVP.",
    });
    const link = await api.req.linkRequirement({
      requirementId: r.id,
      projectId: p.id,
      targetType: "PROJECT",
      isExclusion: true,
      exclusions: "Authentication module deferred to a later phase.",
    });
    expect(link.isExclusion).toBe(true);
    expect(link.exclusions).toContain("Authentication");
  });

  it("updates an existing link's evidence expectation", async () => {
    const p = await project();
    const w = await packet(p);
    const r = await api.req.createRequirement({ projectId: p.id, code: "WPK-003", title: "t", description: "d" });
    const link = await api.req.linkRequirement({ requirementId: r.id, projectId: p.id, targetType: "WORK_PACKET", workPacketId: w.id });
    const updated = await api.req.updateRequirementLink(link.id, { expectedEvidence: "New evidence bar" });
    expect(updated.evidenceExpectation).toBe("New evidence bar");
  });

  it("rejects linking to a work packet in another project", async () => {
    const p1 = await project();
    const p2 = await project();
    const w = await packet(p2);
    const r = await api.req.createRequirement({ projectId: p1.id, code: "WPK-004", title: "t", description: "d" });
    await expect(
      api.req.linkRequirement({ requirementId: r.id, projectId: p1.id, targetType: "WORK_PACKET", workPacketId: w.id }),
    ).rejects.toThrow(/PROJECT_MISMATCH/i);
  });
});
