// AGT-001: Store generic agent records — capabilities, provider, model, autonomy, status.
import { prisma } from "./prisma";
import { recordAudit } from "./audit";
import { AgentKind, AutonomyLevel, AgentStatus } from "./validation";
import { z } from "zod";

export const agentCreateSchema = z.object({
  name: z.string().min(1).max(150),
  kind: AgentKind,
  provider: z.string().max(120).optional().nullable(),
  model: z.string().max(120).optional().nullable(),
  capabilities: z.array(z.string().min(1).max(120)).default([]),
  autonomyLevel: AutonomyLevel.default("MANUAL"),
  status: AgentStatus.default("IDLE"),
});

export type AgentCreateInput = z.infer<typeof agentCreateSchema>;

export const agentUpdateSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  kind: AgentKind.optional(),
  provider: z.string().max(120).optional().nullable(),
  model: z.string().max(120).optional().nullable(),
  capabilities: z.array(z.string().min(1).max(120)).optional(),
  autonomyLevel: AutonomyLevel.optional(),
  status: AgentStatus.optional(),
});

export type AgentUpdateInput = z.infer<typeof agentUpdateSchema>;

export async function createAgent(input: unknown, actor = "SYSTEM") {
  const data = agentCreateSchema.parse(input);
  const agent = await prisma.agent.create({
    data: {
      name: data.name,
      kind: data.kind,
      provider: data.provider ?? null,
      model: data.model ?? null,
      capabilities: JSON.stringify(data.capabilities),
      autonomyLevel: data.autonomyLevel,
      status: data.status,
    },
  });
  await recordAudit({
    actor,
    action: "AGENT_CREATED",
    entityType: "AGENT",
    entityId: agent.id,
    summary: `Agent registered: ${agent.name} (${agent.kind}, ${agent.autonomyLevel})`,
  });
  return agent;
}

export async function updateAgent(id: string, input: unknown, actor = "SYSTEM") {
  const data = agentUpdateSchema.parse(input);
  const agent = await prisma.agent.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.kind !== undefined ? { kind: data.kind } : {}),
      ...(data.provider !== undefined ? { provider: data.provider } : {}),
      ...(data.model !== undefined ? { model: data.model } : {}),
      ...(data.capabilities !== undefined ? { capabilities: JSON.stringify(data.capabilities) } : {}),
      ...(data.autonomyLevel !== undefined ? { autonomyLevel: data.autonomyLevel } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
  });
  await recordAudit({
    actor,
    action: "AGENT_UPDATED",
    entityType: "AGENT",
    entityId: id,
    summary: `Agent updated: ${agent.name}`,
  });
  return agent;
}

export async function listAgents() {
  return prisma.agent.findMany({ orderBy: { name: "asc" } });
}

export async function getAgent(id: string) {
  const a = await prisma.agent.findUnique({ where: { id } });
  if (!a) throw new Error("AGENT_NOT_FOUND");
  return a;
}

/** Queue summary per agent: count of queued/active work packets (AGT-002 preview). */
export async function agentQueueSummary(agentId: string) {
  const [queued, active] = await Promise.all([
    prisma.workPacket.count({ where: { assigneeAgentId: agentId, status: "READY" } }),
    prisma.workPacket.count({ where: { assigneeAgentId: agentId, status: "IN_PROGRESS" } }),
  ]);
  return { queued, active };
}
