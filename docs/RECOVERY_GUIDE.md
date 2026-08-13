# Recovery Guide

1. Stop the VSO application.
2. Copy the current runtime database and attachments to a dated safety folder.
3. Select a verified backup from `runtime/main/backups/`.
4. Validate its manifest and checksums.
5. Restore database and attachments together.
6. Start VSO and run integrity checks.
7. Record the restoration in the activity log.

Hermes must implement exact platform-specific commands during Phase 09 and test them during Phase 08.


## Resume safety gate

A restarted process is not automatically safe to resume. Run:

```bash
python scripts/verify_resume_safety.py
```

It blocks when `safeToResume` is false, the branch/commit differs from the recorded checkpoint, the worktree is dirty, or an active checkpoint lacks a completed action boundary. Recovery must remain blocked until the mismatch is understood.
