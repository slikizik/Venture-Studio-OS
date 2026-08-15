// Zod validation layer — encodes the enums and field rules from
// 04-architecture/DATA_MODEL.md. Prisma/SQLite cannot enforce enums or
// cross-field rules, so every persisted mutation is validated here first.
import { z } from "zod";

// ---- Enums (kept in sync with DATA_MODEL.md) ----
export const ProjectStatus = z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]);
export const ProjectHealth = z.enum(["HEALTHY", "ATTENTION", "AT_RISK", "BLOCKED"]);
export const DeliverableStatus = z.enum([
  "PLANNED", "READY", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "APPROVED", "RELEASED", "ARCHIVED",
]);
export const WorkPacketStatus = z.enum([
  "DRAFT", "READY", "IN_PROGRESS", "SUBMITTED", "IN_REVIEW", "REVISION_REQUESTED", "APPROVED", "REJECTED", "CANCELLED",
]);
export const ReviewStatus = z.enum(["PENDING", "APPROVED", "REVISION_REQUESTED", "REJECTED", "SUPERSEDED"]);
export const RiskStatus = z.enum(["OPEN", "MITIGATING", "ACCEPTED", "CLOSED"]);
export const RiskImpact = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const RiskLikelihood = RiskImpact;
export const QueueStatus = z.enum([
  "NOT_STARTED", "READY", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "COMPLETE", "DEFERRED",
]);
export const StageStatus = z.enum(["NOT_STARTED", "ACTIVE", "BLOCKED", "COMPLETE", "SKIPPED"]);
export const Priority = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const BrainSection = z.enum([
  "VISION", "AUDIENCE", "PROBLEM", "OUTCOMES", "CONSTRAINTS", "NON_GOALS", "SUCCESS_METRICS", "TERMINOLOGY", "COMMERCIAL_MODEL", "REFERENCES",
]);
export const CriterionStatus = z.enum(["NOT_VERIFIED", "PASSED", "FAILED", "WAIVED"]);
export const VerificationMethod = z.enum([
  "AUTOMATED_TEST", "MANUAL_CHECK", "DOCUMENT_REVIEW", "OWNER_APPROVAL",
]);
export const EvidenceType = z.enum(["FILE", "LINK", "NOTE", "TEST_RESULT", "ARTIFACT"]);
export const AgentKind = z.enum(["HUMAN", "AI"]);
export const AutonomyLevel = z.enum(["MANUAL", "SUPERVISED", "BOUNDED_AUTONOMY"]);
export const AgentStatus = z.enum(["IDLE", "ACTIVE", "BLOCKED", "OFFLINE"]);
export const IntentStatus = z.enum(["DRAFT", "APPROVED", "SUPERSEDED"]);
export const BenchmarkStatus = z.enum(["DRAFT", "APPROVED", "NEEDS_REFRESH"]);
export const ProfileStatus = z.enum(["DRAFT", "APPROVED", "SUPERSEDED"]);
export const QualityLevel = z.enum([
  "BASIC", "COMPETITIVE", "COMMERCIAL", "COMMERCIAL_PLUS", "DIFFERENTIATOR",
]);
export const GateLevel = z.enum(["WORK_PACKET", "DELIVERABLE", "STAGE", "RELEASE"]);
export const GateOutcome = z.enum([
  "PASS", "PASS_WITH_ACCEPTED_RISK", "REVISION_REQUIRED", "BLOCKED",
]);
export const LearningSource = z.enum([
  "BUG", "FEEDBACK", "TEST_FAILURE", "BENCHMARK_GAP", "USABILITY", "COMMERCIAL_INSIGHT", "AGENT_FAILURE", "RETROSPECTIVE",
]);
export const LearningStatus = z.enum(["NEW", "ASSESSED", "CONVERTED", "DISMISSED"]);
export const AttentionEventType = z.enum([
  "OWNER_DECISION", "OWNER_REVIEW", "OWNER_CORRECTION", "UNNECESSARY_ESCALATION",
]);
export const VersionType = z.enum(["OFFICIAL", "DEVELOPMENT", "TEST", "RELEASED"]);

// ---- Common helpers ----
const _jsonString = z.string().refine(
  (s) => { try { JSON.parse(s); return true; } catch { return false; } },
  { message: "must be a JSON string" },
);

