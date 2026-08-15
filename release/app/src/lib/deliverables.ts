// DEL-001..003: Deliverable domain operations.
// Create/edit/reorder/archive/restore, validated parent-child hierarchy (DEL-002),
// and status/owner/dueDate/dependencies/criteria/versions storage (DEL-003).
// Dependencies and hierarchy cycles are rejected. Approved/released deliverables
// are archived (not deleted); deletion of a node with children is refused.
import { prisma } from "./prisma";
import { recordAudit } from "./audit";
import {
  deliverableCreateSchema,
  deliverableUpdateSchema,
  dependencyCreateSchema,
  criteriaCreateSchema,
  criteriaUpdateSchema,
  DeliverableCreateInput,
  DeliverableUpdateInput,
  DependencyCreateInput,
  CriteriaCreateInput,
  CriteriaUpdateInput,
} from "./validation";

const ACTOR = "SYSTEM";

/** Walk parent chain to detect whether `ancestorId` is an ancestor of `nodeId`. */
async function isAncestor(nodeId: string, ancestorId: string): Promise<boolean> {
  let current = await prisma.deliverable.findUnique({ where: { id: nodeId }, select: { parentId: true } });
  const seen = new Set<string>();
  while (current?.parentId) {
    if (seen.has(current.parentId)) return false; // defensive: corrupt cycle
    seen.add(current.parentId);
    if (current.parentId === ancestorId) return true;
    current = await prisma.deliverable.findUnique({ where: { id: current.parentId }, select: { parentId: true } });
  }
  return false;
}

/** Detect whether adding dependsOn would create a dependency cycle (DFS). */
async function dependencyCycleExists(deliverableId: string, dependsOnId: string): Promise<boolean> {
  // A cycle exists if dependsOnId already (transitively) depends on deliverableId.
  const stack = [dependsOnId];
  const seen = new Set<string>();
  while (stack.length) {
    const node = stack.pop()!;
    if (node === deliverableId) return true;
    if (seen.has(node)) continue;
    seen.add(node);
    const edges = await prisma.deliverableDependency.findMany({
      where: { deliverableId: node },
      select: { dependsOnDeliverableId: true },
    });
    for (const e of edges) stack.push(e.dependsOnDeliverableId);
  }
  return false;
}

async function assertSameProject(ids: (string | null | undefined)[], projectId: string) {
  for (const id of ids) {
    if (!id) continue;
    const d = await prisma.deliverable.findUnique({ where: { id }, select: { projectId: true } });
    if (!d) throw new Error("DELIVERABLE_NOT_FOUND");
    if (d.projectId !== projectId) throw new Error("DELIVERABLE_CROSS_PROJECT");
  }
}

/** DEL-001/002/003: Create a deliverable. */
export async function createDeliverable(input: unknown, actor = ACTOR) {
  const data = deliverableCreateSchema.parse(input);
  await assertSameProject([data.parentId, data.stageId], data.projectId);
  // A brand-new node has no descendants, so it cannot create a hierarchy cycle
  // with an existing parent; no ancestor check needed on create.
  return prisma.$transaction(async (tx) => {
    const d = await tx.deliverable.create({
      data: {
        projectId: data.projectId,
        parentId: data.parentId ?? null,
        stageId: data.stageId ?? null,
        title: data.title,
        description: data.description ?? null,
        type: data.type,
        status: data.status,
        priority: data.priority,
        ownerAgentId: data.ownerAgentId ?? null,
        dueDate: data.dueDate ?? null,
        order: data.order,
        weight: data.weight,
      },
    });
    await recordAudit(
      {
        actor,
        action: "DELIVERABLE_CREATED",
        entityType: "DELIVERABLE",
        entityId: d.id,
        projectId: data.projectId,
        summary: `Deliverable created: ${d.title} (status ${d.status})`,
      },
      tx,
    );
    return d;
  });
}

