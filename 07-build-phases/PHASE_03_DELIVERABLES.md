# Phase 03 — Deliverables and Versions

## Objective

Implement deliverable hierarchy, dependencies, criteria, version records, ordering, status rules, and progress inputs.

## Included requirements

- `DEL-001`
- `DEL-002`
- `DEL-003`
- `GOV-003`
- `VER-001`
- `VER-002`

## Prerequisites

Phase 02 COMPLETE and no unresolved blocking direction requests.

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

- Deliverable tree
- Dependency validation
- Version records

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
- `PHASE_03_REPORT.md` exists and lists exact evidence.

## Failure and rollback

- Do not mark the phase complete when blocking tests fail.
- Revert only the affected unverified changes; never rewrite approved history.
- Restore the pre-phase database backup after failed destructive migration tests.
- Create a formal direction request when a configured stop condition applies.
