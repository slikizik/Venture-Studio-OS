# Phase 06 Report — Templates

**Specification baseline:** 1.7.0 (Product Alignment Baseline)
**Status:** COMPLETE
**Date:** 2026-08-15
**Included requirements:** TPL-001, TPL-002, TPL-003, QLT-001 (QLT-001 added per Phase 06 product-alignment addendum: templates seed a Quality Profile appropriate to project type while retaining a shared universal engine.)

## Objective

Validate built-in templates, instantiate complete project structures from templates, and create/version custom templates — including the versioned Quality Profile (QLT-001) that templates seed per project type.

## Deliverables

| Requirement | Deliverable | Status | Evidence |
| ----------- | ---------- | ------ | -------- |
| TPL-001 | Template engine — load & validate built-in templates | COMPLETE | `app/src/__tests__/tpl.test.ts` (TEST-TPL-001 PASS); `app/src/lib/templates.ts` (6 built-ins + `validateTemplate`, fail-fast at module load) |
| TPL-002 | Instantiate stages/deliverables/brain/gates from a template | COMPLETE | `app/src/__tests__/tpl.test.ts` (built-in + custom instantiation; deliverables/gates/brain/quality-profile seeded, deps via `DeliverableDependency`); `app/src/lib/templateEngine.ts` + `app/src/lib/projects.ts` |
| TPL-003 | Create & version custom templates | COMPLETE | `app/src/__tests__/tpl.test.ts` (create/version/resolve custom template); `app/src/lib/customTemplates.ts` |
| QLT-001 | Create & version a project Quality Profile | COMPLETE | `app/src/__tests__/qlt.test.ts` (TEST-QLT-001 PASS, 6 cases: create/version/list/update/delete); `app/src/lib/quality.ts` |

## Required automated tests

- `npx vitest run` → **115/115 PASS** (21 test files, including NFR-001 build+serve 200, NFR-003 strict tsc, TPL-001/002/003, QLT-001).
- `npx tsc --noEmit` → 0 errors (full strict, satisfies NFR-003 — no `any`/`as any` in source or tests).
- `npx next build` → Compiled successfully; new routes `/templates`, `/templates/new`, `/quality-profiles` and `quality-profiles/[id]` DELETE registered.

## Required manual checks (documented)

- Built-in templates validated at module load (`validateTemplate` runs over all 6 at import) — a malformed built-in fails fast at boot, not at project-create.
- `DeliverableDependency` join table stores template deliverable dependencies (product-release: build←scope, test←build) — verified via `deliverableDependency.count`.
- Quality Profile is seeded on project create from the template's `qualityProfile` block (QLT-001 retained-evidence link).

## Verification commands run

```
python scripts/preflight.py --phase PHASE_06 --completion   # PREFLIGHT READY: PHASE_06
npx vitest run                                              # 115/115 PASS
npx tsc --noEmit                                           # 0 errors
npx prisma db push --accept-data-loss --skip-generate      # schema applied
npx prisma generate                                        # client regenerated
npx next build                                             # Compiled successfully
```

## Problems encountered & recovery

1. **SQLite single-connection deadlock** — `instantiateTemplate` ran inside `createProject`'s `prisma.$transaction` while using the global `prisma` client; the single SQLite connection blocked indefinitely (5s test timeouts on blank/standard-venture/product-release). *Recovery:* moved template instantiation, blank-Draft-stage creation, audit, and initial-version seeding outside the transaction (global client, no active tx).
2. **DeliverableDependency join table** — deliverable deps live only in `DeliverableDependency`, not a scalar `dependsOn` column; the deps assertion initially read the wrong (absent) column. *Recovery:* assertion now counts `deliverableDependency` rows.
3. **QualityLevel is a string-enum array** (`QualityLevel[]`: BASIC|COMPETITIVE|COMMERCIAL|COMMERCIAL_PLUS|DIFFERENTIATOR), not `{id,level}` objects — initial QLT test payload was rejected. *Recovery:* test sends `targetLevels: ["COMMERCIAL"]`.
4. **`createQualityProfile` signature mismatch** — lib took a single input object but route/test passed `(projectId, input)`. *Recovery:* aligned to `(projectId, input)`; `projectId` optional in schema (service injects it).
5. **NFR-003 strict-TS gate** — introduced `any`/`as any` in new source + tests. *Recovery:* typed `toRecord` via a structural `TemplateWithRelations` interface, `parseJson` as generic `<T>`, `qualityProfile: SeedProfile | null`, and the test `def` as `TemplateDef`; removed all casts.

No scope change. No unregistered production stubs (PH-002/003/004 configuration placeholders remain owner-owned, non-blocking).

## Tracker updates

- `BUILD_MANIFEST.yaml` — phase 6 COMPLETE, currentPhase 6, phase 7 READY.
- `PROJECT_STATUS.md` — current phase Phase 06 COMPLETE; Phase 07 READY.
- `02-requirements/REQUIREMENTS_TRACEABILITY.csv` — TPL-001, TPL-002, TPL-003, QLT-001 → COMPLETE with passing evidence.
- `09-hermes/EXECUTION_QUEUE.yaml` — P06-001..008 COMPLETE; activePhase PHASE_06.
- `09-hermes/EXECUTION_STATE.json` — PHASE_06 COMPLETE, PHASE_07 READY.
- `09-hermes/HERMES_ACTIVITY_LOG.md` — Phase 06 entry appended.
- `CHANGELOG.md` — Phase 06 entry prepended.

## Next action

Await owner review of this report; authorize Phase 07 (Dashboards and Environment Identity) via `09-hermes/prompts/REUSABLE_PHASE_PROMPT.md`.
