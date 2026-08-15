// EXC-001 — Classify and track exceptions/ambiguities: recoverable assumptions,
// direction-required, and critical issues. Each has a lifecycle to resolution.
import { prisma } from "./prisma";
import { recordAudit } from "./audit";
import { exceptionCreateSchema, exceptionResolveSchema } from "./validation";

/** EXC-001 — Classify a new exception. */
export async function createException(input: unknown, actor = "SYSTEM") {
  const data = exceptionCreateSchema.parse(input);
  const project = await prisma.project.findUnique({ where: { id: data.projectId } });
  if (!project) throw new Error("PROJECT_NOT_FOUND");
  const exc = await prisma.exception.create({
    data: {
      projectId: data.projectId,
      classification: data.classification,
      title: data.title,
      detail: data.detail ?? null,
      status: data.status,
    },
  });
  await recordAudit({
    actor,
    action: "EXCEPTION_CLASSIFIED",
    entityType: "EXCEPTION",
    entityId: exc.id,
    projectId: data.projectId,
    summary: `Exception classified: ${exc.title} (${exc.classification})`,
    metadata: { classification: exc.classification },
  });
  return exc;
}

/** EXC-001 — Resolve/close an exception with a recorded resolver. */
export async function resolveException(id: string, input: unknown, actor = "SYSTEM") {
  const data = exceptionResolveSchema.parse(input);
  const exc = await prisma.exception.findUnique({ where: { id } });
  if (!exc) throw new Error("EXCEPTION_NOT_FOUND");
  const updated = await prisma.exception.update({
    where: { id },
    data: { status: data.status, resolvedBy: data.resolvedBy, resolvedAt: new Date() },
  });
  await recordAudit({
    actor,
    action: "EXCEPTION_RESOLVED",
    entityType: "EXCEPTION",
    entityId: id,
    projectId: exc.projectId,
    summary: `Exception ${data.status} by ${data.resolvedBy}`,
  });
  return updated;
}

/** EXC-001 — List exceptions, optionally by classification. */
export async function listExceptions(projectId: string, classification?: string) {
  return prisma.exception.findMany({
    where: { projectId, ...(classification ? { classification } : {}) },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function getExceptionOrThrow(id: string) {
  const e = await prisma.exception.findUnique({ where: { id } });
  if (!e) throw new Error("EXCEPTION_NOT_FOUND");
  return e;
}
