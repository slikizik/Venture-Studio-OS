# Hermes Execution Prompt

The Product Doctrine at `01-product/VSO_PRODUCT_DOCTRINE.md` and Product Intent Alignment Policy at `09-hermes/PRODUCT_INTENT_ALIGNMENT_POLICY.md` are mandatory context for implementation. Product intent outranks convenient local implementation.


You are the implementation agent for Venture Studio OS.

The complete and authoritative project specification is contained in this repository. Do not rely on assumptions from previous conversations.

Begin by reading these files in order:

1. `START_HERE.md`
2. `HERMES_EXECUTION_PROMPT.md`
3. `BUILD_MANIFEST.yaml`
4. `PROJECT_STATUS.md`
5. `09-hermes/HERMES_RULES.md`
6. `09-hermes/AUTONOMOUS_EXECUTION_POLICY.md`
7. `09-hermes/DIRECTION_REQUIRED_PROTOCOL.md`
8. `09-hermes/ASSUMPTION_POLICY.md`
9. `09-hermes/RETRY_POLICY.yaml`
10. `09-hermes/STOP_CONDITIONS.yaml`
11. `09-hermes/EXECUTION_QUEUE.yaml`
12. `09-hermes/CONTEXT_LOADING_ORDER.md`
13. `01-product/MVP_SCOPE.md`
14. `01-product/OUT_OF_SCOPE.md`
15. `02-requirements/FUNCTIONAL_REQUIREMENTS.md`
16. `02-requirements/NON_FUNCTIONAL_REQUIREMENTS.md`
17. `04-architecture/SYSTEM_ARCHITECTURE.md`
18. `04-architecture/TECH_STACK.md`
19. `08-quality/DEFINITION_OF_DONE.md`
20. `07-build-phases/PHASE_00_VALIDATION.md`

Your current assignment is PHASE 00 only.

Do not write application code during Phase 00.

Validate that the specification is internally consistent, sufficiently complete, and implementable. Check product scope, architecture, data model, screen contracts, requirements, tests, project templates, governance controls, autonomous execution rules, environment-isolation rules, and phase dependencies.

Create `PHASE_00_REPORT.md` containing:

- files reviewed;
- missing specifications;
- contradictions;
- ambiguous requirements;
- architecture risks;
- security risks;
- incomplete acceptance criteria;
- requirements that cannot currently be tested;
- recommended corrections;
- final readiness result.

Classify each issue as BLOCKING, IMPORTANT, or MINOR.

Apply bounded autonomy during validation: resolve routine recoverable issues, record permitted assumptions, continue unaffected checks, and create a formal direction request only when a configured stop condition is met.

You may correct spelling, broken internal links, and unambiguous formatting errors. Do not alter product scope, architecture, workflows, or approved behaviour.

Update `PROJECT_STATUS.md`, `BUILD_MANIFEST.yaml`, `09-hermes/EXECUTION_QUEUE.yaml`, and `09-hermes/HERMES_ACTIVITY_LOG.md` after completing validation.

Do not begin Phase 01.

Finish by reporting the exact files created or modified and whether Phase 01 is READY or BLOCKED.


## Operational readiness gate

Before long-running execution, read `09-hermes/OPERATIONAL_READINESS_REGISTER.md`, `09-hermes/PLACEHOLDER_POLICY.md`, and `09-hermes/PLACEHOLDER_REGISTER.yaml`, then run `python scripts/preflight.py` for the active phase. A passing structural validator does not authorize bypassing untested live integrations, overdue placeholders, unsafe Git state, or open direction requests.