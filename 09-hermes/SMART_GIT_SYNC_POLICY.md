# Smart Git Commit Sync Policy

## Purpose

Git is the default synchronization and workstation-handoff mechanism for Venture Studio OS. Manual folder copying is a recovery option, not the normal workflow.

## Core rule

> Work on one workstation, checkpoint repository state, run validation, commit, push, then resume on the other workstation by fetching and fast-forwarding before Hermes continues.

## Authoritative helper

Use from the repository root:

```text
python scripts/vso_git_sync.py status
python scripts/vso_git_sync.py handoff
python scripts/vso_git_sync.py resume
```

On Windows, `py scripts/vso_git_sync.py ...` is also acceptable when `python` is not the launcher name.

## Handoff semantics

`handoff` must:

1. verify this is a Git repository;
2. reject detached HEAD;
3. reject automated handoff from `main`;
4. verify prohibited machine-local/generated files are not tracked;
5. fetch `origin`;
6. stop if the remote upstream contains newer commits;
7. run `scripts/validate_package.py` when present;
8. stage repository changes;
9. create a focused handoff commit when changes exist;
10. push the active branch, setting upstream on first push;
11. report `HANDOFF READY` only after a successful push.

It must never force-push or silently merge.

## Resume semantics

`resume` must:

1. require a clean local worktree;
2. fetch `origin`;
3. resolve/set the same branch upstream when possible;
4. stop if histories diverged;
5. stop if this workstation has unpushed commits;
6. pull using `--ff-only` when remote is ahead;
7. run package validation when present;
8. report `RESUME READY` only after synchronization succeeds.

Hermes must not continue project execution after a failed resume.

## Cross-platform rule

Windows and Linux may share the same repository. Do not commit OS-specific dependencies, build outputs, secrets, live runtime files, or machine-specific absolute paths. Recreate dependencies locally from lockfiles.

`.gitattributes` defines stable line-ending behaviour. `.vso-machine.local.json` is machine-local and ignored by Git. Copy `.vso-machine.example.json` to create it on each workstation.

## Remote

Use a private Git remote. `origin` must point to the shared authoritative repository before cross-workstation handoff is used.

## Hermes behaviour

When the owner says they are changing computers or ending work on one workstation, Hermes should ensure project/phase state is updated and then run `handoff`. On the receiving workstation Hermes must run `resume` before changing project files.

If synchronization is blocked, follow `09-hermes/DIRECTION_REQUIRED_PROTOCOL.md` only when owner direction is truly required; ordinary Git conflicts should first be diagnosed without destructive actions.


## Remote execution lease

`resume` must acquire the project/branch lease using `scripts/vso_execution_lease.py`; `handoff` must release it after a successful push. The lease is stored in a dedicated Git remote ref and must be held by only one workstation at a time. A conflicting unexpired lease is a stop condition, not a reason to force or overwrite the lock.
