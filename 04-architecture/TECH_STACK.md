# Technology Stack

## Fixed architecture

- Local web application
- TypeScript strict mode
- Next.js modular monolith
- React
- SQLite
- Prisma ORM
- Zod validation
- Vitest for unit/integration tests
- Playwright for end-to-end tests
- ESLint and Prettier

## Version-locking policy

Phase 00 must verify currently compatible stable versions and record exact versions in `04-architecture/APPROVED_VERSIONS.yaml`. Phase 01 must create and commit:

```text
package.json
package-lock.json
.nvmrc
```

No later phase may perform an automatic major-version upgrade.

## Runtime baseline

- Node.js: current supported LTS approved in Phase 00
- Package manager: npm, exact version locked in `packageManager`
- Supported development systems: Windows 11 and Ubuntu LTS
- Supported browsers: current and previous major versions of Chrome, Edge, and Firefox

## Dependency rule

Prefer maintained packages with clear licenses. New dependencies require documented justification. Production dependencies with unresolved critical vulnerabilities block release.
