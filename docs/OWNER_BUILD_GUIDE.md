# Owner Build Guide

> For the simplest end-to-end operating instructions, use `docs/OWNER_RUNBOOK.md` as the primary guide. This document remains the detailed build reference.


This is the primary human instruction manual for building Venture Studio OS with Hermes.

## 1. Prepare the project

1. Extract `Venture-Studio-OS_Build-Package_v1.7.0.zip` into a permanent project folder.
2. Open the extracted `Venture-Studio-OS` folder in VS Code or your preferred editor.
3. Read [`../START_HERE.md`](../START_HERE.md).
4. Confirm that `BUILD_MANIFEST.yaml` shows Phase 00 as `READY` and all later phases as `NOT_STARTED`.

## 2. Create the specification baseline

Run these commands from the repository root:

```bash
git init
git add .
git commit -m "Specification Baseline v1.7.0"
git tag spec-v1.7.0
git branch develop
git switch develop
```

If Git is already initialized, do not reinitialize it. Confirm there are no uncommitted changes before continuing.

## 3. Start Hermes for the first time

Open the repository folder in Hermes. Copy the full contents of:

```text
09-hermes/prompts/BOOTSTRAP_PROMPT.md
```

Paste it into Hermes. A convenience copy exists at:

```text
bootstrap prompt.md
```

The bootstrap prompt authorizes **Phase 00 only**. Hermes must not write application code during this phase.

## 4. Review Phase 00

Hermes must create:

```text
PHASE_00_REPORT.md
```

Review:

- readiness result;
- blocking issues;
- important issues;
- assumptions;
- direction requests;
- files modified;
- whether Phase 01 was marked `READY` or `BLOCKED`.

Do not proceed when Phase 00 is blocked.

## 5. Answer direction requests

Hermes stores each direction request in:

```text
09-hermes/direction-requests/DIRECTION_REQUIRED_<ID>.md
```

Read [`HOW_TO_ANSWER_DIRECTION_REQUESTS.md`](HOW_TO_ANSWER_DIRECTION_REQUESTS.md). Copy the response template from:

```text
09-hermes/templates/OWNER_DIRECTION_RESPONSE_TEMPLATE.md
```

Save your answer under:

```text
09-hermes/direction-responses/OWNER_RESPONSE_<ID>.md
```

Then tell Hermes:

```text
Read 09-hermes/direction-responses/OWNER_RESPONSE_<ID>.md, record the decision, resume the affected work, and continue all other approved work.
```

## 6. Start each later phase

When the next phase is marked `READY`, copy the full contents of:

```text
09-hermes/prompts/REUSABLE_PHASE_PROMPT.md
```

A convenience copy exists at:

```text
reusable prompt.md
```

Paste it into Hermes. Use the same reusable prompt for every later phase.

Hermes must execute only the next phase marked `READY`, unless you explicitly authorize multi-phase continuous execution after Phase 00.

## 7. Review every phase completion

At the end of each phase, confirm that Hermes updated:

```text
PROJECT_STATUS.md
BUILD_MANIFEST.yaml
CHANGELOG.md
02-requirements/REQUIREMENTS_TRACEABILITY.csv
09-hermes/EXECUTION_QUEUE.yaml
09-hermes/HERMES_ACTIVITY_LOG.md
```

Hermes must also create:

```text
PHASE_<NN>_REPORT.md
```

A phase is complete only when its definition of done and all blocking tests pass.

## 8. Recommended autonomy modes

### Supervised mode

Use during Phase 00 and Phase 01. Hermes completes one phase and stops.

### Controlled continuous mode

After the foundation is stable, you may authorize Hermes to continue through all phases marked `READY`. Use:

```text
Continue autonomously through phases marked READY. Do not request routine confirmation. Stop only for a configured direction-required or critical stop condition. Complete and report each phase separately before starting the next.
```

### Never use unrestricted autonomy

Do not instruct Hermes to continue regardless of failures. The stop conditions in `09-hermes/STOP_CONDITIONS.yaml` must remain authoritative.

## 9. Simultaneous software versions

Read:

