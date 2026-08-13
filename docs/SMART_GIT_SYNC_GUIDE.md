# Smart Git Sync Guide — Two Computers

This is the default VSO workflow when moving between Windows and Linux or between two computers of the same operating system.

## One-time setup on Computer 1

From the VSO repository root, configure a **private** Git remote named `origin`, then push the current approved development branch. Example:

```bash
git remote add origin <YOUR_PRIVATE_REPOSITORY_URL>
git push -u origin develop
```

Create the local workstation identity:

```text
.vso-machine.example.json  →  .vso-machine.local.json
```

Edit `machineId`, for example `windows-main`.

## One-time setup on Computer 2

Clone the same private repository rather than copying dependencies:

```bash
git clone <YOUR_PRIVATE_REPOSITORY_URL>
cd Venture-Studio-OS
git switch develop
```

Create `.vso-machine.local.json` with a different ID such as `linux-main`.

Install the versions/dependencies required by the project. Do not copy `node_modules`, build folders, caches, secrets, or a live database merely to synchronize source code.

## Before starting work on either computer

Run:

```bash
python scripts/vso_git_sync.py resume
```

Windows may use:

```powershell
py scripts/vso_git_sync.py resume
```

Only continue when the command reports:

```text
RESUME READY
```

`resume` refuses to overwrite a dirty worktree and refuses automatic merges when histories diverge.

## When leaving that computer

First allow Hermes to finish its current atomic action and update its project records. Then run:

```bash
python scripts/vso_git_sync.py handoff
```

Optional commit message:

```bash
python scripts/vso_git_sync.py handoff --message "Complete Phase 03 deliverable workflow"
```

Only switch computers after:

```text
HANDOFF READY
```

## Daily mental model

```text
Computer A: resume → work → handoff
                            ↓
                     private Git remote
                            ↓
Computer B:          resume → work → handoff
```

## Status only

```bash
python scripts/vso_git_sync.py status
```

This shows the current branch, dirty/clean status, upstream, and whether the local branch is ahead or behind.

## Rules

- One workstation should actively execute a given project at a time.
- Never use `git push --force` for normal VSO synchronization.
- Never manually copy `node_modules` between Windows and Linux.
- Never commit `.env`, `.env.telegram`, `.vso-machine.local.json`, API keys, or credentials.
- Do not run automated handoff from `main`.
- When `resume` or `handoff` blocks, resolve the reported state before Hermes continues.

## Manual copy fallback

Copying the entire repository is possible for recovery, but Git remains the normal synchronization mechanism because it preserves history, detects divergence, and prevents silent replacement of newer work.


## Remote execution lease

`resume` now acquires a Git-remote execution lease for the active branch after synchronization. `handoff` pushes the branch and releases the lease. The lease is stored in a dedicated remote ref under `refs/heads/vso-leases/` and does not modify the project branch.

A second workstation is blocked from acquiring the same project/branch lease while the first workstation owns an unexpired lease. Configure a unique `.vso-machine.local.json` on each PC.

Manual commands:

```bash
python scripts/vso_execution_lease.py status --project VSO
python scripts/vso_execution_lease.py heartbeat --project VSO
python scripts/vso_execution_lease.py release --project VSO
```
