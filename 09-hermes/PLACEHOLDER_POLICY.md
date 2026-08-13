# Placeholder Policy

## Purpose

Prevent temporary values, stubs, mocks, unresolved decisions, and incomplete integrations from silently becoming production behaviour.

## Rule

Every intentional placeholder must be registered in `09-hermes/PLACEHOLDER_REGISTER.yaml` before it is committed.

Unregistered implementation placeholders are defects.

## Placeholder classes

### CONFIGURATION
A value that must be supplied by the owner or workstation, such as a Telegram token, chat ID, user ID, machine ID, or repository path.

### PHASE_00_VERIFICATION
A technical value deliberately left unresolved until Phase 00 verifies the current compatible version or capability.

### DEFERRED_SCOPE
A feature explicitly outside the current release. It must map to `01-product/OUT_OF_SCOPE.md` and must not be represented as functional in the UI.

### TEST_DOUBLE
A mock/fake/stub used only inside tests. It may not be reachable from production runtime code.

### IMPLEMENTATION_STUB
Forbidden at phase completion unless the active phase specification explicitly permits it. Examples include TODO handlers, fake persistence, `pass`, hard-coded success responses, and UI controls without behaviour.

## Required register fields

Each registered placeholder must specify:

- `id`
- `class`
- `location`
- `description`
- `introducedFor`
- `conversionTrigger`
- `conversionOwner`
- `mustBeResolvedBy`
- `blockingLevel`
- `validation`
- `status`

## Status values

`OPEN`, `READY_TO_CONVERT`, `RESOLVED`, `DEFERRED_APPROVED`.

## Execution-agent procedure

At the start of every phase:

1. Read `09-hermes/PLACEHOLDER_REGISTER.yaml`.
2. Run `python scripts/scan_placeholders.py`.
3. Identify every OPEN placeholder whose `mustBeResolvedBy` is the active phase or earlier.
4. Resolve it before implementation continues, or create a direction request if owner input is required.
5. Never replace a placeholder with invented data merely to make validation pass.

Before phase completion:

1. Run the placeholder scan again.
2. Fail the phase if an unregistered production placeholder exists.
3. Fail the phase if a due placeholder remains unresolved.
4. Record resolved entries rather than deleting their history.

## Production rule

A release cannot pass Phase 09 while any `blockingLevel: RELEASE` placeholder remains OPEN.
