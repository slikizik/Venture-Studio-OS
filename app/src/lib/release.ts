// VER-003 — Record comparison, approval, merge readiness, and release status of
// a candidate version against its baseline.
//
// QLT-004 — Distinguish technically-ready from commercially-ready release
// states, per RELEASE_READINESS_MODEL.md. The state machine NEVER treats
// TECHNICALLY_READY as equivalent to COMMERCIAL_READY.
import { prisma } from "./prisma";
import { recordAudit } from "./audit";
import {
  releaseRecordCreateSchema,
  releaseRecordApproveSchema,
  releaseReadinessCreateSchema,
  releaseReadinessEvaluateSchema,
  ReleaseReadinessState,
  type ReleaseRecordApproveInput,
  type ReleaseReadinessEvaluateInput,
} from "./validation";

/**
 * VER-003 — Record the comparison and initial release-status of a candidate
 * version. `comparison` is a caller-supplied structured JSON string (diff between
 * base and candidate); this module stores it immutably-ish (append semantics via
 * a new ReleaseRecord rather than mutating the baseline VersionRecord).
 */
export async function recordRelease(input: unknown, actor = "SYSTEM") {
  const data = releaseRecordCreateSchema.parse(input);
  const record = await prisma.releaseRecord.create({
    data: {
      projectId: data.projectId,
      versionLabel: data.versionLabel,
      baseVersionLabel: data.baseVersionLabel ?? null,
      comparison: data.comparison,
      approvalStatus: data.approvalStatus,
      mergeReadiness: data.mergeReadiness,
      mergeBlockers: JSON.stringify(data.mergeBlockers),
      releaseStatus: data.releaseStatus,
    },
  });
  await recordAudit({
    actor,
    action: "RELEASE_RECORDED",
    entityType: "RELEASE_RECORD",
    entityId: record.id,
    projectId: data.projectId,
    summary: `Release recorded for ${data.versionLabel} (base=${data.baseVersionLabel ?? "n/a"}, readiness=${data.mergeReadiness})`,
    metadata: { versionLabel: data.versionLabel, mergeReadiness: data.mergeReadiness },
  });
  return record;
}

/**
 * VER-003 — Record an explicit approval/rejection decision on a release record.
 * Only an APPROVED decision with a named approver advances approvalStatus.
 */
export async function decideRelease(releaseId: string, input: unknown, actor = "SYSTEM") {
  const data = releaseRecordApproveSchema.parse(input);
  const record = await prisma.releaseRecord.update({
    where: { id: releaseId },
    data: {
      approvalStatus: data.decision,
      approvedBy: data.decision === "APPROVED" ? data.approvedBy : null,
      approvedAt: data.decision === "APPROVED" ? new Date() : null,
    },
  });
  await recordAudit({
    actor,
    action: "RELEASE_DECISION",
    entityType: "RELEASE_RECORD",
    entityId: record.id,
    projectId: record.projectId,
    summary: `Release ${record.versionLabel} ${data.decision} by ${data.approvedBy}`,
    metadata: { decision: data.decision, approvedBy: data.approvedBy },
  });
  return record;
}

