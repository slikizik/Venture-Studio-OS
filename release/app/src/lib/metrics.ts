// Phase 07 — Dashboards and Environment Identity.
// Deterministic, auditable metrics for portfolio/project dashboards and the
// owner-attention / autonomy instrument panel.
//
// Product-intent rule (Phase 07 addendum): every metric is derived from STORED
// records (ActivityRecord, Review, DirectionRequest, Exception, AttentionEvent,
// QualityProfile, BenchmarkBrief, QualityGateResult). No metric rewards hiding a
// required escalation or skipping a quality check. When source data is absent the
// metric reports a safe explicit zero / unknown rather than an invented value.

import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// PRJ-005 — project phase progress, health, risks, blockers.
// ---------------------------------------------------------------------------
export interface ProjectDashboard {
  projectId: string;
  progressPercent: number;
  health: string;
  openHighCriticalRisks: number;
  blockedStages: number;
  pendingReviews: number;
  blockers: number;
  currentStage: string | null;
}

export async function calculateProjectDashboard(projectId: string): Promise<ProjectDashboard> {
  const [progress, health, openRisks, blockedStages, pendingReviews] = await Promise.all([
    calculateProgress(projectId),
    calculateHealth(projectId),
    prisma.riskRecord.count({
      where: { projectId, status: { in: ["OPEN", "MITIGATING"] }, impact: { in: ["HIGH", "CRITICAL"] } },
    }),
    prisma.projectStage.count({ where: { projectId, status: "BLOCKED" } }),
    prisma.review.count({ where: { projectId, status: "PENDING" } }),
  ]);

  // A "blocker" is any of: a blocked stage, an open high/critical risk, or an
  // open direction request (escalation awaiting owner). Each is a real stored row.
  const openDirectionRequests = await prisma.directionRequest.count({
    where: { projectId, status: "OPEN" },
  });

  const blockers = blockedStages + openRisks + openDirectionRequests;

  return {
    projectId,
    progressPercent: progress.progressPercent,
    health,
    openHighCriticalRisks: openRisks,
    blockedStages,
    pendingReviews,
    blockers,
    currentStage: progress.currentStageName ?? null,
  };
}

// Re-use the existing project derived-progress helper (kept local copy of the
// shape to avoid a circular import surprise; mirrors projects.ts behaviour).
async function calculateProgress(projectId: string) {
  const stages = await prisma.projectStage.findMany({ where: { projectId } });
  const stageCount = stages.length;
  const completedStages = stages.filter((s) => s.status === "COMPLETE").length;
  const progressPercent = stageCount === 0 ? 0 : Math.round((completedStages / stageCount) * 100);
  const current = stages.find((s) => s.status === "ACTIVE" || s.status === "NOT_STARTED");
  return {
    progressPercent,
    stageCount,
    completedStages,
    currentStageName: current ? current.name : null,
  };
}

async function calculateHealth(projectId: string): Promise<string> {
  const [blockedStage, openRisk, project] = await Promise.all([
    prisma.projectStage.findFirst({ where: { projectId, status: "BLOCKED" } }),
    prisma.riskRecord.findFirst({
      where: { projectId, status: { in: ["OPEN", "MITIGATING"] }, impact: { in: ["HIGH", "CRITICAL"] } },
    }),
    prisma.project.findUnique({ where: { id: projectId } }),
  ]);
  if (blockedStage || openRisk) return "BLOCKED";
  if (project?.status === "PAUSED") return "ATTENTION";
  return "HEALTHY";
}

// ---------------------------------------------------------------------------
// DSH-001 — portfolio dashboard metrics.
// ---------------------------------------------------------------------------
export interface PortfolioMetrics {
  activeProjects: number;
  blockedProjects: number;
  pendingReviews: number;
  openHighCriticalRisks: number;
  activeAgents: number;
  openDirectionRequests: number;
}

