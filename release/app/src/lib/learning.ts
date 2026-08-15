// LRN-001/002 — Capture learnings (from work packets / evidence) and convert
// them into backlog items, requirements, or change requests. Conversion is
// recorded (append-only) and the learning is marked CONVERTED.
import { prisma } from "./prisma";
import { recordAudit } from "./audit";
import { learningCreateSchema, learningConvertSchema } from "./validation";

/** LRN-001 — Record a learning. */
export async function createLearning(input: unknown, actor = "SYSTEM") {
  const data = learningCreateSchema.parse(input);
  const project = await prisma.project.findUnique({ where: { id: data.projectId } });
  if (!project) throw new Error("PROJECT_NOT_FOUND");
  const learning = await prisma.learningRecord.create({
    data: {
      projectId: data.projectId,
      sourceType: data.sourceType,
      summary: data.summary,
      evidenceIds: JSON.stringify(data.evidenceIds),
      impact: data.impact ?? null,
      status: data.status,
    },
  });
  await recordAudit({
    actor,
    action: "LEARNING_CAPTURED",
    entityType: "LEARNING_RECORD",
    entityId: learning.id,
    projectId: data.projectId,
    summary: `Learning captured (${data.sourceType}): ${data.summary.slice(0, 80)}`,
  });
  return learning;
}

/** LRN-002 — Convert a learning into a backlog item / requirement / change
 * request. Conversion is recorded and the learning is marked CONVERTED. */
export async function convertLearning(id: string, input: unknown, actor = "SYSTEM") {
  const data = learningConvertSchema.parse(input);
  const learning = await prisma.learningRecord.findUnique({ where: { id } });
  if (!learning) throw new Error("LEARNING_NOT_FOUND");
  const updated = await prisma.learningRecord.update({
    where: { id },
    data: { status: "CONVERTED", convertedReference: `${data.target}:${data.reference}` },
  });
  await recordAudit({
    actor,
    action: "LEARNING_CONVERTED",
    entityType: "LEARNING_RECORD",
    entityId: id,
    projectId: learning.projectId,
    summary: `Learning converted to ${data.target} (${data.reference})`,
    metadata: { target: data.target, reference: data.reference, note: data.note ?? null },
  });
  return updated;
}

/** LRN-001 — List learnings for a project. */
export async function listLearnings(projectId: string) {
  return prisma.learningRecord.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLearningOrThrow(id: string) {
  const l = await prisma.learningRecord.findUnique({ where: { id } });
  if (!l) throw new Error("LEARNING_NOT_FOUND");
  return l;
}
