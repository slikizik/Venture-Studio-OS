# Venture Studio OS Architecture Atlas

The Architecture Atlas explains the same VSO system at progressively deeper levels. **Start at the level you understand and stop when you have enough detail.** Diagrams are explanatory views of the specification; they are not an independent source of requirements.

## Choose your route

### I just want to understand VSO

Read in order:

1. [`00-system-overview.md`](00-system-overview.md)
2. [`01-major-components.md`](01-major-components.md)
3. [`03-project-lifecycle.md`](03-project-lifecycle.md)
4. [`04-human-ai-collaboration.md`](04-human-ai-collaboration.md)

No technical background required.

### I operate VSO and Hermes

Continue with:

5. [`05-work-packet-execution.md`](05-work-packet-execution.md)
6. [`06-direction-workflow.md`](06-direction-workflow.md)
7. [`07-autonomous-hermes.md`](07-autonomous-hermes.md)
8. [`08-telegram-control.md`](08-telegram-control.md)
9. [`09-gateway-recovery.md`](09-gateway-recovery.md)
10. [`10-smart-git-sync.md`](10-smart-git-sync.md)
11. [`11-multi-project-routing.md`](11-multi-project-routing.md)

### I develop or review VSO technically

Continue with:

12. [`12-c4-system-context.md`](12-c4-system-context.md)
13. [`13-c4-containers.md`](13-c4-containers.md)
14. [`14-application-components.md`](14-application-components.md)
15. [`15-core-data-model.md`](15-core-data-model.md)
16. [`16-work-packet-state-machine.md`](16-work-packet-state-machine.md)
17. [`17-review-approval-state-machine.md`](17-review-approval-state-machine.md)
18. [`18-deployment-security.md`](18-deployment-security.md)

### Product-alignment views

19. [`19-five-engines.md`](19-five-engines.md)
20. [`20-commercial-quality-loop.md`](20-commercial-quality-loop.md)
21. [`21-owner-attention-autonomy.md`](21-owner-attention-autonomy.md)
22. [`22-sevl.md`](22-sevl.md)

## Level model

| Level | Question answered | Audience |
|---|---|---|
| 0 — Conceptual | What is VSO? | Anyone |
| 1 — Functional | What are the big parts and responsibilities? | Owner / stakeholder |
| 2 — Architecture | How are the main layers connected? | Owner / technical manager |
| 3 — Workflow | How does the system behave in real situations? | Operator / developer |
| 4 — Technical | What are the formal components, data and states? | Developer / architect |
| 5 — Infrastructure | Where does it run and what boundaries matter? | Developer / operations / security |

## Source formats

Rendered Markdown diagrams live in this folder. Standalone sources are under:

- `docs/diagrams/mermaid/*.mmd`
- `docs/diagrams/plantuml/*.puml`

Mermaid is the default visual language for conceptual and operational views. PlantUML is the formal technical layer for Levels 4–5 where it adds precision. In Obsidian with a PlantUML plugin enabled, the technical pages render both formats inline. See [`../OBSIDIAN_DIAGRAM_GUIDE.md`](../OBSIDIAN_DIAGRAM_GUIDE.md).

## Architecture authority

The authoritative specification remains in:

- `01-product/`
- `02-requirements/`
- `04-architecture/`
- `05-project-templates/`
- `06-workflows/`
- `09-hermes/`

If a diagram and a normative specification conflict, the normative specification wins and the diagram must be corrected.

## Maintenance rule

Hermes must follow `09-hermes/ARCHITECTURE_DIAGRAM_POLICY.md` whenever architecture, domain relationships, state transitions, integrations, routing, runtime topology, security boundaries, or deployment behaviour changes.


## Obsidian reading experience

Technical Atlas pages 12–18 contain an inline `plantuml` fenced block and link to the matching `.puml` source. With the PlantUML plugin enabled, you can read the formal diagram without leaving the Markdown page.
