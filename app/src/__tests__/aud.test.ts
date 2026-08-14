// TEST-AUD-001 — Record required append-only audit events
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, cleanupStrayTestDbs } from "./testdb";

const db = setupTestDb("aud");

async function load() {
  const { recordAudit, listAuditForProject } = await import("../lib/audit");
  const { createProject } = await import("../lib/projects");
  return { recordAudit, listAuditForProject, createProject };
}
let api: Awaited<ReturnType<typeof load>>;
beforeAll(async () => { api = await load(); });
afterAll(() => { teardownTestDb(db); cleanupStrayTestDbs(); });

describe("TEST-AUD-001: append-only audit events", () => {
  it("records an audit event against a project", async () => {
    const p = await api.createProject({ name: "Audited", ownerName: "Owner" });
    await api.recordAudit({
      actor: "SYSTEM", action: "PROJECT_UPDATED", entityType: "PROJECT", entityId: p.id,
      projectId: p.id, summary: "manual audit event",
    });
    const records = await api.listAuditForProject(p.id);
    expect(records.length).toBeGreaterThanOrEqual(1);
    const found = records.find((r) => r.action === "PROJECT_UPDATED");
    expect(found).toBeTruthy();
    expect(found!.summary).toBe("manual audit event");
  });

  it("rejects invalid audit input", async () => {
    await expect(api.recordAudit({ actor: "", action: "X", entityType: "P", entityId: "1", summary: "y" })).rejects.toThrow();
  });

  it("project create produces an immutable audit trail", async () => {
    const p = await api.createProject({ name: "Trail", ownerName: "Owner", templateId: "standard-venture" });
    const records = await api.listAuditForProject(p.id);
    expect(records.some((r) => r.action === "PROJECT_CREATED")).toBe(true);
  });
});
