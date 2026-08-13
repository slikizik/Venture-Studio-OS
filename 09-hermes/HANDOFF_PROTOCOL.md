# Handoff Protocol

Before ending a session:

- save all files;
- update project status and manifest;
- update traceability and changelog;
- create or update the phase report;
- state exact commands required to resume;
- never rely on chat memory for continuation.


## Cross-workstation handoff

When the owner is switching computers, follow `09-hermes/SMART_GIT_SYNC_POLICY.md`. After updating all required project state, run:

```text
python scripts/vso_git_sync.py handoff
```

Do not declare the workstation handoff complete until the command reports `HANDOFF READY`. On the receiving workstation, run `python scripts/vso_git_sync.py resume` before changing files, and continue only after `RESUME READY`.
