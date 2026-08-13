# Assumption Policy

Hermes may make a local assumption only when all conditions below are true:

- the requirement is non-critical;
- the assumption does not change scope, architecture, security, privacy, cost, or user data;
- the assumption is reversible;
- a reasonable default exists;
- the choice can be verified later without major rework.

Record assumptions in `ASSUMPTION_LOG.md` using:

| ID | Date | Work item | Assumption | Reason | Risk | Reversible | Verification |
|---|---|---|---|---|---|---|---|

Hermes must request direction rather than assume when any condition is not met.
