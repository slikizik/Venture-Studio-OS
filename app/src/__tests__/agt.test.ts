// TEST-AGT-001 — Store generic agent records (capabilities, provider, model, autonomy, status)
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, cleanupStrayTestDbs } from "./testdb";

const db = setupTestDb("agt");

async function load() {
  const { createAgent, updateAgent, listAgents, getAgent } = await import("../lib/agents");
  return { createAgent, updateAgent, listAgents, getAgent };
}
let api: Awaited<ReturnType<typeof load>>;
beforeAll(async () => { api = await load(); });
afterAll(() => { teardownTestDb(db); cleanupStrayTestDbs(); });

describe("TEST-AGT-001: agent records", () => {
  it("creates an agent with capabilities/provider/model/autonomy/status", async () => {
    const a = await api.createAgent({
      name: "Builder", kind: "AI", provider: "OpenAI", model: "gpt-4o",
      capabilities: ["code", "test"], autonomyLevel: "BOUNDED_AUTONOMY", status: "IDLE",
    });
    expect(a.id).toBeTruthy();
    expect(a.kind).toBe("AI");
    expect(a.autonomyLevel).toBe("BOUNDED_AUTONOMY");
    expect(a.status).toBe("IDLE");
    const full = await api.getAgent(a.id);
    expect(JSON.parse(full.capabilities)).toEqual(["code", "test"]);
  });

  it("rejects invalid agent input", async () => {
    await expect(api.createAgent({ name: "", kind: "AI" })).rejects.toThrow();
  });

  it("updates agent status and autonomy", async () => {
    const a = await api.createAgent({ name: "Runner", kind: "AI" });
    const updated = await api.updateAgent(a.id, { status: "ACTIVE", autonomyLevel: "SUPERVISED" });
    expect(updated.status).toBe("ACTIVE");
    expect(updated.autonomyLevel).toBe("SUPERVISED");
  });

  it("lists agents", async () => {
    const all = await api.listAgents();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });
});
