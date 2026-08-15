// TEST-SEVL-001 — End-to-end vertical slice: persisted intent -> work packet ->
// review -> decision -> learning, with retained governance evidence at each hop.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, cleanupStrayTestDbs } from "./testdb";

const db = setupTestDb("sevl");

async function load() {
  const proj = await import("../lib/projects");
  const intent = await import("../lib/intent");
  const wp = await import("../lib/workpackets");
  const reviews = await import("../lib/reviews");
  const learning = await import("../lib/learning");
  const audit = await import("../lib/audit");
  const evidence = await import("../lib/evidence");
  return { proj, intent, wp, reviews, learning, audit, evidence };
}
let api: Awaited<ReturnType<typeof load>>;

beforeAll(async () => { api = await load(); });
afterAll(() => { teardownTestDb(db); cleanupStrayTestDbs(); });

describe("TEST-SEVL-001: full governance slice", () => {
  it("carries intent through review and learning with audit trail", async () => {
    // 1) Project + approved intent (precondition for tracing)
    const p = await api.proj.createProject({ name: "SEVL", ownerName: "Owner" });
    await api.intent.captureIntent(p.id, {
      problem: "Agents need bounded autonomy",
      audience: "Owners",
      desiredOutcome: "Safe delivery",
      constraints: "No credentials in repo",
      successMeasures: [{ measure: "Audit coverage", target: "100%" }],
    });
    await api.intent.approveIntent(p.id);

    // 2) Work packet + evidence
    const w = await api.wp.createWorkPacket({
      projectId: p.id, title: "Implement review gate", objective: "o", scope: "s", exclusions: "e", expectedOutputs: ["gate"],
    });
    const ev = await api.evidence.createEvidence({ projectId: p.id, workPacketId: w.id, type: "TEST_RESULT", title: "Gate tests" });
    expect(ev.id).toBeTruthy();

    // 3) Submit then review + decide
    await api.wp.submitWorkPacket(w.id, "USER");
    const r = await api.reviews.createReview({ workPacketId: w.id, reviewerName: "REVIEWER", submittedVersion: w.versionNumber });
    const decided = await api.reviews.decideReview(r.id, { decision: "APPROVED", decidedBy: "REVIEWER" });
    expect(decided.status).toBe("APPROVED");
    const packetAfter = await api.wp.getWorkPacketOrThrow(w.id);
    expect(packetAfter.status).toBe("APPROVED");

    // 4) Capture a learning derived from the work
    const l = await api.learning.createLearning({ projectId: p.id, sourceType: "TEST_FAILURE", summary: "Flaky gate test" });
    const converted = await api.learning.convertLearning(l.id, { target: "BACKLOG", reference: "BL-7" });
    expect(converted.status).toBe("CONVERTED");

    // 5) Retained governance evidence: audit trail spans the whole slice
    const trail = await api.audit.listAuditForProject(p.id, 50);
    const actions = trail.map((a) => a.action);
    expect(actions).toContain("INTENT_APPROVED");
    expect(actions).toContain("WORK_PACKET_SUBMITTED");
    expect(actions).toContain("REVIEW_APPROVED");
    expect(actions).toContain("EVIDENCE_CREATED");
    expect(actions).toContain("LEARNING_CONVERTED");

    // 6) Evidence integrity: gate can reference the retained evidence id
    const qualityGate = await import("../lib/qualityGate");
    const gate = await qualityGate.evaluateQualityGate({
      projectId: p.id, level: "RELEASE", entityId: w.id, outcome: "PASS", evidenceIds: [ev.id],
    });
    expect(gate.id).toBeTruthy();
  });
});
