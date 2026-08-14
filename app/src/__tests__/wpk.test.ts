// TEST-WPK-001..003 — Work packets: create, edit draft, submit for review
// (-> IN_REVIEW), approve / request changes, and revision (version bump).
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, cleanupStrayTestDbs } from "./testdb";

const db = setupTestDb("wpk");

async function load() {
  const wp = await import("../lib/workpackets");
  const proj = await import("../lib/projects");
  return { wp, proj };
}
let api: Awaited<ReturnType<typeof load>>;

beforeAll(async () => {
  api = await load();
});
afterAll(() => {
  teardownTestDb(db);
  cleanupStrayTestDbs();
});

async function makeProject(name = "P") {
  return api.proj.createProject({ name, ownerName: "Owner" });
}
async function makePacket(p, title = "A") {
  return api.wp.createWorkPacket({
    projectId: p.id,
    title,
    objective: "o",
    scope: "s",
    exclusions: "e",
    expectedOutputs: ["x"],
  });
}

describe("TEST-WPK-001: create + edit draft", () => {
  it("creates a work packet and persists at v1/DRAFT", async () => {
    const p = await makeProject("wpk1");
    const w = await makePacket(p);
    expect(w.id).toBeTruthy();
    expect(w.status).toBe("DRAFT");
    expect(w.versionNumber).toBe(1);
    const list = await api.wp.listWorkPackets(p.id);
    expect(list.length).toBe(1);
  });

  it("edits a draft and persists", async () => {
    const p = await makeProject("wpk2");
    const w = await makePacket(p);
    const u = await api.wp.updateWorkPacket(w.id, { title: "B", objective: "o2" });
    expect(u.title).toBe("B");
    expect(u.objective).toBe("o2");
  });

  it("rejects empty title", async () => {
    const p = await makeProject("wpk3");
    await expect(
      api.wp.createWorkPacket({
        projectId: p.id,
        title: "",
        objective: "o",
        scope: "s",
        exclusions: "e",
        expectedOutputs: ["x"],
      }),
    ).rejects.toThrow();
  });
});

describe("TEST-WPK-002: submit for review locks fields", () => {
  it("submits a DRAFT -> IN_REVIEW", async () => {
    const p = await makeProject("wpk4");
    const w = await makePacket(p);
    const s = await api.wp.submitWorkPacket(w.id, "USER");
    expect(s.status).toBe("IN_REVIEW");
  });

  it("locks objective/scope after submission", async () => {
    const p = await makeProject("wpk5");
    const w = await makePacket(p);
    await api.wp.submitWorkPacket(w.id, "USER");
    await expect(
      api.wp.updateWorkPacket(w.id, { objective: "tampered" }),
    ).rejects.toThrow(/LOCKED/i);
    await expect(
      api.wp.updateWorkPacket(w.id, { scope: "tampered" }),
    ).rejects.toThrow(/LOCKED/i);
    // non-locked fields (title) still editable
    const u = await api.wp.updateWorkPacket(w.id, { title: "A2" });
    expect(u.title).toBe("A2");
  });
});

describe("TEST-WPK-003: approve / changes requested / revision version bump", () => {
  it("approves an in-review packet -> APPROVED", async () => {
    const p = await makeProject("wpk7");
    const w = await makePacket(p);
    await api.wp.submitWorkPacket(w.id, "USER");
    const a = await api.wp.approveWorkPacket(w.id, {
      actor: "REVIEWER",
      decision: "APPROVED",
    });
    expect(a.status).toBe("APPROVED");
  });

  it("rejects approving a non-submitted packet", async () => {
    const p = await makeProject("wpk8");
    const w = await makePacket(p);
    await expect(
      api.wp.approveWorkPacket(w.id, { decision: "APPROVED" }),
    ).rejects.toThrow(/NOT_SUBMITTED/i);
  });

  it("requesting changes -> REVISION_REQUESTED, then revision bumps version", async () => {
    const p = await makeProject("wpk9");
    const w = await makePacket(p);
    await api.wp.submitWorkPacket(w.id, "USER");
    const cr = await api.wp.approveWorkPacket(w.id, {
      actor: "REVIEWER",
      decision: "CHANGES_REQUESTED",
    });
    expect(cr.status).toBe("REVISION_REQUESTED");
    const rev = await api.wp.reviseWorkPacket(w.id, { objective: "o-v2" });
    expect(rev.status).toBe("DRAFT");
    expect(rev.versionNumber).toBe(2);
    expect(rev.objective).toBe("o-v2");
  });
});
