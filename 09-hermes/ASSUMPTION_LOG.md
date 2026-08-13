# Assumption Log

| ID | Date | Phase | Assumption | Reason | Risk | Reversible | Status |
|---|---|---|---|---|---|---|---|
| VSO-ASM-001 | 2026-08-13 | PHASE_00 | Application stack versions recorded in APPROVED_VERSIONS.yaml are the current stable releases from official npm/Node sources; Next.js 16 + React 19 are treated as the mutually-compatible baseline for the modular monolith. | TECH_STACK.md requires Phase 00 to verify current compatible stable versions from official sources without installing the stack. | A future major release could shift compatibility before Phase 01 pins them. | Yes — versions are re-pinned in Phase 01 package.json/lockfile/.nvmrc; this file is a verification snapshot, not a lock. | Recorded |
