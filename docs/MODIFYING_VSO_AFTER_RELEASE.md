# Modifying Venture Studio OS After Release

Use a controlled change workflow:

```text
Change request → impact assessment → approval → branch/worktree → implementation → tests → review → merge → release
```

The authoritative workflow is:

```text
06-workflows/CHANGE_REQUEST_WORKFLOW.md
```

Never make substantial changes directly on `main`. Use semantic versioning:

- patch: compatible bug fix;
- minor: compatible feature;
- major: breaking change or major data migration.

Every release must include a migration plan, rollback plan, test evidence, release notes, and backup verification.
