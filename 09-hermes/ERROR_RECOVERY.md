# Error Recovery

1. Preserve working state.
2. Record the failing command and exact error.
3. Identify whether the issue is environment, specification, architecture, or implementation.
4. Fix only within current phase scope.
5. Rerun the smallest relevant test, then affected regression tests.
6. Mark phase PARTIAL or BLOCKED when unresolved.
