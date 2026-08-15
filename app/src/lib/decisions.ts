// GOV-001 — Immutable decision records. A decision, once created, is never
// overwritten. Corrections create a superseding record (here, a new record with
// a related decisionId convention); updates are intentionally unsupported.
import { prisma } from "./prisma";
import { recordAudit } from "./audit";
import { decisionCreateSchema } from "./validation";

/** GOV-001 — Create an immutable decision record. */
export async function createDecision(input: unknown, actor = "SYSTEM") {
  const data = decisionCreateSchema.parse(input);
  const decision = await prisma.decisionRecord.create({
    data: {
      projectId: data.projectId ?? null,
      decisionId: data.decisionId,
      title: data.title,
      context: data.context,
      options: JSON.stringify(data.options),
      selectedOption: data.selectedOption,
      rationale: data.rationale,
      affectedRequirementIds: JSON.stringify(data.affectedRequirementIds),
      decidedBy: data.decidedBy,
      decidedAt: new Date(),
    },
  });
  await recordAudit({
    actor,
    action: "DECISION_CREATED",
    entityType: "DECISION_RECORD",
    entityId: decision.id,
    projectId: data.projectId ?? null,
    summary: `Decision ${data.decisionId} recorded: ${data.title} (selected ${data.selectedOption})`,
    metadata: { decisionId: data.decisionId, selectedOption: data.selectedOption },
  });
  return decision;
}

/** List decision records (optionally by project). */
export async function listDecisions(projectId?: string) {
  return prisma.decisionRecord.findMany({
    where: projectId ? { projectId } : undefined,
    orderBy: { decidedAt: "desc" },
  });
}

export async function getDecisionOrThrow(id: string) {
  const d = await prisma.decisionRecord.findUnique({ where: { id } });
  if (!d) throw new Error("DECISION_NOT_FOUND");
  return d;
}
