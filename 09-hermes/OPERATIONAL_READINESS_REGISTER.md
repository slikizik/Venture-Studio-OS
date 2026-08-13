# Operational Readiness Register

**Specification baseline:** v1.7.0  
**Purpose:** Single pre-flight view of what is proven, what is unverified, what is blocked, and what must be checked before Hermes performs long-running work.

> This register is an execution gate, not a progress narrative. An agent must read it before Phase 00, before every later phase, before Telegram execution, before cross-PC handoff/resume, and before release.

## Readiness states

| State | Meaning |
|---|---|
| VERIFIED | Test/evidence exists and currently passes. |
| READY_FOR_TEST | Implementation exists but owner/environment test is still required. |
| NOT_CONFIGURED | Intentional configuration placeholder remains. |
| BLOCKED | Execution must not proceed for the affected capability. |
| NOT_BUILT | Product capability is intentionally not implemented yet. |


## Product intent / commercial-quality readiness

| Capability | State | Evidence / test | Gate |
|---|---|---|---|
| Product Doctrine and five-engine model | VERIFIED structurally | `01-product/VSO_PRODUCT_DOCTRINE.md` | Phase 00 re-check |
| Product Intent Alignment Gate | VERIFIED structurally | `01-product/PRODUCT_ALIGNMENT_GATE.md` | Phase 00 must approve |
| Commercial Quality Framework | VERIFIED structurally | `08-quality/COMMERCIAL_QUALITY_FRAMEWORK.md` | Required during product implementation |
| Benchmarking / evidence / quality gates | VERIFIED structurally | `08-quality/BENCHMARKING_PROTOCOL.md`, `08-quality/EVIDENCE_MODEL.md`, `08-quality/QUALITY_GATE_MODEL.md` | SEVL/release gates |
| SEVL vertical-slice definition | VERIFIED structurally | `01-product/SEVL_SCOPE.md`, `TEST-SEVL-001` | BLOCK Phase 06 if Phase 05 cannot prove SEVL |
| Owner attention/autonomy metrics | SPECIFIED | `01-product/SUCCESS_CRITERIA.md`, `04-architecture/DATA_MODEL.md` | Phase 07 implementation |
| MVP architecture freeze | READY | `01-product/ARCHITECTURE_FREEZE.md` | Activate after successful Phase 00 |

## Package / specification readiness

| Capability | State | Evidence / test | Gate |
|---|---|---|---|
| Required repository structure | VERIFIED | `python scripts/validate_package.py` | Phase 00 |
| Requirement traceability | VERIFIED structurally | `02-requirements/REQUIREMENTS_TRACEABILITY.csv` | Phase 00 re-check |
| Architecture Atlas | VERIFIED structurally | `python scripts/validate_architecture_atlas.py` | Phase 00 re-check |
| Placeholder governance | VERIFIED | `python scripts/scan_placeholders.py` | Every phase |
| Approved dependency versions | NOT_CONFIGURED | `04-architecture/APPROVED_VERSIONS.yaml` / PH-001 | BLOCK Phase 01 until Phase 00 resolves |

## Telegram control plane

| Capability | State | Evidence / test | Watch-out |
|---|---|---|---|
| Exact chat/topic routing | VERIFIED unit-level | `scripts/tests/test_telegram_control.py` | No natural-language project inference |
| Fail-closed authorization | VERIFIED unit-level | empty allowlist denies normal control | Never enable allow-all fallback |
| Direction option validation | VERIFIED unit-level | request front matter defines allowed option IDs | Reject closed/invalid/duplicate decisions |
| Free-form governance bypass prevention | VERIFIED unit-level | only governed commands are accepted | Telegram must never pass arbitrary text directly to Hermes |
| Per-project worker isolation | VERIFIED unit-level | separate queue/thread per project | Same project remains serialized |
| Real Telegram bot connectivity | NOT_CONFIGURED | owner sandbox test | Requires PH-002 and PH-003 |
| Real Hermes profile invocation | READY_FOR_TEST | owner machine test | Requires installed Hermes profiles/provider |
| Router restart/watchdog | READY_FOR_TEST | Windows Task Scheduler or Linux systemd test | Verify restart notification and offset preservation |

