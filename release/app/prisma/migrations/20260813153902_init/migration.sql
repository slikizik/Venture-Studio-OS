-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "health" TEXT NOT NULL DEFAULT 'HEALTHY',
    "templateId" TEXT,
    "templateVersion" TEXT,
    "currentStageId" TEXT,
    "ownerName" TEXT NOT NULL,
    "startedAt" DATETIME,
    "targetDate" DATETIME,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" DATETIME,
    "preArchiveStatus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProjectBrainEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectBrainEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectStage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "templateStageId" TEXT,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "entryCriteria" TEXT NOT NULL DEFAULT '[]',
    "exitCriteria" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectStage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Deliverable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "stageId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "ownerAgentId" TEXT,
    "dueDate" DATETIME,
    "order" INTEGER NOT NULL,
    "weight" REAL NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Deliverable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Deliverable_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Deliverable" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliverableDependency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deliverableId" TEXT NOT NULL,
    "dependsOnDeliverableId" TEXT NOT NULL,
    CONSTRAINT "DeliverableDependency_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "Deliverable" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DeliverableDependency_dependsOnDeliverableId_fkey" FOREIGN KEY ("dependsOnDeliverableId") REFERENCES "Deliverable" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AcceptanceCriterion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "deliverableId" TEXT,
    "workPacketId" TEXT,
    "statement" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_VERIFIED',
    "verificationMethod" TEXT NOT NULL DEFAULT 'MANUAL_CHECK',
    "evidenceRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AcceptanceCriterion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AcceptanceCriterion_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "Deliverable" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AcceptanceCriterion_workPacketId_fkey" FOREIGN KEY ("workPacketId") REFERENCES "WorkPacket" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkPacket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "deliverableId" TEXT,
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "exclusions" TEXT NOT NULL,
    "inputs" TEXT NOT NULL DEFAULT '[]',
    "expectedOutputs" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "assigneeAgentId" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "dueDate" DATETIME,
    "submittedAt" DATETIME,
    "approvedAt" DATETIME,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkPacket_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkPacket_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "Deliverable" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "workPacketId" TEXT,
    "acceptanceCriterionId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "checksum" TEXT,
    "immutableAfterApproval" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Evidence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Evidence_workPacketId_fkey" FOREIGN KEY ("workPacketId") REFERENCES "WorkPacket" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Evidence_acceptanceCriterionId_fkey" FOREIGN KEY ("acceptanceCriterionId") REFERENCES "AcceptanceCriterion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workPacketId" TEXT NOT NULL,
    "reviewerName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "summary" TEXT,
    "submittedVersion" INTEGER NOT NULL,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "projectId" TEXT,
    CONSTRAINT "Review_workPacketId_fkey" FOREIGN KEY ("workPacketId") REFERENCES "WorkPacket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reviewId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "criterionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewComment_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DecisionRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "decisionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "selectedOption" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "affectedRequirementIds" TEXT NOT NULL DEFAULT '[]',
    "decidedBy" TEXT NOT NULL,
    "decidedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DecisionRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RiskRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "likelihood" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "mitigation" TEXT,
    "ownerAgentId" TEXT,
    "targetDate" DATETIME,
    "reviewDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RiskRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VersionRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "versionType" TEXT NOT NULL,
    "sourceReference" TEXT,
    "changeSummary" TEXT,
    "status" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "approvedAt" DATETIME,
    "releasedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VersionRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "capabilities" TEXT NOT NULL DEFAULT '[]',
    "autonomyLevel" TEXT NOT NULL DEFAULT 'MANUAL',
    "status" TEXT NOT NULL DEFAULT 'IDLE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ActivityRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "projectId" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectIntent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "problem" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "desiredOutcome" TEXT NOT NULL,
    "constraints" TEXT NOT NULL,
    "nonGoals" TEXT NOT NULL,
    "successMeasures" TEXT NOT NULL DEFAULT '[]',
    "ownerPriorities" TEXT NOT NULL DEFAULT '[]',
    "commercialTarget" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approvedAt" DATETIME,
    "supersededById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectIntent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BenchmarkBrief" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "references" TEXT NOT NULL DEFAULT '[]',
    "dimensions" TEXT NOT NULL DEFAULT '[]',
    "marketBaseline" TEXT,
    "targetSummary" TEXT,
    "differentiators" TEXT NOT NULL DEFAULT '[]',
    "intentionalOmissions" TEXT NOT NULL DEFAULT '[]',
    "evidenceDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BenchmarkBrief_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QualityProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dimensions" TEXT NOT NULL DEFAULT '[]',
    "mandatoryDimensions" TEXT NOT NULL DEFAULT '[]',
    "targetLevels" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QualityProfile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QualityGateResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "criterionResults" TEXT NOT NULL DEFAULT '[]',
    "evidenceIds" TEXT NOT NULL DEFAULT '[]',
    "riskDecisionId" TEXT,
    "evaluatedBy" TEXT NOT NULL,
    "evaluatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QualityGateResult_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LearningRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "evidenceIds" TEXT NOT NULL DEFAULT '[]',
    "impact" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "convertedReference" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LearningRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AttentionEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "durationSeconds" INTEGER,
    "relatedEntityId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttentionEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_archivedAt_idx" ON "Project"("archivedAt");

