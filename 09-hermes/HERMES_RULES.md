# Hermes Rules

1. Repository documents are the source of truth.
2. Read `START_HERE.md` before work.
3. Execute only the explicitly assigned phase.
4. Do not begin later phases early.
5. Do not silently alter requirements.
6. Do not replace approved technology without recording a blocker.
7. Do not redesign approved workflows during implementation.
8. Do not mark requirements complete without passing tests or documented manual verification.
9. Do not remove working features to simplify implementation.
10. Do not use fake persistence, placeholder buttons, or simulated functionality in a completed phase.
11. Do not claim testing unless commands were executed.
12. Preserve backwards compatibility with completed phases.
13. Identify dependents before changing shared code.
14. Rerun affected regression tests after shared-code changes.
15. Keep files modular and maintainable.
16. Record every assumption in the phase report.
17. When requirements conflict, block only the affected item and continue unaffected work.
18. Do not ask routine questions already answered by the specification.
19. Prefer the simplest implementation satisfying the contract.
20. End every phase with the required completion protocol.
21. Follow `AUTONOMOUS_EXECUTION_POLICY.md`; continue routine approved work without asking for confirmation.
22. Classify errors using `DIRECTION_REQUIRED_PROTOCOL.md`.
23. Apply retry limits from `RETRY_POLICY.yaml` and stop conditions from `STOP_CONDITIONS.yaml`.
24. Maintain `EXECUTION_QUEUE.yaml` and `HERMES_ACTIVITY_LOG.md`.
25. When one item is blocked, continue unaffected READY work.
26. Do not perform unfinished implementation directly on `main`.
27. Use isolated branch, worktree, port, database, storage, and logs for simultaneous software versions.
28. Never claim runtime-management scripts are implemented until their tests pass.

29. When Telegram control is enabled, route by exact registered chat/topic IDs; never infer a repository from message text.
30. Persist a Telegram owner decision to the configured direction-response file and decision log before resuming work.
31. One Telegram bot must have one update consumer in this package; project profiles must not simultaneously long-poll the same bot token.
32. Maintain durable execution state and do not auto-resume when `safeToResume` is false or repository identity cannot be verified.


## Operational readiness and placeholders

- Treat `09-hermes/OPERATIONAL_READINESS_REGISTER.md` as a mandatory execution gate.
- Treat `09-hermes/PLACEHOLDER_REGISTER.yaml` as the inventory of intentional unresolved values.
- Never introduce an implementation stub, fake runtime path, hard-coded success, TODO/FIXME, or non-functional UI control without registering it; production implementation stubs are forbidden at phase completion.
- Run `python scripts/preflight.py` before long-running work.
- Run `python scripts/preflight.py --completion` before phase completion.
- Resolve due placeholders at their specified trigger; never invent owner credentials/configuration to close them.
- Telegram cannot pass arbitrary free-form instructions directly to Hermes. Only governed commands and validated direction responses may trigger execution.
