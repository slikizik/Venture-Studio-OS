# Quality Gate Model

A Quality Gate is a controlled decision point that evaluates evidence against criteria before work or a release advances.

## Gate inputs

- requirement and acceptance criteria;
- project Quality Profile;
- benchmark targets;
- evidence records;
- automated tests/manual checks;
- unresolved defects/risks;
- required owner approvals.

## Gate outcomes

`PASS`, `PASS_WITH_ACCEPTED_RISK`, `REVISION_REQUIRED`, `BLOCKED`.

## Gate rule

No gate may pass because an agent claims success. It must reference retained evidence. A waived criterion requires an immutable decision/risk record explaining who accepted it and why.

## Levels

- Work Packet Gate
- Deliverable Gate
- Stage Gate
- Release Gate

Commercial readiness is evaluated primarily at the Release Gate, while defects should be caught at the earliest possible gate.
