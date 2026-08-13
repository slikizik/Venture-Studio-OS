# Bootstrap Prompt — First Hermes Run Only

You are the implementation agent for Venture Studio OS.

The repository is authoritative. Do not rely on previous chat history when it conflicts with repository files.

Read these exact repository-relative paths in order:

1. `START_HERE.md`
2. `docs/OWNER_RUNBOOK.md`
3. `docs/OWNER_BUILD_GUIDE.md`
3. `HERMES_EXECUTION_PROMPT.md`
4. `BUILD_MANIFEST.yaml`
5. `PROJECT_STATUS.md`
6. `09-hermes/CONTEXT_LOADING_ORDER.md`
7. `09-hermes/HERMES_RULES.md`
8. `09-hermes/AUTONOMOUS_EXECUTION_POLICY.md`
9. `09-hermes/DIRECTION_REQUIRED_PROTOCOL.md`
10. `09-hermes/ASSUMPTION_POLICY.md`
11. `09-hermes/RETRY_POLICY.yaml`
12. `09-hermes/STOP_CONDITIONS.yaml`
13. `09-hermes/EXECUTION_QUEUE.yaml`
14. `09-hermes/ASSUMPTION_LOG.md`
15. `09-hermes/DECISION_LOG.md`
16. `09-hermes/EXECUTION_STATE.json`
17. `09-hermes/OPERATIONAL_READINESS_REGISTER.md`
18. `09-hermes/PLACEHOLDER_POLICY.md`
19. `09-hermes/PLACEHOLDER_REGISTER.yaml`
20. `01-product/VSO_PRODUCT_DOCTRINE.md`
21. `01-product/PRODUCT_ALIGNMENT_GATE.md`
22. `01-product/SEVL_SCOPE.md`
23. `01-product/ARCHITECTURE_FREEZE.md`
24. `09-hermes/PRODUCT_INTENT_ALIGNMENT_POLICY.md`
25. `08-quality/COMMERCIAL_QUALITY_FRAMEWORK.md`
26. `08-quality/BENCHMARKING_PROTOCOL.md`
27. `08-quality/QUALITY_GATE_MODEL.md`
28. `08-quality/EVIDENCE_MODEL.md`
29. `08-quality/RELEASE_READINESS_MODEL.md`
30. `01-product/MVP_SCOPE.md`
21. `01-product/OUT_OF_SCOPE.md`
22. `01-product/GLOSSARY.md`
23. `02-requirements/FUNCTIONAL_REQUIREMENTS.md`
24. `02-requirements/NON_FUNCTIONAL_REQUIREMENTS.md`
25. `02-requirements/REQUIREMENTS_TRACEABILITY.csv`
26. `02-requirements/ACCEPTANCE_CRITERIA.md`
27. `04-architecture/SYSTEM_ARCHITECTURE.md`
28. `04-architecture/DATA_MODEL.md`
29. `04-architecture/TECH_STACK.md`
30. `04-architecture/APPROVED_VERSIONS.yaml`
31. `03-ux-design/SCREEN_SPECIFICATIONS.md`
32. `08-quality/DEFINITION_OF_DONE.md`
33. `08-quality/TEST_CASES.md`
34. `07-build-phases/PHASE_00_VALIDATION.md`

Execute Phase 00 only. Do not write application code.

Before validation work, run `python scripts/preflight.py --phase PHASE_00` and `python scripts/validate_product_alignment.py`. Treat warnings about PH-001 as expected work to resolve during Phase 00; any other blocking preflight failure must be fixed before long-running validation.

Use `09-hermes/EXECUTION_QUEUE.yaml` as the work queue. Validate paths, requirements, traceability, field-level schemas, state transitions, screen contracts, project templates, testability, governance, backup/recovery, environment isolation, phase dependencies, and the packaged Telegram control-plane files. Run the local syntax/unit/routing checks specified by Phase 00; do not require a live bot token unless the owner has configured Telegram.

Verify current mutually compatible stable tool versions from official sources and record exact approved versions in `04-architecture/APPROVED_VERSIONS.yaml`. Do not install the application stack during Phase 00.

Resolve only routine formatting, broken path, and unambiguous consistency issues. Record permitted assumptions in `09-hermes/ASSUMPTION_LOG.md`.

When a consequential choice is required, create `09-hermes/direction-requests/DIRECTION_REQUIRED_<ID>.md` using the direction protocol. Continue all unaffected validation work.

Create `PHASE_00_REPORT.md` with files reviewed, checks performed, issues by severity, direction requests, assumptions, exact files changed, and final readiness.

Update:

- `PROJECT_STATUS.md`
- `BUILD_MANIFEST.yaml`
- `CHANGELOG.md`
- `09-hermes/EXECUTION_QUEUE.yaml`
- `09-hermes/HERMES_ACTIVITY_LOG.md`
- `02-requirements/REQUIREMENTS_TRACEABILITY.csv` only when correcting an unambiguous traceability defect

Before declaring Phase 00 complete, run `python scripts/preflight.py --phase PHASE_00 --completion`; PH-001 must be RESOLVED and `04-architecture/APPROVED_VERSIONS.yaml` must be verified.

Do not begin Phase 01. Finish with `PHASE 01 READY` or `PHASE 01 BLOCKED` and the exact reason.

## Architecture Atlas validation

Validate `docs/architecture-atlas/README.md`, `docs/architecture-atlas/DIAGRAM_TRACEABILITY.csv`, Mermaid sources under `docs/diagrams/mermaid/`, PlantUML sources under `docs/diagrams/plantuml/`, and the rules in `09-hermes/ARCHITECTURE_DIAGRAM_POLICY.md`. Run `python scripts/validate_architecture_atlas.py`. Phase 00 must report any diagram/specification contradictions rather than silently resolving them in the diagrams.


Before finalizing Phase 00, explicitly report Product Alignment as APPROVED, BLOCKED, or NEEDS_DIRECTION. Do not begin application implementation while alignment is blocked.
