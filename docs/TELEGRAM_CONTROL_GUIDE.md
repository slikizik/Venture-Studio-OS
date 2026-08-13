# Telegram Control Guide — Functional Setup

This guide configures one Telegram bot as the control plane for multiple isolated Hermes project profiles.

## What this provides

- one Telegram bot;
- one Telegram forum topic per project;
- one isolated Hermes profile per project;
- deterministic topic-to-project routing;
- repository-persisted owner decisions;
- automatic Hermes resume after a valid owner decision;
- durable execution-state checkpoints;
- automatic router restart under Linux `systemd --user`;
- Telegram notification when the control plane starts or is restored.

## Important architecture rule

Do **not** configure the same bot token in multiple Hermes profile gateways. The package uses one router process to own Telegram updates, then invokes the correct project profile from the correct repository.

Current Hermes supports isolated profiles via `hermes profile create`, profile selection with `hermes -p <profile>`, resumable sessions, and per-profile gateways. This package uses the profile isolation but centralizes the single Telegram bot in the VSO router.

## Files used

- Router policy: `09-hermes/telegram/TELEGRAM_CONTROL_PLANE.md`
- Routes: `09-hermes/telegram/PROJECT_COMMUNICATION_REGISTRY.json`
- Router program: `scripts/telegram_router.py`
- Notification program: `scripts/telegram_notify.py`
- Profile setup: `scripts/setup_project_profiles.py`
- Checkpoint helper: `scripts/save_execution_checkpoint.py`
- Route validator: `scripts/verify_project_routing.py`
- Service installer: `scripts/install_telegram_service.sh`
- Secret template: `.env.telegram.example`

## 1. Verify Hermes first

Before Telegram, verify normal Hermes operation:

```bash
hermes --version
hermes doctor
hermes profile list
```

A normal Hermes chat must work before adding the control plane.

## 2. Create one Telegram bot

Create a bot using Telegram's BotFather. Keep the token private.

Create a private Telegram group for your projects and enable forum topics. Create one topic per project, for example:

- Venture Studio OS
- Worship Drum Lab
- BrightPath Learning

Add the bot to the group. Restrict membership to trusted users.

## 3. Store the token locally

From the repository root:

```bash
cp .env.telegram.example .env.telegram
```

Edit `.env.telegram`:

```text
TELEGRAM_BOT_TOKEN=<your real token>
```

`.env.telegram` is ignored by Git.

Load it for manual commands:

```bash
set -a
source .env.telegram
set +a
```

## 4. Discover Telegram IDs

Run:

```bash
python3 scripts/telegram_router.py --discover --discover-seconds 120
```

Send one message in every project topic from your own Telegram account. The terminal prints values such as:

```text
chatId=-1001234567890 topicId=101 userId=123456789 title='Hermes Projects'
```

Record:

- `chatId` — group/chat;
- `topicId` — project topic;
- `userId` — your Telegram account ID.

## 5. Configure project routes

Edit:

```text
09-hermes/telegram/PROJECT_COMMUNICATION_REGISTRY.json
```

For every project set:

- `enabled: true`;
- unique `hermesProfile`;
- absolute repository path, or `.` for this VSO repository;
- Telegram `chatId`;
- Telegram `topicId`;
- project execution-state location.

Add your Telegram user ID to `telegram.allowedUserIds`.

Example second project:

```json
"WDL": {
  "name": "Worship Drum Lab",
  "enabled": true,
  "hermesProfile": "wdl",
  "repository": "/home/you/projects/Worship-Drum-Lab",
  "telegram": {"chatId": -1001234567890, "topicId": 102},
  "sessionTitle": "WDL Control Session",
  "directionRequestDirectory": "09-hermes/direction-requests",
  "directionResponseDirectory": "09-hermes/direction-responses",
  "decisionLog": "09-hermes/DECISION_LOG.md",
  "executionState": "09-hermes/EXECUTION_STATE.json"
}
```

Each routed repository is expected to use the Hermes-ready governance directories. A project that does not yet use them can still receive general Hermes messages, but direction-response persistence requires those paths.

## 6. Create isolated Hermes profiles

Create them automatically:

```bash
python3 scripts/setup_project_profiles.py --clone-from default
```

