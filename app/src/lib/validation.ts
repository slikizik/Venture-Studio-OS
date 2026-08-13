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
  templateId: z.string().uuid().optional().nullable(),
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
