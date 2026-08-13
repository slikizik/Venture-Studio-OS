# System Architecture

Use a modular monolith for the MVP.

Layers:

1. Presentation layer
2. Application/service layer
3. Domain model
4. Persistence layer
5. Validation and logging

Core modules:

- Projects
- Project Brain
- Templates
- Stages
- Deliverables
- Work Packets
- Reviews and Approvals
- Decisions
- Risks
- Versions
- Dashboards

The template engine configures project stages, deliverable types, and quality gates. It must not fork the application into separate project-specific codebases.


## Product-development engine model

The modular monolith exposes five logical engines. These are domain/application boundaries, not necessarily separate deployable processes:

1. **Intent Engine** — Project Intent Brief, outcome/success measures, quality targets, benchmark brief.
2. **Design Engine** — requirements, criteria, deliverables, architecture/content structure, dependency and work decomposition.
3. **Execution Engine** — work packets, queues, agents, checkpoints, retry/stop conditions, environment coordination.
4. **Quality Engine** — evidence, reviews, quality profiles, benchmark gaps, quality gates, release readiness.
5. **Learning Engine** — feedback/defects/insights, change assessment, backlog/change requests, next-iteration linkage.

Hermes is an external/replaceable execution agent integrated through the Execution Engine. Telegram is a communication/control boundary into governance, not a direct execution authority.
