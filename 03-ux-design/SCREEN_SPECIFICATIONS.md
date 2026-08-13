# Screen Specifications

All routes must implement loading, populated, empty, filtered-empty, validation-error, and system-error states where applicable.

## Application shell

- Route: all authenticated/local routes
- Navigation: Portfolio, Projects, Reviews, Decisions, Agents, Settings
- Non-production builds display environment name, branch, version, and port in a persistent banner.

## Portfolio dashboard — `/`

Shows active-project count, blocked-project count, pending reviews, open high/critical risks, recent decisions, and active-agent work. Cards link to filtered views.

## Project list — `/projects`

Columns/cards: name, template, status, stage, progress, health, target date, updated date.

Filters: status, health, template, archived. Search covers project name, summary, and Project Brain titles/content. Default sorting is `updatedAt desc`.

Actions: create, open, archive, restore. Archive requires confirmation. Empty state offers `Create Project`.

## Create project — `/projects/new`

Fields: template, name, summary, owner, target date. Name is required, 1–150 characters. Template selection previews stages, default deliverables, and gates.

## Project dashboard — `/projects/:projectId`

Sections: header, Project Brain summary, progress, current stage, active work, blocked items, pending reviews, risks, recent decisions, and deliverables.

Actions: edit project, add deliverable, add work packet, record decision, record risk, export project.

## Project Brain — `/projects/:projectId/brain`

Tabbed by normative sections defined in `04-architecture/DATA_MODEL.md`. Supports create, edit, reorder, and reference attachment/link.

## Deliverables — `/projects/:projectId/deliverables`

Tree and list views. Supports create, edit, reorder, parent reassignment, dependency management, criteria, versions, archive, and status changes. Circular hierarchy and dependency cycles must be rejected with explanatory errors.

## Work packets — `/projects/:projectId/work-packets`

Filters by status, assignee, deliverable, priority, and due date. Detail route `/projects/:projectId/work-packets/:id` displays specification, criteria, evidence, version history, activity, and review state.

## Reviews — `/reviews`

Shows pending first. Filters by project, status, reviewer, and date. Review detail requires criterion-by-criterion decisions before overall approval.

## Decisions — `/decisions`

Append-only list of decision records and direction requests. Supports filters and links to affected projects and requirements.

## Agents — `/agents`

Stores generic human/AI agent records, capabilities, autonomy, current status, queue summary, and activity history. V0.1 displays records and execution status; external provider orchestration is deferred.

## Settings — `/settings`

Owner display name, timezone, data directories, backup retention, default export location, and environment information.

## Responsive rules

Desktop is primary. At widths below 768 px, tables become cards, navigation becomes a drawer, and critical actions remain accessible without horizontal scrolling.


## Project intent — `/projects/:projectId/intent`

Plain-language owner view for problem, audience, desired outcome, constraints, non-goals, success measures, commercial target, and priorities. Shows approval/version status and links to requirements derived from the approved intent.

## Quality and benchmarks — `/projects/:projectId/quality`

Shows Quality Profile, benchmark brief, quality-gate results, evidence coverage, benchmark gaps, and release-readiness state. Technical detail is progressively disclosed.

## Learning — `/projects/:projectId/learning`

Shows bugs, feedback, benchmark gaps, test failures, commercial insights, and retrospectives with their conversion status into change requests/backlog/requirements.

## Owner-attention view

Portfolio/project dashboards may display autonomy rate, owner attention time, escalation count/quality, first-pass acceptance, and autonomous recovery. Metrics must include definitions/tooltips and must never encourage hiding necessary owner decisions.
