# MVP Architecture Freeze

**Status:** FROZEN_FOR_MVP after Product Alignment Baseline v1.7.0 and successful Phase 00 validation.

The current modular-monolith architecture, five-engine product model, repository governance, Telegram control boundary, Smart Git Sync, and local-first single-owner MVP are frozen for implementation.

## Change rule

A proposed change to core architecture during Phases 01–09 must meet at least one condition:

- required to satisfy an existing blocking requirement;
- required for correctness, security, privacy, data integrity, or recoverability;
- Phase 00 proves the current design cannot be implemented with the approved toolchain;
- an approved owner Direction Record explicitly changes the architecture.

Otherwise record the idea in `01-product/BACKLOG.md` and continue the active phase.

The freeze prevents infrastructure expansion from delaying proof of the core VSO loop.
