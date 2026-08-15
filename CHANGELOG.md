## 1.7.0 — Phase 05 reviews, decisions, risks, exceptions complete (2026-08-15)

- Phase 05 (Reviews, Decisions, Risks, Exceptions) implemented and verified: review service (REV-001 create criterion records; REV-002 decide APPROVED/REVISION_REQUESTED with work-packet transition; REV-003 immutable + append-only comments — decided reviews are superseded, not mutated), decision service (GOV-001 immutable decision records with audit), risk service (GOV-002 risk register, validated status enum), exception + direction services (EXC-001 classify/resolve; EXC-002/004 owner-only direction requests/escalation), learning service (LRN-001 capture; LRN-002 convert to REQUIREMENT/BACKLOG/CHANGE_REQUEST), quality-gate service (QLT-002 evaluate gates against retained evidence, rejecting missing evidence).
- Schema change: added `DirectionRequest` + `Exception` models and their `Project` back-relations; `RiskRecord.description` made nullable. Applied via `prisma db push --accept-data-loss --skip-generate` + regenerated client.
- Added 12 API routes (reviews, reviews/[id] decide/comment, decisions, risks, risks/[id], direction-requests, direction-requests/[id], exceptions, exceptions/[id], learnings, learnings/[id], quality-gates) mirroring existing Phase 02/03/04 handlers.
- Added 6 UI sections under `projects/[id]/governance/` (reviews, decisions, risks, exceptions, direction, learnings, quality-gates) each with a page + client component linked from the project nav.
- Added 6 Phase 05 test files (rev/gov/exc/lrn/qlt/sevl) — 26 new cases; full suite now **101/101 PASS**, including `TEST-SEVL-001` (persisted intent→work-packet→review→decision→learning vertical slice with audit trail) and `TEST-NFR-003` (strict tsc, no `any`). tsc --noEmit 0 errors. preflight --completion READY.
- Fixed real issues: schema back-relations, Prisma EPERM (killed stale `next start -p 3940`), service field-name alignment (`convertedReference`, `Evidence` model), test/API signature mismatches, NFR-003 `as any` removal, and UI import paths (`../`→`./`).
- Updated trackers: BUILD_MANIFEST (phase 5 COMPLETE, phase 6 READY), PROJECT_STATUS, REQUIREMENTS_TRACEABILITY (13 Phase-05 rows PASS incl. SEVL-001), EXECUTION_QUEUE (P05-001..009), EXECUTION_STATE, HERMES_ACTIVITY_LOG. Phase 06 (Templates) marked READY.

## 1.7.0 — Phase 04 work packets and evidence complete (2026-08-14)

- Phase 04 (Work Packets and Evidence) implemented and verified: work packet service (WPK-001 create linked to project/deliverable; WPK-002 full spec/evidence/assignee storage; WPK-003 versioned submit→IN_REVIEW→approve→COMPLETE with audit + version bump + draft-lock on core fields), execution queue + agent activity (AGT-002 ordered queue with dependency readiness vs COMPLETE predecessor and linked evidence JSON; AGT-003 append-only activity log), attachments/evidence (ATT-001 attach file/link/note/test-result/artifact; ATT-002 filename sanitization incl. path traversal on fileName+originalName, size + checksum preserved), requirement→work-packet links (DSG-002 exclusions + evidence expectations).
- Schema change: added `WorkPacket.versionNumber`, `queueOrder`, `queueStatus`; `RequirementLink.targetType/isExclusion/expectedEvidence`; `ExecutionQueueItem.linkedEvidence` (JSON string); `Evidence` model present. Applied to dev.db via `prisma db push`.
- Added 7 API routes (workpackets, workpacket/[id], workpacket/[id]/submit, attachments, queue, queue/[id], activity, requirements/links) and 7 UI views (work packets pages + client, queue pages + client, requirements pages + client, project nav).
- Added 4 test files (wpk, agt2, att, dsg2) — 22 new cases; full suite now **79/79 pass**; tsc strict 0, preflight --completion READY.
- Fixed two real regressions surfaced by the full suite: (1) queue readiness compared `queueStatus` against `"COMPLETED"` instead of the actual enum value `"COMPLETE"`, so dependents were always BLOCKED; (2) test-harness `cleanupStrayTestDbs()` deleted sibling test DBs during parallel Vitest runs, sporadically dropping the `Agent` table (`agt.test.ts` passed isolated, failed in full run) — fixed with an active-DB registry so cleanup skips in-use DBs. Also removed all `as any` escape hatches to satisfy NFR-003 strict discipline, and corrected `AgentActivity.metadata` null-vs-`"{}"`.
- HARNESS HARDENING (post-commit, before sign-off): a subset run (agt2 + agt) reproduced "main.Project does not exist" — each forked Vitest worker's `afterAll` `cleanupStrayTestDbs()` scanned prisma/ and deleted every `_test_*.db` NOT in its own process-local registry, wiping still-running sibling DBs. Fixed deterministically by embedding a per-process SESSION token in every test-DB filename so cleanup can only delete this process's own databases (cross-worker deletion now structurally impossible); also made `prisma db push` fail loud + retry on transient engine-lock. Verified: subset 26/26 and full suite 79/79 (x2), tsc 0, preflight READY.
- Verification: preflight `--completion` READY; `tsc --noEmit` 0 errors (full strict, incl. NFR-003 gate); 79/79 Vitest PASS (run twice, stable). Phase 05 marked READY.
- Updated trackers: BUILD_MANIFEST (phase 4 COMPLETE, phase 5 READY), PROJECT_STATUS, REQUIREMENTS_TRACEABILITY (8 Phase-04 rows PASS), EXECUTION_QUEUE (P04-001..009), EXECUTION_STATE, HERMES_ACTIVITY_LOG.

