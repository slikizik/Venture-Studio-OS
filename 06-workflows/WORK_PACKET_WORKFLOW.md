# Work Packet Workflow

## State transitions

```text
DRAFT → READY → IN_PROGRESS → SUBMITTED → IN_REVIEW
                                      ├→ APPROVED
                                      ├→ REJECTED
                                      └→ REVISION_REQUESTED → IN_PROGRESS
DRAFT/READY/IN_PROGRESS → CANCELLED
```

## Rules

- Only packets with objective, scope, exclusions, at least one expected output, and acceptance criteria may move to `READY`.
- A packet may move to `IN_PROGRESS` only when dependencies are complete or explicitly waived by a decision record.
- Submission locks the packet specification and records the submitted version.
- Review automatically changes `SUBMITTED` to `IN_REVIEW`.
- `REVISION_REQUESTED` creates a new packet version before specification fields may change.
- `APPROVED` packets cannot be edited. New work requires a new packet or superseding version.
- `REJECTED` packets remain immutable; resubmission requires a new version.
- Cancellation requires a reason and is recorded in the activity log.
