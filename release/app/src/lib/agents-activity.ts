// AGT-003 — Append-only agent activity/outcome log (no update/delete).
import { prisma } from "./prisma";
import { agentActivityCreateSchema } from "./validation";

/** AGT-003 — Record an immutable agent activity/outcome event. */
export async function recordAgentActivity(input: unknown) {
  const data = agentActivityCreateSchema.parse(input);
  return prisma.agentActivity.create({
    data: {
      projectId: data.projectId ?? null,
      agentId: data.agentId ?? null,
      agentName: data.agentName,
      action: data.action,
      entityType: data.entityType ?? null,
      entityId: data.entityId ?? null,
      outcome: data.outcome,
      summary: data.summary,
      startedAt: data.startedAt ?? null,
      endedAt: data.endedAt ?? null,
      durationMs: data.durationMs ?? null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : "{}",
    },
  });
}

/** List agent activity for a project, newest first. */
export async function listAgentActivity(projectId: string, opts?: { agentId?: string; limit?: number }) {
  return prisma.agentActivity.findMany({
    where: {
      projectId,
      ...(opts?.agentId ? { agentId: opts.agentId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 100,
  });
}
