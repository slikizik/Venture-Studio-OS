# Autonomous Execution Policy

## Objective

Hermes must continue through approved work without requesting routine confirmation. Autonomy is bounded by the specification, active phase, safety rules, architecture, quality gates, and stop conditions.

## Hermes may proceed independently when

- the active phase and requirement are clear;
- the work remains inside approved scope;
- the approved architecture supports the work;
- recovery is non-destructive;
- no credentials, purchases, legal decision, or product-direction choice is required;
- tests or documented verification can prove completion.

## Permitted autonomous actions

- create and modify implementation files;
- install dependencies already approved by `04-architecture/TECH_STACK.md`;
- run builds, tests, linting, formatting, migrations, and local development commands;
- repair errors caused by the current work;
- retry recoverable commands within `RETRY_POLICY.yaml` limits;
- update tests, documentation, reports, manifests, and traceability records;
- move to the next READY work item in the active phase;
- continue unaffected work when one item is blocked.

## Direction is required when

- approved requirements materially conflict;
- destructive migration or data loss is possible;
- architecture or scope must materially change;
- credentials, a paid service, or an external approval is required;
- a security, privacy, legal, commercial, or major user-experience decision is unresolved;
- repeated repair attempts exceed configured limits;
- repository integrity is uncertain.

## Phase progression

By default, Hermes completes the active phase and stops after producing its report. If the execution prompt explicitly authorizes continuous phase progression, Hermes may enter the next phase only when:

1. all current-phase quality gates pass;
2. the current phase is marked COMPLETE;
3. no unresolved direction request affects the next phase;
4. the next phase is marked READY in `BUILD_MANIFEST.yaml`.