// ---- Project ----
export const projectCreateSchema = z.object({
  name: z.string().min(1).max(150),
  summary: z.string().max(500).optional().default(""),
  status: ProjectStatus.default("DRAFT"),
  health: ProjectHealth.default("HEALTHY"),
  templateId: z.string().min(1).max(80).optional().nullable(),
  templateVersion: z.string().optional().nullable(),
  ownerName: z.string().min(1).max(120),
  startedAt: z.coerce.date().optional().nullable(),
  targetDate: z.coerce.date().optional().nullable(),
  progressPercent: z.number().int().min(0).max(100).default(0),
}).superRefine((val, ctx) => {
  if (val.targetDate && val.startedAt && val.targetDate < val.startedAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "targetDate must not precede startedAt", path: ["targetDate"] });
  }
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;

// ---- Backup service input ----
export const backupRequestSchema = z.object({
  trigger: z.enum(["MIGRATION", "IMPORT", "MANUAL"]),
  reason: z.string().min(1).max(300),
  sourceDbPath: z.string().min(1),
  backupDir: z.string().min(1),
});

export type BackupRequest = z.infer<typeof backupRequestSchema>;

// ---- Deliverable ----
export const deliverableCreateSchema = z.object({
  projectId: z.string().min(1),
  parentId: z.string().min(1).optional().nullable(),
  stageId: z.string().min(1).optional().nullable(),
  title: z.string().min(1).max(180),
  description: z.string().optional().nullable(),
  type: z.string().min(1).max(80),
  status: DeliverableStatus.default("PLANNED"),
  priority: Priority.default("MEDIUM"),
  ownerAgentId: z.string().min(1).optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  order: z.number().int().min(0),
  weight: z.number().min(0).max(100).default(1),
});

export const deliverableUpdateSchema = z.object({
  title: z.string().min(1).max(180).optional(),
  description: z.string().optional().nullable(),
  parentId: z.string().min(1).optional().nullable(),
  stageId: z.string().min(1).optional().nullable(),
  type: z.string().min(1).max(80).optional(),
  status: DeliverableStatus.optional(),
  priority: Priority.optional(),
  ownerAgentId: z.string().min(1).optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  order: z.number().int().min(0).optional(),
  weight: z.number().min(0).max(100).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: "no fields to update" });

export const dependencyCreateSchema = z.object({
  deliverableId: z.string().min(1),
  dependsOnDeliverableId: z.string().min(1),
}).superRefine((val, ctx) => {
  if (val.deliverableId === val.dependsOnDeliverableId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "a deliverable cannot depend on itself", path: ["dependsOnDeliverableId"] });
  }
});

export const criteriaCreateSchema = z.object({
  projectId: z.string().min(1),
  deliverableId: z.string().min(1).optional().nullable(),
  workPacketId: z.string().min(1).optional().nullable(),
  statement: z.string().min(1).max(500),
  status: CriterionStatus.default("NOT_VERIFIED"),
  verificationMethod: VerificationMethod.default("MANUAL_CHECK"),
  evidenceRequired: z.boolean().default(true),
}).superRefine((val, ctx) => {
  if (!val.deliverableId && !val.workPacketId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "exactly one of deliverableId/workPacketId required", path: ["deliverableId"] });
  }
});

export const criteriaUpdateSchema = z.object({
  statement: z.string().min(1).max(500).optional(),
  status: CriterionStatus.optional(),
  verificationMethod: VerificationMethod.optional(),
  evidenceRequired: z.boolean().optional(),
});

// ---- Version record (GOV-003 / VER-001 / VER-002) ----
export const versionCreateSchema = z.object({
  projectId: z.string().min(1),
  versionLabel: z.string().min(1).max(80),
  versionType: VersionType,
  sourceReference: z.string().optional().nullable(),
  changeSummary: z.string().optional().nullable(),
  status: z.string().min(1).default("DRAFT"),
  createdBy: z.string().min(1),
  approvedAt: z.coerce.date().optional().nullable(),
  releasedAt: z.coerce.date().optional().nullable(),
});

export type DeliverableCreateInput = z.infer<typeof deliverableCreateSchema>;
export type DeliverableUpdateInput = z.infer<typeof deliverableUpdateSchema>;
export type DependencyCreateInput = z.infer<typeof dependencyCreateSchema>;
export type CriteriaCreateInput = z.infer<typeof criteriaCreateSchema>;
export type CriteriaUpdateInput = z.infer<typeof criteriaUpdateSchema>;
export type VersionCreateInput = z.infer<typeof versionCreateSchema>;

