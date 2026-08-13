# Architecture Diagram Policy

## Purpose

Architecture diagrams are maintained views of the authoritative VSO specification. They improve human understanding and technical review without becoming a second, competing architecture.

## Authority rule

> Diagrams must never introduce a component, workflow, state, data relationship, integration, security boundary, or deployment behaviour that is not supported by the normative repository specification.

If a diagram exposes ambiguity or a missing decision, Hermes must create an issue or direction request instead of inventing architecture in the diagram.

## Required maintenance trigger

Hermes must assess diagram impact whenever a change touches:

- `04-architecture/`;
- domain entities, relationships, enums or state transitions;
- `05-project-templates/` stage/gate semantics;
- `06-workflows/`;
- agent execution or autonomy;
- Telegram/project routing;
- Git/worktree/environment behaviour;
- persistence or data portability;
- deployment topology;
- security/trust boundaries.

## Update sequence

1. Change the normative specification first.
2. Identify affected Architecture Atlas views using `docs/architecture-atlas/DIAGRAM_TRACEABILITY.csv`.
3. Update the `.md` view and matching Mermaid `.mmd` source.
4. Update related PlantUML `.puml` sources when a technical view is affected.
5. Run `python scripts/validate_architecture_atlas.py`.
6. Update traceability when sources or diagram scope changed.
7. Include diagram changes in the same focused commit as the architecture change whenever practical.

## Audience rule

Preserve progressive disclosure:

- Levels 0–1 must remain understandable without development knowledge.
- Levels 2–3 may introduce architecture/workflow terminology but must explain it.
- Levels 4–5 may use formal technical notation and implementation terminology.

## Mermaid and PlantUML

Mermaid is the default for conceptual and operational views. PlantUML is the formal technical layer for technical Atlas pages 12–18. Those pages must contain both the Mermaid overview and an inline fenced `plantuml` view, and must have a matching standalone `.puml` source under `docs/diagrams/plantuml/`. Where both represent the same view, they must be semantically consistent even if visual layouts differ.

Rendered SVG/PNG files are optional export artifacts; do not make them the maintained source of truth. The intended owner reading experience is Obsidian with Mermaid plus a PlantUML plugin.

## Validation

Package validation checks for required atlas files, matching Mermaid sources, traceability coverage, fenced Mermaid presence, required technical-page PlantUML fences and sources, and basic PlantUML structure. Renderer-specific visual review is still required when diagram syntax or layout changes substantially.
