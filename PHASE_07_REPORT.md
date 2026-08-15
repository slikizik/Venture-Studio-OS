# Phase 07 Report — Dashboards and Environment Identity

**Specification baseline:** 1.7.0 (Product Alignment Baseline)
**Status:** COMPLETE
**Date:** 2026-08-15
**Included requirements:** PRJ-005, DSH-001, DSH-002, DSH-003, ENV-004, QLT-003, AUT-001, AUT-002, AUT-003, AUT-004

## Objective

Provide auditable dashboards for portfolio and project oversight, record benchmark/quality gaps, quantify agent autonomy and owner attention, and surface environment identity — without suppressing required escalations and without inventing quality passes.

## Summary

- **`app/src/lib/metrics.ts`** (new) — deterministic, auditable metrics derived solely from stored records.
  - `calculatePortfolioMetrics` (DSH-001): active/blocked projects, pending reviews, open risks, active agents, open escalations.
  - `calculateProjectDashboard` (PRJ-005): progress (from stages + work packets), health, blockers = BLOCKED stages + open HIGH/CRITICAL risks + open DIRECTION_REQUIRED escalations, pending reviews, open risks, recent decisions, recent escalations.
  - `calculatePortfolioDigest` (DSH-003): pending reviews, open risks, open escalations, recent decisions, blocked projects — the smallest end-to-end oversight loop.
  - `calculateBenchmarkGaps` (QLT-003): compares QualityProfile `mandatoryDimensions` (dimension IDs) + `targetLevels` (QualityLevel[]) against retained `QualityGateResult` (passing, at a target level) and accepted `DecisionRecord`s. Reports only what stored evidence supports; never invents a pass.
  - `calculateAutonomyMetrics` (AUT-001): autonomy rate = SYSTEM-owned activity / total; first-pass acceptance = reviews approved with no revision / total decided.
  - `calculateOwnerAttention` (AUT-002): sums `AttentionEvent` duration; always exposes open escalations and sets `attentionSuppressed: false` by construction.
  - `calculateEscalationQuality` (AUT-003): flags recoverable-class escalations as unnecessary, computes answer rate.
  - `calculateAutonomousRecovery` (AUT-004): resolved RECOVERABLE exceptions / total RECOVERABLE exceptions.
- **`app/src/app/page.tsx`** (DSH-001/003): portfolio metrics grid, needs-attention (open risks, escalations, blocked projects), recent decisions.
- **`app/src/app/projects/[id]/page.tsx`** (DSH-002/PRJ-005 + AUT panel): progress/health/blockers grid, blockers list, owner-attention + autonomy panel.
- **ENV-004**: environment banner (VSO_ENV) already rendered in `app/src/app/layout.tsx` — confirmed, not changed.

All dashboards follow the server-component-fetches-then-passes-to-client pattern per product doctrine; no client-side recomputation of auditable metrics.

## Acceptance criteria mapping

| Requirement | Criterion | Test | Result |
| --- | --- | --- | --- |
| PRJ-005 | Display phase progress, health, risks, blockers | `dsh.test.ts` (TEST-DSH-002) | PASS |
| DSH-001 | Portfolio dashboard metrics | `dsh.test.ts` (TEST-DSH-001) | PASS |
| DSH-002 | Project dashboard | `dsh.test.ts` (TEST-DSH-002) | PASS |
| DSH-003 | Pending reviews, blockers, risks, recent decisions, progress | `dsh.test.ts` (TEST-DSH-003) | PASS |
| ENV-004 | Visible environment identity in non-prod builds | `app/src/app/layout.tsx` (VSO_ENV banner) | PASS |
| QLT-003 | Record benchmark gaps; show met vs explicitly accepted | `qltdash.test.ts` (TEST-QLT-003) | PASS |
| AUT-001 | Autonomy rate + first-pass acceptance from auditable records | `aut.test.ts` (TEST-AUT-001) | PASS |
| AUT-002 | Owner attention time; escalations not suppressed | `aut.test.ts` (TEST-AUT-002) | PASS |
| AUT-003 | Escalation quality; unnecessary escalations identified | `aut.test.ts` (TEST-AUT-003) | PASS |
| AUT-004 | Autonomous recovery rate from classified recoverable incidents | `aut.test.ts` (TEST-AUT-004) | PASS |

## Verification

- `npx vitest run` → **128/128 PASS** (11 new Phase 07 cases across `dsh`/`aut`/`qltdash`).
- `npx tsc --noEmit` → 0 errors (NFR-003 strict mode, no `any`).
- `npx next build` → Compiled successfully.
- `python scripts/preflight.py --phase PHASE_07 --completion` → PREFLIGHT READY: PHASE_07.

## Product alignment

- Metrics never suppress escalations (AUT-002 `attentionSuppressed: false`); the smallest end-to-end loop (DSH-003 digest) is preserved and tested.
- Benchmark gaps (QLT-003) report only retained evidence — no fabricated quality passes — consistent with the commercial-quality doctrine.
- No unregistered production stubs. PH-002/003/004 (operator/provider/playbook config) remain owner-owned non-blocking placeholders, unchanged by this phase.

## Trackers updated

BUILD_MANIFEST.yaml (phase 7 COMPLETE, phase 8 READY), PROJECT_STATUS.md, REQUIREMENTS_TRACEABILITY.csv (10 Phase-07 rows PASS), EXECUTION_QUEUE.yaml (P07-001..006), EXECUTION_STATE.json, HERMES_ACTIVITY_LOG.md, CHANGELOG.md.

## Next phase

Phase 08 — Testing, Data Portability, and Hardening (marked READY).