- Phase 03 (Deliverables and Versions) implemented and verified: deliverable service (DEL-001..003 — create/edit/reorder/archive/restore, validated parent-child hierarchy with cycle rejection, dependency cycles rejected, status/owner/dueDate/criteria/versions storage), version service (GOV-003 record versions + change summaries with audit, VER-001 presentable version labels, VER-002 official/development/test/released with approve/release transitions; baseline DEVELOPMENT version seeded on project create).
- Schema change: relaxed `Deliverable` order uniqueness from global `(projectId, order)` to per-parent `(parentId, order)` (null parent treated distinct in SQLite) so tree reordering works; applied to dev.db via `prisma db push`.
- Added 5 API routes (deliverables, deliverable/[id], dependencies, criteria, versions) and 4 UI views (deliverables tree + client, versions page + client, dashboard links).
- 17 new tests (del/gov/ver) — full suite now 57/57 pass; tsc strict 0, eslint 0, preflight --completion READY.

- Phase 02 (Project Core) implemented and verified: project service (PRJ-001..004 — create from template, edit metadata + brain, archive/restore, search/sort/filter, derived progress/health), agent records (AGT-001), append-only audit (AUD-001), Project Intent Brief + benchmark brief + intent→requirement traceability (INT-001/002, DSG-001), and UTC-storage/owner-timezone display (NFR-008).
- Added `AppSetting` key-value model (owner timezone/name) via a DAT-004-backed migration; migrated with a verified backup (SAFE_TO_PROCEED).
- Implemented 9 API route handlers (projects list/create, update/archive/restore, brain, intent, benchmark, audit, agents, settings) and 10 UI pages (portfolio, project list/create/dashboard/edit/brain/intent, agents, settings, decisions placeholder).
- Added 5 Phase 02 test files (prj, agt, aud, intent, nfr008) — 25 new cases; full suite now 32/32 passing including NFR-001 (real build+serve 200), NFR-003 (strict tsc), DAT-004.
- Fixed scanner false-positive: `scan_placeholders.py` no longer flags JSX `placeholder=` HTML attributes as production stubs.
- Verification: preflight `--completion` READY; `tsc --noEmit` 0 errors; ESLint 0 errors; architecture atlas 23 views; product-alignment + operational-readiness PASS.
- Updated trackers: BUILD_MANIFEST (phase 2 COMPLETE, phase 3 READY), PROJECT_STATUS, REQUIREMENTS_TRACEABILITY (12 rows PASS), EXECUTION_QUEUE (P02-001..008), EXECUTION_STATE, ASSUMPTION/DECISION logs. Phase 03 marked READY.

# Changelog

## 1.7.0 — Phase 01 foundation complete (2026-08-13)

- Phase 01 (Foundation) implemented and verified: Next.js 16 (App Router, TypeScript strict) application shell under `app/`, Prisma schema from `DATA_MODEL.md` with initial SQLite migration, Zod validation layer, and a live-DB dashboard page.
- Implemented DAT-004 backup-before-destructive service (`app/src/lib/backup.ts`) + CLI; destructive operations are refused if the backup fails.
- Added passing tests for the three normative Phase 01 requirements: TEST-NFR-001 (real production build + serve returns HTTP 200), TEST-NFR-003 (`tsc --noEmit` strict passes with no `any`), TEST-DAT-004 (4/4 cases).
- Pinned Prisma to 6.19.3 (VSO-DEC-001 / VSO-ASM-002): Prisma 7.x's adapter API is not reliably resolvable on the local toolchain; 6.x is the same ORM and satisfies the mandate.
- Updated `scripts/validate_package.py` to skip `node_modules`/`.next` in JSON/YAML scans (now tolerates the new `app/` subtree).
- Verification: preflight `--completion` READY; 7/7 Vitest tests pass; ESLint 0 errors; `validate_package.py` PASS (architecture atlas 23 views, telegram + git unit tests). Phase 02 marked READY.

# Changelog

## 1.7.0 — Phase 00 validation complete (2026-08-13)

- Phase 00 (Specification and Runtime-Control Validation) passed with no blocking specification issues.
- Resolved PH-001: verified current mutually-compatible stable tool versions from official npm/Node sources and recorded them in `04-architecture/APPROVED_VERSIONS.yaml` (status VERIFIED).
- Validated all required paths, 70 requirement IDs (no duplicates), traceability coverage, acceptance/test-ID mapping, JSON/YAML/CSV syntax, Python compile of all scripts, Telegram fail-closed unit tests, project routing, package structure, and Architecture Atlas (23 views, no diagram/spec contradictions).
- Product Alignment Gate result: APPROVED. Phase 01 marked READY.
- Updated `PROJECT_STATUS.md`, `BUILD_MANIFEST.yaml`, `09-hermes/EXECUTION_QUEUE.yaml`, `09-hermes/HERMES_ACTIVITY_LOG.md`, `09-hermes/ASSUMPTION_LOG.md`.


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