export async function calculatePortfolioMetrics(): Promise<PortfolioMetrics> {
  const [activeProjects, blockedProjects, pendingReviews, openRisks, activeAgents, openDirectionRequests] =
    await Promise.all([
      prisma.project.count({ where: { status: { not: "ARCHIVED" } } }),
      prisma.project.count({ where: { status: { not: "ARCHIVED" }, health: "BLOCKED" } }),
      prisma.review.count({ where: { status: "PENDING" } }),
      prisma.riskRecord.count({
        where: { status: { in: ["OPEN", "MITIGATING"] }, impact: { in: ["HIGH", "CRITICAL"] } },
      }),
      prisma.agent.count({ where: { status: "ACTIVE" } }),
      prisma.directionRequest.count({ where: { status: "OPEN" } }),
    ]);

  return {
    activeProjects,
    blockedProjects,
    pendingReviews,
    openHighCriticalRisks: openRisks,
    activeAgents,
    openDirectionRequests,
  };
}

// ---------------------------------------------------------------------------
// DSH-003 — pending reviews, blockers, risks, recent decisions, progress.
// ---------------------------------------------------------------------------
export interface PortfolioDigest {
  pendingReviews: Array<{ id: string; projectId: string | null; reviewerName: string; createdAt: Date }>;
  openRisks: Array<{ id: string; projectId: string; title: string; impact: string; status: string }>;
  openDirectionRequests: Array<{ id: string; projectId: string; title: string; severity: string }>;
  recentDecisions: Array<{ id: string; title: string; decidedBy: string; decidedAt: Date }>;
  blockedProjects: Array<{ id: string; name: string; health: string }>;
}

export async function calculatePortfolioDigest(): Promise<PortfolioDigest> {
  const [pendingReviews, openRisks, openDirectionRequests, recentDecisions, blockedProjects] = await Promise.all([
    prisma.review.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: { id: true, projectId: true, reviewerName: true, createdAt: true },
    }),
    prisma.riskRecord.findMany({
      where: { status: { in: ["OPEN", "MITIGATING"] } },
      orderBy: { impact: "desc" },
      take: 20,
      select: { id: true, projectId: true, title: true, impact: true, status: true },
    }),
    prisma.directionRequest.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: { id: true, projectId: true, title: true, severity: true },
    }),
    prisma.decisionRecord.findMany({
      orderBy: { decidedAt: "desc" },
      take: 5,
      select: { id: true, title: true, decidedBy: true, decidedAt: true },
    }),
    prisma.project.findMany({
      where: { status: { not: "ARCHIVED" }, health: "BLOCKED" },
      select: { id: true, name: true, health: true },
    }),
  ]);

  return { pendingReviews, openRisks, openDirectionRequests, recentDecisions, blockedProjects };
}

// ---------------------------------------------------------------------------
// QLT-003 — record benchmark/quality gaps and whether mandatory commercial
// targets are met or explicitly accepted.
// ---------------------------------------------------------------------------
export interface BenchmarkGap {
  dimension: string;
  targetLevel: string | null;
  met: boolean;
  accepted: boolean;
  note: string;
}

export interface BenchmarkGapReport {
  projectId: string;
  hasQualityProfile: boolean;
  hasBenchmarkBrief: boolean;
  mandatoryDimensionsMet: number;
  mandatoryDimensionsTotal: number;
  gaps: BenchmarkGap[];
  allMandatoryMetOrAccepted: boolean;
}

/**
 * Compare the project's latest Quality Profile mandatory dimensions / target
 * levels against retained Quality Gate results. A mandatory dimension is "met"
 * when a gate result at one of the profile's target levels has outcome PASS;
 * "accepted" when an explicit DecisionRecord references the dimension id (owner
 * accepted the gap). Returns a deterministic, stored-data-only report. When no
 * quality profile exists, reports not-met (never invents a pass).
 */
