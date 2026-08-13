# Telegram Direction Protocol

## Notification

When a direction-required record exists at:

`09-hermes/direction-requests/DIRECTION_REQUIRED_<ID>.md`

Hermes or the notification script sends a concise Telegram message containing:

- project;
- phase/work packet when known;
- decision ID;
- issue summary;
- available options;
- recommended option when the record contains one;
- response syntax.

## Accepted owner response

```text
<ID> <OPTION>
```

or:

```text
<ID> <OPTION> | <reason>
```

Example:

```text
VSO-DR-004 A | Preserve audit history.
```

## Persistence before execution

The router must:

1. verify the sender is authorized;
2. verify the topic maps to the same project;
3. verify a pending direction-request file containing the exact ID exists;
4. create `09-hermes/direction-responses/OWNER_RESPONSE_<ID>.md` atomically;
5. append the decision to `09-hermes/DECISION_LOG.md`;
6. only then invoke Hermes with an instruction to read that response and resume affected approved work.

The owner response file is authoritative. Telegram is transport only.
