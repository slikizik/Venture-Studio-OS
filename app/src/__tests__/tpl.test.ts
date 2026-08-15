// TEST-TPL-001..003 — Templates
// TPL-001 list/validate built-in templates, TPL-002 instantiation seeds
// deliverables/gates/quality-profile, TPL-003 custom template CRUD + versioning.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, cleanupStrayTestDbs } from "./testdb";
import type { TemplateDef } from "../lib/validation";

const db = setupTestDb("tpl");

async function load() {
  const { createProject, getProjectOrThrow } = await import("../lib/projects");
  const { listBuiltInTemplates, validateTemplate, getBuiltInTemplate } = await import("../lib/templates");
  const { createCustomTemplate, listCustomTemplates, getCustomTemplate, resolveTemplate } = await import("../lib/customTemplates");
  const { prisma } = await import("../lib/prisma");
  return { createProject, getProjectOrThrow, listBuiltInTemplates, validateTemplate, getBuiltInTemplate, createCustomTemplate, listCustomTemplates, getCustomTemplate, resolveTemplate, prisma };
}

let api: Awaited<ReturnType<typeof load>>;

beforeAll(async () => {
  api = await load();
});
afterAll(() => { teardownTestDb(db); cleanupStrayTestDbs(); });

describe("TEST-TPL-001: built-in template catalog + validation", () => {
  it("exposes 6 built-in templates covering all project types", () => {
    const t = api.listBuiltInTemplates();
    expect(t.length).toBe(6);
    const ids = t.map((x) => x.id).sort();
    expect(ids).toEqual(["blank", "internal-tool", "product-release", "research", "service", "standard-venture"].sort());
  });

  it("has a stable id/description/name for each built-in", () => {
    for (const t of api.listBuiltInTemplates()) {
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(0);
      expect(t.projectTypeId).toBeTruthy();
    }
  });

  it("all built-in definitions validate at module load (fail-fast)", () => {
    for (const id of ["blank", "standard-venture", "product-release", "research", "service", "internal-tool"]) {
      const def = api.getBuiltInTemplate(id);
      expect(def).toBeTruthy();
      expect(() => api.validateTemplate(def)).not.toThrow();
    }
  });

  it("validateTemplate rejects a malformed definition", () => {
    expect(() => api.validateTemplate({ name: "", projectTypeId: "BOGUS", stages: [] })).toThrow();
  });
});

describe("TEST-TPL-002: template instantiation seeds derived entities", () => {
  it("standard-venture seeds stages, deliverables, gates, brain, and a quality profile", async () => {
    const p = await api.createProject({ name: "Venture Co", ownerName: "Owner", templateId: "standard-venture" });
    const full = await api.getProjectOrThrow(p.id);
    expect(full.stages.length).toBe(5);
    expect(full.brainEntries.length).toBeGreaterThan(0);
    const deliverables = await api.prisma.deliverable.findMany({ where: { projectId: p.id } });
    expect(deliverables.length).toBeGreaterThan(0);

    // quality profile auto-seeded for the project type
    const qps = await api.prisma.qualityProfile.findMany({ where: { projectId: p.id } });
    expect(qps.length).toBe(1);
    expect(qps[0].projectTypeId).toBe("STANDARD_VENTURE");
    const dims = JSON.parse(qps[0].dimensions);
    expect(Array.isArray(dims)).toBe(true);
    expect(dims.length).toBeGreaterThan(0);

    // gates seeded as NOT_RUN quality gate results at project scope
    const gates = await api.prisma.qualityGateResult.findMany({ where: { projectId: p.id } });
    expect(gates.length).toBeGreaterThan(0);
    expect(gates.every((g) => g.outcome === "NOT_RUN")).toBe(true);
  });

  it("product-release seeds deliverables with key-based dependencies", async () => {
    const p = await api.createProject({ name: "Launch", ownerName: "Owner", templateId: "product-release" });
    const full = await api.getProjectOrThrow(p.id);
    expect(full.stages.length).toBeGreaterThan(0);
    const deliverables = await api.prisma.deliverable.findMany({ where: { projectId: p.id } });
    expect(deliverables.length).toBeGreaterThan(0);
    // at least one deliverable declares a dependency (stored in the join table)
    const depRows = await api.prisma.deliverableDependency.findMany({
      where: { deliverable: { projectId: p.id } },
    });
    expect(depRows.length).toBeGreaterThan(0);
  });

  it("blank template seeds a single Draft stage with no deliverables/gates", async () => {
    const p = await api.createProject({ name: "Empty", ownerName: "Owner", templateId: "blank" });
    const full = await api.getProjectOrThrow(p.id);
    expect(full.stages.length).toBe(1);
    expect(full.stages[0].name).toBe("Draft");
    const deliverables = await api.prisma.deliverable.findMany({ where: { projectId: p.id } });
    expect(deliverables.length).toBe(0);
    expect(full.brainEntries.length).toBe(0);
    const gates = await api.prisma.qualityGateResult.findMany({ where: { projectId: p.id } });
    expect(gates.length).toBe(0);
  });

  it("no-template project still gets a Draft stage", async () => {
    const p = await api.createProject({ name: "Ad Hoc", ownerName: "Owner" });
    const full = await api.getProjectOrThrow(p.id);
    expect(full.stages.length).toBe(1);
    expect(full.stages[0].name).toBe("Draft");
  });
});

