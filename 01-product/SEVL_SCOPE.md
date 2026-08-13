# Smallest Executable VSO Loop (SEVL)

## Purpose

The SEVL is the first real vertical slice that proves VSO has a heartbeat. It is not a fake prototype and must use persisted data, real workflow transitions, real evidence, and real review state.

## Required end-to-end loop

1. Owner creates a project.
2. Owner captures a Project Intent Brief with outcome, audience, constraints, success measures, and quality target.
3. VSO stores at least one requirement with acceptance criteria.
4. VSO stores at least one deliverable linked to that requirement.
5. VSO stores at least one executable work packet.
6. The work packet is assigned to an agent record and moves through the governed execution states.
7. Evidence is attached to the work packet/criterion.
8. A Quality Gate evaluates the evidence.
9. A review can approve, reject, or request revision.
10. A consequential ambiguity can create a Direction Request and accept a persisted owner response before resuming.
11. The approved deliverable updates project progress and history.
12. At least one Learning Record can become a controlled backlog/change item.

## First proof project

Use **Venture Studio OS** itself as the first serious dogfooding project after the SEVL mechanics are working. A recommended first deliverable is the project-creation/intake workflow.

## SEVL milestone

SEVL is considered proven after Phase 05 only when `TEST-SEVL-001` passes end to end with retained evidence. Phases 06–09 expand templates, dashboards, hardening, packaging, and commercial release readiness; they must not invalidate the proven loop.

## Explicit exclusions from SEVL

- multi-user collaboration;
- advanced portfolio analytics;
- broad external-agent marketplace;
- every project template being polished;
- sophisticated scheduling;
- fully autonomous production deployment;
- aesthetic optimization beyond usable MVP quality.
