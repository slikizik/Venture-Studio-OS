// DAT-001 / DAT-002 / DAT-003 — Project export, import, and package validation.
//
// Export produces a self-contained, versioned JSON package: the project plus
// every record that belongs to it, gathered as FLAT lists (one per model) so
// re-import is an explicit, ordered sequence of creates with remapped ids.
//
// All record ids are REMAPPED on import (old id -> fresh uuid) so the same
// package imports cleanly into the same or any database without collisions.
//
// Import is fully transactional (single prisma.$transaction over an ordered
// create list) so a failure leaves the database unchanged (DAT-002). Packages
// are validated BEFORE any write; incompatible/malformed ones are rejected with
// nothing written (DAT-003).

import { randomUUID } from "node:crypto";
import { prisma } from "./prisma";
import { recordAudit } from "./audit";

export const PROJECT_PACKAGE_FORMAT = "vso-project-package";
export const PROJECT_PACKAGE_VERSION = 1;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Server-owned / cross-project-global tables excluded from a project package:
// ActivityRecord (audit log), Agent (global registry), AppSetting (global).
// These are not project-scoped.

const SERVER_FIELDS = new Set([
  "currentStageId",
  "progressPercent",
  "health",
  "archivedAt",
  "preArchiveStatus",
  "createdAt",
  "updatedAt",
]);

export interface ProjectPackage {
  format: string;
  version: number;
  exportedAt: string;
  generator: string;
  project: {
    id: string;
    name: string;
    [key: string]: unknown;
  };
  // Flat relation lists, each an array of record objects (ids are old uuids).
  brainEntries: unknown[];
  stages: unknown[];
  deliverables: unknown[];
  deliverableDependencies: unknown[];
  requirementLinks: unknown[];
  acceptanceCriteria: unknown[];
  workPackets: unknown[];
  reviews: unknown[];
  reviewComments: unknown[];
  decisions: unknown[];
  risks: unknown[];
  versions: unknown[];
  intents: unknown[];
  benchmarks: unknown[];
  qualityProfiles: unknown[];
  gateResults: unknown[];
  learningRecords: unknown[];
  evidence: unknown[];
  attachments: unknown[];
  attentionEvents: unknown[];
  requirements: unknown[];
  agentActivities: unknown[];
  queueItems: unknown[];
  directionRequests: unknown[];
  exceptions: unknown[];
  projectTemplates: unknown[];
}

/** DAT-001 — Export a complete project as a versioned package. */
export async function exportProject(projectId: string): Promise<ProjectPackage> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error(`Project not found: ${projectId}`);

  const [
    brainEntries,
    stages,
    deliverables,
    deliverableDependencies,
    requirementLinks,
    acceptanceCriteria,
    workPackets,
    reviews,
    reviewComments,
    decisions,
    risks,
    versions,
    intents,
    benchmarks,
    qualityProfiles,
    gateResults,
    learningRecords,
    evidence,
    attachments,
    attentionEvents,
    requirements,
    agentActivities,
    queueItems,
    directionRequests,
    exceptions,
    projectTemplates,
  ] = await Promise.all([
    prisma.projectBrainEntry.findMany({ where: { projectId } }),
    prisma.projectStage.findMany({ where: { projectId } }),
    prisma.deliverable.findMany({ where: { projectId } }),
    prisma.deliverableDependency.findMany({
      where: { deliverable: { projectId } },
    }),
    prisma.requirementLink.findMany({
      where: { OR: [{ deliverable: { projectId } }, { workPacket: { projectId } }] },
    }),
    prisma.acceptanceCriterion.findMany({ where: { projectId } }),
    prisma.workPacket.findMany({ where: { projectId } }),
    prisma.review.findMany({ where: { projectId } }),
    prisma.reviewComment.findMany({
      where: { review: { workPacket: { projectId } } },
    }),
    prisma.decisionRecord.findMany({ where: { projectId } }),
    prisma.riskRecord.findMany({ where: { projectId } }),
    prisma.versionRecord.findMany({ where: { projectId } }),
    prisma.projectIntent.findMany({ where: { projectId } }),
    prisma.benchmarkBrief.findMany({ where: { projectId } }),
    prisma.qualityProfile.findMany({ where: { projectId } }),
    prisma.qualityGateResult.findMany({ where: { projectId } }),
    prisma.learningRecord.findMany({ where: { projectId } }),
    prisma.evidence.findMany({ where: { projectId } }),
    prisma.attachment.findMany({ where: { projectId } }),
    prisma.attentionEvent.findMany({ where: { projectId } }),
    prisma.requirement.findMany({ where: { projectId } }),
    prisma.agentActivity.findMany({ where: { projectId } }),
    prisma.executionQueueItem.findMany({ where: { projectId } }),
    prisma.directionRequest.findMany({ where: { projectId } }),
    prisma.exception.findMany({ where: { projectId } }),
    prisma.projectTemplate.findMany({ where: { projectId } }),
  ]);

  return {
    format: PROJECT_PACKAGE_FORMAT,
    version: PROJECT_PACKAGE_VERSION,
    exportedAt: new Date().toISOString(),
    generator: "vso-data-port",
    project: structuredClone(project) as ProjectPackage["project"],
    brainEntries,
    stages,
    deliverables,
    deliverableDependencies,
    requirementLinks,
    acceptanceCriteria,
    workPackets,
    reviews,
    reviewComments,
    decisions,
    risks,
    versions,
    intents,
    benchmarks,
    qualityProfiles,
    gateResults,
    learningRecords,
    evidence,
    attachments,
    attentionEvents,
    requirements,
    agentActivities,
    queueItems,
    directionRequests,
    exceptions,
    projectTemplates,
  };
}