describe("TEST-TPL-003: custom template CRUD + immutable versioning", () => {
  const def: TemplateDef = {
    key: "my-custom",
    name: "My Custom Flow",
    description: "Custom",
    projectTypeId: "STANDARD_VENTURE",
    stages: [{ name: "Kickoff", order: 0, entryCriteria: [], exitCriteria: ["Approved"] }],
    deliverables: [{ key: "d1", title: "Spec", type: "DOCUMENT", priority: "HIGH", order: 0 }],
    gates: [{ level: "RELEASE", name: "Ship Gate", criteria: ["Smoke test passes"], order: 0 }],
    brainSections: [{ section: "VISION", title: "Why", content: "x", order: 0 }],
  };

  it("creates a custom template at version 1.0.0 and supersedes on re-save", async () => {
    const t1 = await api.createCustomTemplate({ projectId: null, definition: def });

    expect(t1.version).toBe("1.0.0");
    expect(t1.isLatest).toBe(true);

    const t2 = await api.createCustomTemplate({ projectId: null, definition: { ...def, name: "My Custom Flow v2" } });
    expect(t2.version).toBe("1.0.1");
    expect(t2.isLatest).toBe(true);

    // previous version demoted
    const prev = await api.getCustomTemplate(t1.id);
    expect(prev!.isLatest).toBe(false);

    // list only returns latest
    const list = await api.listCustomTemplates();
    const mine = list.filter((t) => t.key === "my-custom");
    expect(mine.length).toBe(1);
    expect(mine[0].version).toBe("1.0.1");
  });

  it("resolveTemplate resolves a custom template id to its definition", async () => {
    const t = await api.createCustomTemplate({ projectId: null, definition: def });
    const res = await api.resolveTemplate(t.id);
    expect(res).not.toBeNull();
    expect(res!.isBuiltIn).toBe(false);
    expect(res!.def.key).toBe("my-custom");
  });

  it("custom template can be instantiated into a project", async () => {
    const t = await api.createCustomTemplate({ projectId: null, definition: def });
    const p = await api.createProject({ name: "FromCustom", ownerName: "Owner", templateId: t.id });
    const full = await api.getProjectOrThrow(p.id);
    expect(full.stages.length).toBe(1);
    expect(full.stages[0].name).toBe("Kickoff");
    const deliverables = await api.prisma.deliverable.findMany({ where: { projectId: p.id } });
    expect(deliverables.length).toBe(1);
  });
});
