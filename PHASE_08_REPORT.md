# Phase 08 Report — Testing, Data Portability, and Hardening

**Specification baseline:** 1.7.0 (Product Alignment Baseline)
**Status:** COMPLETE
**Date:** 2026-08-15
**Included requirements:** ENV-003, DAT-001, DAT-002, DAT-003, DAT-005, NFR-002, NFR-004, NFR-005, NFR-006, NFR-010

## Objective

Make project data portable and recoverable, guarantee isolation between development environments, sanitize all rendered Markdown/user text, meet core accessibility and performance expectations, ensure persisted data survives restart, and link every completed requirement to passing evidence — all without relaxing the frozen MVP architecture (no new infrastructure, no new dependencies).

## Summary

- **`app/src/lib/dataPort.ts`** (new) — Project export/import/validation (DAT-001/002/003).
  - `exportProject(id)` / `exportProjectString(id)`: emits a versioned package `{ format: "vso-project-package", version: 1, exportedAt, generator, project, brainEntries, stages, deliverables, deliverableDependencies, requirementLinks, acceptanceCriteria, workPackets, reviews, reviewComments, decisions, risks, versions, intents, benchmarks, qualityProfiles, gateResults, learningRecords, evidence, attachments, attentionEvents, requirements, agentActivities, queueItems, directionRequests, exceptions, projectTemplates }` — every record owned by the project, with server-only fields (`deletedAt`, etc.) scrubbed via `stripServerFields`.
  - `importProjectPackage(input)`: validates, then creates the project and every relation **transactionally**. Uses **generic deep id-rewriting** `buildIdMap`/`remap` so it is robust across all relations: remaps `id`, every `*Id` FK, embedded id arrays (`affectedRequirementIds`, `evidenceIds`), and unique business keys (`decisionId`, `code`, `slug`) deterministically per import via a module-level counter — so re-importing the same package never collides.
  - `validateProjectPackage(input)`: throws (writes nothing) for unknown `format`, unsupported `version` (only `1`), non-JSON, or structurally malformed packages.
- **`app/src/lib/backup.ts`** (`restoreBackup` added) — DAT-005. Restores a previously created backup with a dependency-free integrity check (SQLite `SQLite format 3` magic bytes) and a transactional replace of the live database + sibling shm/wal/journal files; returns the restored byte count. Fails closed: no overwrite if the integrity check fails.
- **`app/src/lib/isolation.ts`** (new) — ENV-003. `assertNoCrossEnvLeak` / `isEnvIsolatedFrom` guard that two registered environments do not share a database path, storage directory, or secret source.
- **`app/src/lib/sanitize.ts`** (new) — NFR-006. A dependency-free HTML sanitizer (`stripUnsafeHtml` / `escapeHtml`) and a safe Markdown renderer (`renderMarkdownSafe`) that escapes first, then applies a minimal transform (headings, bold, inline code, fenced code, lists, paragraphs) and drops `script`/`style`/`iframe`/`object`/`on*` handlers/`javascript:` URLs. No third-party sanitizer added.
- **`app/src/lib/a11y.ts`** (new) — NFR-004. `contrastRatio`, `meetsContrastAA`, `isKeyboardAccessible`, `checkControlA11y` for automated WCAG 2.1 AA keyboard + contrast checks.
- **`app/src/lib/perf.ts`** (new) — NFR-005. `measure(fn, budgetMs=2000)` asserts an operation completes within the two-second MVP budget.
- **UI affordance (DAT-001):** `app/src/app/api/projects/[id]/export/route.ts` returns the versioned package; `app/src/app/projects/[id]/export-dialog.tsx` is a keyboard-reachable, labelled, `aria-live` export trigger wired into the project page.

## Requirements coverage

| Req | Description | Test ID | Status |
| --- | --- | --- | --- |
| ENV-003 | Prevent runtime data sharing between isolated environments | TEST-ENV-003 | COMPLETE / PASS |
| DAT-001 | Export a complete project as a versioned package | TEST-DAT-001 | COMPLETE / PASS |
| DAT-002 | Import a compatible project package transactionally | TEST-DAT-002 | COMPLETE / PASS |
| DAT-003 | Reject invalid/unsupported import packages safely | TEST-DAT-003 | COMPLETE / PASS |
| DAT-005 | Restore a verified backup with integrity checks | TEST-DAT-005 | COMPLETE / PASS |
| NFR-002 | Persisted data survives application restart | TEST-NFR-002 | COMPLETE / PASS |
| NFR-004 | Core pages meet WCAG 2.1 AA keyboard/contrast | TEST-NFR-004 | COMPLETE / PASS |
| NFR-005 | Primary actions respond within two seconds at MVP volume | TEST-NFR-005 | COMPLETE / PASS |
| NFR-006 | Rendered Markdown/user text is sanitized | TEST-NFR-006 | COMPLETE / PASS |
| NFR-010 | Every completed requirement links to passing evidence | TEST-NFR-010 | COMPLETE / PASS |

NFR-003 (strict TypeScript, no `any` escape hatches) was additionally exercised across the new code via `nfr003-strict-ts.test.ts` — **0 errors**, all `as any`/`tx:any` removed and replaced with `unknown`/typed delegates.

## Verification

- `npx tsc --noEmit` → **0 errors** (including strict mode used by TEST-NFR-003).
- `npx vitest run` → **158/158 PASS** (30 new Phase-08 cases across `dat.test.ts` [12], `env.test.ts` [6], `nfr.test.ts` [12], incl. NFR-010 evidence-link assertions).
- `npx next build` → **Compiled successfully**.
- `python scripts/preflight.py --completion --phase PHASE_08` → **PREFLIGHT READY: PHASE_08**.

## Problems encountered and recovery

1. **Shared singleton test-DB contamination** — `makeProjectWithData` seeded `decisionId:"DEC-1"`, colliding with the `@@unique([decisionId])` constraint when multiple tests ran in the same shared DB. Fixed by deriving the decision id from the unique project name.
2. **Import id-rewrite collisions on re-import** — importing the same package twice into the shared DB produced identical business keys. Fixed with a module-level counter so each import gets unique `decisionId`/`code`/`slug` suffixes.
3. **NFR-003 strict-TS regression** — `as any` casts in `dataPort.ts` and `dat.test.ts` tripped the `any`-scan. Replaced with `unknown` and a typed `ModelDelegate`, and `as Record<string,unknown>` in tests.
4. **Sanitizer double-escaping** — fenced code blocks were escaped twice. Fixed by not re-escaping already-escaped lines.
5. **Seed field gaps** — `deliverable.create` required `order`; added to seeds.

All resolved in-phase; no scope change; no new dependencies; architecture freeze honoured. No unregistered production stubs (PH-002/003/004 config placeholders remain owner-owned, non-blocking).

## Trackers updated

BUILD_MANIFEST.yaml (phase 8 COMPLETE, phase 9 READY), PROJECT_STATUS.md, REQUIREMENTS_TRACEABILITY.csv (10 Phase-08 rows COMPLETE/PASS), EXECUTION_QUEUE.yaml (P08-001..007), EXECUTION_STATE.json, HERMES_ACTIVITY_LOG.md, CHANGELOG.md.

**Next phase:** Phase 09 — Packaging and Release (marked READY).
