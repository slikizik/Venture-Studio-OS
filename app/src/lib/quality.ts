// QLT-001 — Quality Profile service: create/version/list Quality Profiles.
// A Quality Profile defines the quality dimensions, mandatory dimensions, and
// target levels appropriate to a project type. Versions are immutable snapshots;
// a new save supersedes the previous version (isLatest flag).
import { prisma } from "./prisma";
import {
  qualityProfileCreateSchema,
  QualityProfileCreateInput,
  qualityProfileUpdateSchema,
  QualityProfileUpdateInput,
} from "./validation";

export async function createQualityProfile(projectId: string, input: QualityProfileCreateInput) {
  const data = qualityProfileCreateSchema.parse({ ...input, projectId });

  // supersede any current latest version for this project
  const existing = await prisma.qualityProfile.findFirst({
    where: { projectId: data.projectId, isLatest: true },
  });
  if (existing) {
    await prisma.qualityProfile.update({
      where: { id: existing.id },
      data: { isLatest: false },
    });
  }

  const version = existing ? bumpVersion(existing.version) : "1.0.0";

  return prisma.qualityProfile.create({
    data: {
      projectId,
      name: data.name,
      projectTypeId: data.projectTypeId,
      dimensions: JSON.stringify(data.dimensions),
      mandatoryDimensions: JSON.stringify(data.mandatoryDimensions),
      targetLevels: JSON.stringify(data.targetLevels),
      status: data.status,
      version,
      isLatest: true,
    },
  });
}

export async function listQualityProfiles(projectId: string) {
  return prisma.qualityProfile.findMany({
    where: { projectId },
    orderBy: { version: "desc" },
  });
}

export async function getLatestQualityProfile(projectId: string) {
  return prisma.qualityProfile.findFirst({
    where: { projectId, isLatest: true },
    orderBy: { version: "desc" },
  });
}

export async function getQualityProfile(id: string) {
  return prisma.qualityProfile.findUnique({ where: { id } });
}

// Update supersedes the current latest version with a new immutable version.
export async function updateQualityProfile(projectId: string, input: QualityProfileUpdateInput) {
  const data = qualityProfileUpdateSchema.parse(input);
  const latest = await prisma.qualityProfile.findFirst({
    where: { projectId, isLatest: true },
    orderBy: { version: "desc" },
  });
  if (!latest) {
    throw new Error("No quality profile exists to update; create one first");
  }
  // demote current latest
  await prisma.qualityProfile.update({ where: { id: latest.id }, data: { isLatest: false } });
  const version = bumpVersion(latest.version);
  return prisma.qualityProfile.create({
    data: {
      projectId,
      name: data.name ?? latest.name,
      projectTypeId: data.projectTypeId ?? latest.projectTypeId,
      dimensions: JSON.stringify(data.dimensions ?? parseJson(latest.dimensions, [])),
      mandatoryDimensions: JSON.stringify(data.mandatoryDimensions ?? parseJson(latest.mandatoryDimensions, [])),
      targetLevels: JSON.stringify(data.targetLevels ?? parseJson(latest.targetLevels, [])),
      status: data.status ?? latest.status,
      version,
      isLatest: true,
    },
  });
}

// Promote an existing historical version to latest (re-point isLatest).
export async function versionQualityProfile(projectId: string, version: string) {
  const target = await prisma.qualityProfile.findFirst({
    where: { projectId, version },
  });
  if (!target) throw new Error(`Quality profile version ${version} not found`);
  await prisma.qualityProfile.updateMany({
    where: { projectId, isLatest: true },
    data: { isLatest: false },
  });
  return prisma.qualityProfile.update({ where: { id: target.id }, data: { isLatest: true } });
}

export async function deleteQualityProfile(id: string) {
  return prisma.qualityProfile.delete({ where: { id } });
}

function parseJson<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function bumpVersion(v: string): string {
  const parts = v.split(".").map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return "1.0.1";
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}
