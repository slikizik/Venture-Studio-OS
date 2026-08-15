# Venture Studio OS — Run Guide

How to install, run, and operate Venture Studio OS (VSO) after unpacking the
release. This is the operational companion to `docs/OWNER_RUNBOOK.md` (which
explains the build/phase governance) and `docs/OWNER_BUILD_GUIDE.md` (which
explains building from source).

## 1. Requirements

- Node.js 22.x (developed against 22.23.1)
- Python 3.11 (for the Hermes orchestration scripts under `scripts/`)
- A private Git remote (recommended before relying on cross-PC Smart Git Sync)
- No external paid services required for the local MVP

## 2. Install

```bash
# from the extracted repository root
cd app
npm install
npx prisma generate
npx prisma db push --accept-data-loss --skip-generate
npm run dev
```

The app serves at http://localhost:3000 (Next.js). The first load runs the
database migrations and seeds no external data.

## 3. Daily operation

- Open VSO in the Hermes desktop agent. The reusable phase prompt drives
  controlled autonomous execution.
- Before any cross-workstation work: `python scripts/vso_git_sync.py resume`
  (continue only after `RESUME READY`).
- Before handing off to another machine:
  `python scripts/vso_git_sync.py handoff --message "..."`
  (continue only after `HANDOFF READY`).

## 4. Quality gates

- `npx tsc --noEmit` — strict TypeScript (no `as any` allowed in `src`).
- `npx vitest run` — full test suite.
- `npm run build` — production Next.js build.
- `python scripts/preflight.py --phase PHASE_<NN>` — phase readiness gate.
- `npm audit --json` — dependency vulnerability scan (NFR-007: no unresolved
  criticals may ship).

## 5. Environments (Phase 09 / ENV-001, ENV-002)

Isolated environments are registered with distinct branch, worktree, port,
database, storage, and log paths. Register via `lib/environments.ts`
(`registerEnvironment`) and record live status with `updateEnvironment`. No two
environments may share a database, storage root, or secret source (enforced by
`lib/isolation.ts`, ENV-003).

## 6. Release readiness (Phase 09 / QLT-004)

A release is gated by `RELEASE_READINESS_MODEL.md`. The state machine is:

```
NOT_READY → TECHNICALLY_READY → COMMERCIAL_REVIEW → COMMERCIAL_READY → RELEASED
```

`TECHNICALLY_READY` is NEVER equivalent to `COMMERCIAL_READY`. A version may be
code-complete and test-green yet still require commercial review (licensing,
pricing, distribution) before `RELEASED`.

## 7. Recovery

If something breaks, run the phase preflight and check, in order: placeholder
status, approved versions, Git state/lease, project/profile routing,
machine-local configuration, prerequisite tests, and specification
contradictions. See `docs/RECOVERY_GUIDE.md` and
`09-hermes/OPERATIONAL_READINESS_REGISTER.md`.