// ---- Phase 04: Work packets, attachments, agents activity, requirements, queue ----

// WPK-001/002/003
export const workPacketCreateSchema = z.object({
  projectId: z.string().min(1),
  deliverableId: z.string().min(1).optional().nullable(),
  title: z.string().min(1).max(180),
  objective: z.string().min(1),
  scope: z.string().min(1),
  exclusions: z.string().min(1),
  inputs: z.array(z.string().min(1).max(300)).default([]),
  expectedOutputs: z.array(z.string().min(1).max(300)).min(1),
  status: WorkPacketStatus.default("DRAFT"),
  assigneeAgentId: z.string().min(1).optional().nullable(),
  priority: Priority.default("MEDIUM"),
  dueDate: z.coerce.date().optional().nullable(),
  versionNumber: z.number().int().min(1).default(1),
});
export type WorkPacketCreateInput = z.infer<typeof workPacketCreateSchema>;

export const workPacketUpdateSchema = z.object({
  title: z.string().min(1).max(180).optional(),
  objective: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  exclusions: z.string().min(1).optional(),
  inputs: z.array(z.string().min(1).max(300)).optional(),
  expectedOutputs: z.array(z.string().min(1).max(300)).min(1).optional(),
  status: WorkPacketStatus.optional(),
  assigneeAgentId: z.string().min(1).optional().nullable(),
  priority: Priority.optional(),
  dueDate: z.coerce.date().optional().nullable(),
});
export type WorkPacketUpdateInput = z.infer<typeof workPacketUpdateSchema>;

export const workPacketSubmitSchema = z.object({
  actor: z.string().min(1).max(120).default("SYSTEM"),
  summary: z.string().min(1).max(2000).optional(),
});
export type WorkPacketSubmitInput = z.infer<typeof workPacketSubmitSchema>;

export const workPacketApproveSchema = z.object({
  actor: z.string().min(1).max(120).default("SYSTEM"),
});

