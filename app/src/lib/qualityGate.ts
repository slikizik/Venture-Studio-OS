// QLT-002 — Quality gate evaluation using retained evidence. A gate records a
// level, an outcome, and the evidence that was inspected to reach it. The
// attached evidence must exist (retained) so the gate is auditable.
import { prisma } from "./prisma";
import { recordAudit } from "./audit";
import { qualityGateCreateSchema } from "./validation";

/** QLT-002 — Evaluate a quality gate at a level using retained evidence. */
export async function evaluateQualityGate(input: unknown, actor = "SYSTEM") {
  const data = qualityGateCreateSchema.parse(input);
  const project = await prisma.project.findUnique({ where: { id: data.projectId } });
  if (!project) throw new Error("PROJECT_NOT_FOUND");

  // Evidence integrity: referenced evidence IDs must already exist (retained).
  if (data.evidenceIds.length > 0) {
    const found = await prisma.evidence.findMany({
      where: { id: { in: data.evidenceIds } },
      select: { id: true },
    });
    const missing = data.evidenceIds.filter((e) => !found.some((f) => f.id === e));
    if (missing.length > 0) throw new Error("EVIDENCE_NOT_FOUND:" + missing.join(","));
  }

  const gate = await prisma.qualityGateResult.create({
    data: {
      projectId: data.projectId,
      level: data.level,
      entityId: data.entityId,
      outcome: data.outcome,
      criterionResults: JSON.stringify(data.criterionResults),
      evidenceIds: JSON.stringify(data.evidenceIds),
      riskDecisionId: data.riskDecisionId ?? null,
      evaluatedBy: data.evaluatedBy,
      evaluatedAt: new Date(),
    },
  });
  await recordAudit({
    actor,
    action: "QUALITY_GATE_EVALUATED",
    entityType: "QUALITY_GATE_RESULT",
    entityId: gate.id,
    projectId: data.projectId,
    summary: `Quality gate ${data.level} for ${data.entityId} -> ${data.outcome}`,
    metadata: { level: data.level, outcome: data.outcome, evidenceCount: data.evidenceIds.length },
  });
  return gate;
}

/** QLT-002 — List quality gate results for a project. */
export async function listQualityGates(projectId: string) {
  return prisma.qualityGateResult.findMany({
    where: { projectId },
    orderBy: { evaluatedAt: "desc" },
  });
}

export async function getQualityGateOrThrow(id: string) {
  const g = await prisma.qualityGateResult.findUnique({ where: { id } });
  if (!g) throw new Error("QUALITY_GATE_NOT_FOUND");
  return g;
}
