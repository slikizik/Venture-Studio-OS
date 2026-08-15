// TEST-AUT-001..004 — autonomy rate, first-pass acceptance, owner attention
// (without suppressing escalations), escalation quality, and autonomous recovery,
// all derived from stored auditable records.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, cleanupStrayTestDbs } from "./testdb";

const db = setupTestDb("aut-p7");

async function load() {
  const proj = await import("../lib/projects");
  const metrics = await import("../lib/metrics");
  const reviews = await import("../lib/reviews");
  const { prisma } = await import("../lib/prisma");
  return { proj, metrics, reviews, prisma };
}
let api: Awaited<ReturnType<typeof load>>;

beforeAll(async () => { api = await load(); });
afterAll(() => { teardownTestDb(db); cleanupStrayTestDbs(); });

async function makeProject(name: string) {
  return api.proj.createProject({ name, ownerName: "Owner" });
}

describe("TEST-AUT-001: autonomy rate and first-pass acceptance", () => {
  it("computes autonomy rate from SYSTEM vs owner activity records", async () => {
    const p = await makeProject("aut-1");
    // createProject emits SYSTEM actor activity records
    const m = await api.metrics.calculateAutonomyMetrics(p.id);
    expect(m.totalExecutionRecords).toBeGreaterThan(0);
    expect(m.autonomousRecords).toBeGreaterThan(0);
    expect(m.autonomyRate).toBeGreaterThan(0);
    expect(m.autonomyRate).toBeLessThanOrEqual(1);
  });

  it("computes first-pass acceptance from decided reviews", async () => {
    const p = await makeProject("aut-2");
    const wp = await api.prisma.workPacket.create({ data: { projectId: p.id, title: "wp", objective: "o", scope: "s", exclusions: "x", expectedOutputs: "[\"out\"]", status: "IN_REVIEW" } });
    const r = await api.reviews.createReview({ workPacketId: wp.id, reviewerName: "R", submittedVersion: 1, status: "PENDING", criteria: [] });
    await api.reviews.decideReview(r.id, { decision: "APPROVED", decidedBy: "R" });
    const m = await api.metrics.calculateAutonomyMetrics(p.id);
    expect(m.decidedReviews).toBe(1);
    expect(m.firstPassApprovals).toBe(1);
    expect(m.firstPassAcceptanceRate).toBe(1);
  });
});

describe("TEST-AUT-002: owner attention without suppressing escalations", () => {
  it("sums attention time and never hides open escalations", async () => {
    const p = await makeProject("aut-3");
    await api.prisma.attentionEvent.create({ data: { projectId: p.id, type: "OWNER_DECISION", startedAt: new Date(), endedAt: new Date(), durationSeconds: 600 } });
    await api.prisma.directionRequest.create({ data: { projectId: p.id, title: "need owner", question: "decide?", status: "OPEN", severity: "DIRECTION_REQUIRED" } });

    const a = await api.metrics.calculateOwnerAttention(p.id);
    expect(a.totalAttentionSeconds).toBe(600);
    expect(a.attentionEvents).toBe(1);
    expect(a.openEscalations).toBe(1);
    expect(a.attentionSuppressed).toBe(false);
  });
});

describe("TEST-AUT-003: escalation quality", () => {
  it("flags recoverable-class escalations as unnecessary", async () => {
    const p = await makeProject("aut-4");
    await api.prisma.directionRequest.create({ data: { projectId: p.id, title: "recoverable q", question: "can recover?", status: "OPEN", severity: "RECOVERABLE" } });
    await api.prisma.directionRequest.create({ data: { projectId: p.id, title: "real decision", question: "decide?", status: "ANSWERED", severity: "DIRECTION_REQUIRED" } });

    const e = await api.metrics.calculateEscalationQuality(p.id);
    expect(e.totalEscalations).toBe(2);
    expect(e.answeredEscalations).toBe(1);
    expect(e.unnecessaryEscalations).toBe(1);
    expect(e.escalationAnswerRate).toBe(0.5);
  });
});

describe("TEST-AUT-004: autonomous recovery rate", () => {
  it("computes recovery from resolved recoverable exceptions", async () => {
    const p = await makeProject("aut-5");
    await api.prisma.exception.create({ data: { projectId: p.id, classification: "RECOVERABLE", title: "e1", status: "RESOLVED" } });
    await api.prisma.exception.create({ data: { projectId: p.id, classification: "RECOVERABLE", title: "e2", status: "OPEN" } });

    const r = await api.metrics.calculateRecoveryMetrics(p.id);
    expect(r.recoverableIncidents).toBe(2);
    expect(r.recoveredIncidents).toBe(1);
    expect(r.autonomousRecoveryRate).toBe(0.5);
  });

  it("returns 0 rate with no recoverable incidents (safe, not invented)", async () => {
    const p = await makeProject("aut-6");
    const r = await api.metrics.calculateRecoveryMetrics(p.id);
    expect(r.recoverableIncidents).toBe(0);
    expect(r.autonomousRecoveryRate).toBe(0);
  });
});
