# Level 3 — Smart Git Cross-PC Handoff

> **Reading level:** Level 3 — Workflow
> **Purpose:** Understand safe Windows/Linux project switching
> **Source of truth:** `09-hermes/SMART_GIT_SYNC_POLICY.md`, `docs/SMART_GIT_SYNC_GUIDE.md`

Git is the normal cross-workstation synchronization mechanism. The helper deliberately refuses unsafe automatic merges or overwrites.

## Diagram

```mermaid
flowchart LR
  A[PC A owns execution lease] --> WorkA[Work + checkpoint]
  WorkA --> Handoff[Smart Git handoff]
  Handoff --> ValidateA[Validate + fetch + commit + push]
  ValidateA --> Release[Release remote execution lease]
  Release --> Remote[(Private Git remote)]
  Remote --> Resume[PC B: Smart Git resume]
  Resume --> ValidateB[Clean check + fetch + ff-only + validation]
  ValidateB --> Acquire[Acquire remote execution lease]
  Acquire --> B[PC B: RESUME READY]
  B --> WorkB[Continue work]
```

## What this means

You can move between Windows and Linux because source/state are synchronized while dependencies, secrets, build outputs, and machine identity remain local.

## Technical notes

`scripts/vso_git_sync.py` implements status/handoff/resume. It rejects dirty pulls, diverged histories, force pushes, newer remote commits during handoff, and automated handoff from `main`. `scripts/vso_execution_lease.py` uses a dedicated Git remote ref plus atomic force-with-lease updates so only one workstation owns autonomous execution of a project/branch at a time.
