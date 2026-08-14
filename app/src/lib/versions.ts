// GOV-003 / VER-001 / VER-002: Project version records.
// GOV-003 records project versions + change summaries; VER-001 presents
// understandable labels (human-readable label + type); VER-002 records official,
// development, test, and released versions.
import { prisma } from "./prisma";
import { recordAudit } from "./audit";
import { versionCreateSchema, VersionCreateInput } from "./validation";

const ACTOR = "SYSTEM";

/** GOV-003 / VER-002: Record a version for a project with a change summary. */
export async function recordVersion(input: unknown, actor = ACTOR) {
  const data = versionCreateSchema.parse(input);
  const v = await prisma.versionRecord.create({
    data: {
      projectId: data.projectId,
      versionLabel: data.versionLabel,
      versionType: data.versionType,
      sourceReference: data.sourceReference ?? null,
      changeSummary: data.changeSummary ?? null,
      status: data.status,
      createdBy: data.createdBy,
      approvedAt: data.approvedAt ?? null,
      releasedAt: data.releasedAt ?? null,
    },
  });
  await recordAudit({
    actor,
    action: "VERSION_RECORDED",
    entityType: "VERSION",
    entityId: v.id,
    projectId: data.projectId,
    summary: `Version recorded: ${v.versionLabel} (${v.versionType})`,
  });
  return v;
}

/** VER-002: Mark a version approved (sets approvedAt). */
export async function approveVersion(id: string, actor = ACTOR) {
  const current = await prisma.versionRecord.findUnique({ where: { id } });
  if (!current) throw new Error("VERSION_NOT_FOUND");
  const updated = await prisma.versionRecord.update({
    where: { id },
    data: { status: "APPROVED", approvedAt: new Date() },
  });
  await recordAudit({
    actor,
    action: "VERSION_APPROVED",
    entityType: "VERSION",
    entityId: id,
    projectId: current.projectId,
    summary: `Version approved: ${current.versionLabel}`,
  });
  return updated;
}

/** VER-002: Mark a version released (sets releasedAt). */
export async function releaseVersion(id: string, actor = ACTOR) {
  const current = await prisma.versionRecord.findUnique({ where: { id } });
  if (!current) throw new Error("VERSION_NOT_FOUND");
  const updated = await prisma.versionRecord.update({
    where: { id },
    data: { status: "RELEASED", releasedAt: new Date() },
  });
  await recordAudit({
    actor,
    action: "VERSION_RELEASED",
    entityType: "VERSION",
    entityId: id,
    projectId: current.projectId,
    summary: `Version released: ${current.versionLabel}`,
  });
  return updated;
}

/** VER-001: List version records with a presentable label + type + status. */
export async function listVersions(projectId: string) {
  const versions = await prisma.versionRecord.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
  return versions.map((v) => ({
    id: v.id,
    label: v.versionLabel, // presentable human label (VER-001)
    type: v.versionType,
    status: v.status,
    changeSummary: v.changeSummary,
    sourceReference: v.sourceReference,
    createdBy: v.createdBy,
    approvedAt: v.approvedAt,
    releasedAt: v.releasedAt,
    createdAt: v.createdAt,
  }));
}

/** Seed an initial DEVELOPMENT version when a project is created (GOV-003 baseline). */
export async function seedInitialVersion(projectId: string, createdBy: string, tx: import("@prisma/client").Prisma.TransactionClient) {
  return tx.versionRecord.create({
    data: {
      projectId,
      versionLabel: "v0.1.0-dev",
      versionType: "DEVELOPMENT",
      changeSummary: "Initial project version (auto-created on project creation).",
      status: "DRAFT",
      createdBy,
    },
  });
}

export type { VersionCreateInput };