/** DEL-001: Edit a deliverable (metadata, status, parent reassignment, order). */
export async function updateDeliverable(id: string, input: unknown, actor = ACTOR) {
  const data = deliverableUpdateSchema.parse(input);
  const current = await prisma.deliverable.findUnique({ where: { id } });
  if (!current) throw new Error("DELIVERABLE_NOT_FOUND");
  if (data.parentId !== undefined && data.parentId) {
    if (data.parentId === id) throw new Error("DELIVERABLE_CYCLE_SELF");
    // Cannot move a node under one of its own descendants (would form a cycle).
    if (await isAncestor(data.parentId, id)) throw new Error("DELIVERABLE_HIERARCHY_CYCLE");
    await assertSameProject([data.parentId, data.stageId ?? current.stageId], current.projectId);
  } else if (data.stageId !== undefined && data.stageId) {
    await assertSameProject([data.stageId], current.projectId);
  }
  const updated = await prisma.deliverable.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
      ...(data.stageId !== undefined ? { stageId: data.stageId } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.ownerAgentId !== undefined ? { ownerAgentId: data.ownerAgentId } : {}),
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
      ...(data.order !== undefined ? { order: data.order } : {}),
      ...(data.weight !== undefined ? { weight: data.weight } : {}),
    },
  });
  await recordAudit({
    actor,
    action: "DELIVERABLE_UPDATED",
    entityType: "DELIVERABLE",
    entityId: id,
    projectId: current.projectId,
    summary: `Deliverable updated: ${updated.title} (status ${updated.status})`,
  });
  return updated;
}

/** DEL-001: Reorder a deliverable among its siblings. */
export async function reorderDeliverable(id: string, order: number, actor = ACTOR) {
  const current = await prisma.deliverable.findUnique({ where: { id } });
  if (!current) throw new Error("DELIVERABLE_NOT_FOUND");
  const updated = await prisma.deliverable.update({ where: { id }, data: { order: Math.max(0, Math.floor(order)) } });
  await recordAudit({
    actor,
    action: "DELIVERABLE_REORDERED",
    entityType: "DELIVERABLE",
    entityId: id,
    projectId: current.projectId,
    summary: `Deliverable reordered: ${updated.title} -> ${updated.order}`,
  });
  return updated;
}

/** DEL-001: Archive a deliverable (approved/released are archived, never deleted). */
export async function archiveDeliverable(id: string, actor = ACTOR) {
  const current = await prisma.deliverable.findUnique({ where: { id } });
  if (!current) throw new Error("DELIVERABLE_NOT_FOUND");
  const updated = await prisma.deliverable.update({ where: { id }, data: { status: "ARCHIVED" } });
  await recordAudit({
    actor,
    action: "DELIVERABLE_ARCHIVED",
    entityType: "DELIVERABLE",
    entityId: id,
    projectId: current.projectId,
    summary: `Deliverable archived: ${updated.title}`,
  });
  return updated;
}

/** DEL-001: Restore an archived deliverable. */
export async function restoreDeliverable(id: string, actor = ACTOR) {
  const current = await prisma.deliverable.findUnique({ where: { id } });
  if (!current) throw new Error("DELIVERABLE_NOT_FOUND");
  if (current.status !== "ARCHIVED") throw new Error("DELIVERABLE_NOT_ARCHIVED");
  const updated = await prisma.deliverable.update({ where: { id }, data: { status: "PLANNED" } });
  await recordAudit({
    actor,
    action: "DELIVERABLE_RESTORED",
    entityType: "DELIVERABLE",
    entityId: id,
    projectId: current.projectId,
    summary: `Deliverable restored: ${updated.title}`,
  });
  return updated;
}

/** DEL-001: Delete a deliverable. Refused if it has children or is approved/released. */
export async function deleteDeliverable(id: string, actor = ACTOR) {
  const current = await prisma.deliverable.findUnique({
    where: { id },
    include: { children: { select: { id: true } } },
  });
  if (!current) throw new Error("DELIVERABLE_NOT_FOUND");
  if (current.children.length > 0) throw new Error("DELIVERABLE_HAS_CHILDREN");
  if (current.status === "APPROVED" || current.status === "RELEASED") throw new Error("DELIVERABLE_APPROVED_NO_DELETE");
  await prisma.deliverable.delete({ where: { id } });
  await recordAudit({
    actor,
    action: "DELIVERABLE_DELETED",
    entityType: "DELIVERABLE",
    entityId: id,
    projectId: current.projectId,
    summary: `Deliverable deleted: ${current.title}`,
  });
  return { id };
}

