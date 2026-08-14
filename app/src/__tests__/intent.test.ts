// TEST-INT-001 / TEST-INT-002 / TEST-DSG-001 — Intent, benchmark, intent tracing
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, cleanupStrayTestDbs } from "./testdb";

const db = setupTestDb("int");

async function load() {
  const intent = await import("../lib/intent");
  const { createProject } = await import("../lib/projects");
  const { listAuditForProject } = await import("../lib/audit");
  return { intent, createProject, listAuditForProject };
}
let api: Awaited<ReturnType<typeof load>>;
beforeAll(async () => { api = await load(); });
afterAll(() => { teardownTestDb(db); cleanupStrayTestDbs(); });

describe("TEST-INT-001: project intent brief", () => {
  it("captures a draft intent and approves it", async () => {
    const p = await api.createProject({ name: "IntentP", ownerName: "Owner" });
    const captured = await api.intent.captureIntent(p.id, {
      problem: "Users lack X", audience: "SMBs", desiredOutcome: "Ship X",
      constraints: "Budget", commercialTarget: "10k MRR",
    });
    expect(captured.status).toBe("DRAFT");
    expect(captured.problem).toBe("Users lack X");
    const approved = await api.intent.approveIntent(p.id);
    expect(approved.status).toBe("APPROVED");
    expect(approved.approvedAt).toBeTruthy();
  });

  it("rejects invalid intent (missing required fields)", async () => {
    const p = await api.createProject({ name: "IntentBad", ownerName: "Owner" });
    await expect(api.intent.captureIntent(p.id, { problem: "", audience: "", desiredOutcome: "", constraints: "" })).rejects.toThrow();
  });
});

describe("TEST-INT-002: benchmark brief", () => {
  it("captures and approves a benchmark brief with omissions", async () => {
    const p = await api.createProject({ name: "BenchP", ownerName: "Owner" });
    const b = await api.intent.captureBenchmark(p.id, {
      purpose: "Compare with leaders", dimensions: ["speed", "price"],
      differentiators: ["design"], intentionalOmissions: ["support"],
    });
    expect(b.status).toBe("DRAFT");
    expect(JSON.parse(b.differentiators)).toEqual(["design"]);
    const approved = await api.intent.approveBenchmark(p.id);
    expect(approved.status).toBe("APPROVED");
  });
});

describe("TEST-DSG-001: trace approved intent into requirements (no intent mutation)", () => {
  it("records traceability only after intent is approved", async () => {
    const p = await api.createProject({ name: "TraceP", ownerName: "Owner" });
    await api.intent.captureIntent(p.id, { problem: "P", audience: "A", desiredOutcome: "O", constraints: "C" });
    // before approval, trace is refused
    await expect(api.intent.traceIntent(p.id, { requirementIds: ["PRJ-001"] })).rejects.toThrow(/NOT_APPROVED/i);
    await api.intent.approveIntent(p.id);
    const trace = await api.intent.traceIntent(p.id, { requirementIds: ["PRJ-001", "PRJ-002"], acceptanceCriterionIds: [] });
    expect(trace.traced).toBe(true);
    // intent text unchanged by tracing
    const intentAfter = await api.intent.getIntent(p.id);
    expect(intentAfter!.problem).toBe("P");
    const audit = await api.listAuditForProject(p.id);
    expect(audit.some((r) => r.action === "INTENT_TRACED")).toBe(true);
  });
});
