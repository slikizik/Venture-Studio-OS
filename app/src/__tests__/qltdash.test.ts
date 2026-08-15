// TEST-QLT-003 — Record benchmark/quality gaps and show whether mandatory
// commercial targets are met or explicitly accepted. Derived from stored
// QualityProfile + QualityGateResult + DecisionRecord data.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, cleanupStrayTestDbs } from "./testdb";

const db = setupTestDb("qltdash-p7");

async function load() {
  const proj = await import("../lib/projects");
  const metrics = await import("../lib/metrics");
  const quality = await import("../lib/quality");
  const { prisma } = await import("../lib/prisma");
  return { proj, metrics, quality, prisma };
}
let api: Awaited<ReturnType<typeof load>>;

beforeAll(async () => { api = await load(); });
afterAll(() => { teardownTestDb(db); cleanupStrayTestDbs(); });

async function makeProject(name: string) {
  return api.proj.createProject({ name, ownerName: "Owner" });
}

describe("TEST-QLT-003: benchmark gaps", () => {
  it("reports a gap when no quality profile exists (never invents a pass)", async () => {
    const p = await makeProject("qlt-none");
    const report = await api.metrics.calculateBenchmarkGaps(p.id);
    expect(report.hasQualityProfile).toBe(false);
    expect(report.allMandatoryMetOrAccepted).toBe(false);
  });

  it("reports mandatory dimension met when a passing gate result exists at the target level", async () => {
    const p = await makeProject("qlt-met");
    await api.quality.createQualityProfile(p.id, {
      name: "Profile",
      projectTypeId: "STANDARD_VENTURE",
      dimensions: [{ id: "reliability", name: "Reliability" }],
      mandatoryDimensions: ["reliability"],
      targetLevels: ["COMMERCIAL"],
      status: "APPROVED",
    });
    await api.prisma.qualityGateResult.create({
      data: { projectId: p.id, level: "COMMERCIAL", entityId: "x", outcome: "PASS", evaluatedBy: "SYSTEM", evidenceIds: "[]" },
    });
    const report = await api.metrics.calculateBenchmarkGaps(p.id);
    expect(report.hasQualityProfile).toBe(true);
    expect(report.mandatoryDimensionsTotal).toBe(1);
    expect(report.mandatoryDimensionsMet).toBe(1);
    expect(report.allMandatoryMetOrAccepted).toBe(true);
    expect(report.gaps[0].met).toBe(true);
  });

  it("reports a gap when targets are not met but explicitly accepted by a decision", async () => {
    const p = await makeProject("qlt-accept");
    await api.quality.createQualityProfile(p.id, {
      name: "Profile",
      projectTypeId: "STANDARD_VENTURE",
      dimensions: [{ id: "security", name: "Security" }],
      mandatoryDimensions: ["security"],
      targetLevels: ["COMMERCIAL_PLUS"],
      status: "APPROVED",
    });
    // no passing gate at COMMERCIAL_PLUS -> gap; owner accepts via decision
    await api.prisma.decisionRecord.create({
      data: {
        projectId: p.id, decisionId: "DEC-GAP", title: "Accept security gap",
        context: "security resourcing deferred", options: "[]", selectedOption: "ACCEPT",
        rationale: "owner accepted", decidedBy: "OWNER", decidedAt: new Date(),
      },
    });
    const report = await api.metrics.calculateBenchmarkGaps(p.id);
    expect(report.mandatoryDimensionsMet).toBe(1);
    expect(report.gaps[0].met).toBe(false);
    expect(report.gaps[0].accepted).toBe(true);
    expect(report.allMandatoryMetOrAccepted).toBe(true);
  });
});
