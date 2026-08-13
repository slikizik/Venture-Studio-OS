# Application Service Contracts

VSO v0.1 may use server actions or internal route handlers, but service boundaries must remain testable.

Every mutation returns a typed result:

```ts
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; fieldErrors?: Record<string,string[]> } };
```

Required service groups:

- ProjectService
- ProjectBrainService
- DeliverableService
- WorkPacketService
- EvidenceService
- ReviewService
- DecisionService
- RiskService
- TemplateService
- DashboardService
- ImportExportService
- BackupService
- AgentService
- ActivityService

Mutations must validate authorization context, input schema, state transition, referential integrity, and audit recording in one transaction where applicable.
