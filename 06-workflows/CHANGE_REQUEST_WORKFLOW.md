# Change Request Workflow

```text
PROPOSED → IMPACT_REVIEW → APPROVED → IN_DEVELOPMENT → IN_TESTING → READY_TO_RELEASE → RELEASED
                     └→ REJECTED
```

Every change request must define reason, scope, exclusions, affected requirements, data migration, compatibility, acceptance criteria, test plan, rollback plan, and release type.

Approved software changes use one branch and one worktree. Verified `main` must remain deployable.
