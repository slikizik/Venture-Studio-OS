// TEST-LRN-001/002 — Capture learnings and convert them into backlog items,
// requirements, or change requests (conversion recorded, learning marked).
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, cleanupStrayTestDbs } from "./testdb";

const db = setupTestDb("lrn");

async function load() {
  const learning = await import("../lib/learning");
  const proj = await import("../lib/projects");
  return { learning, proj };
}
let api: Awaited<ReturnType<typeof load>>;

beforeAll(async () => { api = await load(); });
afterAll(() => { teardownTestDb(db); cleanupStrayTestDbs(); });

async function makeProject(name = "P") {
  return api.proj.createProject({ name, ownerName: "Owner" });
}

describe("TEST-LRN-001: capture learnings", () => {
  it("captures a learning and lists it under the project", async () => {
    const p = await makeProject("lrn1");
    const l = await api.learning.createLearning({
      projectId: p.id, sourceType: "BUG", summary: "Race in submit", impact: "causes dup reviews",
    });
    expect(l.id).toBeTruthy();
    expect(l.status).toBe("NEW");
    const list = await api.learning.listLearnings(p.id);
    expect(list.some((x) => x.id === l.id)).toBe(true);
  });
});

describe("TEST-LRN-002: convert learning", () => {
  it("converts a learning into a requirement and marks it CONVERTED", async () => {
    const p = await makeProject("lrn2");
    const l = await api.learning.createLearning({ projectId: p.id, sourceType: "FEEDBACK", summary: "Users want dark mode" });
    const converted = await api.learning.convertLearning(l.id, { target: "REQUIREMENT", reference: "REQ-99", note: "add to backlog" });
    expect(converted.status).toBe("CONVERTED");
    expect(converted.convertedReference).toBe("REQUIREMENT:REQ-99");
    const refetched = await api.learning.getLearningOrThrow(l.id);
    expect(refetched.status).toBe("CONVERTED");
  });

  it("records the conversion as an audit event", async () => {
    const p = await makeProject("lrn3");
    const l = await api.learning.createLearning({ projectId: p.id, sourceType: "USABILITY", summary: "Confusing nav" });
    await api.learning.convertLearning(l.id, { target: "BACKLOG", reference: "BL-1" });
    const trail = await (await import("../lib/audit")).listAuditForProject(p.id, 10);
    expect(trail.some((a) => a.entityId === l.id && a.action === "LEARNING_CONVERTED")).toBe(true);
  });
});
