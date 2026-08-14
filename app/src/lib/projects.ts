// PRJ-001..004: Project core domain operations.
// Create from template, edit metadata + Project Brain, archive/restore,
// search/sort/filter. Progress is derived from stage completion; health is
// derived (DRAFT/ARCHIVED => status-derived; AT_RISK/BLOCKED when there are
// blocking risks / blocked stages). Archiving preserves all data (NFR-002).
import { prisma } from "./prisma";
import { recordAudit } from "./audit";
import { getBuiltInTemplate } from "./templates";
import {
  projectCreateSchema,
  ProjectStatus,
  ProjectHealth,
  BrainSection,
} from "./validation";
import { z } from "zod";

export const projectUpdateSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  summary: z.string().max(500).optional(),
  status: ProjectStatus.optional(),
  ownerName: z.string().min(1).max(120).optional(),
  startedAt: z.coerce.date().optional().nullable(),
  targetDate: z.coerce.date().optional().nullable(),
}).superRefine((val, ctx) => {
  if (val.targetDate && val.startedAt && val.targetDate < val.startedAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "targetDate must not precede startedAt", path: ["targetDate"] });
  }
});

export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;

export const projectBrainEntrySchema = z.object({
  section: BrainSection,
  title: z.string().min(1).max(150),
  content: z.string(), // markdown (sanitized at render per NFR-006)
  order: z.number().int().min(0),
});

export type ProjectBrainEntryInput = z.infer<typeof projectBrainEntrySchema>;

export interface ProjectSearchOptions {
  status?: string;
  health?: string;
  templateId?: string;
  archived?: boolean;
  search?: string;
  sortBy?: "updatedAt" | "name" | "createdAt" | "targetDate";
  sortDir?: "asc" | "desc";
}

const ACTOR = "SYSTEM"; // service-level actor; UI passes owner name where relevant

/** PRJ-001: Create a project, optionally from a built-in or custom template. */
export async function createProject(input: unknown, actor = ACTOR) {
  const data = projectCreateSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        name: data.name,
        summary: data.summary ?? null,
        status: data.status,
        health: data.health,
        templateId: data.templateId ?? null,
        templateVersion: data.templateVersion ?? null,
        ownerName: data.ownerName,
        startedAt: data.startedAt ?? null,
        targetDate: data.targetDate ?? null,
        progressPercent: 0,
      },
    });

    const tpl = data.templateId ? getBuiltInTemplate(data.templateId) : undefined;
    if (tpl) {
      await tx.projectStage.createMany({
        data: tpl.stages.map((s) => ({
          projectId: project.id,
          name: s.name,
          order: s.order,
          status: "NOT_STARTED",
          entryCriteria: JSON.stringify(s.entryCriteria ?? []),
          exitCriteria: JSON.stringify(s.exitCriteria ?? []),
        })),
      });
      if (tpl.brainSections.length > 0) {
        await tx.projectBrainEntry.createMany({
          data: tpl.brainSections.map((b) => ({
            projectId: project.id,
            section: b.section,
            title: b.title,
            content: b.content,
            order: b.order,
          })),
        });
      }
    } else {
      await tx.projectStage.create({
        data: { projectId: project.id, name: "Draft", order: 0, status: "NOT_STARTED" },
      });
    }

    await recordAudit(
      {
        actor,
        action: "PROJECT_CREATED",
        entityType: "PROJECT",
        entityId: project.id,
        projectId: project.id,
        summary: `Project created: ${project.name} (template: ${data.templateId ?? "none"})`,
      },
      tx,
    );
    return project;
  });
}

/** PRJ-002: Edit project metadata. */
export async function updateProject(id: string, input: unknown, actor = ACTOR) {
  const data = projectUpdateSchema.parse(input);
  const current = await prisma.project.findUnique({ where: { id } });
  if (!current) throw new Error("PROJECT_NOT_FOUND");
  const updated = await prisma.project.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.summary !== undefined ? { summary: data.summary } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.ownerName !== undefined ? { ownerName: data.ownerName } : {}),
      ...(data.startedAt !== undefined ? { startedAt: data.startedAt } : {}),
      ...(data.targetDate !== undefined ? { targetDate: data.targetDate } : {}),
    },
  });
  await recordAudit({
    actor,
    action: "PROJECT_UPDATED",
    entityType: "PROJECT",
    entityId: id,
    projectId: id,
    summary: `Project updated: ${updated.name}`,
  });
  return updated;
}

/** PRJ-003: Archive without data loss (records pre-archive status). */
export async function archiveProject(id: string, actor = ACTOR) {
  const current = await prisma.project.findUnique({ where: { id } });
  if (!current) throw new Error("PROJECT_NOT_FOUND");
  const updated = await prisma.project.update({
    where: { id },
    data: {
      preArchiveStatus: current.status,
      status: "ARCHIVED",
      archivedAt: new Date(),
    },
  });
  await recordAudit({
    actor,
    action: "PROJECT_ARCHIVED",
    entityType: "PROJECT",
    entityId: id,
    projectId: id,
    summary: `Project archived: ${updated.name} (was ${current.status})`,
  });
  return updated;
}

