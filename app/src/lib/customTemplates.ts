// TPL-003 — Custom template persistence with immutable versioning.
// A ProjectTemplate is a reusable definition of stages, deliverables, gates,
// brain sections, and a default quality profile. Saving a new version creates a
// new immutable snapshot and marks it isLatest; older versions are retained.
import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";
import { getBuiltInTemplate } from "./templates";
import {
  customTemplateCreateSchema,
  CustomTemplateCreateInput,
  templateDefSchema,
  TemplateDef,
  TemplateDeliverableDef,
  TemplateGateDef,
  TemplateBrainSectionDef,
  QualityLevel,
} from "./validation";
import { z } from "zod";

const templateInclude = {
  stages: true,
  deliverables: true,
  gates: true,
  brainSections: true,
  qualityProfile: true,
};

// Structural shape of a ProjectTemplate row loaded with `templateInclude`.
interface TemplateWithRelations {
  id: string;
  projectId: string | null;
  key: string;
  name: string;
  description: string | null;
  version: string;
  isLatest: boolean;
  projectTypeId: string;
  createdAt: Date;
  updatedAt: Date;
  stages: { name: string; order: number; entryCriteria: string; exitCriteria: string }[];
  deliverables: { key: string; parentKey: string | null; stageKey: string | null; title: string; description: string | null; type: string; priority: string; order: number; weight: number; dependsOn: string }[];
  gates: { level: string; name: string; criteria: string; order: number }[];
  brainSections: { section: string; title: string; content: string; order: number }[];
  qualityProfile: {
    name: string;
    projectTypeId: string;
    dimensions: string;
    mandatoryDimensions: string;
    targetLevels: string;
  } | null;
}

export interface CustomTemplateRecord {
  id: string;
  projectId: string | null;
  key: string;
  name: string;
  description: string | null;
  version: string;
  isLatest: boolean;
  projectTypeId: string;
  definition: TemplateDef;
  createdAt: Date;
  updatedAt: Date;
}

export async function createCustomTemplate(input: CustomTemplateCreateInput): Promise<CustomTemplateRecord> {
  const data = customTemplateCreateSchema.parse(input);
  const def = templateDefSchema.parse(data.definition);

  // supersede previous latest version of the same (projectId, key)
  const prev = await prisma.projectTemplate.findFirst({
    where: { projectId: data.projectId ?? null, key: def.key, isLatest: true },
  });
  if (prev) {
    await prisma.projectTemplate.update({ where: { id: prev.id }, data: { isLatest: false } });
  }
  const version = prev ? bumpVersion(prev.version) : (data.version ?? "1.0.0");

  const created = await prisma.projectTemplate.create({
    data: {
      projectId: data.projectId ?? null,
      key: def.key,
      name: def.name,
      description: def.description ?? null,
      version,
      isLatest: true,
      projectTypeId: def.projectTypeId,
      stages: { create: def.stages.map((s) => ({
        name: s.name, order: s.order,
        entryCriteria: JSON.stringify(s.entryCriteria),
        exitCriteria: JSON.stringify(s.exitCriteria),
      })) },
      deliverables: { create: def.deliverables.map((d) => ({
        key: d.key, parentKey: d.parentKey ?? null, stageKey: d.stageKey ?? null,
        title: d.title, description: d.description ?? null, type: d.type,
        priority: d.priority, order: d.order, weight: d.weight,
        dependsOn: JSON.stringify(d.dependsOn),
      })) },
      gates: { create: def.gates.map((g) => ({
        level: g.level, name: g.name, criteria: JSON.stringify(g.criteria), order: g.order,
      })) },
      brainSections: { create: def.brainSections.map((b) => ({
        section: b.section, title: b.title, content: b.content, order: b.order,
      })) },
      qualityProfile: def.qualityProfile ? { create: {
        name: def.qualityProfile.name,
        projectTypeId: def.qualityProfile.projectTypeId,
        dimensions: JSON.stringify(def.qualityProfile.dimensions),
        mandatoryDimensions: JSON.stringify(def.qualityProfile.mandatoryDimensions),
        targetLevels: JSON.stringify(def.qualityProfile.targetLevels),
      } } : undefined,
    },
    include: { stages: true, deliverables: true, gates: true, brainSections: true, qualityProfile: true },
  });

  return toRecord(created);
}

