# Decision Log

| ID | Date | Request | Decision | Reason | Affected requirements | Status |
|---|---|---|---|---|---|---|
| VSO-DEC-001 | 2026-08-13 | PHASE_01 | Pin Prisma to 6.19.3 (last stable before the v7 driver-adapter rewrite) instead of the 7.9.1 recorded in APPROVED_VERSIONS.yaml. | Prisma 7's adapter/config API (prisma.config.ts + @prisma/adapter-*) was not resolvable/stable in the installed toolchain; `npx prisma` could not load the config and the classic `prisma generate`/`prisma migrate` flow (assumed by the manifests) broke. Prisma 6 satisfies the 'Prisma ORM' mandate with the documented migration workflow. | DAT-004 migration workflow; TECH_STACK 'Prisma ORM'. | Recorded |
