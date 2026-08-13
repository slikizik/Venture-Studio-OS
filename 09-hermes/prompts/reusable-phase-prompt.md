# Reusable Phase Prompt — Use After Phase 00

Resume Venture Studio OS from the repository state.

Read the exact files listed in `09-hermes/CONTEXT_LOADING_ORDER.md`. Determine the next phase marked `READY` in `BUILD_MANIFEST.yaml` and read its complete specification.

Execute that phase only unless the owner has explicitly authorized controlled continuous mode.

Before implementation:

- read `01-product/VSO_PRODUCT_DOCTRINE.md`, `01-product/SEVL_SCOPE.md`, `01-product/ARCHITECTURE_FREEZE.md`, and `09-hermes/PRODUCT_INTENT_ALIGNMENT_POLICY.md`; do not optimize local code at the expense of product intent;

0. read `09-hermes/OPERATIONAL_READINESS_REGISTER.md`, `09-hermes/PLACEHOLDER_POLICY.md`, and `09-hermes/PLACEHOLDER_REGISTER.yaml`; run `python scripts/preflight.py --phase PHASE_<NN>` and stop if it is blocked;

1. identify every requirement assigned to the phase;
2. verify all prerequisites and direction responses;
3. map each requirement to data, workflows, screens, tests, and evidence;
4. seed or update `09-hermes/EXECUTION_QUEUE.yaml`;
5. create a pre-phase backup when data or migrations may be affected;
6. confirm the current Git branch is not protected `main` for unfinished work;
7. update the configured execution-state checkpoint before risky or long-running work;
8. if this is a newly resumed workstation session, run `python scripts/vso_git_sync.py resume` and stop if it does not report `RESUME READY`.

During implementation:

- route useful non-blocking scope ideas to `01-product/BACKLOG.md` instead of expanding the active phase;

- follow normative contracts exactly;
- implement real functionality, not placeholders; register every intentional configuration/deferred/test placeholder and never leave an unregistered production stub;
- add tests alongside implementation;
- preserve completed behaviour;
- maintain bounded autonomy;
- retry recoverable failures according to policy;
- record assumptions in `09-hermes/ASSUMPTION_LOG.md`;
- record decisions in `09-hermes/DECISION_LOG.md`;
- create direction requests only under configured stop conditions;
- continue unaffected work while an item is blocked;
- maintain `09-hermes/HERMES_ACTIVITY_LOG.md` and the execution queue;
- keep `09-hermes/EXECUTION_STATE.json` current at meaningful checkpoints;
- when Telegram control is enabled, use the registered project route for notifications and never infer project identity from message text;
- persist owner direction responses in the repository before resuming affected work.

Before completion:

- run `python scripts/preflight.py --phase PHASE_<NN> --completion`; do not complete the phase while a due placeholder or operational gate is unresolved;

- run required tests and affected regression tests;
- verify every acceptance criterion;
- verify persistence, audit records, invalid paths, and recovery where applicable;
- update `02-requirements/REQUIREMENTS_TRACEABILITY.csv` with evidence paths;
- update `PROJECT_STATUS.md`, `BUILD_MANIFEST.yaml`, `CHANGELOG.md`, `09-hermes/EXECUTION_QUEUE.yaml`, and `09-hermes/HERMES_ACTIVITY_LOG.md`;
- create `PHASE_<NN>_REPORT.md` using `09-hermes/PHASE_COMPLETION_TEMPLATE.md`;
- checkpoint the final phase state as safe-to-resume/idle before handing off;
- when the owner is switching computers or ending work for cross-workstation continuation, run `python scripts/vso_git_sync.py handoff` and report success only after `HANDOFF READY`.

Mark the phase `COMPLETE` only when its definition of done is fully satisfied. Otherwise mark it `PARTIAL` or `BLOCKED`.

Do not silently change scope, architecture, data rules, or approved behaviour. Do not begin the next phase unless controlled continuous mode is explicitly authorized and the next phase is `READY`.

## Architecture diagram maintenance

If the phase changes architecture, domain relationships, states, workflows, integrations, routing, deployment, runtime environments, or security boundaries, read `09-hermes/ARCHITECTURE_DIAGRAM_POLICY.md`, update affected `docs/architecture-atlas/` views and matching diagram sources, then run `python scripts/validate_architecture_atlas.py` before phase completion. Do not invent architecture merely to complete a diagram.


## SEVL priority

Until `TEST-SEVL-001` has passed, prioritize completing/protecting the smallest end-to-end loop over optional breadth or polish. Phase 05 cannot be COMPLETE without retained SEVL evidence.