/**
 * Validate a parsed project package. Throws for any incompatible, unknown, or
 * structurally invalid package (DAT-003). Returns the normalized package.
 */
export function validateProjectPackage(input: unknown): ProjectPackage {
  if (typeof input !== "object" || input === null) {
    throw new Error("Package must be a JSON object");
  }
  const pkg = input as Record<string, unknown>;
  if (pkg.format !== PROJECT_PACKAGE_FORMAT) {
    throw new Error(`Unsupported package format: ${String(pkg.format)}`);
  }
  if (pkg.version !== PROJECT_PACKAGE_VERSION) {
    throw new Error(`Unsupported package version: ${String(pkg.version)} (expected ${PROJECT_PACKAGE_VERSION})`);
  }
  const project = pkg.project as Record<string, unknown> | undefined;
  if (typeof project !== "object" || project === null) {
    throw new Error("Package is missing a project object");
  }
  if (typeof project.id !== "string" || !UUID_RE.test(project.id)) {
    throw new Error("Package project.id is missing or not a UUID");
  }
  if (typeof project.name !== "string" || project.name.length === 0) {
    throw new Error("Package project.name is missing");
  }
  return pkg as unknown as ProjectPackage;
}

// Build old->new id map covering every id in the package (including embedded
// id arrays like affectedRequirementIds / evidenceIds), plus unique business
// keys (decisionId, code, slug) that must not collide on repeated import.
const BUSINESS_KEYS = ["decisionId", "code", "slug"];
let businessKeySeq = 0; // module-level so repeated imports are always unique
function buildIdMap(pkg: ProjectPackage): Map<string, string> {
  const map = new Map<string, string>();
  const register = (v: unknown) => {
    if (typeof v === "string" && UUID_RE.test(v) && !map.has(v)) map.set(v, randomUUID());
  };
  const registerKey = (k: string, v: unknown) => {
    if (BUSINESS_KEYS.includes(k) && typeof v === "string" && v.length > 0 && !map.has(v)) {
      map.set(v, `${v}-imp-${businessKeySeq++}`);
    }
  };
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node === null || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    register(obj.id);
    for (const [k, val] of Object.entries(obj)) {
      registerKey(k, val);
      if ((k === "affectedRequirementIds" || k === "evidenceIds") && typeof val === "string") {
        try {
          (JSON.parse(val) as unknown[]).forEach(register);
        } catch {
          /* ignore */
        }
      }
      walk(val);
    }
  };
  walk(pkg.project);
  for (const key of Object.keys(pkg)) {
    if (key === "project" || key === "format" || key === "version" || key === "exportedAt" || key === "generator") {
      continue;
    }
    walk((pkg as unknown as Record<string, unknown>)[key]);
  }
  return map;
}

