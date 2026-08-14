// TEST-PRJ-001..004 — Project Core
// PRJ-001 create from template, PRJ-002 edit metadata + brain,
// PRJ-003 archive/restore without data loss, PRJ-004 search/sort/filter.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, cleanupStrayTestDbs } from "./testdb";

const db = setupTestDb("prj");

async function load() {
  const { createProject, updateProject, archiveProject, restoreProject, searchProjects, upsertBrainEntry, getProjectOrThrow } = await import("../lib/projects");
  const { prisma } = await import("../lib/prisma");
  return { createProject, updateProject, archiveProject, restoreProject, searchProjects, upsertBrainEntry, getProjectOrThrow, prisma };
}

let api: Awaited<ReturnType<typeof load>>;

beforeAll(async () => {
  api = await load();
});
afterAll(() => { teardownTestDb(db); cleanupStrayTestDbs(); });

describe("TEST-PRJ-001: create project from template", () => {
  it("creates a project and seeds stages from a built-in template", async () => {
    const p = await api.createProject({ name: "Alpha", ownerName: "Owner", templateId: "standard-venture" });
    expect(p.id).toBeTruthy();
    expect(p.status).toBe("DRAFT");
    const full = await api.getProjectOrThrow(p.id);
    expect(full.stages.length).toBe(5);
    expect(full.stages[0].name).toBe("Discovery");
    // brain sections seeded
    expect(full.brainEntries.length).toBeGreaterThan(0);
  });

  it("rejects invalid input without persisting", async () => {
    await expect(api.createProject({ name: "", ownerName: "Owner" })).rejects.toThrow();
    const all = await api.searchProjects({});
    expect(all.length).toBe(1); // only Alpha
  });

  it("creates a blank project with a single Draft stage", async () => {
    const p = await api.createProject({ name: "Blank", ownerName: "Owner", templateId: "blank" });
    const full = await api.getProjectOrThrow(p.id);
    expect(full.stages.length).toBe(1);
    expect(full.stages[0].name).toBe("Draft");
    expect(full.brainEntries.length).toBe(0);
  });
});

describe("TEST-PRJ-002: edit metadata and project brain", () => {
  it("edits metadata and persists across reload", async () => {
    const p = await api.createProject({ name: "EditMe", ownerName: "Owner" });
    const updated = await api.updateProject(p.id, { name: "Edited", ownerName: "NewOwner", summary: "note" });
    expect(updated.name).toBe("Edited");
    const reloaded = await api.getProjectOrThrow(p.id);
    expect(reloaded.name).toBe("Edited");
    expect(reloaded.ownerName).toBe("NewOwner");
    expect(reloaded.summary).toBe("note");
  });

  it("rejects invalid edit without corrupting data", async () => {
    const p = await api.createProject({ name: "Keep", ownerName: "Owner" });
    await expect(api.updateProject(p.id, { name: "" })).rejects.toThrow();
    const reloaded = await api.getProjectOrThrow(p.id);
    expect(reloaded.name).toBe("Keep");
  });

  it("upserts brain entries and persists", async () => {
    const p = await api.createProject({ name: "Brain", ownerName: "Owner" });
    await api.upsertBrainEntry(p.id, { section: "VISION", title: "Vision", content: "Be great", order: 0 });
    await api.upsertBrainEntry(p.id, { section: "VISION", title: "Vision 2", content: "Updated", order: 0 });
    const full = await api.getProjectOrThrow(p.id);
    expect(full.brainEntries.length).toBe(1);
    expect(full.brainEntries[0].content).toBe("Updated");
  });
});

describe("TEST-PRJ-003: archive and restore without data loss", () => {
  it("archives preserving data and restores to pre-archive status", async () => {
    const p = await api.createProject({ name: "Arc", ownerName: "Owner", status: "ACTIVE" });
    await api.upsertBrainEntry(p.id, { section: "VISION", title: "V", content: "x", order: 0 });
    const archived = await api.archiveProject(p.id);
    expect(archived.status).toBe("ARCHIVED");
    expect(archived.archivedAt).toBeTruthy();
    expect(archived.preArchiveStatus).toBe("ACTIVE");
    // data intact
    const full = await api.getProjectOrThrow(p.id);
    expect(full.brainEntries.length).toBe(1);
    // restore
    const restored = await api.restoreProject(p.id);
    expect(restored.status).toBe("ACTIVE");
    expect(restored.archivedAt).toBeNull();
  });

  it("refuses to restore a project that was not archived", async () => {
    const p = await api.createProject({ name: "NoArc", ownerName: "Owner" });
    await expect(api.restoreProject(p.id)).rejects.toThrow(/NOT_ARCHIVED/i);
  });
});

describe("TEST-PRJ-004: search, sort, filter", () => {
  it("filters by status and searches across name/summary/brain", async () => {
    const a = await api.createProject({ name: "Searchable One", ownerName: "Owner", summary: "unique summary text" });
    await api.createProject({ name: "Other", ownerName: "Owner", status: "ARCHIVED" });
    await api.upsertBrainEntry(a.id, { section: "VISION", title: "Hidden", content: "brainsearchword", order: 0 });

    const active = await api.searchProjects({ status: "ACTIVE" });
    expect(active.length).toBeGreaterThanOrEqual(1);
    const noneActive = await api.searchProjects({ status: "ARCHIVED" });
    expect(noneActive.every((p) => p.status === "ARCHIVED")).toBe(true);

    const bySummary = await api.searchProjects({ search: "unique summary" });
    expect(bySummary.some((p) => p.id === a.id)).toBe(true);
    const byBrain = await api.searchProjects({ search: "brainsearchword" });
    expect(byBrain.some((p) => p.id === a.id)).toBe(true);
  });

  it("sorts by name ascending", async () => {
    const r = await api.searchProjects({ sortBy: "name", sortDir: "asc" });
    const names = r.map((p) => p.name);
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });
});
