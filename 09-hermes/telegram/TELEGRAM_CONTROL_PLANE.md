# Telegram Control Plane

## Purpose

Telegram is a human control channel. It does **not** replace repository records. Every consequential owner decision received through Telegram must be persisted in the repository before work resumes.

## Functional topology

One Telegram bot is owned by one router process. The bot must **not** be configured simultaneously in multiple Hermes profile gateways because Telegram long polling has one update stream and competing consumers can steal updates from each other.

The router maps `(chatId, topicId)` deterministically to exactly one project, Hermes profile, and repository.

```text
Telegram bot
    -> telegram_router.py
        -> Project registry
            -> VSO topic -> Hermes profile vso -> VSO repository
            -> Project B topic -> Hermes profile project-b -> Project B repository
```

Each project profile has isolated Hermes configuration, sessions, memory, skills, and provider settings. The router token exists only in the Telegram control-plane environment.

## Source of truth

- Routing: `09-hermes/telegram/PROJECT_COMMUNICATION_REGISTRY.json`
- Telegram rules: `09-hermes/telegram/TELEGRAM_DIRECTION_PROTOCOL.md`
- Notifications: `09-hermes/telegram/NOTIFICATION_POLICY.md`
- Recovery: `09-hermes/telegram/GATEWAY_RECOVERY_POLICY.md`
- Checkpoint/resume: `09-hermes/telegram/CHECKPOINT_AND_RESUME_POLICY.md`
- Owner setup: `docs/TELEGRAM_CONTROL_GUIDE.md`

## Security rules

1. Never commit a bot token.
2. Read the token from the environment variable named in the registry.
3. Populate `allowedUserIds` before enabling remote direction responses.
4. Reject messages from unlisted users when the allowlist is non-empty.
5. Never select a repository from free-form message text.
6. A topic may map to only one enabled project.
7. A project may map to only one topic in this registry version.
8. Do not expose provider keys, secrets, local paths, or file contents in routine Telegram notifications.
