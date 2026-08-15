// GOV-002 — Risk register: create and manage risks with impact/likelihood/
// status, mitigation, and review cadence.
import { prisma } from "./prisma";
import { recordAudit } from "./audit";
import { riskCreateSchema, riskUpdateSchema } from "./validation";

/** GOV-002 — Create a risk. */
export async function createRisk(input: unknown, actor = "SYSTEM") {
  const data = riskCreateSchema.parse(input);
  const risk = await prisma.riskRecord.create({
    data: {
      projectId: data.projectId,
      title: data.title,
      description: data.description ?? undefined,
      impact: data.impact,
      likelihood: data.likelihood,
      status: data.status,
      mitigation: data.mitigation ?? undefined,
      ownerAgentId: data.ownerAgentId ?? undefined,
      targetDate: data.targetDate ?? undefined,
      reviewDate: data.reviewDate ?? undefined,
    },
  });
  await recordAudit({
    actor,
    action: "RISK_CREATED",
    entityType: "RISK_RECORD",
    entityId: risk.id,
    projectId: data.projectId,
    summary: `Risk created: ${risk.title} (${risk.impact}/${risk.likelihood})`,
  });
  return risk;
}

/** GOV-002 — Update a risk (status, mitigation, impact, etc.). */
export async function updateRisk(id: string, input: unknown, actor = "SYSTEM") {
  const data = riskUpdateSchema.parse(input);
  const existing = await prisma.riskRecord.findUnique({ where: { id } });
  if (!existing) throw new Error("RISK_NOT_FOUND");
  const risk = await prisma.riskRecord.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title ?? undefined } : {}),
      ...(data.description !== undefined ? { description: data.description ?? undefined } : {}),
      ...(data.impact !== undefined ? { impact: data.impact } : {}),
      ...(data.likelihood !== undefined ? { likelihood: data.likelihood } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.mitigation !== undefined ? { mitigation: data.mitigation ?? undefined } : {}),
      ...(data.ownerAgentId !== undefined ? { ownerAgentId: data.ownerAgentId ?? undefined } : {}),
      ...(data.targetDate !== undefined ? { targetDate: data.targetDate ?? undefined } : {}),
      ...(data.reviewDate !== undefined ? { reviewDate: data.reviewDate ?? undefined } : {}),
    },
  });
  await recordAudit({
    actor,
    action: "RISK_UPDATED",
    entityType: "RISK_RECORD",
    entityId: id,
    projectId: existing.projectId,
    summary: `Risk updated: ${risk.title} (status ${risk.status})`,
  });
  return risk;
}

/** GOV-002 — List risks for a project. */
export async function listRisks(projectId: string) {
  return prisma.riskRecord.findMany({
    where: { projectId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function getRiskOrThrow(id: string) {
  const r = await prisma.riskRecord.findUnique({ where: { id } });
  if (!r) throw new Error("RISK_NOT_FOUND");
  return r;
}