// Rewrites every `id` and `*Id` scalar + embedded id arrays using the map,
// and uniquifies repeatable business keys so repeated imports never collide.
function remap(node: unknown, map: Map<string, string>): unknown {
  if (Array.isArray(node)) return node.map((n) => remap(n, map));
  if (node === null || typeof node !== "object") return node;
  const obj = node as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(obj)) {
    if (k === "id" && typeof val === "string" && map.has(val)) {
      out[k] = map.get(val);
      continue;
    }
    if (k.endsWith("Id") && k !== "id" && typeof val === "string" && map.has(val)) {
      out[k] = map.get(val);
      continue;
    }
    if (BUSINESS_KEYS.includes(k) && typeof val === "string" && map.has(val)) {
      out[k] = map.get(val);
      continue;
    }
    if ((k === "affectedRequirementIds" || k === "evidenceIds") && typeof val === "string") {
      try {
        const arr = JSON.parse(val) as unknown[];
        out[k] = JSON.stringify(arr.map((v) => (typeof v === "string" && map.has(v) ? map.get(v) : v)));
        continue;
      } catch {
        /* fall through */
      }
    }
    out[k] = remap(val, map);
  }
  return out;
}

// Strip server-managed/derived fields from a record before (re)creating it.
function stripServerFields(rec: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rec)) {
    if (SERVER_FIELDS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

/** DAT-002 — Import a compatible project package transactionally. */
export async function importProjectPackage(
  input: unknown,
  actor = "SYSTEM",
): Promise<{ projectId: string; created: Record<string, number> }> {
  const pkg = validateProjectPackage(input);
  const idMap = buildIdMap(pkg);
  const r = (n: unknown) => remap(n, idMap) as Record<string, unknown>;

  const newProjectId = idMap.get(pkg.project.id)!;
  const created: Record<string, number> = {};

  await prisma.$transaction(async (tx) => {
    type ModelDelegate = {
      create(a: { data: Record<string, unknown> }): Promise<unknown>;
    } & { [K: string]: ModelDelegate };
    const dyn = tx as unknown as ModelDelegate & { project: ModelDelegate };
    await dyn.project.create({
      data: stripServerFields(r(pkg.project)),
    });
    created.project = 1;

    const list = (
      key: string,
      model: string,
    ) => {
      const rows = (pkg[key as keyof ProjectPackage] as unknown[]) ?? [];
      return { rows, model, count: rows.length };
    };

    const batch: [string, string][] = [
      ["brainEntries", "projectBrainEntry"],
      ["stages", "projectStage"],
      ["deliverables", "deliverable"],
      ["deliverableDependencies", "deliverableDependency"],
      ["requirementLinks", "requirementLink"],
      ["acceptanceCriteria", "acceptanceCriterion"],
      ["workPackets", "workPacket"],
      ["reviews", "review"],
      ["reviewComments", "reviewComment"],
      ["decisions", "decisionRecord"],
      ["risks", "riskRecord"],
      ["versions", "versionRecord"],
      ["intents", "projectIntent"],
      ["benchmarks", "benchmarkBrief"],
      ["qualityProfiles", "qualityProfile"],
      ["gateResults", "qualityGateResult"],
      ["learningRecords", "learningRecord"],
      ["evidence", "evidence"],
      ["attachments", "attachment"],
      ["attentionEvents", "attentionEvent"],
      ["requirements", "requirement"],
      ["agentActivities", "agentActivity"],
      ["queueItems", "executionQueueItem"],
      ["directionRequests", "directionRequest"],
      ["exceptions", "exception"],
      ["projectTemplates", "projectTemplate"],
    ] as const;

    for (const [key, model] of batch) {
      const { rows, count } = list(key, model);
      for (const row of rows) {
        await dyn[model].create({ data: stripServerFields(r(row)) });
      }
      if (count > 0) created[key as string] = count;
    }
  });

  await recordAudit({
    actor,
    action: "PROJECT_IMPORTED",
    entityType: "PROJECT",
    entityId: newProjectId,
    summary: `Imported project package "${String(pkg.project.name)}"`,
  });

  return { projectId: newProjectId, created };
}

/** Export a project and serialize to a pretty JSON string. */
export async function exportProjectString(projectId: string): Promise<string> {
  return JSON.stringify(await exportProject(projectId), null, 2);
}

/** Parse + import a package from a JSON string (DAT-002/003). */
export async function importProjectString(
  json: string,
  actor = "SYSTEM",
): Promise<{ projectId: string; created: Record<string, number> }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Package is not valid JSON");
  }
  return importProjectPackage(parsed, actor);
}
