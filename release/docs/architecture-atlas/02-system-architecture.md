# Level 2 — System Architecture

> **Reading level:** Level 2 — Architecture
> **Purpose:** Understand how the application is divided into layers
> **Source of truth:** `04-architecture/SYSTEM_ARCHITECTURE.md`, `04-architecture/TECH_STACK.md`, `04-architecture/DATA_MODEL.md`

The MVP uses a modular-monolith architecture. The browser interface calls application services, which enforce domain rules and persist validated state. External integrations sit at controlled boundaries.

## Diagram

```mermaid
flowchart TB
  subgraph Interfaces[Interfaces]
    Web[VSO Web UI]
    TG[Telegram Control Channel]
    CLI[CLI / Operational Scripts]
  end
  subgraph App[Application / Service Layer]
    ProjectSvc[Project Services]
    Workflow[Workflow Engine]
    AgentSvc[Agent Execution]
    DecisionSvc[Decision and Review Services]
    VersionSvc[Version / Environment Services]
  end
  subgraph Domain[Domain Model]
    Entities[Projects, Stages, Deliverables, Work Packets, Reviews, Decisions, Risks]
    Rules[State transitions, validation, quality gates]
  end
  subgraph Persistence[Persistence / Records]
    DB[(SQLite MVP)]
    Files[Project files and evidence]
    Git[Git repository]
    Runtime[Execution state and logs]
  end
  Web --> App
  TG --> AgentSvc
  CLI --> App
  App --> Domain
  Domain --> Persistence
  AgentSvc --> Hermes[Hermes profiles]
  VersionSvc --> Git
```

## What this means

UI, business rules, stored data, and external tools have distinct roles. That separation makes the system easier to reason about and later replace or scale individual parts.

## Technical notes

Presentation must not bypass application/domain validation. SQLite is the MVP database; Git is version-control/synchronization for repository state, not a replacement for a transactional database.
