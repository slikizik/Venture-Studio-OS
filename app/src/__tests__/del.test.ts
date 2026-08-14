// TEST-DEL-001..003 — Deliverables (create/edit/reorder/archive/restore,
// validated parent-child hierarchy, dependencies, criteria, versions storage).
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, cleanupStrayTestDbs } from "./testdb";

const db = setupTestDb("del");

async function load() {
  const del = await import("../lib/deliverables");
  const proj = await import("../lib/projects");
  const audit = await import("../lib/audit");
  const { prisma } = await import("../lib/prisma");
  return { del, proj, audit, prisma };
}
let api: Awaited<ReturnType<typeof load>>;

beforeAll(async () => { api = await load(); });
afterAll(() => { teardownTestDb(db); cleanupStrayTestDbs(); });

async function makeProject(name = "P") {
  return api.proj.createProject({ name, ownerName: "Owner" });
}

describe("TEST-DEL-001: create edit reorder archive restore", () => {
  it("creates a deliverable and persists", async () => {
    const p = await makeProject("d1");
    const d = await api.del.createDeliverable({ projectId: p.id, title: "Landing page", type: "feature", order: 0 });
    expect(d.id).toBeTruthy();
    expect(d.status).toBe("PLANNED");
    const list = await api.del.listDeliverables(p.id);
    expect(list.length).toBe(1);
  });

  it("edits metadata and persists across reload", async () => {
    const p = await makeProject("d2");
    const d = await api.del.createDeliverable({ projectId: p.id, title: "A", type: "feature", order: 0 });
    const u = await api.del.updateDeliverable(d.id, { title: "B", status: "IN_PROGRESS", priority: "HIGH" });
    expect(u.title).toBe("B");
    const reloaded = await api.del.getDeliverableOrThrow(d.id);
    expect(reloaded.status).toBe("IN_PROGRESS");
    expect(reloaded.priority).toBe("HIGH");
  });

  it("reorders among siblings and persists", async () => {
    const p = await makeProject("d3");
    const a = await api.del.createDeliverable({ projectId: p.id, title: "A", type: "feature", order: 0 });
    await api.del.createDeliverable({ projectId: p.id, title: "B", type: "feature", order: 1 });
    const r = await api.del.reorderDeliverable(a.id, 5);
    expect(r.order).toBe(5);
  });

  it("archives without data loss and restores", async () => {
    const p = await makeProject("d4");
    const d = await api.del.createDeliverable({ projectId: p.id, title: "A", type: "feature", order: 0 });
    const arc = await api.del.archiveDeliverable(d.id);
    expect(arc.status).toBe("ARCHIVED");
    const restored = await api.del.restoreDeliverable(d.id);
    expect(restored.status).toBe("PLANNED");
  });

  it("refuses to restore a deliverable that is not archived", async () => {
    const p = await makeProject("d5");
    const d = await api.del.createDeliverable({ projectId: p.id, title: "A", type: "feature", order: 0 });
    await expect(api.del.restoreDeliverable(d.id)).rejects.toThrow(/NOT_ARCHIVED/i);
  });

  it("refuses to delete a deliverable that has children", async () => {
    const p = await makeProject("d6");
    const parent = await api.del.createDeliverable({ projectId: p.id, title: "Parent", type: "feature", order: 0 });
    await api.del.createDeliverable({ projectId: p.id, title: "Child", type: "feature", order: 1, parentId: parent.id });
    await expect(api.del.deleteDeliverable(parent.id)).rejects.toThrow(/HAS_CHILDREN/i);
    // child can be deleted
    const child = (await api.del.listDeliverables(p.id)).find((x) => x.parentId === parent.id)!;
    await api.del.deleteDeliverable(child.id);
    await api.del.deleteDeliverable(parent.id);
    expect((await api.del.listDeliverables(p.id)).length).toBe(0);
  });

  it("rejects invalid create input without persisting", async () => {
    const p = await makeProject("d7");
    await expect(api.del.createDeliverable({ projectId: p.id, title: "", type: "feature", order: 0 })).rejects.toThrow();
    expect((await api.del.listDeliverables(p.id)).length).toBe(0);
  });
});