/** DEL-002: Add a dependency between two deliverables in the same project. */
export async function addDependency(input: unknown, actor = ACTOR) {
  const data = dependencyCreateSchema.parse(input);
  const [a, b] = await Promise.all([
    prisma.deliverable.findUnique({ where: { id: data.deliverableId }, select: { projectId: true } }),
    prisma.deliverable.findUnique({ where: { id: data.dependsOnDeliverableId }, select: { projectId: true } }),
  ]);
  if (!a || !b) throw new Error("DELIVERABLE_NOT_FOUND");
  if (a.projectId !== b.projectId) throw new Error("DELIVERABLE_CROSS_PROJECT");
  if (await dependencyCycleExists(data.deliverableId, data.dependsOnDeliverableId)) {
    throw new Error("DELIVERABLE_DEPENDENCY_CYCLE");
  }
  const dep = await prisma.deliverableDependency.create({
    data: { deliverableId: data.deliverableId, dependsOnDeliverableId: data.dependsOnDeliverableId },
  });
  await recordAudit({
    actor,
    action: "DELIVERABLE_DEPENDENCY_ADDED",
    entityType: "DELIVERABLE_DEPENDENCY",
    entityId: dep.id,
    projectId: a.projectId,
    summary: `Dependency added: ${data.deliverableId} depends on ${data.dependsOnDeliverableId}`,
  });
  return dep;
}

/** DEL-002: Remove a dependency. */
export async function removeDependency(deliverableId: string, dependsOnDeliverableId: string, actor = ACTOR) {
  const dep = await prisma.deliverableDependency.findUnique({
    where: { deliverableId_dependsOnDeliverableId: { deliverableId, dependsOnDeliverableId } },
  });
  if (!dep) throw new Error("DEPENDENCY_NOT_FOUND");
  const proj = await prisma.deliverable.findUnique({ where: { id: deliverableId }, select: { projectId: true } });
  await prisma.deliverableDependency.delete({ where: { deliverableId_dependsOnDeliverableId: { deliverableId, dependsOnDeliverableId } } });
  await recordAudit({
    actor,
    action: "DELIVERABLE_DEPENDENCY_REMOVED",
    entityType: "DELIVERABLE_DEPENDENCY",
    entityId: dep.id,
    projectId: proj?.projectId ?? undefined,
    summary: `Dependency removed: ${deliverableId} no longer depends on ${dependsOnDeliverableId}`,
  });
  return { deliverableId, dependsOnDeliverableId };
}

/** DEL-003: Add an acceptance criterion to a deliverable (or work packet). */
export async function addCriterion(input: unknown, actor = ACTOR) {
  const data = criteriaCreateSchema.parse(input);
  const crit = await prisma.acceptanceCriterion.create({
    data: {
      projectId: data.projectId,
      deliverableId: data.deliverableId ?? null,
      workPacketId: data.workPacketId ?? null,
      statement: data.statement,
      status: data.status,
      verificationMethod: data.verificationMethod,
      evidenceRequired: data.evidenceRequired,
    },
  });
  await recordAudit({
    actor,
    action: "ACCEPTANCE_CRITERION_ADDED",
    entityType: "ACCEPTANCE_CRITERION",
    entityId: crit.id,
    projectId: data.projectId,
    summary: `Acceptance criterion added: ${data.statement.slice(0, 80)}`,
  });
  return crit;
}

/** DEL-003: Update an acceptance criterion status/verification. */
export async function updateCriterion(id: string, input: unknown, actor = ACTOR) {
  const data = criteriaUpdateSchema.parse(input);
  const current = await prisma.acceptanceCriterion.findUnique({ where: { id } });
  if (!current) throw new Error("CRITERION_NOT_FOUND");
  const updated = await prisma.acceptanceCriterion.update({
    where: { id },
    data: {
      ...(data.statement !== undefined ? { statement: data.statement } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.verificationMethod !== undefined ? { verificationMethod: data.verificationMethod } : {}),
      ...(data.evidenceRequired !== undefined ? { evidenceRequired: data.evidenceRequired } : {}),
    },
  });
  await recordAudit({
    actor,
    action: "ACCEPTANCE_CRITERION_UPDATED",
    entityType: "ACCEPTANCE_CRITERION",
    entityId: id,
    projectId: current.projectId,
    summary: `Acceptance criterion updated (status ${updated.status})`,
  });
  return updated;
}

export async function listDeliverables(projectId: string) {
  return prisma.deliverable.findMany({
    where: { projectId },
    orderBy: [{ parentId: "asc" }, { order: "asc" }],
    include: { dependencies: true, dependedOnBy: true, acceptanceCriteria: true },
  });
}

export async function getDeliverableOrThrow(id: string) {
  const d = await prisma.deliverable.findUnique({
    where: { id },
    include: { dependencies: true, dependedOnBy: true, acceptanceCriteria: true },
  });
  if (!d) throw new Error("DELIVERABLE_NOT_FOUND");
  return d;
}

export type { DeliverableCreateInput, DeliverableUpdateInput, DependencyCreateInput, CriteriaCreateInput, CriteriaUpdateInput };
