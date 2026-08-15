# Venture Studio OS — Architecture Summary

A condensed view of how VSO is built. The authoritative, diagram-rich reference
is `docs/architecture-atlas/` (24 views). This file is the index-level summary
for the release package.

## System shape

VSO is a **modular monolith**: one Next.js (App Router, TypeScript strict) +
Prisma 6 + SQLite application, organized into logical engine boundaries. Project
types are configured by templates rather than separate codebases. Repository
records (not source code) are authoritative for the build and governance process.

```
Owner intent → Intent Engine → Design Engine → Execution Engine (Hermes/agents)
             → Quality Engine → Release → Learning Engine → (back to Intent)
```

## The five engines (logical boundaries)

- **Intent Engine** — project brief, Project Brain, success criteria, benchmarks.
- **Design Engine** — requirements, deliverables, work packets.
- **Execution Engine** — bounded-autonomy agent execution with escalation.
- **Quality Engine** — requirement + commercial-quality gates, reviews.
- **Learning Engine** — feedback, defects, discoveries feed the next iteration.

See `docs/architecture-atlas/19-five-engines.md`.

## Key subsystems

- **Multi-project routing** — `docs/architecture-atlas/11-multi-project-routing.md`
- **Autonomous Hermes control** — `docs/architecture-atlas/07-autonomous-hermes.md`
- **Direction workflow** (owner choices) — `docs/architecture-atlas/06-direction-workflow.md`
- **Smart Git Sync** (cross-PC lease) — `docs/architecture-atlas/10-smart-git-sync.md`
- **Telegram control** (governed remote) — `docs/architecture-atlas/08-telegram-control.md`
- **Release readiness state machine** — `08-quality/RELEASE_READINESS_MODEL.md`
- **SEVL** (smallest end-to-end loop) — `docs/architecture-atlas/22-sevl.md`

## Data model

Prisma + SQLite. Domain models include `Project`, `ProjectBrainEntry`,
`Deliverable`, `WorkPacket`, `Requirement`, `QualityGateResult`, `Review`,
`DecisionRecord`, `RiskRecord`, `VersionRecord`, `EnvironmentRegistration`
(Phase 09 / ENV-001/002), `ReleaseRecord` (VER-003), and `ReleaseReadiness`
(QLT-004). Enums are stored as `String` with Zod validation at the edge. See
`04-architecture/DATA_MODEL.md` and `docs/architecture-atlas/15-core-data-model.md`.

## Quality and safety contracts

- **NFR-003** — strict TypeScript; `as any` is banned in `src` (enforced by test).
- **NFR-007** — production releases must have no unresolved critical dependency
  vulnerabilities (`npm audit`; see `app/src/lib/vulnAudit.ts`).
- **ENV-003** — environments must resolve to distinct database/storage/secret
  sources (enforced by `app/src/lib/isolation.ts`).
- **Architecture freeze** — the MVP architecture is frozen
  (`01-product/ARCHITECTURE_FREEZE.md`); non-blocking ideas go to
  `01-product/BACKLOG.md`.

## Deployment & security

Local-first MVP. No unattended deployment until the Operational Readiness
Register has no release-blocking item, live integrations are tested, backup/restore
works, and security boundaries pass. See `docs/architecture-atlas/18-deployment-security.md`
and `09-hermes/OPERATIONAL_READINESS_REGISTER.md`.