describe("TEST-DEL-002: validated parent-child hierarchy", () => {
  it("supports a parent-child tree", async () => {
    const p = await makeProject("h1");
    const parent = await api.del.createDeliverable({ projectId: p.id, title: "P", type: "feature", order: 0 });
    const child = await api.del.createDeliverable({ projectId: p.id, title: "C", type: "feature", order: 0, parentId: parent.id });
    expect(child.parentId).toBe(parent.id);
  });

  it("rejects a cycle (move under own descendant)", async () => {
    const p = await makeProject("h2");
    const a = await api.del.createDeliverable({ projectId: p.id, title: "A", type: "feature", order: 0 });
    const b = await api.del.createDeliverable({ projectId: p.id, title: "B", type: "feature", order: 1, parentId: a.id });
    await expect(api.del.updateDeliverable(a.id, { parentId: b.id })).rejects.toThrow(/HIERARCHY_CYCLE/i);
  });

  it("rejects a self-parent", async () => {
    const p = await makeProject("h3");
    const a = await api.del.createDeliverable({ projectId: p.id, title: "A", type: "feature", order: 0 });
    await expect(api.del.updateDeliverable(a.id, { parentId: a.id })).rejects.toThrow(/CYCLE_SELF/i);
  });

  it("rejects cross-project reparent", async () => {
    const p1 = await makeProject("h4a");
    const p2 = await makeProject("h4b");
    const a = await api.del.createDeliverable({ projectId: p1.id, title: "A", type: "feature", order: 0 });
    const b = await api.del.createDeliverable({ projectId: p2.id, title: "B", type: "feature", order: 0 });
    await expect(api.del.updateDeliverable(b.id, { parentId: a.id })).rejects.toThrow(/CROSS_PROJECT/i);
  });

  it("rejects a dependency cycle", async () => {
    const p = await makeProject("h5");
    const a = await api.del.createDeliverable({ projectId: p.id, title: "A", type: "feature", order: 0 });
    const b = await api.del.createDeliverable({ projectId: p.id, title: "B", type: "feature", order: 1 });
    await api.del.addDependency({ deliverableId: a.id, dependsOnDeliverableId: b.id });
    await expect(api.del.addDependency({ deliverableId: b.id, dependsOnDeliverableId: a.id })).rejects.toThrow(/DEPENDENCY_CYCLE/i);
  });

  it("rejects a self-dependency and cross-project dependency", async () => {
    const p1 = await makeProject("h6a");
    const p2 = await makeProject("h6b");
    const a = await api.del.createDeliverable({ projectId: p1.id, title: "A", type: "feature", order: 0 });
    await expect(api.del.addDependency({ deliverableId: a.id, dependsOnDeliverableId: a.id })).rejects.toThrow(/cannot depend on itself/i);
    const b = await api.del.createDeliverable({ projectId: p2.id, title: "B", type: "feature", order: 0 });
    await expect(api.del.addDependency({ deliverableId: a.id, dependsOnDeliverableId: b.id })).rejects.toThrow(/CROSS_PROJECT/i);
  });
});

describe("TEST-DEL-003: status owner dueDate dependencies criteria versions", () => {
  it("stores status, priority, dueDate, owner agent", async () => {
    const p = await makeProject("s1");
    const agent = await api.prisma.agent.create({ data: { name: "Builder", kind: "AI", provider: "x", model: "y" } });
    const due = new Date("2026-12-01T00:00:00.000Z");
    const d = await api.del.createDeliverable({
      projectId: p.id, title: "A", type: "feature", order: 0,
      status: "READY", priority: "CRITICAL", ownerAgentId: agent.id, dueDate: due,
    });
    expect(d.status).toBe("READY");
    expect(d.priority).toBe("CRITICAL");
    expect(d.ownerAgentId).toBe(agent.id);
    expect(new Date(d.dueDate!).toISOString()).toBe(due.toISOString());
  });

  it("stores acceptance criteria and updates their status", async () => {
    const p = await makeProject("s2");
    const d = await api.del.createDeliverable({ projectId: p.id, title: "A", type: "feature", order: 0 });
    const c = await api.del.addCriterion({ projectId: p.id, deliverableId: d.id, statement: "Must pass lint", verificationMethod: "AUTOMATED_TEST" });
    expect(c.status).toBe("NOT_VERIFIED");
    const u = await api.del.updateCriterion(c.id, { status: "PASSED" });
    expect(u.status).toBe("PASSED");
  });

  it("requires exactly one of deliverableId/workPacketId for criteria", async () => {
    const p = await makeProject("s3");
    await expect(api.del.addCriterion({ projectId: p.id, statement: "x" })).rejects.toThrow(/exactly one/i);
  });

  it("records an audit event for deliverable creation", async () => {
    const p = await makeProject("s4");
    const d = await api.del.createDeliverable({ projectId: p.id, title: "Audited", type: "feature", order: 0 });
    const trail = await api.audit.listAuditForProject(p.id, 5);
    expect(trail.some((a) => a.entityId === d.id && a.action === "DELIVERABLE_CREATED")).toBe(true);
  });
});
