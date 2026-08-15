// NFR-004 — Core pages must meet WCAG 2.1 AA keyboard and contrast expectations.
//
// This module provides pure, testable helpers that encode the minimum
// automated checks VSO can perform for WCAG 2.1 AA on its own UI:
//   - sufficient text/background contrast (>= 4.5:1 normal, >= 3:1 large)
//   - interactive elements are keyboard reachable (have a programmatic name
//     via role/aria-label/aria-labelledby or associated text/label)
//   - focus must not be removed (no negative tabindex on interactive controls)
//
// These are necessary-but-not-sufficient checks; they are paired with an
// exported, labeled UI affordance (see app/src/components/ExportDialog.tsx).

/** Relative luminance per WCAG 2.1. Accepts #rgb / #rrggbb. */
export function relativeLuminance(hex: string): number {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLin(parseInt(h.slice(0, 2), 16));
  const g = toLin(parseInt(h.slice(2, 4), 16));
  const b = toLin(parseInt(h.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two colors (1..21). */
export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [a, b] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (a + 0.05) / (b + 0.05);
}

export interface ContrastCheckInput {
  fg: string;
  bg: string;
  largeText?: boolean;
}

/** WCAG 2.1 AA: 4.5:1 normal text, 3:1 large text (>= 18pt or >=14pt bold). */
export function meetsContrastAA(input: ContrastCheckInput): boolean {
  const required = input.largeText ? 3 : 4.5;
  return contrastRatio(input.fg, input.bg) >= required;
}

export interface KeyboardAccessInput {
  role?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  hasAssociatedText?: boolean;
  tabIndex?: number;
  interactive?: boolean;
}

/**
 * A keyboard-accessible interactive control must be focusable (no negative
 * tabindex) and have a programmatic name (aria-label / aria-labelledby /
 * associated text / native button/link semantics).
 */
export function isKeyboardAccessible(input: KeyboardAccessInput): boolean {
  if (input.interactive === false) return true;
  if (input.tabIndex !== undefined && input.tabIndex < 0) return false;
  const named =
    !!input.ariaLabel ||
    !!input.ariaLabelledby ||
    input.hasAssociatedText === true ||
    input.role === "button" ||
    input.role === "link" ||
    input.role === "menuitem";
  return named;
}

/** Aggregate accessibility assertion used by component smoke tests. */
export interface A11yReport {
  contrast: { fg: string; bg: string; ratio: number; pass: boolean };
  keyboard: boolean;
}

export function checkControlA11y(input: {
  fg: string;
  bg: string;
  largeText?: boolean;
  interactive?: boolean;
  tabIndex?: number;
  ariaLabel?: string;
  ariaLabelledby?: string;
  hasAssociatedText?: boolean;
  role?: string;
}): A11yReport {
  const ratio = contrastRatio(input.fg, input.bg);
  return {
    contrast: {
      fg: input.fg,
      bg: input.bg,
      ratio,
      pass: ratio >= (input.largeText ? 3 : 4.5),
    },
    keyboard: isKeyboardAccessible({
      role: input.role,
      ariaLabel: input.ariaLabel,
      ariaLabelledby: input.ariaLabelledby,
      hasAssociatedText: input.hasAssociatedText,
      tabIndex: input.tabIndex,
      interactive: input.interactive,
    }),
  };
}
