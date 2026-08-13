# Release Readiness Model

Release readiness answers two questions separately:

1. **Can this version be released safely?**
2. **Does this version meet its declared commercial-quality target?**

## Blocking checks

- required requirements complete or formally deferred/waived;
- required automated/manual evidence passes;
- no unresolved critical blocker/security/data-integrity risk;
- backup/recovery and packaging requirements satisfied;
- required installation/compatibility checks satisfied;
- required documentation exists;
- Quality Profile mandatory dimensions meet target or have approved accepted risk;
- benchmark gaps marked mandatory are closed or explicitly accepted.

## Readiness states

`NOT_READY`, `TECHNICALLY_READY`, `COMMERCIAL_REVIEW`, `COMMERCIAL_READY`, `RELEASED`.

`TECHNICALLY_READY` must never be presented as equivalent to `COMMERCIAL_READY`.
