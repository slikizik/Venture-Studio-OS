# Direction Required Protocol

## Purpose

Prevent unnecessary stopping while ensuring Hermes does not invent consequential product, commercial, security, legal, or architectural decisions.

## Classification

### RECOVERABLE
Hermes diagnoses, repairs, tests, records the recovery, and continues.

### ASSUMPTION_ALLOWED
Hermes selects the lowest-risk interpretation, records it in the assumption log and phase report, and continues.

### DIRECTION_REQUIRED
Hermes blocks only the affected work, creates a direction request, continues unaffected work, and waits for the project owner only when no further unaffected work remains.

### CRITICAL_STOP
Hermes stops relevant execution immediately when continuing may corrupt data, expose secrets, damage the repository, or violate security rules.

## Direction request file

Create `09-hermes/direction-requests/DIRECTION_REQUIRED_<ID>.md` from `09-hermes/templates/direction-required-template.md`.

The YAML front matter is machine-readable and mandatory:

```yaml
decisionId: VSO-DR-004
status: OPEN
options:
  - id: A
    label: Archive only
  - id: B
    label: Permanent delete
```

Every request must contain:

- exact issue;
- reason Hermes cannot safely decide;
- affected and unaffected work;
- two or more concrete options where possible;
- consequences of each option;
- a recommended option;
- the exact decision requested.

## Validation

Before accepting an owner response, the control layer must verify:

1. the request exists in the current project repository;
2. front matter `decisionId` matches the response ID;
3. status is exactly `OPEN`;
4. selected option ID exists in `options`;
5. no owner response file already exists for the same decision.

Invalid, closed, duplicate, or cross-project responses must not resume Hermes.

## Resumption

After receiving a valid decision:

1. persist the owner response first;
2. append it to `09-hermes/DECISION_LOG.md`;
3. change request front matter status to `RESOLVED` only when Hermes applies the decision;
4. update `PROJECT_STATUS.md` and the execution queue;
5. resume from the first unblocked work item;
6. do not reinterpret the decision beyond its written scope.
