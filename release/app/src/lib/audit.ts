// AUD-001: Record required append-only audit events.
// ActivityRecord is the append-only audit log (no update/delete service methods).
import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

// Events required by the audit policy (Phase 02 relevant).
export const AUDIT_EVENTS = [
  "PROJECT_CREATED",
  "PROJECT_UPDATED",
  "PROJECT_ARCHIVED",
  "PROJECT_RESTORED",
  "PROJECT_BRAIN_UPDATED",
  "AGENT_CREATED",
  "AGENT_UPDATED",
  "INTENT_CAPTURED",
  "INTENT_APPROVED",
  "BENCHMARK_CAPTURED",
  "BENCHMARK_APPROVED",
  "INTENT_TRACED",
] as const;

export type AuditEvent = (typeof AUDIT_EVENTS)[number];

const auditInputSchema = z.object({
  actor: z.string().min(1).max(120),
  action: z.string().min(1).max(80),
  entityType: z.string().min(1).max(40),
  entityId: z.string().min(1),
  projectId: z.string().uuid().optional().nullable(),
  summary: z.string().min(1).max(500),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AuditInput = z.infer<typeof auditInputSchema>;

/**
 * Append an immutable audit event. Throws on invalid input (so callers fail
 * safely rather than silently dropping the record).
 */
export async function recordAudit(
  input: AuditInput,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const parsed = auditInputSchema.parse(input);
  const db = tx ?? prisma;
  await db.activityRecord.create({
    data: {
      actor: parsed.actor,
      action: parsed.action,
      entityType: parsed.entityType,
      entityId: parsed.entityId,
      projectId: parsed.projectId ?? null,
      summary: parsed.summary,
      metadata: JSON.stringify(parsed.metadata ?? {}),
    },
  });
}

/** Read audit records for a project (most recent first). */
export async function listAuditForProject(projectId: string, limit = 50) {
  return prisma.activityRecord.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