export async function listReleases(projectId: string) {
  return prisma.releaseRecord.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRelease(releaseId: string) {
  return prisma.releaseRecord.findUnique({ where: { id: releaseId } });
}

/**
 * QLT-004 — Derive the readiness state from the technical/commercial verdicts
 * and open blocking checks. The transition rules (RELEASE_READINESS_MODEL.md)
 * are enforced centrally so no caller can silently collapse the distinction:
 *
 *   - any open blockingCheck            -> NOT_READY
 *   - technical=false                  -> NOT_READY
 *   - technical=true & commercial=false -> TECHNICALLY_READY
 *   - technical=true & commercial=true -> COMMERCIAL_REVIEW (owner gate)
 *   - explicit RELEASED (releasedVersion set) stays RELEASED
 */
export function deriveReadinessState(input: {
  technicalReady: boolean;
  commercialReady: boolean;
  blockingChecks: string[];
  releasedVersion?: string | null;
}): (typeof ReleaseReadinessState._output) {
  if (input.releasedVersion) return "RELEASED";
  if (input.blockingChecks.length > 0) return "NOT_READY";
  if (!input.technicalReady) return "NOT_READY";
  if (!input.commercialReady) return "TECHNICALLY_READY";
  return "COMMERCIAL_REVIEW";
}

/**
 * QLT-004 — Create (or replace) a project's release-readiness record based on a
 * fresh evaluation. The readiness state is ALWAYS derived, never taken verbatim
 * from caller input, so TECHNICALLY_READY can never masquerade as COMMERCIAL_READY.
 */
export async function evaluateReleaseReadiness(
  projectId: string,
  input: unknown,
  actor = "SYSTEM",
) {
  const data = releaseReadinessEvaluateSchema.parse(input);
  const state = deriveReadinessState({
    technicalReady: data.technicalReady,
    commercialReady: data.commercialReady,
    blockingChecks: data.blockingChecks,
    releasedVersion: data.releasedVersion,
  });
  const existing = await prisma.releaseReadiness.findUnique({ where: { projectId } });
  const record = existing
    ? await prisma.releaseReadiness.update({
        where: { projectId },
        data: {
          readinessState: state,
          technicalReady: data.technicalReady,
          commercialReady: data.commercialReady,
          technicalNotes: data.technicalNotes,
          commercialNotes: data.commercialNotes,
          blockingChecks: JSON.stringify(data.blockingChecks),
          lastEvaluatedAt: new Date(),
          releasedVersion: data.releasedVersion ?? null,
          releasedAt: state === "RELEASED" ? new Date() : null,
        },
      })
    : await prisma.releaseReadiness.create({
        data: {
          projectId,
          readinessState: state,
          technicalReady: data.technicalReady,
          commercialReady: data.commercialReady,
          technicalNotes: data.technicalNotes,
          commercialNotes: data.commercialNotes,
          blockingChecks: JSON.stringify(data.blockingChecks),
          lastEvaluatedAt: new Date(),
          releasedVersion: data.releasedVersion ?? null,
          releasedAt: state === "RELEASED" ? new Date() : null,
        },
      });
  await recordAudit({
    actor,
    action: "RELEASE_READINESS_EVALUATED",
    entityType: "RELEASE_READINESS",
    entityId: record.id,
    projectId,
    summary: `Release readiness for project ${projectId}: ${state} (technical=${data.technicalReady}, commercial=${data.commercialReady})`,
    metadata: { readinessState: state, technicalReady: data.technicalReady, commercialReady: data.commercialReady },
  });
  return record;
}

export async function getReleaseReadiness(projectId: string) {
  return prisma.releaseReadiness.findUnique({ where: { projectId } });
}

/**
 * QLT-004 — Explicit owner commercial-readiness sign-off. This is the human gate
 * that distinguishes COMMERCIAL_REVIEW from a released product; it can NEVER be
 * reached by a silent `commercialReady=true` flag. Rules:
 *
 *   - Requires an existing readiness record in COMMERCIAL_REVIEW (technical AND
 *     commercial already true, no blocking checks).
 *   - Requires `releasedVersion` to be set (you cannot sign off a release with no
 *     version identity).
 *   - Records the named approver + timestamp and flips commercialReady, deriving
 *     the state to RELEASED (or back to COMMERCIAL_REVIEW if the version is cleared).
 *   - Anything outside COMMERCIAL_REVIEW is rejected — TECHNICALLY_READY can never
 *     skip straight to RELEASED.
 */
export async function signOffCommercial(
  projectId: string,
  input: { approvedBy: string; releasedVersion: string; notes?: string },
  actor = "SYSTEM",
) {
  const current = await prisma.releaseReadiness.findUnique({ where: { projectId } });
  if (!current) {
    throw new Error("No release-readiness record exists; evaluate readiness before sign-off.");
  }
  if (current.readinessState !== "COMMERCIAL_REVIEW") {
    throw new Error(
      `Commercial sign-off requires state COMMERCIAL_REVIEW, current state=${current.readinessState}. ` +
        "TECHNICALLY_READY cannot skip to a released product.",
    );
  }
  const releasedVersion = input.releasedVersion.trim();
  if (!releasedVersion) {
    throw new Error("releasedVersion is required to sign off a commercial release.");
  }
  const record = await prisma.releaseReadiness.update({
    where: { projectId },
    data: {
      commercialReady: true,
      releasedVersion,
      releasedAt: new Date(),
      commercialNotes: input.notes ?? current.commercialNotes,
      readinessState: "RELEASED",
      lastEvaluatedAt: new Date(),
    },
  });
  await recordAudit({
    actor,
    action: "COMMERCIAL_SIGN_OFF",
    entityType: "RELEASE_READINESS",
    entityId: record.id,
    projectId,
    summary: `Commercial sign-off for ${releasedVersion} by ${input.approvedBy}`,
    metadata: { releasedVersion, approvedBy: input.approvedBy },
  });
  return record;
}