// ATT-001/002
export const attachmentCreateSchema = z.object({
  projectId: z.string().min(1),
  workPacketId: z.string().min(1).optional().nullable(),
  evidenceId: z.string().min(1).optional().nullable(),
  type: EvidenceType,
  title: z.string().min(1).max(150),
  fileName: z.string().max(255).optional().nullable(),
  originalName: z.string().max(255).optional().nullable(),
  location: z.string().max(1000).optional().nullable(),
  checksum: z.string().max(128).optional().nullable(),
  sizeBytes: z.number().int().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type AttachmentCreateInput = z.infer<typeof attachmentCreateSchema>;

// AGT-003
export const agentActivityCreateSchema = z.object({
  projectId: z.string().min(1).optional().nullable(),
  agentId: z.string().min(1).optional().nullable(),
  agentName: z.string().min(1).max(120),
  action: z.string().min(1).max(120),
  entityType: z.string().max(40).optional().nullable(),
  entityId: z.string().min(1).optional().nullable(),
  outcome: z.enum(["SUCCESS", "FAILURE", "BLOCKED", "PARTIAL"]),
  summary: z.string().min(1).max(1000),
  startedAt: z.coerce.date().optional().nullable(),
  endedAt: z.coerce.date().optional().nullable(),
  durationMs: z.number().int().min(0).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type AgentActivityCreateInput = z.infer<typeof agentActivityCreateSchema>;

// DSG-002
export const requirementCreateSchema = z.object({
  projectId: z.string().min(1).optional().nullable(),
  code: z.string().min(1).max(40),
  title: z.string().min(1).max(180),
  description: z.string().min(1),
  phase: z.number().int().min(0).max(12).optional().nullable(),
  status: z.string().min(1).default("ACTIVE"),
});
export type RequirementCreateInput = z.infer<typeof requirementCreateSchema>;

export const requirementLinkCreateSchema = z.object({
  requirementId: z.string().min(1),
  projectId: z.string().min(1).optional().nullable(),
  targetType: z.enum(["DELIVERABLE", "WORK_PACKET", "PROJECT"]).default("DELIVERABLE"),
  deliverableId: z.string().min(1).optional().nullable(),
  workPacketId: z.string().min(1).optional().nullable(),
  isExclusion: z.boolean().optional().default(false),
  dependencyDetail: z.string().optional().nullable(),
  exclusions: z.string().optional().nullable(),
  expectedEvidence: z.string().optional().nullable(),
  evidenceExpectation: z.string().optional().nullable(),
}).transform((d) => ({ ...d, evidenceExpectation: d.evidenceExpectation ?? d.expectedEvidence ?? null }));
export type RequirementLinkCreateInput = z.infer<typeof requirementLinkCreateSchema>;

export const requirementLinkUpdateSchema = z.object({
  targetType: z.enum(["DELIVERABLE", "WORK_PACKET", "PROJECT"]).optional(),
  deliverableId: z.string().min(1).optional().nullable(),
  workPacketId: z.string().min(1).optional().nullable(),
  isExclusion: z.boolean().optional(),
  dependencyDetail: z.string().optional().nullable(),
  exclusions: z.string().optional().nullable(),
  expectedEvidence: z.string().optional().nullable(),
  evidenceExpectation: z.string().optional().nullable(),
}).transform((d) => ({ ...d, evidenceExpectation: d.evidenceExpectation ?? d.expectedEvidence ?? undefined }));
export type RequirementLinkUpdateInput = z.infer<typeof requirementLinkUpdateSchema>;

// AGT-002 queue
export const queueItemCreateSchema = z.object({
  workPacketId: z.string().min(1),
  order: z.number().int().min(0).default(0),
  queueStatus: QueueStatus.default("READY"),
  dependsOnId: z.string().min(1).optional().nullable(),
  evidenceNote: z.string().optional().nullable(),
});
export type QueueItemCreateInput = z.infer<typeof queueItemCreateSchema>;

export const queueItemUpdateSchema = z.object({
  order: z.number().int().min(0).optional(),
  queueStatus: QueueStatus.optional(),
  dependsOnId: z.string().min(1).optional().nullable(),
  blockedReason: z.string().optional().nullable(),
  evidenceNote: z.string().optional().nullable(),
});
export type QueueItemUpdateInput = z.infer<typeof queueItemUpdateSchema>;

// ---- Phase 05: Reviews, decisions, risks, direction, exceptions, learning, quality gates ----

export const ReviewStatusEnum = z.enum(["PENDING", "APPROVED", "REVISION_REQUESTED", "REJECTED", "SUPERSEDED"]);
export const ReviewDecision = z.enum(["APPROVED", "REVISION_REQUESTED", "REJECTED"]);
export const DirectionRequestStatus = z.enum(["OPEN", "ANSWERED", "SUPERSEDED"]);
export const IssueSeverity = z.enum(["RECOVERABLE", "ASSUMPTION", "DIRECTION_REQUIRED", "CRITICAL"]);
export const IssueClassification = IssueSeverity;
export const IssueStatus = z.enum(["OPEN", "MITIGATING", "ACCEPTED", "RESOLVED", "CLOSED"]);
export const LearningConversionTarget = z.enum(["BACKLOG", "REQUIREMENT", "CHANGE_REQUEST"]);

// REV-001/002/003 — criterion-based review records
export const reviewCreateSchema = z.object({
  workPacketId: z.string().min(1),
  reviewerName: z.string().min(1).max(120),
  summary: z.string().max(2000).optional().nullable(),
  submittedVersion: z.number().int().min(1),
  status: ReviewStatusEnum.default("PENDING"),
  criteria: z.array(z.object({
    criterionId: z.string().min(1).optional().nullable(),
    result: z.enum(["PASS", "FAIL", "WAIVED"]),
    note: z.string().max(1000).optional().nullable(),
  })).default([]),
});
export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;

export const reviewDecisionSchema = z.object({
  decision: ReviewDecision,
  decidedBy: z.string().min(1).max(120).default("OWNER"),
  note: z.string().max(2000).optional().nullable(),
});
export type ReviewDecisionInput = z.infer<typeof reviewDecisionSchema>;

export const reviewCommentSchema = z.object({
  authorName: z.string().min(1).max(120),
  body: z.string().min(1).max(2000),
  criterionId: z.string().min(1).optional().nullable(),
});
export type ReviewCommentInput = z.infer<typeof reviewCommentSchema>;

// GOV-001 — immutable decision records
export const decisionCreateSchema = z.object({
  projectId: z.string().min(1).optional().nullable(),
  decisionId: z.string().min(1).max(80),
  title: z.string().min(1).max(180),
  context: z.string().min(1),
  options: z.array(z.object({ id: z.string().min(1), label: z.string().min(1) })).min(1),
  selectedOption: z.string().min(1),
  rationale: z.string().min(1),
  affectedRequirementIds: z.array(z.string().min(1)).default([]),
  decidedBy: z.string().min(1).max(120),
}).superRefine((val, ctx) => {
  if (!val.options.some((o) => o.id === val.selectedOption)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "selectedOption must be one of options", path: ["selectedOption"] });
  }
});
export type DecisionCreateInput = z.infer<typeof decisionCreateSchema>;

// GOV-002 — risk register
export const riskCreateSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(180),
  description: z.string().optional().nullable(),
  impact: RiskImpact,
  likelihood: RiskLikelihood,
  status: RiskStatus.default("OPEN"),
  mitigation: z.string().optional().nullable(),
  ownerAgentId: z.string().min(1).optional().nullable(),
  targetDate: z.coerce.date().optional().nullable(),
  reviewDate: z.coerce.date().optional().nullable(),
});
export type RiskCreateInput = z.infer<typeof riskCreateSchema>;

