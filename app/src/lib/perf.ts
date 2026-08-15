// NFR-005 — Primary list and dashboard actions should respond within two
// seconds at MVP data volume.
//
// This module provides a small, deterministic timing helper used to assert
// that dataset-bounded operations (export/import at MVP volume, dashboard
// metric aggregation) complete within the 2000ms budget. The test seeds an
// MVP-volume fixture and measures the real operation, so the budget is
// evaluated against actual behaviour, not a hardcoded constant.

export const NFR_005_BUDGET_MS = 2000;

export interface TimingResult {
  ms: number;
  withinBudget: boolean;
}

/** Measure an async operation. Throws the original error if `fn` rejects. */
export async function measure<T>(fn: () => Promise<T>): Promise<TimingResult & { value: T }> {
  const start = performance.now();
  const value = await fn();
  const ms = performance.now() - start;
  return { value, ms, withinBudget: ms <= NFR_005_BUDGET_MS };
}

/** Synchronous variant for pure computations. */
export function measureSync<T>(fn: () => T): TimingResult & { value: T } {
  const start = performance.now();
  const value = fn();
  const ms = performance.now() - start;
  return { value, ms, withinBudget: ms <= NFR_005_BUDGET_MS };
}
