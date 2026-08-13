# Phase 00 — Specification and Runtime-Control Validation

## Objective

Validate that the Build Bible and Hermes control layer are complete, internally consistent, testable, and safe to implement. Do not write Venture Studio OS application code.

## Included scope

- all product and requirement documents;
- requirement traceability structure;
- data and workflow contracts;
- screen contracts;
- project templates;
- quality/test contracts;
- Hermes autonomy and direction rules;
- Git/worktree/environment rules;
- backup/recovery contracts;
- optional Telegram control-plane scripts and policies;
- phase dependencies and readiness.

## Prerequisites

None.

## Excluded work

- VSO application implementation;
- production database creation;
- application dependency installation;
- enabling Telegram routes without owner-supplied IDs/token.

## Mandatory context

Follow `09-hermes/CONTEXT_LOADING_ORDER.md` and include `09-hermes/EXECUTION_STATE.json`. If Telegram control will be used, also load `09-hermes/telegram/*` and `docs/TELEGRAM_CONTROL_GUIDE.md`.

## Validation tasks

1. Confirm all required repository paths exist.
2. Confirm every requirement ID is unique and represented in `02-requirements/REQUIREMENTS_TRACEABILITY.csv`.
3. Confirm each implementation-phase requirement maps to an acceptance criterion and test ID.
4. Validate field-level data schemas, enums, relationships, state transitions, archive/delete rules, audit rules, progress rules, and health rules for internal consistency.
5. Validate every phase specification has objective, scope, prerequisites, tasks, verification, deliverables, definition of done, and failure behaviour.
6. Validate project-template schema consistency and version fields.
7. Validate JSON/YAML/CSV syntax.
8. Run Python syntax checks for operational scripts.
9. Run `python3 -m unittest scripts/tests/test_telegram_control.py -v` when Python 3 is available.
10. Validate Telegram route uniqueness with `python3 scripts/verify_project_routing.py`; zero enabled routes is valid before owner configuration.
11. Verify the Hermes CLI commands referenced by the package against the installed/current Hermes version. Record material incompatibilities as blockers.
12. Verify current mutually compatible application-tool versions from official sources and record approved versions in `04-architecture/APPROVED_VERSIONS.yaml`; do not install the application stack.
13. Resolve only routine formatting, path, and unambiguous consistency issues.
14. Record assumptions and create direction requests for consequential unresolved choices.
15. Produce `PHASE_00_REPORT.md` with exact evidence and readiness.

## Required deliverables

- `PHASE_00_REPORT.md`
- updated validation evidence in the phase report;
- `04-architecture/APPROVED_VERSIONS.yaml` populated or clearly blocked;
- corrected tracking records where validation uncovered unambiguous defects.

## Required verification

- no duplicate requirement IDs;
- every requirement is traceable to a phase, acceptance criterion, and test or is explicitly deferred;
- data/state contracts contain no unresolved contradiction;
- build phases are executable without hidden design choices;
- operational Python scripts compile;
- packaged Telegram unit tests pass when Python 3 is available;
- no enabled Telegram route is duplicated;
- no unresolved CRITICAL specification blocker remains;
- Phase 01 prerequisites are objectively satisfied before it is marked `READY`.

## Definition of done

Phase 00 does **not** mark product requirements complete. It validates their readiness.

Phase 00 is complete when:

- all Phase 00 queue items are complete or explicitly blocked;
- validation checks and evidence are recorded;
- every unresolved consequential issue has a direction request;
- `PROJECT_STATUS.md`, `BUILD_MANIFEST.yaml`, `CHANGELOG.md`, `09-hermes/EXECUTION_QUEUE.yaml`, and `09-hermes/HERMES_ACTIVITY_LOG.md` are updated;
- `PHASE_00_REPORT.md` exists;
- Phase 01 is marked `READY` only if no blocking specification issue remains.

## Failure and rollback

- Do not begin Phase 01 while Phase 00 is blocked.
- Revert only unverified Phase 00 corrections; never rewrite approved history.
- Do not insert owner secrets or Telegram tokens into tracked files.
- Create a formal direction request when a configured stop condition applies.


## Pre-implementation hardening checks

- Run `python scripts/preflight.py --phase PHASE_00` at phase start.
- Audit `09-hermes/PLACEHOLDER_REGISTER.yaml`; resolve PH-001 by verifying and pinning the approved toolchain.
- Run Telegram operational unit tests including fail-closed authorization, direction-option validation, duplicate/closed response rejection, and project-worker isolation.
- Validate that free-form Telegram messages cannot invoke Hermes.
- Validate Smart Git Sync plus the remote execution lease using a local bare Git remote simulation.
- Confirm `BUILD_MANIFEST.yaml` and `09-hermes/EXECUTION_STATE.json` identify specification baseline v1.7.0.
- Run `python scripts/preflight.py --phase PHASE_00 --completion` before marking Phase 01 READY.

## Product alignment validation

- Validate `01-product/VSO_PRODUCT_DOCTRINE.md`, `01-product/PRODUCT_ALIGNMENT_GATE.md`, `01-product/SEVL_SCOPE.md`, and all new commercial-quality contracts.
- Run `python scripts/validate_product_alignment.py`.
- Confirm the architecture can implement the five engines without turning Hermes into the system-of-record.
- Confirm Phase 01 can begin without unresolved contradiction between commercial quality, autonomy, local-first MVP, and SEVL scope.
- Update the final Phase 00 report with `PRODUCT ALIGNMENT: APPROVED`, `BLOCKED`, or `NEEDS_DIRECTION`.
