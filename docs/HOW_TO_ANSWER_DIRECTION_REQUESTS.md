# How to Answer Hermes Direction Requests

Hermes should ask for direction only when a consequential decision cannot safely be inferred.

## Where direction requests appear

```text
09-hermes/direction-requests/DIRECTION_REQUIRED_<ID>.md
```

Each request must explain:

- the issue;
- why Hermes cannot decide;
- affected and unaffected work;
- available options;
- consequences of each option;
- Hermes' recommendation;
- the exact decision required.

## How to respond

Copy:

```text
09-hermes/templates/OWNER_DIRECTION_RESPONSE_TEMPLATE.md
```

Save it as:

```text
09-hermes/direction-responses/OWNER_RESPONSE_<ID>.md
```

Your response should be decisive and brief. Example:

```markdown
# Owner Direction Response — VSO-DR-004

- **Selected option:** Option A
- **Decision:** Keep the MVP local-only. Do not add cloud authentication.
- **Reason:** Preserve MVP scope and reduce infrastructure complexity.
- **Constraints:** Keep the data layer migration-ready for a future hosted database.
- **Approved scope change:** None.
- **Resume instruction:** Record this decision and continue the affected work.
```

## What not to do

Do not answer with vague language such as:

- “Do what you think is best.”
- “Maybe use option A.”
- “Try both.”

When none of the options are acceptable, state the required alternative and whether it changes scope.

## Resume instruction

After saving the response, tell Hermes:

```text
Read 09-hermes/direction-responses/OWNER_RESPONSE_<ID>.md, append the decision to the decision log, update the blocked queue item, and resume all approved work.
```
