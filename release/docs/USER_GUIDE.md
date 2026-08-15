# Venture Studio OS — User Guide

What Venture Studio OS (VSO) does for you and how to use it day to day. This is
the product-usage companion to `docs/RUN_GUIDE.md` (operations) and
`docs/ARCHITECTURE_SUMMARY.md` (how it is built).

## What VSO is

VSO is an **AI Product Development Operating System**. It sits between you (the
owner), your projects, and the agents that do the work. You define intent and
approve consequential choices; VSO structures the work, preserves decisions,
coordinates agents, and proves quality — without you supervising routine
execution all day.

VSO is the operating layer, not the worker and not the project. It keeps work
organized, traceable, reviewable, and recoverable.

## The five engines

VSO moves an idea through five connected responsibilities:

1. **Intent Engine** — capture what should be built (project brief, brain,
   success criteria, benchmarks).
2. **Design Engine** — turn approved intent into requirements, deliverables,
   and executable work packets.
3. **Execution Engine** — agents (e.g. Hermes) execute work packets inside
   approved rules; consequential decisions escalate to you.
4. **Quality Engine** — outputs are verified against requirements and
   commercial-quality gates, not only compilation/tests.
5. **Learning Engine** — feedback, defects, and market learning feed the next
   controlled iteration.

Quality and learning are separate from execution so autonomous work cannot
declare itself commercially ready without evidence.

## Core workflow

1. Create a project from a template.
2. Define the Project Brain (intent, success criteria, quality profile,
   benchmark targets).
3. Confirm stages and quality gates.
4. Create deliverables; link work packets to them.
5. Produce and attach outputs or evidence.
6. Submit work for review; approve, reject, or request revision.
7. Record decisions and risks.
8. Release a project version.
9. Capture feedback and create improvement work.

## Where things live

- Projects, requirements, deliverables, work packets, reviews, decisions, risks,
  versions, and release-readiness records live in the application database
  (Prisma + SQLite). Repository records are authoritative for the build process.
- Project types are configured by **templates**, not separate codebases.
- Environments (dev/staging/etc.) are registered with isolated
  branch/worktree/port/database/storage/logs (ENV-001/002).

## Release readiness

A version is `TECHNICALLY_READY` when tests, builds, and gates pass — but that is
not the same as `COMMERCIAL_READY`. Commercial readiness (licensing, pricing,
distribution) is a separate gate before `RELEASED` (QLT-004). VSO never collapses
the two.

## Getting help

- Operations: `docs/RUN_GUIDE.md`
- Recovery: `docs/RECOVERY_GUIDE.md`
- Architecture: `docs/ARCHITECTURE_SUMMARY.md` and `docs/architecture-atlas/`
- Build governance: `docs/OWNER_RUNBOOK.md`
