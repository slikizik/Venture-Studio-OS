# Checkpoint and Resume Policy

## Goal

Recovery must rely on durable repository state, not chat memory.

## Checkpoints

Before risky work and after each meaningful successful unit, update the project execution state file and normal governance files.

The executable helper is:

`python scripts/save_execution_checkpoint.py --project VSO ...`

The checkpoint records:

- phase;
- work packet;
- status;
- last successful action;
- resume instruction;
- Git branch, commit, and dirty state;
- UTC timestamp.

## Safe resume

After a router/gateway restart:

1. read execution state;
2. confirm repository exists;
3. compare current Git branch and commit with saved values;
4. read `PROJECT_STATUS.md`, `BUILD_MANIFEST.yaml`, and `09-hermes/EXECUTION_QUEUE.yaml`;
5. resume automatically only when `safeToResume=true` and repository identity is consistent;
6. otherwise create a direction-required recovery record and do not make project changes.

Hermes filesystem checkpoints (`hermes chat --checkpoints`) may be used in addition to this policy, but do not replace repository checkpoint records.
