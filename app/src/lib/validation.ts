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