/** PRJ-003: Restore to pre-archive status. */
export async function restoreProject(id: string, actor = ACTOR) {
  const current = await prisma.project.findUnique({ where: { id } });
  if (!current) throw new Error("PROJECT_NOT_FOUND");
  if (!current.archivedAt) throw new Error("PROJECT_NOT_ARCHIVED");
  const restoredStatus = current.preArchiveStatus ?? "DRAFT";
  const updated = await prisma.project.update({
    where: { id },
    data: { status: restoredStatus, archivedAt: null },
  });
  await recordAudit({
    actor,
    action: "PROJECT_RESTORED",
    entityType: "PROJECT",
    entityId: id,
    projectId: id,
    summary: `Project restored: ${updated.name} (status ${restoredStatus})`,
  });
  return updated;
}

/** PRJ-004: Search / sort / filter across name, summary, and Project Brain. */
export async function searchProjects(opts: ProjectSearchOptions = {}) {
  const where: Record<string, unknown> = {};
  if (opts.status) where.status = opts.status;
  if (opts.health) where.health = opts.health;
  if (opts.templateId) where.templateId = opts.templateId; // built-in id
  if (opts.archived === true) where.archivedAt = { not: null };
  if (opts.archived === false) where.archivedAt = null;
  if (opts.search) {
    const term = opts.search;
    where.OR = [
      { name: { contains: term } },
      { summary: { contains: term } },
      { brainEntries: { some: { OR: [{ title: { contains: term } }, { content: { contains: term } }] } } },
    ];
  }
  const orderBy: Record<string, string> = {};
  const sortBy = opts.sortBy ?? "updatedAt";
  orderBy[sortBy] = opts.sortDir ?? "desc";
  return prisma.project.findMany({ where, orderBy });
}

/** PRJ-002: Upsert a Project Brain entry. */
export async function upsertBrainEntry(projectId: string, input: unknown, actor = ACTOR) {
  const data = projectBrainEntrySchema.parse(input);
  const existing = await prisma.projectBrainEntry.findFirst({
    where: { projectId, section: data.section, order: data.order },
  });
  let entry;
  if (existing) {
    entry = await prisma.projectBrainEntry.update({
      where: { id: existing.id },
      data: { title: data.title, content: data.content },
    });
  } else {
    entry = await prisma.projectBrainEntry.create({
      data: { projectId, section: data.section, title: data.title, content: data.content, order: data.order },
    });
  }
  await recordAudit({
    actor,
    action: "PROJECT_BRAIN_UPDATED",
    entityType: "PROJECT_BRAIN",
    entityId: entry.id,
    projectId,
    summary: `Brain section ${data.section} updated: ${data.title}`,
  });
  return entry;
}

/** Derived progress (%): completed stages / total stages (weighted equally). */
export async function calculateProgress(projectId: string): Promise<{
  progressPercent: number;
  stageCount: number;
  completedStages: number;
  currentStageId: string | null;
}> {
  const stages = await prisma.projectStage.findMany({ where: { projectId } });
  const stageCount = stages.length;
  const completedStages = stages.filter((s) => s.status === "COMPLETE").length;
  const progressPercent = stageCount === 0 ? 0 : Math.round((completedStages / stageCount) * 100);
  const current = stages.find((s) => s.status === "ACTIVE" || s.status === "NOT_STARTED");
  return {
    progressPercent,
    stageCount,
    completedStages,
    currentStageId: current ? current.id : null,
  };
}

/** Derived health: BLOCKED if a stage is blocked or a high/critical risk is open. */
export async function calculateHealth(projectId: string): Promise<ProjectHealthType> {
  const [blockedStage, openRisk] = await Promise.all([
    prisma.projectStage.findFirst({ where: { projectId, status: "BLOCKED" } }),
    prisma.riskRecord.findFirst({
      where: { projectId, status: { in: ["OPEN", "MITIGATING"] }, impact: { in: ["HIGH", "CRITICAL"] } },
    }),
  ]);
  if (blockedStage || openRisk) return "BLOCKED";
  if (openRisk) return "AT_RISK";
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (project?.status === "PAUSED") return "ATTENTION";
  return "HEALTHY";
}

type ProjectHealthType = z.infer<typeof ProjectHealth>;

/** Recompute and persist derived progress + health for a project. */
export async function refreshDerived(projectId: string) {
  const [progress, health] = await Promise.all([
    calculateProgress(projectId),
    calculateHealth(projectId),
  ]);
  return prisma.project.update({
    where: { id: projectId },
    data: {
      progressPercent: progress.progressPercent,
      currentStageId: progress.currentStageId,
      health,
    },
  });
}

export async function getProjectOrThrow(id: string) {
  const p = await prisma.project.findUnique({
    where: { id },
    include: { brainEntries: { orderBy: { order: "asc" } }, stages: { orderBy: { order: "asc" } } },
  });
  if (!p) throw new Error("PROJECT_NOT_FOUND");
  return p;
}
