# START HERE — Venture Studio OS v1.7.0

**Primary owner path:** open `docs/OWNER_RUNBOOK.md` and follow it top to bottom.

**Product intent:** read `01-product/VSO_PRODUCT_DOCTRINE.md`.

**First Hermes prompt:** `09-hermes/prompts/BOOTSTRAP_PROMPT.md`.

**Architecture reading:** `docs/architecture-atlas/README.md`.

---

# Venture Studio OS — Start Here

> **Specification package:** v1.7.0 — Product Alignment Baseline  
> **Target application:** Venture Studio OS v0.1.0  
> **Current authorized phase:** Phase 00 — Validation

Venture Studio OS is a universal project operating system for managing software, books, learning products, business ventures, and creative products. This repository is the authoritative source of truth. Chat history is supporting context only.

## Owner quick start

Follow the exact instructions in [`docs/OWNER_BUILD_GUIDE.md`](docs/OWNER_BUILD_GUIDE.md).

The two prompts you will paste into Hermes are:

1. **First run only:** [`09-hermes/prompts/BOOTSTRAP_PROMPT.md`](09-hermes/prompts/BOOTSTRAP_PROMPT.md)
2. **Every approved later phase:** [`09-hermes/prompts/REUSABLE_PHASE_PROMPT.md`](09-hermes/prompts/REUSABLE_PHASE_PROMPT.md)

Convenience copies also exist at the repository root:

- [`bootstrap prompt.md`](bootstrap%20prompt.md)
- [`reusable prompt.md`](reusable%20prompt.md)

## When Hermes needs your direction

Read [`docs/HOW_TO_ANSWER_DIRECTION_REQUESTS.md`](docs/HOW_TO_ANSWER_DIRECTION_REQUESTS.md). Hermes must create a file under:

```text
09-hermes/direction-requests/
```

Reply using the template at:

```text
09-hermes/templates/OWNER_DIRECTION_RESPONSE_TEMPLATE.md
```

## Required reading order for Hermes

The machine-readable order is defined in:

```text
09-hermes/CONTEXT_LOADING_ORDER.md
```

The build-control state is held in:

```text
BUILD_MANIFEST.yaml
PROJECT_STATUS.md
09-hermes/EXECUTION_QUEUE.yaml
09-hermes/HERMES_ACTIVITY_LOG.md
02-requirements/REQUIREMENTS_TRACEABILITY.csv
```

## Core operating rule

> Humans define intent and approve consequential choices. Agents execute approved work, test it, document it, and stop only under defined stop conditions.

## Initial repository workflow

1. Extract this package into a new project folder.
2. Initialize Git if the folder is not already a repository.
3. Commit the untouched specification as `Specification Baseline v1.7.0`.
4. Tag that commit `spec-v1.7.0`.
5. Create and switch to branch `develop`.
6. Open the folder in Hermes.
7. Paste [`09-hermes/prompts/BOOTSTRAP_PROMPT.md`](09-hermes/prompts/BOOTSTRAP_PROMPT.md).
8. Authorize Phase 00 only.
9. Review `PHASE_00_REPORT.md` before authorizing Phase 01.

Do not authorize continuous implementation through Phase 09 until Phase 00 reports **READY** and you have reviewed all direction requests.

## Optional Telegram control plane

After Phase 00 is healthy and normal Hermes CLI operation is verified, you may configure remote project control using:

```text
docs/TELEGRAM_CONTROL_GUIDE.md
```

This provides one Telegram bot with deterministic per-project topic routing to separate Hermes profiles. Telegram is transport only; owner decisions are persisted in repository files before Hermes resumes.


## Two-computer smart Git synchronization

Git is the default way to move VSO work between computers, including Windows and Linux. Read:

```text
docs/SMART_GIT_SYNC_GUIDE.md
```

The operational helper is:

```text
scripts/vso_git_sync.py
```

Before working on a computer, run `python scripts/vso_git_sync.py resume`. Before switching away, run `python scripts/vso_git_sync.py handoff`. Continue only after `RESUME READY` or `HANDOFF READY` respectively.

## Understand the architecture visually

Start with the layered Architecture Atlas:

```text
docs/architecture-atlas/README.md
```

It begins with layperson views and progressively reaches developer/architect detail. Mermaid sources are under `docs/diagrams/mermaid/`; deeper PlantUML views are under `docs/diagrams/plantuml/`.


## Viewing architecture in Obsidian

Open `docs/architecture-atlas/README.md`. Mermaid renders natively; technical pages 12–18 also contain inline PlantUML designed for an enabled Obsidian PlantUML plugin. Setup/read guidance: `docs/OBSIDIAN_DIAGRAM_GUIDE.md`.


## Operational Readiness — read before executing

Before giving Hermes long-running autonomy, read `09-hermes/OPERATIONAL_READINESS_REGISTER.md`. It tells you what is verified, what is only ready for live testing, what remains intentionally unconfigured, and what blocks deployment.

Intentional unresolved values are tracked in `09-hermes/PLACEHOLDER_REGISTER.yaml`; the rules are in `09-hermes/PLACEHOLDER_POLICY.md`. Run `python scripts/preflight.py` to catch due placeholders, stale baseline metadata, and readiness defects before debugging application code.
