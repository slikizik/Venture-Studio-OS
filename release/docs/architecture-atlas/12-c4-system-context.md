# Level 4 — C4 System Context

> **Reading level:** Level 4 — Technical
> **Purpose:** Show VSO and the external actors/systems around it
> **Source of truth:** `04-architecture/SYSTEM_ARCHITECTURE.md`, `09-hermes/telegram/TELEGRAM_CONTROL_PLANE.md`, `09-hermes/SMART_GIT_SYNC_POLICY.md`

This is the C4-style system context: VSO is the system of interest; owner, Hermes, Telegram, Git, and model providers sit outside its boundary.

## Diagram

```mermaid
flowchart LR
  Owner[Person: Project Owner]
  VSO[System: Venture Studio OS]
  Hermes[External: Hermes Agent]
  Telegram[External: Telegram]
  Git[External: Private Git Remote]
  Models[External: AI Model Providers]
  Owner -->|Creates, reviews, decides| VSO
  Owner <-->|Remote notifications / decisions| Telegram
  VSO -->|Structured work and control| Hermes
  Hermes -->|Model requests| Models
  VSO <-->|Version sync / handoff| Git
  Telegram -->|Validated owner input| VSO
```

## Formal PlantUML View

> **Obsidian:** With your PlantUML plugin enabled, the fenced block below renders directly in Reading view/Live Preview. The standalone editable source is [`../diagrams/plantuml/12-c4-system-context.puml`](../diagrams/plantuml/12-c4-system-context.puml).

```plantuml
@startuml
left to right direction
skinparam componentStyle rectangle
actor "Project Owner" as Owner
rectangle "Venture Studio OS" as VSO
component "Hermes Agent" as Hermes
cloud "Telegram" as Telegram
cloud "Private Git Remote" as Git
cloud "AI Model Providers" as Models
Owner --> VSO : creates, reviews, decides
Owner <--> Telegram : notifications / decisions
VSO --> Hermes : structured work + control
Hermes --> Models : model requests
VSO <--> Git : version sync / handoff
Telegram --> VSO : validated owner input
@enduml
```

## What this means

The context diagram focuses on responsibilities and boundaries rather than internal modules.

## Technical notes

This view corresponds to C4 Level 1. The PlantUML counterpart is `docs/diagrams/plantuml/c4-system-context.puml`.
