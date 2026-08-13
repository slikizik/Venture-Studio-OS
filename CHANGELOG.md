# Changelog

## 1.7.0 — Product Alignment Baseline

- Reframed VSO explicitly as an AI Product Development Operating System for commercial-quality output with governed autonomy and low owner-attention cost.
- Added Product Doctrine, Product Intent Alignment Gate, SEVL scope, architecture freeze, and post-MVP backlog policy.
- Added five-engine model: Intent, Design, Execution, Quality, and Learning.
- Added Commercial Quality Framework, Benchmarking Protocol, Quality Gate Model, Evidence Model, Release Readiness Model, and Continuous Improvement Model.
- Added owner-attention/autonomy metrics and product-alignment requirements/tests/traceability.
- Added `docs/OWNER_RUNBOOK.md` as the primary owner operating guide.
- Added agent product-intent alignment policy, SEVL milestone by Phase 05, and product-alignment validation/preflight.
- Expanded Architecture Atlas with product-engine, commercial-quality, owner-attention, and SEVL views.
- Declared the MVP architecture frozen after successful Phase 00; non-blocking new ideas go to backlog.

## 1.6.1 — Pre-Implementation Hardening

- Corrected specification baseline metadata to v1.6.1.
- Made Telegram authorization fail closed.
- Removed free-form Telegram-to-Hermes execution; only governed commands and validated direction responses can trigger work.
- Added machine-readable direction options and validation for open/valid/non-duplicate decisions.
- Added isolated per-project Telegram worker queues so one project cannot block message handling for every other project.
- Added Git-remote execution lease for cross-workstation autonomous ownership.
- Added Operational Readiness Register, Placeholder Policy/Register, preflight scanner, resume-safety checks, and expanded operational tests.
- Removed generated Python cache artifacts from the release package.

## v1.6.0 — Obsidian PlantUML Architecture Layer

- Optimized the Architecture Atlas for Obsidian with Mermaid plus PlantUML.
- Added inline PlantUML views to technical Atlas pages 12–18.
- Added standalone PlantUML sources for the core data model and state machines, bringing technical coverage to all pages 12–18.
- Added `docs/OBSIDIAN_DIAGRAM_GUIDE.md`.
- Updated architecture policy so Hermes maintains Mermaid and PlantUML together for technical views.
- Extended validation to require PlantUML fences and matching `.puml` sources on technical pages.
- Kept rendered SVG/PNG as optional export artifacts rather than duplicated maintained sources.

## v1.5.0 — Layered Architecture Atlas

- Added a 19-view Architecture Atlas with progressive disclosure from layperson concepts to infrastructure/security.
- Added Mermaid source files for all layered views.
- Added PlantUML technical views for system context, containers, application components, and deployment.
- Added diagram-to-specification traceability and a formal architecture diagram maintenance policy.
- Added architecture-atlas validation and integrated it into package validation.
- Updated owner instructions, bootstrap validation, reusable Hermes prompt, and context loading rules so diagrams remain synchronized with normative specifications.

## v1.4.0 — Smart cross-workstation Git synchronization

- Made private Git the default synchronization and workstation-handoff mechanism.
- Added functional `scripts/vso_git_sync.py` with `status`, `handoff`, and `resume`.
- Added safe guards against dirty pulls, silent merges, force pushes, remote-behind handoffs, diverged histories, and automated handoff on `main`.
- Added Windows/Linux line-ending policy through `.gitattributes`.
- Added ignored machine-local workstation identity configuration.
- Added `09-hermes/SMART_GIT_SYNC_POLICY.md` and `docs/SMART_GIT_SYNC_GUIDE.md`.
- Updated owner guide, handoff protocol, version-control policy, context loading order, and reusable Hermes prompt.


## Specification v1.3.0

- Added functional single-bot Telegram control plane with deterministic topic-to-project routing.
- Added isolated Hermes profile setup for each registered project.
- Added Telegram direction-response persistence before Hermes resume.
- Added cross-platform Python notification, routing, profile setup, route validation, and execution checkpoint tools.
- Added durable router update-offset state and clean/unclean restart detection.
- Added Linux user-systemd installer with automatic router restart.
- Added exact owner setup and validation instructions in `docs/TELEGRAM_CONTROL_GUIDE.md`.
- Added execution-state file and checkpoint/resume safety policy.
- Added safeguards preventing multiple project gateways from long-polling one Telegram bot.

## Specification v1.2.0

- Expanded all build phases into executable contracts.
- Added owner build guide with exact prompt and file paths.
- Added formal direction-response instructions and templates.
- Added field-level data model, enums, relationships, archival, audit, progress, and health rules.
- Added work-packet and review state machines.
- Completed requirement traceability including non-functional and data portability requirements.
- Added requirement-level acceptance and test IDs.
- Expanded screen contracts.
- Added version-locking policy and Phase 00 approved-version file.
- Added backup, export, import, restore, attachment, and recovery contracts.
- Expanded six project templates with versions, stages, deliverables, criteria, and gates.
- Seeded the Phase 00 execution queue.
- Added assumption and decision logs.
- Corrected all governance references to exact repository-relative paths.

## Specification v1.1.0

- Added bounded autonomy, exception handling, environment isolation, and version-control governance.
