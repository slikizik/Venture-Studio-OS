# Security Model

- Validate all input.
- Prevent path traversal in local file operations.
- Do not execute uploaded content.
- Do not expose stack traces in user-facing errors.
- Keep secrets outside source control.
- Use safe database queries through the ORM.