export const riskUpdateSchema = z.object({
  title: z.string().min(1).max(180).optional(),
  description: z.string().optional().nullable(),
  impact: RiskImpact.optional(),
  likelihood: RiskLikelihood.optional(),
  status: RiskStatus.optional(),
  mitigation: z.string().optional().nullable(),
  ownerAgentId: z.string().min(1).optional().nullable(),
  targetDate: z.coerce.date().optional().nullable(),
  reviewDate: z.coerce.date().optional().nullable(),
}).refine((v) => Object.keys(v).length > 0, { message: "no fields to update" });
export type RiskUpdateInput = z.infer<typeof riskUpdateSchema>;

// EXC-001 — classify issues/exceptions
export const exceptionCreateSchema = z.object({
  projectId: z.string().min(1),
  classification: IssueClassification.default("RECOVERABLE"),
  title: z.string().min(1).max(180),
  detail: z.string().optional().nullable(),
  status: IssueStatus.default("OPEN"),
});
export type ExceptionCreateInput = z.infer<typeof exceptionCreateSchema>;

export const exceptionResolveSchema = z.object({
  status: z.enum(["RESOLVED", "CLOSED", "ACCEPTED", "MITIGATING"]),
  resolvedBy: z.string().min(1).max(120).default("SYSTEM"),
});
export type ExceptionResolveInput = z.infer<typeof exceptionResolveSchema>;

// EXC-002 — formal direction requests
export const directionRequestCreateSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(180),
  question: z.string().min(1),
  context: z.string().optional().nullable(),
  options: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), recommended: z.boolean().optional() })).default([]),
  severity: IssueSeverity.default("DIRECTION_REQUIRED"),
});
export type DirectionRequestCreateInput = z.infer<typeof directionRequestCreateSchema>;

// EXC-004 — record owner decision on a direction request (cannot be bypassed)
export const directionRequestResolveSchema = z.object({
  resolution: z.string().min(1),
  decidedBy: z.string().min(1).max(120).default("OWNER"),
});
export type DirectionRequestResolveInput = z.infer<typeof directionRequestResolveSchema>;

// LRN-001/002 — learning records + conversion
export const learningCreateSchema = z.object({
  projectId: z.string().min(1),
  sourceType: LearningSource,
  summary: z.string().min(1).max(2000),
  evidenceIds: z.array(z.string().min(1)).default([]),
  impact: z.string().max(2000).optional().nullable(),
  status: LearningStatus.default("NEW"),
});
export type LearningCreateInput = z.infer<typeof learningCreateSchema>;

export const learningConvertSchema = z.object({
  target: LearningConversionTarget,
  reference: z.string().min(1).max(200),
  note: z.string().max(2000).optional().nullable(),
});
export type LearningConvertInput = z.infer<typeof learningConvertSchema>;

// QLT-002 — quality gate evaluation using retained evidence
export const qualityGateCreateSchema = z.object({
  projectId: z.string().min(1),
  level: GateLevel,
  entityId: z.string().min(1),
  outcome: GateOutcome,
  criterionResults: z.array(z.object({
    criterion: z.string().min(1),
    passed: z.boolean(),
    evidenceId: z.string().min(1).optional().nullable(),
    note: z.string().max(1000).optional().nullable(),
  })).default([]),
  evidenceIds: z.array(z.string().min(1)).default([]),
  riskDecisionId: z.string().min(1).optional().nullable(),
  evaluatedBy: z.string().min(1).max(120).default("SYSTEM"),
});
export type QualityGateCreateInput = z.infer<typeof qualityGateCreateSchema>;

