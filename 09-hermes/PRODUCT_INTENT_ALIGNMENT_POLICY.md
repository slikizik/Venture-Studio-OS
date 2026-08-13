# Product Intent Alignment Policy

The executing agent must optimize for the normative product intent, not merely for local technical completion.

Before Phase 01 and before any material architecture or scope change, read:

- `01-product/VSO_PRODUCT_DOCTRINE.md`
- `01-product/PRODUCT_ALIGNMENT_GATE.md`
- `01-product/SEVL_SCOPE.md`
- `01-product/ARCHITECTURE_FREEZE.md`

## Conflict rule

If a proposed implementation satisfies a technical requirement but materially undermines commercial quality, governed autonomy, low owner-attention operation, or the universal project model, stop the affected work and surface the conflict.

Do not rewrite product intent to fit convenient code.

## Backlog rule

Non-blocking ideas discovered during implementation go to `01-product/BACKLOG.md`. Do not expand the active phase merely because the idea is useful.

## SEVL priority

Until `TEST-SEVL-001` passes, prefer work that completes or protects the end-to-end SEVL over optional horizontal breadth or interface polish.