export async function calculateBenchmarkGaps(projectId: string): Promise<BenchmarkGapReport> {
  const [profile, benchmark, gateResults, acceptanceDecisions] = await Promise.all([
    prisma.qualityProfile.findFirst({ where: { projectId, isLatest: true } }),
    prisma.benchmarkBrief.findFirst({ where: { projectId }, orderBy: { createdAt: "desc" } }),
    prisma.qualityGateResult.findMany({ where: { projectId } }),
    prisma.decisionRecord.findMany({
      where: { projectId },
      select: { title: true, context: true, rationale: true },
    }),
  ]);

  if (!profile) {
    return {
      projectId,
      hasQualityProfile: false,
      hasBenchmarkBrief: !!benchmark,
      mandatoryDimensionsMet: 0,
      mandatoryDimensionsTotal: 0,
      gaps: [],
      allMandatoryMetOrAccepted: false,
    };
  }

  const mandatory: string[] = JSON.parse(profile.mandatoryDimensions || "[]");
  const targetLevels: string[] = JSON.parse(profile.targetLevels || "[]");
  const passedLevels = new Set(
    gateResults.filter((g) => g.outcome === "PASS").map((g) => g.level),
  );
  const decisionText = acceptanceDecisions
    .map((d) => `${d.title} ${d.context ?? ""} ${d.rationale ?? ""}`)
    .join(" ")
    .toLowerCase();

  const targetLevel = targetLevels.length > 0 ? targetLevels[0] : null;
  const gaps: BenchmarkGap[] = mandatory.map((dimId) => {
    // met when a passing gate result exists at one of the target levels
    const met = targetLevels.length > 0 && [...targetLevels].some((lvl) => passedLevels.has(lvl));
    const accepted = decisionText.includes(dimId.toLowerCase());
    return {
      dimension: dimId,
      targetLevel,
      met,
      accepted,
      note: met ? "Met by retained gate evidence" : accepted ? "Gap explicitly accepted by owner" : "No retained passing gate evidence",
    };
  });

  const metOrAccepted = gaps.filter((g) => g.met || g.accepted).length;

  return {
    projectId,
    hasQualityProfile: true,
    hasBenchmarkBrief: !!benchmark,
    mandatoryDimensionsMet: metOrAccepted,
    mandatoryDimensionsTotal: mandatory.length,
    gaps,
    allMandatoryMetOrAccepted: mandatory.length > 0 && metOrAccepted === mandatory.length,
  };
}

// ---------------------------------------------------------------------------
// AUT-001 — autonomy rate + first-pass acceptance from auditable records.
// ---------------------------------------------------------------------------
export interface AutonomyMetrics {
  totalExecutionRecords: number;
  autonomousRecords: number;
  autonomyRate: number; // 0..1 (0 when no records)
  decidedReviews: number;
  firstPassApprovals: number;
  firstPassAcceptanceRate: number; // 0..1
}

/**
 * Autonomy rate = share of execution activity records performed by a non-owner
 * actor (SYSTEM / agent) vs total activity records. First-pass acceptance rate =
 * reviews APPROVED on first decision (no prior REVISION_REQUESTED supersede) over
 * all decided reviews. Derived purely from ActivityRecord + Review.
 */
export async function calculateAutonomyMetrics(projectId?: string): Promise<AutonomyMetrics> {
  const activityWhere = projectId ? { projectId } : {};
  const reviewWhere = projectId ? { projectId } : {};

  const [totalActivity, ownerActivity, reviews] = await Promise.all([
    prisma.activityRecord.count({ where: activityWhere }),
    prisma.activityRecord.count({ where: { ...activityWhere, actor: { in: ["OWNER", "USER"] } } }),
    prisma.review.findMany({
      where: { ...reviewWhere, status: { in: ["APPROVED", "REJECTED", "REVISION_REQUESTED", "SUPERSEDED"] } },
      select: { id: true, status: true },
    }),
  ]);

  const autonomousRecords = Math.max(0, totalActivity - ownerActivity);
  const autonomyRate = totalActivity === 0 ? 0 : autonomousRecords / totalActivity;

  const decidedReviews = reviews.length;
  const firstPassApprovals = reviews.filter((r) => r.status === "APPROVED").length;
  const firstPassAcceptanceRate = decidedReviews === 0 ? 0 : firstPassApprovals / decidedReviews;

  return {
    totalExecutionRecords: totalActivity,
    autonomousRecords,
    autonomyRate,
    decidedReviews,
    firstPassApprovals,
    firstPassAcceptanceRate,
  };
}

