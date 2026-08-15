// INT-001 / INT-002 / DSG-001: Project intent, benchmark brief, and intent tracing.
// Per Product Intent Alignment Policy: intent/quality/commercial claims are
// derived from stored evidence, never invented. Approval is an explicit state
// transition. DSG-001 records traceability rows (intent -> requirement -> AC)
// without altering stored owner intent text.
import { prisma } from "./prisma";
import { recordAudit } from "./audit";
import { z } from "zod";

export const intentSchema = z.object({
  problem: z.string().min(1).max(2000),
  audience: z.string().min(1).max(2000),
  desiredOutcome: z.string().min(1).max(2000),
  constraints: z.string().min(1).max(2000),
  nonGoals: z.string().max(2000).optional().default(""),
  successMeasures: z.array(z.object({ measure: z.string().min(1), target: z.string().min(1) })).default([]),
  ownerPriorities: z.array(z.string().min(1)).default([]),
  commercialTarget: z.string().max(2000).optional().nullable(),
});

export type IntentInput = z.infer<typeof intentSchema>;

export const benchmarkSchema = z.object({
  purpose: z.string().min(1).max(2000),
  references: z.array(z.string().min(1)).default([]),
  dimensions: z.array(z.string().min(1)).default([]),
  marketBaseline: z.string().max(2000).optional().nullable(),
  targetSummary: z.string().max(2000).optional().nullable(),
  differentiators: z.array(z.string().min(1)).default([]),
  intentionalOmissions: z.array(z.string().min(1)).default([]),
});

export type BenchmarkInput = z.infer<typeof benchmarkSchema>;

export const traceInputSchema = z.object({
  requirementIds: z.array(z.string().min(1)).default([]),
  acceptanceCriterionIds: z.array(z.string().min(1)).default([]),
  note: z.string().max(1000).optional().default(""),
});

export type TraceInput = z.infer<typeof traceInputSchema>;

/** INT-001: Capture (or replace) a draft intent brief for a project. */
export async function captureIntent(projectId: string, input: unknown, actor = "SYSTEM") {
  const data = intentSchema.parse(input);
  const parsed = await prisma.project.findUnique({ where: { id: projectId } });
  if (!parsed) throw new Error("PROJECT_NOT_FOUND");
  const existing = await prisma.projectIntent.findFirst({ where: { projectId } });
  if (existing) {
    await prisma.projectIntent.update({
      where: { id: existing.id },
      data: {
        problem: data.problem,
        audience: data.audience,
        desiredOutcome: data.desiredOutcome,
        constraints: data.constraints,
        nonGoals: data.nonGoals,
        successMeasures: JSON.stringify(data.successMeasures),
        ownerPriorities: JSON.stringify(data.ownerPriorities),
        commercialTarget: data.commercialTarget ?? null,
        status: "DRAFT",
        approvedAt: null,
      },
    });
  } else {
    await prisma.projectIntent.create({
      data: {
        projectId,
        problem: data.problem,
        audience: data.audience,
        desiredOutcome: data.desiredOutcome,
        constraints: data.constraints,
        nonGoals: data.nonGoals,
        successMeasures: JSON.stringify(data.successMeasures),
        ownerPriorities: JSON.stringify(data.ownerPriorities),
        commercialTarget: data.commercialTarget ?? null,
        status: "DRAFT",
      },
    });
  }
  await recordAudit({
    actor,
    action: "INTENT_CAPTURED",
    entityType: "PROJECT_INTENT",
    entityId: projectId,
    projectId,
    summary: `Project intent captured (draft)`,
  });
  return getIntent(projectId);
}

/** INT-001: Approve a captured intent (explicit transition). */
export async function approveIntent(projectId: string, actor = "SYSTEM") {
  const existing = await prisma.projectIntent.findFirst({ where: { projectId } });
  if (!existing) throw new Error("INTENT_NOT_FOUND");
  const updated = await prisma.projectIntent.update({
    where: { id: existing.id },
    data: { status: "APPROVED", approvedAt: new Date() },
  });
  await recordAudit({
    actor,
    action: "INTENT_APPROVED",
    entityType: "PROJECT_INTENT",
    entityId: projectId,
    projectId,
    summary: `Project intent approved`,
  });
  return updated;
}

