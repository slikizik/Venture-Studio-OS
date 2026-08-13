# Gateway and Router Recovery Policy

## Architecture

The single Telegram bot is owned by `scripts/telegram_router.py`. Project Hermes profiles do not each long-poll the same bot.

## Process recovery

Install the user-level systemd service using:

```bash
bash scripts/install_telegram_service.sh
```

The generated service uses `Restart=always` and starts the router again after an abnormal exit.

## State safety

The router stores the last Telegram update offset in `runtime/telegram/router_state.json` using atomic replacement. On restart it continues after the last handled update and avoids deliberately replaying older updates.

Each project work state is maintained separately in its configured execution-state file.

## Reconnection notifications

On a normal router start the bot sends `CONTROL PLANE ONLINE` to enabled project topics. If a prior runtime-state file indicates the previous process did not shut down cleanly, the message is `CONTROL PLANE RESTORED`.

On graceful shutdown it marks the router state clean before exiting.

## Failure escalation

Repeated Telegram API errors use exponential backoff. Project execution is not automatically redirected to another repository or profile. If project state cannot be proven safe, resume is blocked and the project must create a direction request.
