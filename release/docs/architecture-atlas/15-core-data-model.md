# Level 4 — Core Data Model

> **Reading level:** Level 4 — Technical
> **Purpose:** See the principal persisted relationships
> **Source of truth:** `04-architecture/DATA_MODEL.md`

This is a simplified relationship view. The normative field definitions, constraints, and archival rules remain in the data-model specification.

## Diagram

```mermaid
erDiagram
  PROJECT ||--o{ PROJECT_BRAIN_ENTRY : contains
  PROJECT ||--o{ PROJECT_STAGE : progresses_through
  PROJECT ||--o{ DELIVERABLE : contains
  DELIVERABLE ||--o{ DELIVERABLE : parent_of
  DELIVERABLE ||--o{ WORK_PACKET : decomposes_into
  WORK_PACKET ||--o{ REVIEW : receives
  REVIEW ||--o{ REVIEW_COMMENT : contains
  PROJECT ||--o{ DECISION_RECORD : records
  PROJECT ||--o{ RISK_RECORD : tracks
  PROJECT ||--o{ VERSION_RECORD : versions
  PROJECT ||--o{ ACTIVITY_RECORD : logs
  DELIVERABLE ||--o{ ACCEPTANCE_CRITERION : verifies
  WORK_PACKET ||--o{ ACCEPTANCE_CRITERION : verifies
  WORK_PACKET ||--o{ EVIDENCE : produces
```

## Formal PlantUML View

> **Obsidian:** With your PlantUML plugin enabled, the fenced block below renders directly in Reading view/Live Preview. The standalone editable source is [`../diagrams/plantuml/15-core-data-model.puml`](../diagrams/plantuml/15-core-data-model.puml).

```plantuml
@startuml
hide methods
hide stereotypes
skinparam classAttributeIconSize 0
class Project
class ProjectBrainEntry
class ProjectStage
class Deliverable
class WorkPacket
class Review
class ReviewComment
class DecisionRecord
class RiskRecord
class VersionRecord
class ActivityRecord
class AcceptanceCriterion
class Evidence
Project "1" -- "0..*" ProjectBrainEntry : contains
Project "1" -- "0..*" ProjectStage : progresses through
Project "1" -- "0..*" Deliverable : contains
Deliverable "0..1 parent" -- "0..* children" Deliverable : parent of
Deliverable "1" -- "0..*" WorkPacket : decomposes into
WorkPacket "1" -- "0..*" Review : receives
Review "1" -- "0..*" ReviewComment : contains
Project "1" -- "0..*" DecisionRecord : records
Project "1" -- "0..*" RiskRecord : tracks
Project "1" -- "0..*" VersionRecord : versions
Project "1" -- "0..*" ActivityRecord : logs
Deliverable "1" -- "0..*" AcceptanceCriterion : verifies
WorkPacket "1" -- "0..*" AcceptanceCriterion : verifies
WorkPacket "1" -- "0..*" Evidence : produces
@enduml
```

## What this means

Projects are the aggregate context. Deliverables organize outputs; work packets organize execution; reviews and evidence establish verification; decisions/risks/version/activity preserve governance history.

## Technical notes

Refer to `04-architecture/DATA_MODEL.md` for exact fields, enum values, relationship validation, immutability, archival, dependency cycles, and derived progress/health rules.