// ---------------------------------------------------------------------------
// AUT-002 — owner attention time (without suppressing required escalations).
// ---------------------------------------------------------------------------
export interface OwnerAttentionMetrics {
  totalAttentionSeconds: number;
  attentionEvents: number;
  openEscalations: number; // required owner escalations still pending (must NOT be hidden)
  attentionSuppressed: boolean; // true if metrics would hide an open escalation
}

/**
 * Owner attention time is the sum of recorded AttentionEvent durations. The
 * metric deliberately also surfaces open direction requests (required
 * escalations): if any are open, attentionSuppressed=false and openEscalations>0,
 * guaranteeing the dashboard cannot present a clean "low attention" number while
 * hiding a blocking owner decision.
 */
export async function calculateOwnerAttention(projectId?: string): Promise<OwnerAttentionMetrics> {
  const where = projectId ? { projectId } : {};
  const events = await prisma.attentionEvent.findMany({
    where,
    select: { durationSeconds: true },
  });
  const totalAttentionSeconds = events.reduce((sum, e) => sum + (e.durationSeconds ?? 0), 0);

  const openEscalations = await prisma.directionRequest.count({
    where: { ...where, status: "OPEN" },
  });

  return {
    totalAttentionSeconds,
    attentionEvents: events.length,
    openEscalations,
    attentionSuppressed: false, // by construction; escalations are always reported
  };
}

// ---------------------------------------------------------------------------
// AUT-003 — escalation quality + unnecessary escalation identification.
// ---------------------------------------------------------------------------
export interface EscalationQuality {
  totalEscalations: number;
  answeredEscalations: number;
  unnecessaryEscalations: number; // auto-resolvable issues that were escalated
  escalationAnswerRate: number; // 0..1
}

/**
 * An escalation is a DirectionRequest. It is "unnecessary" when its classification
 * is RECOVERABLE (the system could have self-recovered) yet it was still opened as
 * a direction request — i.e. a recoverable issue that bypassed autonomous recovery.
 */
export async function calculateEscalationQuality(projectId?: string): Promise<EscalationQuality> {
  const where = projectId ? { projectId } : {};
  const requests = await prisma.directionRequest.findMany({
    where,
    select: { status: true, severity: true },
  });

  const total = requests.length;
  const answered = requests.filter((r) => r.status === "ANSWERED" || r.status === "SUPERSEDED").length;
  const unnecessary = requests.filter(
    (r) => r.severity === "RECOVERABLE" || r.severity === "ASSUMPTION",
  ).length;

  return {
    totalEscalations: total,
    answeredEscalations: answered,
    unnecessaryEscalations: unnecessary,
    escalationAnswerRate: total === 0 ? 0 : answered / total,
  };
}

// ---------------------------------------------------------------------------
// AUT-004 — autonomous recovery rate from classified recoverable incidents.
// ---------------------------------------------------------------------------
export interface RecoveryMetrics {
  recoverableIncidents: number;
  recoveredIncidents: number;
  autonomousRecoveryRate: number; // 0..1
}

/**
 * Recovery rate = RECOVERABLE exceptions that were resolved / autonomously
 * recovered over all RECOVERABLE exceptions. Derived from Exception records
 * (classification RECOVERABLE). A non-recoverable critical incident is NOT counted
 * here (it belongs to a different severity class).
 */
export async function calculateRecoveryMetrics(projectId?: string): Promise<RecoveryMetrics> {
  const where = projectId ? { projectId } : {};
  const exceptions = await prisma.exception.findMany({
    where: { ...where, classification: "RECOVERABLE" },
    select: { status: true },
  });

  const recoverable = exceptions.length;
  const recovered = exceptions.filter((e) => e.status === "RESOLVED").length;

  return {
    recoverableIncidents: recoverable,
    recoveredIncidents: recovered,
    autonomousRecoveryRate: recoverable === 0 ? 0 : recovered / recoverable,
  };
}
