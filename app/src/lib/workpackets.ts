// WPK-001/002/003 — Work packets: create, edit, submit for review, approve,
// request changes, and revision (version bump). Submitted/non-draft packets
// lock objective/scope/exclusions/inputs/expectedOutputs against edits.
import { prisma } from "./prisma";
import { recordAudit } from "./audit";
import { z } from "zod";
import {
  workPacketCreateSchema,
  workPacketUpdateSchema,
  WorkPacketStatus,
} from "./validation";

type WpStatus = z.infer<typeof WorkPacketStatus>;

const LOCKED_STATUSES: WpStatus[] = [
  "SUBMITTED",
  "IN_REVIEW",
  "REVISION_REQUESTED",
  "APPROVED",
  "REJECTED",
];
const LOCKED_FIELDS = [
  "objective",
  "scope",
  "exclusions",
  "inputs",
  "expectedOutputs",
] as const;

/** WPK-001/002 — Create a work packet linked to a project (+ optional deliverable). */
export async function createWorkPacket(input: unknown, actor = "SYSTEM") {
  const data = workPacketCreateSchema.parse(input);
  if (data.deliverableId) {
    const del = await prisma.deliverable.findUnique({
      where: { id: data.deliverableId },
    });
    if (!del || del.projectId !== data.projectId)
      throw new Error("DELIVERABLE_PROJECT_MISMATCH");
  }
  const wp = await prisma.workPacket.create({
    data: {
      projectId: data.projectId,
      deliverableId: data.deliverableId ?? null,
      title: data.title,
      objective: data.objective,
      scope: data.scope,
      exclusions: data.exclusions,
      inputs: JSON.stringify(data.inputs),
      expectedOutputs: JSON.stringify(data.expectedOutputs),
      status: data.status,
      assigneeAgentId: data.assigneeAgentId ?? null,
      priority: data.priority,
      dueDate: data.dueDate ?? null,
      versionNumber: data.versionNumber,
    },
  });
  await recordAudit({
    actor,
    action: "WORK_PACKET_CREATED",
    entityType: "WORK_PACKET",
    entityId: wp.id,
    projectId: wp.projectId,
    summary: `Work packet created: ${wp.title} (v${wp.versionNumber}, ${wp.status})`,
  });
  return wp;
}

/** WPK-002 — Update a work packet (enforces submit-lock on core fields). */
export async function updateWorkPacket(
  id: string,
  input: unknown,
  actor = "SYSTEM",
) {
  const data = workPacketUpdateSchema.parse(input);
  const existing = await prisma.workPacket.findUnique({ where: { id } });
  if (!existing) throw new Error("WORK_PACKET_NOT_FOUND");
  if (LOCKED_STATUSES.includes(existing.status as WpStatus)) {
    for (const f of LOCKED_FIELDS) {
      if (f in data && (data as Record<string, unknown>)[f] !== undefined) {
        throw new Error("WORK_PACKET_LOCKED");
      }
    }
  }
  const wp = await prisma.workPacket.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.objective !== undefined ? { objective: data.objective } : {}),
      ...(data.scope !== undefined ? { scope: data.scope } : {}),
      ...(data.exclusions !== undefined ? { exclusions: data.exclusions } : {}),
      ...(data.inputs !== undefined
        ? { inputs: JSON.stringify(data.inputs) }
        : {}),
      ...(data.expectedOutputs !== undefined
        ? { expectedOutputs: JSON.stringify(data.expectedOutputs) }
        : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.assigneeAgentId !== undefined
        ? { assigneeAgentId: data.assigneeAgentId }
        : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
    },
  });
  await recordAudit({
    actor,
    action: "WORK_PACKET_UPDATED",
    entityType: "WORK_PACKET",
    entityId: id,
    projectId: wp.projectId,
    summary: `Work packet updated: ${wp.title}`,
  });
  return wp;
}

/** WPK-003 — Submit a (DRAFT / REVISION_REQUESTED) packet for review.
 * A resubmission of an already-submitted packet creates a new version. */
export async function submitWorkPacket(
  id: string,
  actor = "SYSTEM",
  summary?: string,
) {
  const existing = await prisma.workPacket.findUnique({ where: { id } });
  if (!existing) throw new Error("WORK_PACKET_NOT_FOUND");
  if (
    existing.status === "APPROVED" ||
    existing.status === "REJECTED" ||
    existing.status === "CANCELLED"
  ) {
    throw new Error("WORK_PACKET_TERMINAL");
  }
  const isRevision = existing.status !== "DRAFT";
  const versionNumber = isRevision ? existing.versionNumber + 1 : existing.versionNumber;
  const wp = await prisma.workPacket.update({
    where: { id },
    data: {
      status: "IN_REVIEW",
      submittedAt: new Date(),
      versionNumber,
      versionCreatedAt: new Date(),
    },
  });
  await recordAudit({
    actor,
    action: "WORK_PACKET_SUBMITTED",
    entityType: "WORK_PACKET",
    entityId: id,
    projectId: wp.projectId,
    summary: `Work packet submitted for review: ${wp.title} (v${versionNumber})`,
    metadata: { actor, summary: summary ?? null },
  });
  return wp;
}

