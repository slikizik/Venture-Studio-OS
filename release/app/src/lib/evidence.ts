// Evidence records (ATT-001/002 backing store). Evidence is immutable once
// linked to an approved work packet, so the service only supports create + read.
import { prisma } from "./prisma";
import { recordAudit } from "./audit";
import { z } from "zod";
import { EvidenceType } from "./validation";

export const evidenceCreateSchema = z.object({
  projectId: z.string().min(1),
  workPacketId: z.string().min(1).optional().nullable(),
  acceptanceCriterionId: z.string().min(1).optional().nullable(),
  type: EvidenceType,
  title: z.string().min(1).max(150),
  location: z.string().max(1000).optional().nullable(),
  checksum: z.string().max(128).optional().nullable(),
});
export type EvidenceCreateInput = z.infer<typeof evidenceCreateSchema>;

/** ATT-001/002 — Create an evidence record. */
export async function createEvidence(input: unknown, actor = "SYSTEM") {
  const data = evidenceCreateSchema.parse(input);
  const ev = await prisma.evidence.create({
    data: {
      projectId: data.projectId,
      workPacketId: data.workPacketId ?? null,
      acceptanceCriterionId: data.acceptanceCriterionId ?? null,
      type: data.type,
      title: data.title,
      location: data.location ?? null,
      checksum: data.checksum ?? null,
    },
  });
  await recordAudit({
    actor,
    action: "EVIDENCE_CREATED",
    entityType: "EVIDENCE",
    entityId: ev.id,
    projectId: ev.projectId,
    summary: `Evidence recorded: ${ev.title} (${ev.type})`,
  });
  return ev;
}

/** List evidence for a project (optionally scoped to a work packet). */
export async function listEvidence(
  projectId: string,
  opts?: { workPacketId?: string },
) {
  return prisma.evidence.findMany({
    where: {
      projectId,
      ...(opts?.workPacketId ? { workPacketId: opts.workPacketId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}
