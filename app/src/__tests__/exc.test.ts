// TEST-EXC-001..004 — Exception classification, resolution lifecycle, and
// direction requests that cannot be bypassed by an agent.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, cleanupStrayTestDbs } from "./testdb";

const db = setupTestDb("exc");

async function load() {
  const exceptions = await import("../lib/exceptions");
  const direction = await import("../lib/direction");
  const proj = await import("../lib/projects");
  return { exceptions, direction, proj };
}
let api: Awaited<ReturnType<typeof load>>;

beforeAll(async () => { api = await load(); });
afterAll(() => { teardownTestDb(db); cleanupStrayTestDbs(); });

async function makeProject(name = "P") {
  return api.proj.createProject({ name, ownerName: "Owner" });
}

describe("TEST-EXC-001: classify + resolve exceptions", () => {
  it("classifies an exception and resolves it", async () => {
    const p = await makeProject("exc1");
    const e = await api.exceptions.createException({
      projectId: p.id, classification: "RECOVERABLE", title: "Temp file leak", detail: "d",
    });
    expect(e.id).toBeTruthy();
    expect(e.status).toBe("OPEN");
    const r = await api.exceptions.resolveException(e.id, { status: "RESOLVED", resolvedBy: "OWNER" });
    expect(r.status).toBe("RESOLVED");
    expect(r.resolvedBy).toBe("OWNER");
    expect(r.resolvedAt).toBeTruthy();
  });

  it("lists exceptions for the project", async () => {
    const p = await makeProject("exc2");
    await api.exceptions.createException({ projectId: p.id, classification: "CRITICAL", title: "C1" });
    await api.exceptions.createException({ projectId: p.id, classification: "ASSUMPTION", title: "A1" });
    const list = await api.exceptions.listExceptions(p.id);
    expect(list.length).toBe(2);
  });
});

describe("TEST-EXC-002/004: direction requests cannot be bypassed", () => {
  it("raises a direction request and records an owner decision", async () => {
    const p = await makeProject("exc3");
    const dr = await api.direction.createDirectionRequest({
      projectId: p.id,
      title: "Which auth provider?",
      question: "OAuth vs sessions?",
      options: [{ id: "OAUTH", label: "OAuth" }, { id: "SESSION", label: "Sessions", recommended: true }],
    });
    expect(dr.id).toBeTruthy();
    expect(dr.status).toBe("OPEN");
    const resolved = await api.direction.resolveDirectionRequest(dr.id, { resolution: "Use sessions", decidedBy: "OWNER" });
    expect(resolved.status).toBe("ANSWERED");
    expect(resolved.decidedAt).toBeTruthy();
    expect(resolved.resolution).toBe("Use sessions");
  });

  it("refuses to answer a non-open request (cannot be reopened)", async () => {
    const p = await makeProject("exc4");
    const dr = await api.direction.createDirectionRequest({ projectId: p.id, title: "Q", question: "?" });
    await api.direction.resolveDirectionRequest(dr.id, { resolution: "A", decidedBy: "OWNER" });
    await expect(api.direction.resolveDirectionRequest(dr.id, { resolution: "B", decidedBy: "OWNER" }))
      .rejects.toThrow(/DIRECTION_REQUEST_CLOSED/i);
  });

  it("lists only open direction requests", async () => {
    const p = await makeProject("exc5");
    const dr = await api.direction.createDirectionRequest({ projectId: p.id, title: "Open Q", question: "?" });
    await api.direction.createDirectionRequest({ projectId: p.id, title: "Answered Q", question: "?" });
    const list = await api.direction.listOpenDirectionRequests(p.id);
    expect(list.length).toBe(2);
    // resolve one, list should shrink
    await api.direction.resolveDirectionRequest(dr.id, { resolution: "x", decidedBy: "OWNER" });
    const list2 = await api.direction.listOpenDirectionRequests(p.id);
    expect(list2.length).toBe(1);
  });
});
