# Scripts

Executable operational helpers for the Hermes-ready package.

## Telegram control plane

- `telegram_router.py` — one-bot router; maps Telegram topic to project/profile/repository, persists direction responses, and invokes Hermes.
- `telegram_notify.py` — send level-controlled project notifications.
- `setup_project_profiles.py` — create one isolated Hermes profile per enabled route.
- `save_execution_checkpoint.py` — atomically persist project execution state and Git identity.
- `verify_project_routing.py` — validate route uniqueness, repository paths, and optional Hermes profile existence.
- `install_telegram_service.sh` — install/start Linux user-systemd router with automatic restart.
- `uninstall_telegram_service.sh` — remove the Linux user service.
- `install_telegram_task.ps1` — install/start the router as a Windows Task Scheduler task with restart-on-failure.
- `telegram_common.py` — shared runtime library.

Owner instructions: `docs/TELEGRAM_CONTROL_GUIDE.md`.

## Cross-workstation Git synchronization

- `vso_git_sync.py` — safe `status`, `handoff`, and `resume` workflow for Windows/Linux workstation switching. It refuses force pushes, dirty pulls, remote-behind handoffs, diverged histories, and automated handoff on `main`.

Owner instructions: `docs/SMART_GIT_SYNC_GUIDE.md`.
