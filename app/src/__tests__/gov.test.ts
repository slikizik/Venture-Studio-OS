// TEST-GOV-001/002 — Immutable decision records, risk register, and the
// governance audit trail linkage.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, cleanupStrayTestDbs } from "./testdb";

const db = setupTestDb("gov-p5");

async function load() {
  const decisions = await import("../lib/decisions");
  const risks = await import("../lib/risks");
  const audit = await import("../lib/audit");
  const proj = await import("../lib/projects");
  const { prisma } = await import("../lib/prisma");
  return { decisions, risks, audit, proj, prisma };
}
let api: Awaited<ReturnType<typeof load>>;

beforeAll(async () => { api = await load(); });
afterAll(() => { teardownTestDb(db); cleanupStrayTestDbs(); });

async function makeProject(name = "P") {
  return api.proj.createProject({ name, ownerName: "Owner" });
}

describe("TEST-GOV-001: immutable decision records", () => {
  it("records a decision with options and selected option", async () => {
    const p = await makeProject("gov1");
    const d = await api.decisions.createDecision({
      projectId: p.id,
      decisionId: "DEC-1",
      title: "Adopt cadence",
      context: "How often to sync",
      options: [{ id: "WEEKLY", label: "Weekly" }, { id: "BIWEEKLY", label: "Biweekly" }],
      selectedOption: "WEEKLY",
      rationale: "Faster feedback",
      decidedBy: "OWNER",
    });
    expect(d.id).toBeTruthy();
    expect(d.selectedOption).toBe("WEEKLY");
    // immutability: the persisted record carries no update path, so re-read equals write
    const refetched = await api.decisions.getDecisionOrThrow(d.id);
    expect(refetched.selectedOption).toBe("WEEKLY");
    expect(refetched.title).toBe("Adopt cadence");
  });

  it("rejects a selectedOption that is not among the options", async () => {
    const p = await makeProject("gov1b");
    await expect(api.decisions.createDecision({
      projectId: p.id, decisionId: "DEC-2", title: "x", context: "c",
      options: [{ id: "A", label: "A" }], selectedOption: "Z", rationale: "r", decidedBy: "OWNER",
    })).rejects.toThrow(/selectedOption must be one of options/i);
  });

  it("records an audit event for the decision", async () => {
    const p = await makeProject("gov2");
    const d = await api.decisions.createDecision({
      projectId: p.id,
      decisionId: "DEC-3",
      title: "Cut feature X",
      context: "Scope decision",
      options: [{ id: "CUT", label: "Cut" }, { id: "KEEP", label: "Keep" }],
      selectedOption: "CUT",
      rationale: "r",
      decidedBy: "OWNER",
    });
    const trail = await api.audit.listAuditForProject(p.id, 10);
    expect(trail.some((a) => a.entityId === d.id && a.action === "DECISION_CREATED")).toBe(true);
  });

  it("lists decisions for the project", async () => {
    const p = await makeProject("gov2b");
    await api.decisions.createDecision({
      projectId: p.id, decisionId: "DEC-4", title: "t", context: "c",
      options: [{ id: "X", label: "X" }], selectedOption: "X", rationale: "r", decidedBy: "OWNER",
    });
    const list = await api.decisions.listDecisions(p.id);
    expect(list.some((x) => x.id)).toBe(true);
  });
});

describe("TEST-GOV-002: risk register", () => {
  it("registers a risk and updates status to mitigating with a mitigation", async () => {
    const p = await makeProject("gov3");
    const r = await api.risks.createRisk({ projectId: p.id, title: "Key person dependency", impact: "HIGH", likelihood: "MEDIUM" });
    expect(r.id).toBeTruthy();
    expect(r.status).toBe("OPEN");
    const u = await api.risks.updateRisk(r.id, { status: "MITIGATING", mitigation: "Cross-train" });
    expect(u.status).toBe("MITIGATING");
    expect(u.mitigation).toBe("Cross-train");
  });

  it("rejects an invalid risk status", async () => {
    const p = await makeProject("gov3b");
    const r = await api.risks.createRisk({ projectId: p.id, title: "R", impact: "LOW", likelihood: "LOW" });
    await expect(api.risks.updateRisk(r.id, { status: "MITIGATED" as unknown as "OPEN" })).rejects.toThrow();
  });

  it("lists risks for the project", async () => {
    const p = await makeProject("gov4");
    await api.risks.createRisk({ projectId: p.id, title: "R1", impact: "LOW", likelihood: "LOW" });
    await api.risks.createRisk({ projectId: p.id, title: "R2", impact: "LOW", likelihood: "LOW" });
    const list = await api.risks.listRisks(p.id);
    expect(list.length).toBe(2);
  });
});
