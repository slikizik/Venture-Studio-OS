# Level 4 — Application Components

> **Reading level:** Level 4 — Technical
> **Purpose:** Show the logical modules inside the VSO application
> **Source of truth:** `04-architecture/SYSTEM_ARCHITECTURE.md`, `04-architecture/API_CONTRACTS.md`, `04-architecture/DATA_MODEL.md`

The modular monolith keeps one deployable application while separating domain responsibilities internally.

## Diagram

```mermaid
flowchart LR
  UI[Presentation] --> Projects[Projects]
  UI --> Brain[Project Brain]
  UI --> Templates[Templates / Stages]
  UI --> Deliverables[Deliverables]
  UI --> Packets[Work Packets]
  UI --> Reviews[Reviews / Approvals]
  UI --> Decisions[Decisions / Risks]
  UI --> Versions[Versions / Dashboards]
  Projects --> Brain
  Templates --> Projects
  Projects --> Deliverables
  Deliverables --> Packets
  Packets --> Reviews
  Reviews --> Decisions
  Deliverables --> Versions
  Decisions --> Versions
  Versions --> Persistence[(Persistence + validation + logging)]
```

## Formal PlantUML View

> **Obsidian:** With your PlantUML plugin enabled, the fenced block below renders directly in Reading view/Live Preview. The standalone editable source is [`../diagrams/plantuml/14-application-components.puml`](../diagrams/plantuml/14-application-components.puml).

```plantuml
@startuml
left to right direction
skinparam componentStyle rectangle
package "VSO Modular Monolith" {
  [Presentation] as UI
  [Projects] as Projects
  [Project Brain] as Brain
  [Templates / Stages] as Templates
  [Deliverables] as Deliverables
  [Work Packets] as Packets
  [Reviews / Approvals] as Reviews
  [Decisions / Risks] as Decisions
  [Versions / Dashboards] as Versions
  database "Persistence" as Persistence
  component "Validation + Logging" as Validation
}
UI --> Projects
UI --> Brain
UI --> Templates
UI --> Deliverables
UI --> Packets
UI --> Reviews
UI --> Decisions
UI --> Versions
Projects --> Brain
Templates --> Projects
Projects --> Deliverables
Deliverables --> Packets
Packets --> Reviews
Reviews --> Decisions
Deliverables --> Versions
Decisions --> Versions
Versions --> Validation
Validation --> Persistence
@enduml
```

## What this means

The modules cooperate through application/domain contracts rather than becoming separate project-specific applications.

## Technical notes

This is C4 Level 3 style. Code-level diagrams should only be added when implementation exists and should reflect actual modules, not anticipated class names.
