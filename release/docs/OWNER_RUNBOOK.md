# Owner Runbook — Build VSO Without Needing Systems-Architecture Expertise

This is the owner's primary operating document. Supporting files are linked where needed.

## 1. What you are building

Read `01-product/VSO_PRODUCT_DOCTRINE.md` and the first four Architecture Atlas pages under `docs/architecture-atlas/`.

Your job is to define outcomes, priorities, taste, commercial intent, and consequential decisions. Hermes/VSO should handle routine technical execution inside approved rules.

## 2. Extract and preserve the package

Extract the ZIP to a permanent project folder. Do not develop from inside the ZIP.

Read `START_HERE.md`.

## 3. Initialize the private Git baseline

From the repository root, if it is not already a Git repository:

```bash
git init
git add .
git commit -m "Specification Baseline v1.7.0"
git tag spec-v1.7.0
git branch develop
git switch develop
```

Use a private remote before relying on cross-PC Smart Git Sync. Never commit `.env`, `.env.telegram`, `.vso-machine.local.json`, API keys, or tokens.

## 4. Configure workstation identity

Copy `.vso-machine.example.json` to `.vso-machine.local.json` on each computer and set a unique machine ID. This file remains local and untracked.

## 5. Run Phase 00 only

Open the repository in Hermes. Paste the contents of:

`09-hermes/prompts/BOOTSTRAP_PROMPT.md`

Hermes must not write VSO application code in Phase 00.

## 6. What Phase 00 must prove

Hermes validates specification consistency, current tool compatibility, product alignment, quality contracts, operational controls, placeholders, diagrams, tests, and paths. It creates `PHASE_00_REPORT.md`.

Proceed only when it ends with `PHASE 01 READY` and `python scripts/preflight.py --phase PHASE_00 --completion` passes.

## 7. How to answer questions needing your direction

Read `docs/HOW_TO_ANSWER_DIRECTION_REQUESTS.md`.

Requests appear in `09-hermes/direction-requests/`. Answer using `09-hermes/templates/OWNER_DIRECTION_RESPONSE_TEMPLATE.md` and save the response in `09-hermes/direction-responses/`.

When Telegram is enabled, Telegram may carry the same decision, but the repository response/decision record remains authoritative.

## 8. Build after Phase 00

For each READY phase, paste:

`09-hermes/prompts/REUSABLE_PHASE_PROMPT.md`

The executing agent must run preflight before implementation and completion preflight before marking a phase complete.

Do not authorize unrelated infrastructure expansion. The MVP architecture is frozen under `01-product/ARCHITECTURE_FREEZE.md`; useful non-blocking ideas go to `01-product/BACKLOG.md`.

## 9. The first major proof: SEVL

The priority milestone is `01-product/SEVL_SCOPE.md`.

By the end of Phase 05, VSO must prove one real end-to-end loop: project intent → requirement → deliverable → work packet → agent execution state → evidence → quality gate/review → owner direction if needed → approval → learning record.

Do not judge early success by dashboard polish. Judge it by whether the loop is real, persistent, auditable, and usable.

## 10. After SEVL

Create **Venture Studio OS** as a project inside VSO and progressively manage its own subsequent development there. Continue Phases 06–09 for templates, dashboards, hardening, portability, packaging, and commercial release readiness.

## 11. Cross-PC work

Before work on either machine:

```bash
python scripts/vso_git_sync.py resume
```

Continue only after `RESUME READY`.

When moving to the other machine:

```bash
python scripts/vso_git_sync.py handoff --message "Describe completed work"
```

Move only after `HANDOFF READY`. Only one workstation may own the project execution lease at a time.

## 12. Telegram remote operation

Configure only after the local build and Hermes profile work normally. Follow `docs/TELEGRAM_CONTROL_GUIDE.md`.

Telegram is a governed remote-control channel, not a bypass around VSO. Test allowlisting, routing, direction validation, restart, worker isolation, and recovery before unattended operation.

## 13. Readiness view

Keep `09-hermes/OPERATIONAL_READINESS_REGISTER.md` open while testing/deploying. It distinguishes VERIFIED, READY_FOR_TEST, NOT_CONFIGURED, BLOCKED, and NOT_BUILT.

Also watch `09-hermes/PLACEHOLDER_REGISTER.yaml`; no overdue or unregistered production placeholder may pass a completion gate.

## 14. Deployment

Do not enable unattended deployment until the Operational Readiness Register has no release-blocking item, required live integrations have been tested, backup/restore works, security boundaries pass, and the Release Readiness Model reaches the required state.

## 15. When something goes wrong

Before long debugging, run the phase preflight and check, in order: placeholder status, approved versions, Git state/lease, project/profile routing, machine-local configuration, prerequisite tests, and specification contradictions. Follow `docs/RECOVERY_GUIDE.md` and the Operational Readiness Register.