export async function listCustomTemplates(projectId?: string): Promise<CustomTemplateRecord[]> {
  const where = projectId ? { projectId, isLatest: true } : { isLatest: true };
  const rows = await prisma.projectTemplate.findMany({
    where,
    orderBy: [{ projectId: "asc" }, { key: "asc" }, { version: "desc" }],
    include: { stages: true, deliverables: true, gates: true, brainSections: true, qualityProfile: true },
  });
  return rows.map(toRecord);
}

export async function getCustomTemplate(id: string): Promise<CustomTemplateRecord | null> {
  const row = await prisma.projectTemplate.findUnique({
    where: { id },
    include: { stages: true, deliverables: true, gates: true, brainSections: true, qualityProfile: true },
  });
  return row ? toRecord(row) : null;
}

export async function listTemplateVersions(projectId: string | null, key: string): Promise<CustomTemplateRecord[]> {
  const rows = await prisma.projectTemplate.findMany({
    where: { projectId: projectId ?? null, key },
    orderBy: { version: "desc" },
    include: { stages: true, deliverables: true, gates: true, brainSections: true, qualityProfile: true },
  });
  return rows.map(toRecord);
}

// Resolve a template id (built-in or custom) to a normalized TemplateDef + meta.
export async function resolveTemplate(templateId: string): Promise<{ def: TemplateDef; isBuiltIn: boolean } | null> {
  const built = getBuiltInTemplate(templateId);
  if (built) {
    return { def: built, isBuiltIn: true };
  }
  const rec = await getCustomTemplate(templateId);
  if (!rec) return null;
  return { def: rec.definition, isBuiltIn: false };
}

function toRecord(row: TemplateWithRelations): CustomTemplateRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    key: row.key,
    name: row.name,
    description: row.description,
    version: row.version,
    isLatest: row.isLatest,
    projectTypeId: row.projectTypeId,
    definition: {
      key: row.key,
      name: row.name,
      description: row.description,
      projectTypeId: row.projectTypeId as TemplateDef["projectTypeId"],
      stages: row.stages.map((s) => ({
        name: s.name, order: s.order,
        entryCriteria: parseJson<string[]>(s.entryCriteria, []),
        exitCriteria: parseJson<string[]>(s.exitCriteria, []),
      })),
      deliverables: row.deliverables.map((d) => ({
        key: d.key, parentKey: d.parentKey, stageKey: d.stageKey,
        title: d.title, description: d.description, type: d.type,
        priority: d.priority as TemplateDeliverableDef["priority"], order: d.order, weight: d.weight,
        dependsOn: parseJson<string[]>(d.dependsOn, []),
      })),
      gates: row.gates.map((g) => ({
        level: g.level as TemplateGateDef["level"], name: g.name, criteria: parseJson<string[]>(g.criteria, []), order: g.order,
      })),
      brainSections: row.brainSections.map((b) => ({
        section: b.section as TemplateBrainSectionDef["section"], title: b.title, content: b.content, order: b.order,
      })),
      qualityProfile: row.qualityProfile ? {
        name: row.qualityProfile.name,
        projectTypeId: row.qualityProfile.projectTypeId as TemplateDef["projectTypeId"],
        dimensions: parseJson<string[]>(row.qualityProfile.dimensions, []),
        mandatoryDimensions: parseJson<string[]>(row.qualityProfile.mandatoryDimensions, []),
        targetLevels: parseJson<z.infer<typeof QualityLevel>[]>(row.qualityProfile.targetLevels, []),
      } : undefined,
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseJson<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

function bumpVersion(v: string): string {
  const parts = v.split(".").map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return "1.0.1";
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}
