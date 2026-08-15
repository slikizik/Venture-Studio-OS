// TEST-QLT-002 — Quality gate evaluation using retained evidence. The gate must
// reference evidence that already exists; missing evidence is rejected.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, cleanupStrayTestDbs } from "./testdb";

const db = setupTestDb("qlt");

async function load() {
  const qualityGate = await import("../lib/qualityGate");
  const evidence = await import("../lib/evidence");
  const wp = await import("../lib/workpackets");
  const proj = await import("../lib/projects");
  return { qualityGate, evidence, wp, proj };
}
let api: Awaited<ReturnType<typeof load>>;

beforeAll(async () => { api = await load(); });
afterAll(() => { teardownTestDb(db); cleanupStrayTestDbs(); });

async function makeProject(name = "P") {
  return api.proj.createProject({ name, ownerName: "Owner" });
}

describe("TEST-QLT-002: gate requires retained evidence", () => {
  it("evaluates a gate when referenced evidence exists", async () => {
    const p = await makeProject("qlt1");
    const w = await api.wp.createWorkPacket({
      projectId: p.id, title: "A", objective: "o", scope: "s", exclusions: "e", expectedOutputs: ["x"],
    });
    const ev = await api.evidence.createEvidence({ projectId: p.id, workPacketId: w.id, type: "TEST_RESULT", title: "Passing tests" });
    const gate = await api.qualityGate.evaluateQualityGate({
      projectId: p.id,
      level: "WORK_PACKET",
      entityId: w.id,
      outcome: "PASS",
      criterionResults: [{ criterion: "build", passed: true, evidenceId: ev.id }],
      evidenceIds: [ev.id],
      evaluatedBy: "SYSTEM",
    });
    expect(gate.id).toBeTruthy();
    expect(gate.outcome).toBe("PASS");
    expect(gate.level).toBe("WORK_PACKET");
  });

  it("rejects a gate referencing non-existent evidence", async () => {
    const p = await makeProject("qlt2");
    const w = await api.wp.createWorkPacket({
      projectId: p.id, title: "A", objective: "o", scope: "s", exclusions: "e", expectedOutputs: ["x"],
    });
    await expect(api.qualityGate.evaluateQualityGate({
      projectId: p.id, level: "WORK_PACKET", entityId: w.id, outcome: "PASS",
      evidenceIds: ["does-not-exist"],
    })).rejects.toThrow(/EVIDENCE_NOT_FOUND/i);
  });

  it("passes a gate with no evidence dependency (evidenceIds empty)", async () => {
    const p = await makeProject("qlt3");
    const w = await api.wp.createWorkPacket({
      projectId: p.id, title: "A", objective: "o", scope: "s", exclusions: "e", expectedOutputs: ["x"],
    });
    const gate = await api.qualityGate.evaluateQualityGate({
      projectId: p.id, level: "DELIVERABLE", entityId: w.id, outcome: "PASS_WITH_ACCEPTED_RISK", evidenceIds: [],
    });
    expect(gate.id).toBeTruthy();
    const list = await api.qualityGate.listQualityGates(p.id);
    expect(list.length).toBe(1);
  });
});