## Cross-workstation / Git

| Capability | State | Evidence / test | Watch-out |
|---|---|---|---|
| Dirty pull prevention | VERIFIED | smart-sync tests | Never pull over uncommitted work |
| Remote-ahead handoff prevention | VERIFIED | smart-sync tests | Resume first |
| Divergence prevention | VERIFIED | smart-sync tests | Explicit human resolution only |
| Secret/generated-file tracking prevention | VERIFIED | package/sync validator | `.env*`, runtime, build output remain untracked |
| Remote execution lease | READY_FOR_TEST | `scripts/vso_execution_lease.py` | Requires private `origin` remote and machine IDs |
| Windows ↔ Linux handoff | READY_FOR_TEST | run real two-workstation test before autonomy | Dependencies recreated locally, not copied |

## Checkpoint / recovery

| Capability | State | Evidence / test | Watch-out |
|---|---|---|---|
| Execution checkpoint persistence | VERIFIED unit-level | checkpoint tests | Checkpoint is not proof that resume is safe |
| Safe-resume verification | READY_FOR_TEST | recovery validator before autonomous deployment | Branch/commit/dirty state/lease must agree |
| Mid-migration recovery | NOT_BUILT | Phase 08 requirement | Do not claim automatic recovery until implemented and tested |

## Product implementation

The actual VSO application is **NOT_BUILT** before Hermes begins Phase 01. A passing package validator means the Build Bible/control tooling is structurally ready; it does not mean VSO product features exist.

## Early-warning checks before long debugging

The executing agent must stop and diagnose at the earliest matching condition:

1. **Placeholder due:** `scan_placeholders.py` reports an OPEN entry due in the active phase.
2. **Unregistered stub:** scanner finds TODO/FIXME/not-implemented/fake runtime behaviour outside approved tests/docs.
3. **Version drift:** installed dependency/tool does not match `APPROVED_VERSIONS.yaml`.
4. **Dirty or divergent Git:** do not debug application failures until repository state is clean and expected.
5. **Wrong project/profile:** route, repository, profile, branch, or execution lease does not match.
6. **Environment mismatch:** machine-local secrets, ports, database, paths, or dependencies are missing.
7. **Known failing prerequisite test:** do not enter downstream debugging while an upstream gate is already red.
8. **Specification contradiction:** create a direction request rather than coding around it.
9. **Repeated repair loop:** after retry-policy limit, stop the affected item and produce evidence instead of continuing speculative edits.
10. **Generated/fake success:** no hard-coded passing output, skipped test presented as passed, mock production path, or placeholder UI may satisfy a quality gate.

## Mandatory pre-phase command

```bash
python scripts/preflight.py
```

A phase may begin only when the command reports `PREFLIGHT READY` for the applicable capabilities.

## Owner live-test gates before unattended deployment

- [ ] Telegram bot authenticates with explicit allowlisted owner ID.
- [ ] Wrong Telegram user is ignored/rejected.
- [ ] Wrong topic cannot execute another project.
- [ ] Invalid and closed direction options are rejected.
- [ ] Two projects can queue/execute independently.
- [ ] Same-project concurrent execution remains serialized.
- [ ] Gateway restart preserves Telegram update offset.
- [ ] Hermes failure does not lose a persisted owner decision.
- [ ] Git handoff works Windows → Linux and Linux → Windows.
- [ ] Second workstation is blocked while a live remote execution lease is owned by the first.
- [ ] Expired/released lease can be safely reacquired.
- [ ] Unsafe checkpoint does not auto-resume.
- [ ] Backup/restore test passes before real project data is trusted.

## Release rule

Phase 09 cannot be marked COMPLETE while this register contains a release-blocking `BLOCKED`, an overdue placeholder, an untested security boundary, or a required live integration still marked READY_FOR_TEST.
