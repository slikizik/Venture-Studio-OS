// DSG-002 — Map requirements to deliverables/work packets with exclusions,
// dependency detail, and explicit evidence expectations.
import { prisma } from "./prisma";
import { recordAudit } from "./audit";
import { requirementCreateSchema, requirementLinkCreateSchema, requirementLinkUpdateSchema } from "./validation";

/** DSG-002 — Create a requirement. */
export async function createRequirement(input: unknown, actor = "SYSTEM") {
  const data = requirementCreateSchema.parse(input);
  const req = await prisma.requirement.create({
    data: {
      projectId: data.projectId ?? null,
      code: data.code,
      title: data.title,
      description: data.description,
      phase: data.phase ?? null,
      status: data.status,
    },
  });
  await recordAudit({
    actor,
    action: "REQUIREMENT_CREATED",
    entityType: "REQUIREMENT",
    entityId: req.id,
    projectId: req.projectId ?? undefined,
    summary: `Requirement created: ${req.code} — ${req.title}`,
  });
  return req;
}

/** DSG-002 — Link a requirement to a deliverable and/or work packet with exclusions + evidence expectation. */
export async function linkRequirement(input: unknown, actor = "SYSTEM") {
  const data = requirementLinkCreateSchema.parse(input);
  const req = await prisma.requirement.findUnique({ where: { id: data.requirementId } });
  if (!req) throw new Error("REQUIREMENT_NOT_FOUND");
  if (data.deliverableId) {
    const del = await prisma.deliverable.findUnique({ where: { id: data.deliverableId } });
    if (!del || (req.projectId && del.projectId !== req.projectId)) throw new Error("DELIVERABLE_PROJECT_MISMATCH");
  }
  if (data.workPacketId) {
    const wp = await prisma.workPacket.findUnique({ where: { id: data.workPacketId } });
    if (!wp || (req.projectId && wp.projectId !== req.projectId)) throw new Error("WORK_PACKET_PROJECT_MISMATCH");
  }
  const link = await prisma.requirementLink.create({
    data: {
      requirementId: data.requirementId,
      projectId: data.projectId ?? req.projectId ?? null,
      targetType: data.targetType,
      deliverableId: data.deliverableId ?? null,
      workPacketId: data.workPacketId ?? null,
      isExclusion: data.isExclusion,
      dependencyDetail: data.dependencyDetail ?? null,
      exclusions: data.exclusions ?? null,
      evidenceExpectation: data.evidenceExpectation ?? null,
    },
  });
  await recordAudit({
    actor,
    action: "REQUIREMENT_LINKED",
    entityType: "REQUIREMENT_LINK",
    entityId: link.id,
    projectId: link.projectId ?? undefined,
    summary: `Requirement ${req.code} linked (target: ${data.targetType}, exclusions: ${data.exclusions ? "yes" : "none"})`,
    metadata: { exclusions: data.exclusions ?? null, evidenceExpectation: data.evidenceExpectation ?? null },
  });
  return link;
}

/** DSG-002 — Alias used by API/tests. */
export const createRequirementLink = linkRequirement;

/** DSG-002 — Update a requirement link (target/exclusion/evidence). */
export async function updateRequirementLink(id: string, input: unknown, actor = "SYSTEM") {
  const data = requirementLinkUpdateSchema.parse(input);
  const existing = await prisma.requirementLink.findUnique({ where: { id } });
  if (!existing) throw new Error("REQUIREMENT_LINK_NOT_FOUND");
  const link = await prisma.requirementLink.update({
    where: { id },
    data: {
      ...(data.targetType !== undefined ? { targetType: data.targetType } : {}),
      ...(data.deliverableId !== undefined ? { deliverableId: data.deliverableId } : {}),
      ...(data.workPacketId !== undefined ? { workPacketId: data.workPacketId } : {}),
      ...(data.isExclusion !== undefined ? { isExclusion: data.isExclusion } : {}),
      ...(data.dependencyDetail !== undefined ? { dependencyDetail: data.dependencyDetail } : {}),
      ...(data.exclusions !== undefined ? { exclusions: data.exclusions } : {}),
      ...(data.evidenceExpectation !== undefined ? { evidenceExpectation: data.evidenceExpectation } : {}),
    },
  });
  await recordAudit({
    actor,
    action: "REQUIREMENT_LINK_UPDATED",
    entityType: "REQUIREMENT_LINK",
    entityId: id,
    projectId: link.projectId ?? undefined,
    summary: `Requirement link updated (evidenceExpectation: ${link.evidenceExpectation ?? "—"})`,
  });
  return link;
}

/** DSG-002 — Remove a requirement link. */
export async function removeRequirementLink(id: string, actor = "SYSTEM") {
  const existing = await prisma.requirementLink.findUnique({ where: { id } });
  if (!existing) throw new Error("REQUIREMENT_LINK_NOT_FOUND");
  await prisma.requirementLink.delete({ where: { id } });
  await recordAudit({
    actor,
    action: "REQUIREMENT_LINK_REMOVED",
    entityType: "REQUIREMENT_LINK",
    entityId: id,
    projectId: existing.projectId ?? undefined,
    summary: `Requirement link removed`,
  });
  return { id };
}

/** List requirement links for a project. */
export async function listRequirementLinks(projectId: string) {
  return prisma.requirementLink.findMany({
    where: { projectId },
    include: { requirement: true, deliverable: true, workPacket: true },
    orderBy: { createdAt: "asc" },
  });
}
