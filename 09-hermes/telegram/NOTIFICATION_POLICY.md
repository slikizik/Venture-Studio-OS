# Telegram Notification Policy

Levels:

- `INFO`: completion/status. Disabled by default to prevent noise.
- `ATTENTION`: automatic recovery or non-blocking abnormal event.
- `DIRECTION_REQUIRED`: owner decision required.
- `CRITICAL`: execution stopped, unsafe state, or repeated recovery failure.

Default Telegram delivery levels are configured in `09-hermes/telegram/PROJECT_COMMUNICATION_REGISTRY.json`.

Never send secrets, access tokens, raw environment files, database contents, or large logs. Send the relevant repository-relative log/report path instead.
