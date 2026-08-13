# Context Loading Order

Always use repository-relative paths.

## Every run

1. `START_HERE.md`
2. `PROJECT_STATUS.md`
3. `BUILD_MANIFEST.yaml`
4. `CHANGELOG.md`
5. `01-product/VSO_PRODUCT_DOCTRINE.md`
6. `01-product/PRODUCT_ALIGNMENT_GATE.md`
7. `01-product/SEVL_SCOPE.md`
8. `01-product/ARCHITECTURE_FREEZE.md`
9. `09-hermes/PRODUCT_INTENT_ALIGNMENT_POLICY.md`
10. `09-hermes/HERMES_RULES.md`
6. `09-hermes/AUTONOMOUS_EXECUTION_POLICY.md`
7. `09-hermes/DIRECTION_REQUIRED_PROTOCOL.md`
8. `09-hermes/ASSUMPTION_POLICY.md`
9. `09-hermes/RETRY_POLICY.yaml`
10. `09-hermes/STOP_CONDITIONS.yaml`
11. `09-hermes/EXECUTION_QUEUE.yaml`
12. `09-hermes/ASSUMPTION_LOG.md`
13. `09-hermes/DECISION_LOG.md`
14. `09-hermes/EXECUTION_STATE.json` when present
15. `09-hermes/SMART_GIT_SYNC_POLICY.md` when Git synchronization or workstation handoff is relevant
16. Current phase specification listed in `BUILD_MANIFEST.yaml`
17. Requirements listed by that phase
18. `04-architecture/DATA_MODEL.md`
19. Relevant architecture documents
20. `09-hermes/ARCHITECTURE_DIAGRAM_POLICY.md` when architecture/workflow changes are in scope
21. `03-ux-design/SCREEN_SPECIFICATIONS.md`
22. Relevant workflow documents
23. `02-requirements/ACCEPTANCE_CRITERIA.md`
24. `08-quality/TEST_CASES.md`

Do not reload unrelated historical content unless a dependency requires it.


## When Telegram control is enabled

Also load, as required by the active task:

- `09-hermes/telegram/TELEGRAM_CONTROL_PLANE.md`
- `09-hermes/telegram/PROJECT_ROUTING_POLICY.md`
- `09-hermes/telegram/TELEGRAM_DIRECTION_PROTOCOL.md`
- `09-hermes/telegram/CHECKPOINT_AND_RESUME_POLICY.md`
- `09-hermes/telegram/GATEWAY_RECOVERY_POLICY.md`
- `09-hermes/telegram/NOTIFICATION_POLICY.md`
- `09-hermes/telegram/PROJECT_COMMUNICATION_REGISTRY.json`


## Mandatory operational preflight

Before long-running work, read in this order:

1. `09-hermes/OPERATIONAL_READINESS_REGISTER.md`
2. `09-hermes/PLACEHOLDER_POLICY.md`
3. `09-hermes/PLACEHOLDER_REGISTER.yaml`
4. `09-hermes/EXECUTION_STATE.json`
5. `09-hermes/EXECUTION_QUEUE.yaml`

Run `python scripts/preflight.py` before implementation and `python scripts/preflight.py --completion` before declaring a phase complete.