-- CreateIndex
CREATE INDEX "ProjectBrainEntry_projectId_idx" ON "ProjectBrainEntry"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectBrainEntry_projectId_section_order_key" ON "ProjectBrainEntry"("projectId", "section", "order");

-- CreateIndex
CREATE INDEX "ProjectStage_projectId_idx" ON "ProjectStage"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectStage_projectId_order_key" ON "ProjectStage"("projectId", "order");

-- CreateIndex
CREATE INDEX "Deliverable_projectId_idx" ON "Deliverable"("projectId");

-- CreateIndex
CREATE INDEX "Deliverable_parentId_idx" ON "Deliverable"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Deliverable_projectId_order_key" ON "Deliverable"("projectId", "order");

-- CreateIndex
CREATE INDEX "DeliverableDependency_deliverableId_idx" ON "DeliverableDependency"("deliverableId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliverableDependency_deliverableId_dependsOnDeliverableId_key" ON "DeliverableDependency"("deliverableId", "dependsOnDeliverableId");

-- CreateIndex
CREATE INDEX "AcceptanceCriterion_projectId_idx" ON "AcceptanceCriterion"("projectId");

-- CreateIndex
CREATE INDEX "AcceptanceCriterion_deliverableId_idx" ON "AcceptanceCriterion"("deliverableId");

-- CreateIndex
CREATE INDEX "AcceptanceCriterion_workPacketId_idx" ON "AcceptanceCriterion"("workPacketId");

-- CreateIndex
CREATE INDEX "WorkPacket_projectId_idx" ON "WorkPacket"("projectId");

-- CreateIndex
CREATE INDEX "WorkPacket_deliverableId_idx" ON "WorkPacket"("deliverableId");

-- CreateIndex
CREATE INDEX "Evidence_projectId_idx" ON "Evidence"("projectId");

-- CreateIndex
CREATE INDEX "Evidence_workPacketId_idx" ON "Evidence"("workPacketId");

-- CreateIndex
CREATE INDEX "Review_workPacketId_idx" ON "Review"("workPacketId");

-- CreateIndex
CREATE INDEX "ReviewComment_reviewId_idx" ON "ReviewComment"("reviewId");

-- CreateIndex
CREATE INDEX "DecisionRecord_projectId_idx" ON "DecisionRecord"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "DecisionRecord_decisionId_key" ON "DecisionRecord"("decisionId");

-- CreateIndex
CREATE INDEX "RiskRecord_projectId_idx" ON "RiskRecord"("projectId");

-- CreateIndex
CREATE INDEX "VersionRecord_projectId_idx" ON "VersionRecord"("projectId");

-- CreateIndex
CREATE INDEX "ActivityRecord_projectId_idx" ON "ActivityRecord"("projectId");

-- CreateIndex
CREATE INDEX "ActivityRecord_entityType_entityId_idx" ON "ActivityRecord"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ProjectIntent_projectId_idx" ON "ProjectIntent"("projectId");

-- CreateIndex
CREATE INDEX "BenchmarkBrief_projectId_idx" ON "BenchmarkBrief"("projectId");

-- CreateIndex
CREATE INDEX "QualityProfile_projectId_idx" ON "QualityProfile"("projectId");

-- CreateIndex
CREATE INDEX "QualityGateResult_projectId_idx" ON "QualityGateResult"("projectId");

-- CreateIndex
CREATE INDEX "LearningRecord_projectId_idx" ON "LearningRecord"("projectId");

-- CreateIndex
CREATE INDEX "AttentionEvent_projectId_idx" ON "AttentionEvent"("projectId");
