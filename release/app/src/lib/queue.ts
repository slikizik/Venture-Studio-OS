// AGT-002 — Execution queue of work packets with ordering, dependencies,
// readiness, and linked evidence. Respects dependencies (blocked until predep satisfied).
import { prisma } from "./prisma";
import { recordAudit } from "./audit";
import { queueItemCreateSchema, queueItemUpdateSchema, QueueStatus } from "./validation";

/** AGT-002 — Enqueue a work packet with order + optional dependency. */
export async function enqueueWorkPacket(input: unknown, actor = "SYSTEM") {
  const data = queueItemCreateSchema.parse(input);
  const wp = await prisma.workPacket.findUnique({ where: { id: data.workPacketId } });
  if (!wp) throw new Error("WORK_PACKET_NOT_FOUND");
  if (data.dependsOnId) {
    const dep = await prisma.executionQueueItem.findUnique({ where: { id: data.dependsOnId } });
    if (!dep) throw new Error("DEPENDENCY_NOT_FOUND");
  }
  const item = await prisma.executionQueueItem.create({
    data: {
      projectId: wp.projectId,
      workPacketId: data.workPacketId,
      order: data.order,
      queueStatus: data.queueStatus,
      dependsOnId: data.dependsOnId ?? null,
      evidenceNote: data.evidenceNote ?? null,
    },
  });
  // Reflect queue state on the work packet itself.
  await prisma.workPacket.update({
    where: { id: data.workPacketId },
    data: { queueOrder: data.order, queueStatus: data.queueStatus },
  });
  await recordAudit({
    actor,
    action: "QUEUE_ENQUEUED",
    entityType: "EXECUTION_QUEUE_ITEM",
    entityId: item.id,
    projectId: item.projectId,
    summary: `Work packet enqueued at order ${item.order} (${item.queueStatus})`,
  });
  return item;
}

/** AGT-002 — Update a queue item (order, status, dependency, evidence, block reason). */
export async function updateQueueItem(id: string, input: unknown, actor = "SYSTEM") {
  const data = queueItemUpdateSchema.parse(input);
  const existing = await prisma.executionQueueItem.findUnique({ where: { id } });
  if (!existing) throw new Error("QUEUE_ITEM_NOT_FOUND");
  const item = await prisma.executionQueueItem.update({
    where: { id },
    data: {
      ...(data.order !== undefined ? { order: data.order } : {}),
      ...(data.queueStatus !== undefined ? { queueStatus: data.queueStatus } : {}),
      ...(data.dependsOnId !== undefined ? { dependsOnId: data.dependsOnId } : {}),
      ...(data.blockedReason !== undefined ? { blockedReason: data.blockedReason } : {}),
      ...(data.evidenceNote !== undefined ? { evidenceNote: data.evidenceNote } : {}),
    },
  });
  await prisma.workPacket.update({
    where: { id: existing.workPacketId },
    data: {
      ...(data.order !== undefined ? { queueOrder: data.order } : {}),
      ...(data.queueStatus !== undefined ? { queueStatus: data.queueStatus } : {}),
    },
  });
  await recordAudit({
    actor,
    action: "QUEUE_UPDATED",
    entityType: "EXECUTION_QUEUE_ITEM",
    entityId: id,
    projectId: existing.projectId,
    summary: `Queue item updated (status: ${item.queueStatus})`,
  });
  return item;
}

/** AGT-002 — List ordered queue with readiness (blocked vs ready) computed vs dependencies. */
type QueueReadiness = "BLOCKED" | "READY";
type QueueItemRead = {
  id: string;
  projectId: string;
  workPacketId: string;
  order: number;
  queueStatus: string;
  dependsOnId: string | null;
  evidenceNote: string | null;
  linkedEvidence: string;
  readiness: QueueReadiness;
  effectiveStatus: string;
  workPacket: { title: string } | null;
};
export async function getExecutionQueue(projectId: string): Promise<QueueItemRead[]> {
  const items = await prisma.executionQueueItem.findMany({
    where: { projectId },
    include: { workPacket: true, dependsOn: true },
    orderBy: { order: "asc" },
  });
  // Readiness: a READY/BLOCKED item is only ready if its dependency is COMPLETE.
  return items.map((it) => {
    const blockedByDependency =
      !!it.dependsOnId && it.dependsOn?.queueStatus !== "COMPLETE";
    const effectiveStatus: string =
      blockedByDependency && it.queueStatus !== "COMPLETE" ? "BLOCKED" : it.queueStatus;
    const readiness: QueueReadiness = blockedByDependency ? "BLOCKED" : "READY";
    return {
      id: it.id,
      projectId: it.projectId,
      workPacketId: it.workPacketId,
      order: it.order,
      queueStatus: it.queueStatus,
      dependsOnId: it.dependsOnId,
      evidenceNote: it.evidenceNote,
      linkedEvidence: it.linkedEvidence,
      readiness,
      effectiveStatus,
      workPacket: it.workPacket ? { title: it.workPacket.title } : null,
    };
  });
}

/** AGT-002 — Mark an evidence record against a queue item (linkedEvidence JSON string). */
export async function markEvidence(itemId: string, evidenceId: string, actor = "SYSTEM") {
  const item = await prisma.executionQueueItem.findUnique({ where: { id: itemId } });
  if (!item) throw new Error("QUEUE_ITEM_NOT_FOUND");
  let linked: string[] = [];
  try { linked = JSON.parse(item.linkedEvidence || "[]"); } catch { linked = []; }
  if (!Array.isArray(linked)) linked = [];
  if (!linked.includes(evidenceId)) linked.push(evidenceId);
  const updated = await prisma.executionQueueItem.update({
    where: { id: itemId },
    data: { linkedEvidence: JSON.stringify(linked) },
  });
  await recordAudit({
    actor,
    action: "QUEUE_EVIDENCE_LINKED",
    entityType: "EXECUTION_QUEUE_ITEM",
    entityId: itemId,
    projectId: item.projectId,
    summary: `Evidence ${evidenceId} linked to queue item`,
  });
  return updated;
}

/** AGT-002 — Convenience: attach an Evidence row to a queue item. */
export async function attachEvidenceToItem(itemId: string, evidenceId: string, actor = "SYSTEM") {
  return markEvidence(itemId, evidenceId, actor);
}

/** AGT-002 — Remove a queue item (and clear the work packet's queue markers). */
export async function removeQueueItem(id: string, actor = "SYSTEM") {
  const existing = await prisma.executionQueueItem.findUnique({ where: { id } });
  if (!existing) throw new Error("QUEUE_ITEM_NOT_FOUND");
  await prisma.executionQueueItem.delete({ where: { id } });
  await prisma.workPacket.update({
    where: { id: existing.workPacketId },
    data: { queueOrder: 0, queueStatus: null },
  });
  await recordAudit({
    actor,
    action: "QUEUE_REMOVED",
    entityType: "EXECUTION_QUEUE_ITEM",
    entityId: id,
    projectId: existing.projectId,
    summary: `Queue item removed`,
  });
  return { id };
}
