# Phase 08 — Testing, Data Portability, and Hardening

## Objective

Complete automated tests, accessibility, performance, import/export, backup restore, isolation, persistence, and security validation.

## Included requirements

- `ENV-003`
- `DAT-001`
- `DAT-002`
- `DAT-003`
- `DAT-005`
- `NFR-002`
- `NFR-004`
- `NFR-005`
- `NFR-006`
- `NFR-010`

## Prerequisites

Phase 07 COMPLETE and no unresolved blocking direction requests.

## Excluded work

Requirements assigned to later phases; unapproved scope expansion; major dependency upgrades.

## Mandatory context

- `START_HERE.md`
- `BUILD_MANIFEST.yaml`
- `PROJECT_STATUS.md`
- `09-hermes/HERMES_RULES.md`
- `09-hermes/AUTONOMOUS_EXECUTION_POLICY.md`
- `09-hermes/DIRECTION_REQUIRED_PROTOCOL.md`
- `04-architecture/DATA_MODEL.md`
- `03-ux-design/SCREEN_SPECIFICATIONS.md`
- `02-requirements/ACCEPTANCE_CRITERIA.md`
- `08-quality/TEST_CASES.md`

## Implementation tasks

1. Load every included requirement and its traceability row.
2. Initialize queue items for design, implementation, testing, documentation, and reporting.
3. Implement only behaviour authorized by the normative contracts.
4. Add tests before marking any requirement complete.
5. Record assumptions, activities, and consequential decisions.
6. Run regression tests for all previously completed phases.
7. Update tracking files and produce the phase report.

## Required deliverables

- Full test evidence
- Export/import
- Recovery test
- Hardening report

## Required verification

- Every included requirement has passing evidence.
- Invalid and boundary cases are tested.
- Persistence is verified where applicable.
- Audit records are verified where applicable.
- No unrelated completed behaviour regresses.
- No unresolved critical or blocking issue remains.

## Definition of done

- All included requirements are `COMPLETE` in `02-requirements/REQUIREMENTS_TRACEABILITY.csv`.
- Required automated tests pass.
- Required manual checks are documented and passed.
- `PROJECT_STATUS.md`, `BUILD_MANIFEST.yaml`, `CHANGELOG.md`, `09-hermes/EXECUTION_QUEUE.yaml`, and `09-hermes/HERMES_ACTIVITY_LOG.md` are updated.
- `PHASE_08_REPORT.md` exists and lists exact evidence.

## Failure and rollback

- Do not mark the phase complete when blocking tests fail.
- Revert only the affected unverified changes; never rewrite approved history.
- Restore the pre-phase database backup after failed destructive migration tests.
- Create a formal direction request when a configured stop condition applies.
