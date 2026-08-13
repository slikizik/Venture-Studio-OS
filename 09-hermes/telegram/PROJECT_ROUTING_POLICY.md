# Project Routing Policy

Routing is deterministic.

The router identifies a Telegram message by:

- `chat.id`
- `message_thread_id` (forum topic ID; use `0` for a non-topic chat)

It then performs an exact lookup in `09-hermes/telegram/PROJECT_COMMUNICATION_REGISTRY.json`.

A route contains:

- project ID and display name;
- repository path;
- Hermes profile;
- Telegram chat and topic IDs;
- session title;
- direction request/response paths;
- decision log path;
- execution state path.

If no exact route exists, the router must not guess. It replies only with an unregistered-route message when the sender is authorized.

The project profile is invoked from the configured repository directory. Telegram messages must never be allowed to override the repository path or profile name.