/** WPK-003 — Approve or request changes on a submitted packet. */
export async function approveWorkPacket(
  id: string,
  opts: { actor?: string; decision?: string; reviewNote?: string } = {},
) {
  const actor = opts.actor ?? "SYSTEM";
  const decision = opts.decision ?? "APPROVED";
  const existing = await prisma.workPacket.findUnique({ where: { id } });
  if (!existing) throw new Error("WORK_PACKET_NOT_FOUND");
  if (existing.status !== "IN_REVIEW" && existing.status !== "REVISION_REQUESTED") {
    throw new Error("WORK_PACKET_NOT_SUBMITTED");
  }
  const isChangeRequest = decision === "CHANGES_REQUESTED" || decision === "REVISION_REQUIRED";
  const wp = await prisma.workPacket.update({
    where: { id },
    data: isChangeRequest
      ? { status: "REVISION_REQUESTED" }
      : { status: "APPROVED", approvedAt: new Date() },
  });
  await recordAudit({
    actor,
    action: isChangeRequest ? "WORK_PACKET_CHANGES_REQUESTED" : "WORK_PACKET_APPROVED",
    entityType: "WORK_PACKET",
    entityId: id,
    projectId: wp.projectId,
    summary: `Work packet ${isChangeRequest ? "changes requested" : "approved"}: ${wp.title} (v${wp.versionNumber})`,
    metadata: { actor, reviewNote: opts.reviewNote ?? null },
  });
  return wp;
}

/** WPK-003 — Revise a changes-requested packet: bump version, return to DRAFT, apply allowed edits. */
export async function reviseWorkPacket(
  id: string,
  input: { objective?: string; scope?: string; exclusions?: string; inputs?: string[]; expectedOutputs?: string[]; title?: string } = {},
  actor = "SYSTEM",
) {
  const existing = await prisma.workPacket.findUnique({ where: { id } });
  if (!existing) throw new Error("WORK_PACKET_NOT_FOUND");
  const versionNumber = existing.versionNumber + 1;
  const wp = await prisma.workPacket.update({
    where: { id },
    data: {
      status: "DRAFT",
      versionNumber,
      versionCreatedAt: new Date(),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.objective !== undefined ? { objective: input.objective } : {}),
      ...(input.scope !== undefined ? { scope: input.scope } : {}),
      ...(input.exclusions !== undefined ? { exclusions: input.exclusions } : {}),
      ...(input.inputs !== undefined
        ? { inputs: JSON.stringify(input.inputs) }
        : {}),
      ...(input.expectedOutputs !== undefined
        ? { expectedOutputs: JSON.stringify(input.expectedOutputs) }
        : {}),
    },
  });
  await recordAudit({
    actor,
    action: "WORK_PACKET_REVISED",
    entityType: "WORK_PACKET",
    entityId: id,
    projectId: wp.projectId,
    summary: `Work packet revised: ${wp.title} (v${versionNumber})`,
  });
  return wp;
}

/** Get a single work packet, throw if missing. */
export async function getWorkPacketOrThrow(id: string) {
  const wp = await prisma.workPacket.findUnique({
    where: { id },
    include: {
      deliverable: true,
      acceptanceCriteria: true,
      evidence: true,
      attachments: true,
    },
  });
  if (!wp) throw new Error("WORK_PACKET_NOT_FOUND");
  return wp;
}

/** Delete a work packet (with its queue item). */
export async function deleteWorkPacket(id: string, actor = "SYSTEM") {
  const existing = await prisma.workPacket.findUnique({ where: { id } });
  if (!existing) throw new Error("WORK_PACKET_NOT_FOUND");
  await prisma.workPacket.delete({ where: { id } });
  await recordAudit({
    actor,
    action: "WORK_PACKET_DELETED",
    entityType: "WORK_PACKET",
    entityId: id,
    projectId: existing.projectId,
    summary: `Work packet deleted: ${existing.title}`,
  });
  return { id };
}

/** List work packets for a project (optionally filtered by deliverable/status). */
export async function listWorkPackets(
  projectId: string,
  opts?: { deliverableId?: string; status?: string },
) {
  return prisma.workPacket.findMany({
    where: {
      projectId,
      ...(opts?.deliverableId ? { deliverableId: opts.deliverableId } : {}),
      ...(opts?.status ? { status: opts.status } : {}),
    },
    orderBy: [{ versionNumber: "desc" }, { createdAt: "asc" }],
    include: {
      deliverable: true,
      acceptanceCriteria: true,
      evidence: true,
      attachments: true,
    },
  });
}