Omit `--clone-from default` when you want fresh profiles and will configure provider/tool settings individually.

Verify:

```bash
hermes profile list
python3 scripts/verify_project_routing.py --check-profiles
```

Project profiles must **not** each be configured to long-poll this same Telegram bot.

## 7. Test without allowing Hermes execution

Start the router safely:

```bash
python3 scripts/telegram_router.py --no-hermes
```

In each Telegram topic send:

```text
/status
```

Confirm every topic displays only its own project status. Stop with `Ctrl+C`.

## 8. Test Hermes routing

Start normally:

```bash
python3 scripts/telegram_router.py
```

Send a harmless project-specific question in each topic. The router runs Hermes from the configured repository using the configured project profile.

Because each project has a dedicated profile, `--continue` resumes that profile's most recent project session when available; first use falls back to a fresh session.

## 9. Test direction handling

Create or wait for a real direction request in:

```text
09-hermes/direction-requests/DIRECTION_REQUIRED_<ID>.md
```

Reply in that project's Telegram topic:

```text
<ID> <OPTION> | <reason>
```

Example:

```text
VSO-DR-004 A | Preserve audit history.
```

Before Hermes is invoked, the router creates:

```text
09-hermes/direction-responses/OWNER_RESPONSE_VSO-DR-004.md
```

and appends the decision to:

```text
09-hermes/DECISION_LOG.md
```

Only after persistence succeeds does it tell Hermes to resume.

## 10. Enable automatic restart

Linux with systemd user services:

```bash
bash scripts/install_telegram_service.sh
```

Check it:

```bash
systemctl --user status vso-telegram-router.service
journalctl --user -u vso-telegram-router.service -f
```

The service uses `Restart=always` and a five-second restart delay.

For a server that must run when you are logged out, enable user lingering once:

```bash
sudo loginctl enable-linger "$USER"
```

## 11. Checkpoint project execution

Example:

```bash
python3 scripts/save_execution_checkpoint.py \
  --project VSO \
  --status executing \
  --phase PHASE_04 \
  --work-packet WPK-041 \
  --last-action "database migration passed" \
  --resume "run WPK-041 integration tests"
```

This updates the configured project execution-state file atomically with Git identity information.

For unsafe state:

```bash
python3 scripts/save_execution_checkpoint.py --project VSO --status blocked --unsafe --error "repository state does not match checkpoint"
```

Hermes must not auto-resume an execution state marked unsafe.

## 12. Notifications from build scripts or Hermes

Example:

```bash
python3 scripts/telegram_notify.py --project VSO --level ATTENTION --message "Dependency retry succeeded; no owner action required."
```

Direction-required and critical messages should include the repository-relative request/report path.

## Recovery behaviour

The router stores the last handled Telegram update ID in:

```text
runtime/telegram/router_state.json
```

Writes are atomic. If the process was not cleanly shut down, startup notifications say `CONTROL PLANE RESTORED`.

Project work recovery is separate from Telegram update recovery. Read:

```text
09-hermes/telegram/CHECKPOINT_AND_RESUME_POLICY.md
09-hermes/telegram/GATEWAY_RECOVERY_POLICY.md
```

## Windows automatic restart

The router and profile/checkpoint scripts are cross-platform Python. On Windows PowerShell, after creating `.env.telegram`, run:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
.\scripts\install_telegram_task.ps1
```

This creates and starts a Task Scheduler task with restart-on-failure settings. The Linux `install_telegram_service.sh` remains the preferred path for systemd systems.


## v1.6.1 governance hardening

Normal router startup now **fails closed** when `allowedUserIds` is empty. Use `--discover` only to obtain IDs, then explicitly configure the owner before starting normal control.

Telegram is a control channel, not a free-form shell. Supported execution controls are `/resume`, `/pause`, `/unpause`, `/status`, and validated direction responses. Arbitrary text is not forwarded to Hermes.

Each enabled project has its own serialized worker queue. Long-running work in one project does not block Telegram polling or another project's worker. Multiple jobs for the same project remain serialized to protect its repository.

Before live use, all Telegram rows in `09-hermes/OPERATIONAL_READINESS_REGISTER.md` must be tested on your actual bot/profile setup.