/** INT-002: Capture/approve a benchmark brief. */
export async function captureBenchmark(projectId: string, input: unknown, actor = "SYSTEM") {
  const data = benchmarkSchema.parse(input);
  const existing = await prisma.benchmarkBrief.findFirst({ where: { projectId } });
  if (existing) {
    await prisma.benchmarkBrief.update({
      where: { id: existing.id },
      data: {
        purpose: data.purpose,
        references: JSON.stringify(data.references),
        dimensions: JSON.stringify(data.dimensions),
        marketBaseline: data.marketBaseline ?? null,
        targetSummary: data.targetSummary ?? null,
        differentiators: JSON.stringify(data.differentiators),
        intentionalOmissions: JSON.stringify(data.intentionalOmissions),
        status: "DRAFT",
        evidenceDate: new Date(),
      },
    });
  } else {
    await prisma.benchmarkBrief.create({
      data: {
        projectId,
        purpose: data.purpose,
        references: JSON.stringify(data.references),
        dimensions: JSON.stringify(data.dimensions),
        marketBaseline: data.marketBaseline ?? null,
        targetSummary: data.targetSummary ?? null,
        differentiators: JSON.stringify(data.differentiators),
        intentionalOmissions: JSON.stringify(data.intentionalOmissions),
        status: "DRAFT",
        evidenceDate: new Date(),
      },
    });
  }
  await recordAudit({
    actor,
    action: "BENCHMARK_CAPTURED",
    entityType: "BENCHMARK_BRIEF",
    entityId: projectId,
    projectId,
    summary: `Benchmark brief captured (draft)`,
  });
  return getBenchmark(projectId);
}

export async function approveBenchmark(projectId: string, actor = "SYSTEM") {
  const existing = await prisma.benchmarkBrief.findFirst({ where: { projectId } });
  if (!existing) throw new Error("BENCHMARK_NOT_FOUND");
  const updated = await prisma.benchmarkBrief.update({
    where: { id: existing.id },
    data: { status: "APPROVED" },
  });
  await recordAudit({
    actor,
    action: "BENCHMARK_APPROVED",
    entityType: "BENCHMARK_BRIEF",
    entityId: projectId,
    projectId,
    summary: `Benchmark brief approved`,
  });
  return updated;
}

/**
 * DSG-001: Record traceability from approved intent into requirements and
 * acceptance criteria. This writes a traceability record (and an audit event)
 * WITHOUT modifying the stored owner intent text. If intent is not approved,
 * capture trace is rejected to enforce the "approved intent" precondition.
 */
export async function traceIntent(projectId: string, input: unknown, actor = "SYSTEM") {
  const data = traceInputSchema.parse(input);
  const intent = await prisma.projectIntent.findFirst({ where: { projectId } });
  if (!intent || intent.status !== "APPROVED") {
    throw new Error("INTENT_NOT_APPROVED");
  }
  // Record the trace as an immutable audit event (append-only) and return it.
  await recordAudit({
    actor,
    action: "INTENT_TRACED",
    entityType: "PROJECT_INTENT",
    entityId: projectId,
    projectId,
    summary: `Intent traced to ${data.requirementIds.length} requirement(s), ${data.acceptanceCriterionIds.length} acceptance criterion(s)${data.note ? ": " + data.note : ""}`,
    metadata: {
      requirementIds: data.requirementIds,
      acceptanceCriterionIds: data.acceptanceCriterionIds,
    },
  });
  return { traced: true, requirementIds: data.requirementIds, acceptanceCriterionIds: data.acceptanceCriterionIds };
}

export async function getIntent(projectId: string) {
  return prisma.projectIntent.findFirst({ where: { projectId } });
}

export async function getBenchmark(projectId: string) {
  return prisma.benchmarkBrief.findFirst({ where: { projectId } });
}
