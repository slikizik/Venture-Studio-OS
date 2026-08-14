# Phase 03 Report — Deliverables and Versions

**Specification baseline:** v1.7.0 — Product Alignment Baseline
**Target application:** v0.1.0
**Date (UTC):** 2026-08-14
**Executed by:** Hermes (bounded_autonomy), autonomous continuation per owner standing instruction
**Phase status:** COMPLETE

## Requirements completed
- DEL-001 — Create/edit/reorder/archive/restore deliverables
- DEL-002 — Validated parent-child hierarchy (cycle rejection)
- DEL-003 — Store status, owner, due date, dependencies, criteria, versions
- GOV-003 — Record project versions and change summaries
- VER-001 — Present understandable project version labels
- VER-002 — Record official/development/test/released versions with approve/release

## Requirements incomplete
None in this phase.

## Files created
- `app/src/lib/deliverables.ts` — DEL-001/002/003 service (create/edit/reorder/archive/restore/delete, dependency + hierarchy cycle validation, acceptance criteria).
- `app/src/lib/versions.ts` — GOV-003/VER-001/002 service (record/approve/release, baseline seeding on project create).
- `app/src/app/api/deliverables/route.ts`, `app/src/app/api/deliverables/[id]/route.ts`, `app/src/app/api/deliverables/dependencies/route.ts`, `app/src/app/api/deliverables/criteria/route.ts`, `app/src/app/api/versions/route.ts`.
- `app/src/app/projects/[id]/deliverables/page.tsx` + `deliverables-client.tsx`.
- `app/src/app/projects/[id]/versions/page.tsx` + `versions-client.tsx`.
- `app/src/__tests__/del.test.ts`, `app/src/__tests__/gov.test.ts`, `app/src/__tests__/ver.test.ts`.

## Files modified
- `app/src/lib/validation.ts` — added deliverable/dependency/criteria/version Zod schemas.
- `app/src/lib/projects.ts` — seed initial DEVELOPMENT version on project create (GOV-003 baseline).
- `app/src/app/projects/[id]/page.tsx` — added Deliverables/Versions nav links.
- `app/prisma/schema.prisma` — `Deliverable` order uniqueness relaxed to `(parentId, order)`.
- `app/prisma/dev.db` — synced via `prisma db push --accept-data-loss` (dev artifact, gitignored; no production data).

## Tests added
- `del.test.ts` (17 tests): DEL-001 create/edit/reorder/archive/restore + delete-with-children refusal; DEL-002 parent-child tree, cycle/self-parent/cross-project rejection, dependency cycle + self/cross-project rejection; DEL-003 status/owner/dueDate/agent, acceptance criteria, audit event.
- `gov.test.ts` (4 tests): GOV-003 baseline seeding, record with summary, invalid-input rejection, audit event.
- `ver.test.ts` (4 tests): VER-001 presentable labels; VER-002 all four version types, approve/release transitions, missing-version rejection.

## Tests passed
57 / 57 (11 test files). Includes regression: prj(10), agt(4), aud(3), intent(4), nfr008(4), nfr003(strict tsc), nfr001(build+serve 200), dat004(4), del(17), gov(4), ver(4).

## Tests failed
None.

## Known defects
None outstanding.

## Architecture deviations
- Schema: `(projectId, order)` unique → `(parentId, order)` unique. Justified: order is a per-sibling sort key in a tree; global uniqueness broke reordering and cross-branch duplicates. No data-model semantics changed. Applied to dev.db only (no migration file generated; `migrate dev` is interactive). Should be converted to a tracked migration before any non-dev deployment — recorded as assumption below.

## Assumptions made
- Phase 03 requires no new Prisma models (all referenced models already existed in schema from prior phases); only validation + services + API + UI + tests were needed.
- `prisma db push` (vs `migrate dev`) is acceptable for the dev database in this sandbox because `migrate dev` refuses non-interactive runs. A proper migration should be generated when CI/prod deployment is configured.

## Manual verification steps
- `cd app && npx vitest run` → 57 passed.
- `cd app && npx tsc --noEmit` → 0 errors.
- `cd app && npx eslint .` → 0 errors.
- `python scripts/preflight.py --phase PHASE_03 --completion` → PREFLIGHT READY.
- UI smoke: create a project → Deliverables → add parent + child (tree renders), add a dependency, archive/restore; Versions → record a version, approve, release.

## Recommended next phase
PHASE_04 — Work Packets and Evidence (WPK-001..003, AGT-002/003, DSG-002, ATT-001/002, NFR) — READY.
