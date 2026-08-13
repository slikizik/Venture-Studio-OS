# Version Control Policy

## Protected official line

`main` represents the latest verified official version. Unfinished work must not be performed directly on `main`.

## Change isolation

Use one branch and, when simultaneous testing is required, one worktree per change.

Naming:

- `feature/<short-name>`
- `fix/<short-name>`
- `docs/<short-name>`
- `release/<version>`

## Required flow

1. Confirm clean repository state.
2. Create branch from the approved base.
3. Create an isolated worktree when parallel work is required.
4. Implement and test the approved change.
5. Compare with `main`.
6. Produce merge-readiness evidence.
7. Merge only after quality gates pass.
8. Tag verified releases.

## Commit rules

- Make focused commits.
- Do not combine unrelated changes.
- Include requirement or change-request IDs when available.
- Never commit credentials, generated secrets, or environment-specific databases.


## Cross-workstation synchronization

`09-hermes/SMART_GIT_SYNC_POLICY.md` is authoritative for moving active work between computers. A private Git remote named `origin` is the synchronization authority. Automatic merges and force pushes are prohibited.
