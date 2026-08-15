// TEST-DSH-001/002/003 + TEST-PRJ-005 — Portfolio/project dashboards, digests,
// and project phase/progress/health/risk/blocker computation.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, cleanupStrayTestDbs } from "./testdb";

const db = setupTestDb("dsh-p7");

async function load() {
  const proj = await import("../lib/projects");
  const metrics = await import("../lib/metrics");
  const { prisma } = await import("../lib/prisma");
  return { proj, metrics, prisma };
}
let api: Awaited<ReturnType<typeof load>>;

beforeAll(async () => { api = await load(); });
afterAll(() => { teardownTestDb(db); cleanupStrayTestDbs(); });

async function makeProject(name: string, templateId?: string) {
  return api.proj.createProject({ name, ownerName: "Owner", ...(templateId ? { templateId } : {}) });
}

describe("TEST-DSH-001: portfolio dashboard metrics", () => {
  it("counts active/blocked projects, pending reviews, open risks, agents, escalations", async () => {
    const p1 = await makeProject("dsh-active");
    await makeProject("dsh-archived");
    // mark second as archived
    await api.prisma.project.update({ where: { id: (await api.prisma.project.findFirst({ where: { name: "dsh-archived" } }))!.id }, data: { status: "ARCHIVED", archivedAt: new Date() } });
    await api.prisma.project.update({ where: { id: p1.id }, data: { health: "BLOCKED" } });
    await api.prisma.riskRecord.create({ data: { projectId: p1.id, title: "r", impact: "HIGH", likelihood: "POSSIBLE", status: "OPEN" } });
    await api.prisma.directionRequest.create({ data: { projectId: p1.id, title: "decide", question: "q?", status: "OPEN", severity: "DIRECTION_REQUIRED" } });

    const m = await api.metrics.calculatePortfolioMetrics();
    expect(m.activeProjects).toBe(1);
    expect(m.blockedProjects).toBe(1);
    expect(m.openHighCriticalRisks).toBe(1);
    expect(m.openDirectionRequests).toBe(1);
  });
});

describe("TEST-DSH-002/PRJ-005: project dashboard", () => {
  it("computes progress, health, blockers from stored rows", async () => {
    const p = await makeProject("dsh-proj", "standard-venture");
    // a blocked stage + an open high risk + a pending review
    await api.prisma.projectStage.updateMany({ where: { projectId: p.id }, data: { status: "BLOCKED" } });
    await api.prisma.riskRecord.create({ data: { projectId: p.id, title: "risk", impact: "CRITICAL", likelihood: "LIKELY", status: "OPEN" } });
    const wp = await api.prisma.workPacket.create({ data: { projectId: p.id, title: "wp", objective: "o", scope: "s", exclusions: "x", expectedOutputs: "[\"out\"]", status: "IN_REVIEW" } });
    await api.prisma.review.create({ data: { workPacketId: wp.id, projectId: p.id, reviewerName: "R", status: "PENDING", submittedVersion: 1 } });

    const dash = await api.metrics.calculateProjectDashboard(p.id);
    expect(dash.blockedStages).toBeGreaterThanOrEqual(1);
    expect(dash.openHighCriticalRisks).toBe(1);
    expect(dash.pendingReviews).toBe(1);
    expect(dash.blockers).toBeGreaterThanOrEqual(3); // blocked stage + risk + pending review escalation
    expect(dash.health).toBe("BLOCKED");
    expect(dash.progressPercent).toBeGreaterThanOrEqual(0);
  });

  it("reports zero blockers for a clean project", async () => {
    const p = await makeProject("dsh-clean");
    const dash = await api.metrics.calculateProjectDashboard(p.id);
    expect(dash.blockers).toBe(0);
    expect(dash.health).toBe("HEALTHY");
  });
});

describe("TEST-DSH-003: portfolio digest", () => {
  it("surfaces pending reviews, open risks, open escalations, recent decisions, blocked projects", async () => {
    const p = await makeProject("dsh-digest");
    await api.prisma.directionRequest.create({ data: { projectId: p.id, title: "q", question: "decide?", status: "OPEN", severity: "DIRECTION_REQUIRED" } });
    await api.prisma.decisionRecord.create({
      data: {
        projectId: p.id, decisionId: "DEC-D", title: "t", context: "c",
        options: JSON.stringify([{ id: "A", label: "A" }]), selectedOption: "A",
        rationale: "r", decidedBy: "OWNER", decidedAt: new Date(),
      },
    });
    const digest = await api.metrics.calculatePortfolioDigest();
    expect(digest.openDirectionRequests.length).toBeGreaterThanOrEqual(1);
    expect(digest.recentDecisions.length).toBeGreaterThanOrEqual(1);
    expect(digest.pendingReviews).toBeDefined();
    expect(digest.openRisks).toBeDefined();
  });
});