```text
docs/PARALLEL_TESTING_GUIDE.md
09-hermes/PARALLEL_ENVIRONMENT_RULES.md
09-hermes/VERSION_CONTROL_POLICY.md
```

Use one branch, worktree, port, database, storage folder, and log folder per active software change.

## 10. Releases and modifications after build

Read:

```text
docs/MODIFYING_VSO_AFTER_RELEASE.md
06-workflows/CHANGE_REQUEST_WORKFLOW.md
```

Never modify the only verified release directly. Create a change request and isolated branch/worktree first.

## 11. Working between two computers

Git smart sync is the default workstation handoff method. This works between Windows and Linux. Read:

```text
docs/SMART_GIT_SYNC_GUIDE.md
09-hermes/SMART_GIT_SYNC_POLICY.md
```

On every workstation, create a machine-local identity by copying:

```text
.vso-machine.example.json
```

to:

```text
.vso-machine.local.json
```

Before starting work on a workstation:

```bash
python scripts/vso_git_sync.py resume
```

Before leaving that workstation or moving the project to the other computer:

```bash
python scripts/vso_git_sync.py handoff
```

Do not continue on the second computer until the first reports `HANDOFF READY`, and the second reports `RESUME READY`. The helper refuses dirty pulls, force pushes, divergent histories, newer remote commits during handoff, and automated handoff from `main`.

Machine-local dependencies, build outputs, secrets, and absolute paths are not synchronized through Git. Recreate dependencies locally from lockfiles.

## 12. Optional Telegram remote control

Configure Telegram only after a normal Hermes CLI chat works and Phase 00 validation is healthy. Follow:

```text
docs/TELEGRAM_CONTROL_GUIDE.md
```

The functional implementation files are:

```text
09-hermes/telegram/PROJECT_COMMUNICATION_REGISTRY.json
scripts/telegram_router.py
scripts/telegram_notify.py
scripts/setup_project_profiles.py
scripts/save_execution_checkpoint.py
scripts/verify_project_routing.py
scripts/install_telegram_service.sh
```

Use **one bot and one router process**. Each project gets its own Telegram topic, Hermes profile, repository route, decision records, and execution state. Do not configure the same bot token in multiple profile gateways.

A Telegram direction answer is valid only after the router successfully writes `09-hermes/direction-responses/OWNER_RESPONSE_<ID>.md`. The repository record remains authoritative.

## 13. Understand the system architecture

Open:

```text
docs/architecture-atlas/README.md
```

Start with Levels 0–1 for a plain-English understanding. Continue through Levels 2–3 for operational architecture and workflows. Levels 4–5 are intended for developers, architects, operations, and security review.

Mermaid source files are in:

```text
docs/diagrams/mermaid/
```

PlantUML technical sources are in:

```text
docs/diagrams/plantuml/
```

Hermes must follow `09-hermes/ARCHITECTURE_DIAGRAM_POLICY.md` whenever changes affect the system architecture or workflows.


## Architecture Atlas in Obsidian

Open `docs/architecture-atlas/README.md`. For PlantUML setup and reading behavior, use `docs/OBSIDIAN_DIAGRAM_GUIDE.md`. Technical Atlas pages 12–18 contain inline PlantUML plus matching `.puml` source files.


# Operational readiness and placeholder control

Use `09-hermes/OPERATIONAL_READINESS_REGISTER.md` as the live readiness dashboard. Do not interpret a passing package validator as proof that external integrations or the VSO application itself have been tested.

Before each phase run:

```bash
python scripts/preflight.py --phase PHASE_XX
```

Before approving phase completion run:

```bash
python scripts/preflight.py --phase PHASE_XX --completion
```

Review intentional unresolved items in `09-hermes/PLACEHOLDER_REGISTER.yaml`. Each item identifies exactly where it exists, who resolves it, when it becomes due, and what test proves conversion to functional behaviour. Unregistered runtime stubs are defects.

For cross-PC work, `vso_git_sync.py resume` acquires the remote execution lease after synchronization; `handoff` pushes the branch and releases the lease. Only one workstation should own autonomous execution for a project/branch at a time.