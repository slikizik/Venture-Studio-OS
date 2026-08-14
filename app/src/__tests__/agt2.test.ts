// TEST-AGT-002/003 — Execution queue (order, dependency readiness, linked
// evidence) + append-only agent activity log.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, cleanupStrayTestDbs } from "./testdb";

const db = setupTestDb("agt2");

async function load() {
  const proj = await import("../lib/projects");
  const wp = await import("../lib/workpackets");
  const q = await import("../lib/queue");
  const ea = await import("../lib/agents-activity");
  const ev = await import("../lib/evidence");
  return { proj, wp, q, ea, ev };
}
let api: Awaited<ReturnType<typeof load>>;
beforeAll(async () => { api = await load(); });
afterAll(() => { teardownTestDb(db); cleanupStrayTestDbs(); });

async function project() { return api.proj.createProject({ name: "Q", ownerName: "O" }); }
async function packet(p, t = "WP") {
  return api.wp.createWorkPacket({ projectId: p.id, title: t, objective: "o", scope: "s", exclusions: "e", expectedOutputs: ["x"] });
}

describe("TEST-AGT-002: execution queue", () => {
  it("enqueues a work packet (READY) and reflects on the packet", async () => {
    const p = await project();
    const w = await packet(p);
    const item = await api.q.enqueueWorkPacket({ workPacketId: w.id, order: 0, queueStatus: "READY" });
    expect(item.queueStatus).toBe("READY");
    const wp2 = await api.wp.getWorkPacketOrThrow(w.id);
    expect(wp2.queueStatus).toBe("READY");
    expect(wp2.queueOrder).toBe(0);
  });

  it("dependency readiness: a queued item is BLOCKED until predecessor COMPLETE", async () => {
    const p = await project();
    const a = await packet(p, "A");
    const b = await packet(p, "B");
    const ia = await api.q.enqueueWorkPacket({ workPacketId: a.id, order: 0, queueStatus: "COMPLETE" });
    const ib = await api.q.enqueueWorkPacket({ workPacketId: b.id, order: 1, queueStatus: "READY", dependsOnId: ia.id });
    const queue = await api.q.getExecutionQueue(p.id);
    const eb = queue.find((x) => x.id === ib.id)!;
    expect(eb.readiness).toBe("READY");
    expect(eb.effectiveStatus).toBe("READY");
    // now make predecessor not complete
    await api.q.updateQueueItem(ia.id, { queueStatus: "IN_PROGRESS" });
    const queue2 = await api.q.getExecutionQueue(p.id);
    const eb2 = queue2.find((x) => x.id === ib.id)!;
    expect(eb2.readiness).toBe("BLOCKED");
    expect(eb2.effectiveStatus).toBe("BLOCKED");
  });

  it("markEvidence stores a JSON array of evidence ids on the queue item", async () => {
    const p = await project();
    const w = await packet(p);
    const item = await api.q.enqueueWorkPacket({ workPacketId: w.id, order: 0, queueStatus: "IN_PROGRESS" });
    const evidence = await api.ev.createEvidence({ projectId: p.id, workPacketId: w.id, type: "TEST_RESULT", title: "result" });
    const updated = await api.q.markEvidence(item.id, evidence.id);
    const parsed = JSON.parse(updated.linkedEvidence);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toContain(evidence.id);
  });

  it("removeQueueItem clears packet queue markers", async () => {
    const p = await project();
    const w = await packet(p);
    const item = await api.q.enqueueWorkPacket({ workPacketId: w.id, order: 0, queueStatus: "READY" });
    await api.q.removeQueueItem(item.id);
    const wp2 = await api.wp.getWorkPacketOrThrow(w.id);
    expect(wp2.queueStatus).toBeNull();
    expect(wp2.queueOrder).toBe(0);
  });
});

describe("TEST-AGT-003: agent activity log", () => {
  it("appends an immutable activity record with outcome", async () => {
    const p = await project();
    const rec = await api.ea.recordAgentActivity({
      projectId: p.id,
      agentName: "Agent-1",
      action: "BUILD",
      entityType: "WORK_PACKET",
      outcome: "SUCCESS",
      summary: "built packet",
    });
    expect(rec.id).toBeTruthy();
    expect(rec.outcome).toBe("SUCCESS");
    const list = await api.ea.listAgentActivity(p.id);
    expect(list.length).toBe(1);
  });

  it("rejects an invalid outcome enum", async () => {
    const p = await project();
    await expect(
      api.ea.recordAgentActivity({
        projectId: p.id,
        agentName: "A",
        action: "X",
        outcome: "UNKNOWN",
        summary: "y",
      }),
    ).rejects.toThrow();
  });
});
