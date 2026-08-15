// EXC-002/003/004 — Direction requests: an agent escalates a consequential
// ambiguity it cannot resolve within approved boundaries. The request blocks the
// dependent work until a persisted owner decision (decidedBy + resolution +
// decidedAt) is recorded. Once ANSWERED it cannot be reopened except by
// superseding (a new request), enforcing "owner direction cannot be bypassed".
import { prisma } from "./prisma";
import { recordAudit } from "./audit";
import { directionRequestCreateSchema, directionRequestResolveSchema } from "./validation";

/** EXC-002 — Create a direction request (escalate consequential ambiguity). */
export async function createDirectionRequest(input: unknown, actor = "SYSTEM") {
  const data = directionRequestCreateSchema.parse(input);
  const project = await prisma.project.findUnique({ where: { id: data.projectId } });
  if (!project) throw new Error("PROJECT_NOT_FOUND");
  const dr = await prisma.directionRequest.create({
    data: {
      projectId: data.projectId,
      title: data.title,
      question: data.question,
      context: data.context ?? null,
      options: JSON.stringify(data.options),
      status: "OPEN",
      severity: data.severity,
    },
  });
  await recordAudit({
    actor,
    action: "DIRECTION_REQUEST_RAISED",
    entityType: "DIRECTION_REQUEST",
    entityId: dr.id,
    projectId: data.projectId,
    summary: `Direction request raised: ${dr.title} (${dr.severity})`,
    metadata: { severity: dr.severity },
  });
  return dr;
}

/** EXC-004 — Record the owner's decision. Cannot bypass: status flips to
 * ANSWERED and decidedAt is stamped; reopen is refused. */
export async function resolveDirectionRequest(id: string, input: unknown, actor = "SYSTEM") {
  const data = directionRequestResolveSchema.parse(input);
  const dr = await prisma.directionRequest.findUnique({ where: { id } });
  if (!dr) throw new Error("DIRECTION_REQUEST_NOT_FOUND");
  if (dr.status !== "OPEN") throw new Error("DIRECTION_REQUEST_CLOSED");
  const updated = await prisma.directionRequest.update({
    where: { id },
    data: { status: "ANSWERED", resolution: data.resolution, decidedBy: data.decidedBy, decidedAt: new Date() },
  });
  await recordAudit({
    actor,
    action: "DIRECTION_REQUEST_ANSWERED",
    entityType: "DIRECTION_REQUEST",
    entityId: id,
    projectId: dr.projectId,
    summary: `Direction request answered by ${data.decidedBy}`,
    metadata: { resolution: data.resolution, decidedBy: data.decidedBy },
  });
  return updated;
}

/** EXC-003 — List open direction requests that still require owner input. */
export async function listOpenDirectionRequests(projectId?: string) {
  return prisma.directionRequest.findMany({
    where: { status: "OPEN", ...(projectId ? { projectId } : {}) },
    orderBy: { createdAt: "asc" },
  });
}

export async function getDirectionRequestOrThrow(id: string) {
  const d = await prisma.directionRequest.findUnique({ where: { id } });
  if (!d) throw new Error("DIRECTION_REQUEST_NOT_FOUND");
  return d;
}
