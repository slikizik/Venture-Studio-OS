# Product Intent Alignment Gate

This gate prevents technically correct implementation from drifting away from the reason VSO exists.

Before Phase 01 and before any major architecture change, answer all eight questions with evidence from the repository.

| Gate | Required outcome |
|---|---|
| A1 | A non-technical owner can turn an idea into a structured project without supplying architecture. |
| A2 | The project records what “good” means through success criteria, quality profile, and benchmark targets. |
| A3 | Approved intent can be transformed into requirements, deliverables, and executable work. |
| A4 | Agents can execute safely without routine owner supervision. |
| A5 | Outputs are verified against requirements and commercial-quality gates, not only compilation/tests. |
| A6 | Consequential decisions are translated into plain-language owner choices and formally recorded. |
| A7 | Feedback, defects, discoveries, and market learning can feed the next controlled iteration. |
| A8 | The system measures autonomy and owner-attention cost so convenience does not hide declining quality. |

## Gate result

Valid states: `APPROVED`, `BLOCKED`, `NEEDS_DIRECTION`.

A phase that materially changes these outcomes must update this document's evidence in its phase report. Non-blocking ideas that do not affect the active MVP go to `01-product/BACKLOG.md` instead of expanding the architecture.
