// ENV-001 / ENV-002 — Register isolated software-development environments and
// record their branch, worktree, port, database, storage, logs, and live status.
//
// Each registered environment MUST resolve to a distinct database/storage/secret
// source. The physical-isolation guarantee is enforced at configuration time by
// lib/isolation.ts (ENV-003); this module persists the registry and the
// per-environment runtime facts that ENV-002 requires be recorded.
import { prisma } from "./prisma";
import { recordAudit } from "./audit";
import {
  environmentRegisterSchema,
  environmentUpdateSchema,
  type EnvironmentRegisterInput,
  type EnvironmentUpdateInput,
} from "./validation";

/** ENV-001 — Register (or replace the registration of) an isolated environment. */
export async function registerEnvironment(input: unknown, actor = "SYSTEM") {
  const data = environmentRegisterSchema.parse(input);
  const existing = await prisma.environmentRegistration.findUnique({
    where: { envId: data.envId },
  });
  const record = existing
    ? await prisma.environmentRegistration.update({
        where: { envId: data.envId },
        data: {
          name: data.name,
          branch: data.branch ?? null,
          worktreePath: data.worktreePath ?? null,
          port: data.port ?? null,
          dbPath: data.dbPath ?? null,
          storageDir: data.storageDir ?? null,
          logPath: data.logPath ?? null,
          status: data.status,
          lastSeenAt: new Date(),
          notes: data.notes ?? null,
        },
      })
    : await prisma.environmentRegistration.create({
        data: {
          envId: data.envId,
          name: data.name,
          branch: data.branch ?? null,
          worktreePath: data.worktreePath ?? null,
          port: data.port ?? null,
          dbPath: data.dbPath ?? null,
          storageDir: data.storageDir ?? null,
          logPath: data.logPath ?? null,
          status: data.status,
          lastSeenAt: new Date(),
          notes: data.notes ?? null,
        },
      });
  await recordAudit({
    actor,
    action: existing ? "ENV_UPDATED" : "ENV_REGISTERED",
    entityType: "ENVIRONMENT",
    entityId: record.id,
    summary: `Environment "${data.envId}" ${existing ? "re-registered" : "registered"} (branch=${data.branch ?? "n/a"}, port=${data.port ?? "n/a"})`,
    metadata: { envId: data.envId, status: data.status },
  });
  return record;
}

/** ENV-002 — Record/refresh live status and runtime facts for an environment. */
export async function updateEnvironment(envId: string, input: unknown, actor = "SYSTEM") {
  const data = environmentUpdateSchema.parse(input);
  const record = await prisma.environmentRegistration.update({
    where: { envId },
    data: {
      ...data,
      lastSeenAt: data.lastSeenAt ? new Date(data.lastSeenAt) : new Date(),
    },
  });
  await recordAudit({
    actor,
    action: "ENV_STATUS_RECORDED",
    entityType: "ENVIRONMENT",
    entityId: record.id,
    summary: `Environment "${envId}" status recorded: ${record.status}`,
    metadata: { envId, status: record.status },
  });
  return record;
}

/** List registered environments (optionally filtered by status). */
export async function listEnvironments(status?: string) {
  return prisma.environmentRegistration.findMany({
    where: status ? { status } : undefined,
    orderBy: { registeredAt: "asc" },
  });
}

export async function getEnvironment(envId: string) {
  return prisma.environmentRegistration.findUnique({ where: { envId } });
}

/**
 * ENV-003 integration — return the registered environments as EnvironmentConfig
 * so isolation assertions can be run against the live registry. Environments that
 * omit dbPath/storageDir/secretSource are treated as not sharing those resources.
 */
export async function registeredEnvironmentConfigs() {
  const envs = await listEnvironments();
  return envs.map((e) => ({
    id: e.envId,
    name: e.name,
    dbPath: e.dbPath ?? "",
    storageDir: e.storageDir ?? "",
    secretSource: e.logPath ?? "",
  }));
}
